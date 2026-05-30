/**
 * Plan HTTP v2.1 — httpAiClient tests.
 *
 * We focus on the surface that's hard to lab-verify:
 *   - constructor validation (port range, IP required)
 *   - health() caching behavior
 *   - error-kind discrimination (429 → http-busy distinct from 5xx → http-server)
 *   - executeAction() success + 4xx + 5xx + network failure paths
 *
 * The SSE `/troubleshoot` stream is exercised only at the lab device level
 * — react-native-sse's mock is a moving target, and the integration is the
 * thing that actually matters.
 */

// ESM default-export-compatible mock. `import EventSource from 'react-native-sse'`
// resolves to the module's `default` property; we expose a jest.fn there so
// tests can re-implement it via mockImplementation per case.
jest.mock('react-native-sse', () => {
    const ctor = jest.fn().mockImplementation(() => ({
        addEventListener: jest.fn(),
        removeAllEventListeners: jest.fn(),
        close: jest.fn(),
    }));
    return { __esModule: true, default: ctor };
});

import { HttpAiClient, DIAG_FALLBACK_TOOLS } from '../httpAiClient';

const originalFetch = global.fetch;

afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllTimers();
    jest.useRealTimers();
});

describe('HttpAiClient — constructor validation', () => {
    test('rejects empty lanIp', () => {
        expect(() => new HttpAiClient('')).toThrow(/lanIp/);
    });

    test.each([0, -1, 65536, 99999, 1.5, NaN])('rejects bad port %p', (port) => {
        expect(() => new HttpAiClient('192.168.1.1', port as number)).toThrow(/port/);
    });

    test.each([1, 80, 8083, 8084, 65535])('accepts valid port %p', (port) => {
        expect(() => new HttpAiClient('192.168.1.1', port)).not.toThrow();
    });

    test('builds baseUrl from lanIp + port', () => {
        const c = new HttpAiClient('10.0.0.5', 9100);
        expect(c.baseUrl).toBe('http://10.0.0.5:9100');
    });

    test('default port 8083', () => {
        const c = new HttpAiClient('192.168.1.50');
        expect(c.port).toBe(8083);
        expect(c.baseUrl).toBe('http://192.168.1.50:8083');
    });
});

describe('HttpAiClient.health()', () => {
    test('returns ok=true when server responds 200 with ok:true body', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            status: 200,
            text: () => Promise.resolve('{"ok":true}'),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.health();

        expect(r.ok).toBe(true);
        expect(r.latencyMs).toBeGreaterThanOrEqual(0);
    });

    test('returns ok=false on non-200', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            status: 503,
            text: () => Promise.resolve('{"ok":false}'),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.health();

        expect(r.ok).toBe(false);
    });

    test('returns ok=false when 200 body is not ok:true', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            status: 200,
            text: () => Promise.resolve('garbage'),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.health();
        expect(r.ok).toBe(false);
    });

    test('returns ok=false on network error', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.health();

        expect(r.ok).toBe(false);
    });

    test('memoizes for HEALTH_CACHE_TTL_MS', async () => {
        const fetchMock = jest.fn().mockResolvedValue({
            status: 200,
            text: () => Promise.resolve('{"ok":true}'),
        });
        global.fetch = fetchMock as any;
        const c = new HttpAiClient('192.168.1.50');

        await c.health();
        await c.health();
        await c.health();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const cached = await c.health();
        expect(cached.cached).toBe(true);
    });

    test('invalidateHealthCache forces re-probe', async () => {
        const fetchMock = jest.fn().mockResolvedValue({
            status: 200,
            text: () => Promise.resolve('{"ok":true}'),
        });
        global.fetch = fetchMock as any;
        const c = new HttpAiClient('192.168.1.50');

        await c.health();
        c.invalidateHealthCache();
        await c.health();

        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});

describe('HttpAiClient.executeAction()', () => {
    test('200 → ok with parsed payload', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: () => Promise.resolve('{"type":"execution_result","action_id":"a1","success":true,"duration_ms":100}'),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.executeAction({
            action_id: 'a1',
            approval_token: 'tok',
        });

        expect(r.ok).toBe(true);
        expect(r.payload?.success).toBe(true);
    });

    test('429 → http-busy error (NOT transient — caller should NOT fall back to BLE)', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 429,
            text: () => Promise.resolve('device busy'),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.executeAction({ action_id: 'a1', approval_token: 't' });

        expect(r.ok).toBe(false);
        expect(r.error?.kind).toBe('http-busy');
        expect(r.error?.transient).toBe(false);
    });

    test('400 → http-bad-request (not transient)', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 400,
            text: () => Promise.resolve('bad request'),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.executeAction({ action_id: 'a1', approval_token: 't' });

        expect(r.ok).toBe(false);
        expect(r.error?.kind).toBe('http-bad-request');
        expect(r.error?.transient).toBe(false);
    });

    test('404 → http-not-found (not transient — session/action expired)', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 404,
            text: () => Promise.resolve('not found'),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.executeAction({ action_id: 'a1', approval_token: 't' });

        expect(r.error?.kind).toBe('http-not-found');
        expect(r.error?.transient).toBe(false);
    });

    test('500 → http-server (transient — caller may retry on BLE)', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 500,
            text: () => Promise.resolve('boom'),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.executeAction({ action_id: 'a1', approval_token: 't' });

        expect(r.error?.kind).toBe('http-server');
        expect(r.error?.transient).toBe(true);
    });

    test('network failure → network error (transient)', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.executeAction({ action_id: 'a1', approval_token: 't' });

        expect(r.error?.kind).toBe('network');
        expect(r.error?.transient).toBe(true);
    });

    test('includes security_code only when provided', async () => {
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: () => Promise.resolve('{"type":"execution_result","action_id":"a1","success":true,"duration_ms":100}'),
        });
        global.fetch = fetchMock as any;
        const c = new HttpAiClient('192.168.1.50');

        await c.executeAction({ action_id: 'a1', approval_token: 't' });
        const bodyNoCode = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
        expect(bodyNoCode.security_code).toBeUndefined();

        await c.executeAction({ action_id: 'a2', approval_token: 't' }, '1234');
        const bodyWithCode = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
        expect(bodyWithCode.security_code).toBe('1234');
    });
});

describe('HttpAiClient.fetchDiagBundle()', () => {
    test('200 + valid JSON → ok:true with parsed bundle', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: () => Promise.resolve(
                '{"generated_at":"2026-05-29T00:00:00Z","tools":{"internet":{"dns_ok":true}}}',
            ),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.fetchDiagBundle();

        expect(r.ok).toBe(true);
        expect(r.payload?.generated_at).toBe('2026-05-29T00:00:00Z');
        expect(r.payload?.tools).toEqual({ internet: { dns_ok: true } });
    });

    test('POSTs an empty JSON body to /diag/bundle (BLE-proxy-compatible)', async () => {
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: () => Promise.resolve('{"generated_at":"t","tools":{}}'),
        });
        global.fetch = fetchMock as any;
        const c = new HttpAiClient('192.168.1.50');

        await c.fetchDiagBundle();

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('http://192.168.1.50:8083/diag/bundle');
        expect((init as RequestInit).method).toBe('POST');
        expect((init as any).headers['Content-Type']).toBe('application/json');
        // Body MUST be the literal "{}" the core BLE proxy also sends, so the
        // identical request shape works over either transport.
        expect((init as RequestInit).body).toBe('{}');
    });

    test('200 + non-JSON → sse-malformed (server should never do this, but guard it)', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: () => Promise.resolve('not json at all'),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.fetchDiagBundle();

        expect(r.ok).toBe(false);
        expect(r.error?.kind).toBe('sse-malformed');
        expect(r.error?.transient).toBe(false);
    });

    test('429 → http-busy (device mid-session; caller must NOT fall back to BLE)', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 429,
            text: () => Promise.resolve('device busy'),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.fetchDiagBundle();

        expect(r.ok).toBe(false);
        expect(r.error?.kind).toBe('http-busy');
        expect(r.error?.transient).toBe(false);
    });

    test('500 → http-server (transient — caller may retry on BLE)', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 500,
            text: () => Promise.resolve('boom'),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.fetchDiagBundle();

        expect(r.error?.kind).toBe('http-server');
        expect(r.error?.transient).toBe(true);
    });

    test('network failure → network error (transient)', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.fetchDiagBundle();

        expect(r.ok).toBe(false);
        expect(r.error?.kind).toBe('network');
        expect(r.error?.transient).toBe(true);
    });

    // --- Stale-image fallback: a blox-ai image predating POST /diag/bundle
    //     405s the POST but still serves the per-tool GET /diag/{tool} routes.

    test('405 on POST → falls back to per-tool GETs and assembles the bundle', async () => {
        const fetchMock = jest.fn().mockImplementation((url: string, init: RequestInit) => {
            if (init.method === 'POST') {
                return Promise.resolve({
                    ok: false, status: 405,
                    text: () => Promise.resolve('Method Not Allowed'),
                });
            }
            // GET /diag/{tool}: echo the tool name back so we can assert wiring.
            const tool = url.split('/diag/')[1];
            return Promise.resolve({
                ok: true, status: 200,
                text: () => Promise.resolve(JSON.stringify({ tool, ok: true })),
            });
        });
        global.fetch = fetchMock as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.fetchDiagBundle();

        expect(r.ok).toBe(true);
        expect(typeof r.payload?.generated_at).toBe('string');
        // Keyed by short tool name, one entry per fallback tool.
        expect(Object.keys(r.payload!.tools).sort()).toEqual([...DIAG_FALLBACK_TOOLS].sort());
        expect(r.payload?.tools.internet).toEqual({ tool: 'internet', ok: true });
        // One POST (the failed bundle) + one GET per fallback tool.
        expect(fetchMock).toHaveBeenCalledTimes(1 + DIAG_FALLBACK_TOOLS.length);
    });

    test('404 on POST → also falls back (older image lacks the route entirely)', async () => {
        const fetchMock = jest.fn().mockImplementation((url: string, init: RequestInit) => {
            if (init.method === 'POST') {
                return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('Not Found') });
            }
            return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{"ok":true}') });
        });
        global.fetch = fetchMock as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.fetchDiagBundle();

        expect(r.ok).toBe(true);
        expect(r.payload?.tools.internet).toEqual({ ok: true });
    });

    test('fallback records {error} for tools absent on a stale image but still succeeds', async () => {
        // Simulate a stale image: only the original core tools exist; the
        // newer ones 404 individually.
        const stale = new Set([
            'internet', 'relay', 'time', 'power', 'storage', 'containers',
            'wireguard', 'heartbeat', 'events', 'readiness',
        ]);
        const fetchMock = jest.fn().mockImplementation((url: string, init: RequestInit) => {
            if (init.method === 'POST') {
                return Promise.resolve({ ok: false, status: 405, text: () => Promise.resolve('') });
            }
            const tool = url.split('/diag/')[1];
            return stale.has(tool)
                ? Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{"data":1}') })
                : Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('not found') });
        });
        global.fetch = fetchMock as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.fetchDiagBundle();

        expect(r.ok).toBe(true);
        expect(r.payload?.tools.internet).toEqual({ data: 1 });
        expect(r.payload?.tools.kubo_health).toEqual({ error: 'HTTP 404', http_status: 404 });
    });

    test('fallback where EVERY per-tool GET fails → network error (not a bundle of errors)', async () => {
        const fetchMock = jest.fn().mockImplementation((url: string, init: RequestInit) => {
            if (init.method === 'POST') {
                return Promise.resolve({ ok: false, status: 405, text: () => Promise.resolve('') });
            }
            return Promise.resolve({ ok: false, status: 500, text: () => Promise.resolve('boom') });
        });
        global.fetch = fetchMock as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.fetchDiagBundle();

        expect(r.ok).toBe(false);
        expect(r.error?.kind).toBe('network');
        expect(r.error?.transient).toBe(true);
    });

    test('fallback caps in-flight per-tool GETs (parallel but bounded)', async () => {
        let inFlight = 0;
        let maxInFlight = 0;
        const fetchMock = jest.fn().mockImplementation((url: string, init: RequestInit) => {
            if (init.method === 'POST') {
                return Promise.resolve({ ok: false, status: 405, text: () => Promise.resolve('') });
            }
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            return new Promise((resolve) => {
                setTimeout(() => {
                    inFlight -= 1;
                    resolve({ ok: true, status: 200, text: () => Promise.resolve('{}') });
                }, 5);
            });
        });
        global.fetch = fetchMock as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.fetchDiagBundle();

        expect(r.ok).toBe(true);
        // Bounded by the concurrency cap (5) …
        expect(maxInFlight).toBeLessThanOrEqual(5);
        // … yet genuinely concurrent, not serialized one-at-a-time.
        expect(maxInFlight).toBeGreaterThan(1);
    });
});

describe('HttpAiClient.enableRemoteSupport()', () => {
    test('200 {success:true} → ok:true with success payload', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: () => Promise.resolve('{"success":true,"exit_code":0}'),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.enableRemoteSupport('1234');

        expect(r.ok).toBe(true);
        expect(r.payload?.success).toBe(true);
    });

    test('sends X-Fula-Support header + security_code body to /support/wireguard', async () => {
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: () => Promise.resolve('{"success":true}'),
        });
        global.fetch = fetchMock as any;
        const c = new HttpAiClient('192.168.1.50');

        await c.enableRemoteSupport('4321');

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('http://192.168.1.50:8083/support/wireguard');
        expect((init as RequestInit).method).toBe('POST');
        // The custom header is what forces a CORS preflight (drive-by defense)
        // AND what the core BLE proxy cannot send — hence LAN-only.
        expect((init as any).headers['X-Fula-Support']).toBe('enable');
        expect((init as any).headers['Content-Type']).toBe('application/json');
        expect(JSON.parse((init as RequestInit).body as string).security_code).toBe('4321');
    });

    test('403 security_code_invalid → ok:false but payload still carries the gate code', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 403,
            text: () => Promise.resolve('{"error":"security_code_invalid"}'),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.enableRemoteSupport('0000');

        expect(r.ok).toBe(false);
        // 403 is a deterministic 4xx → http-bad-request (no BLE fallback).
        expect(r.error?.kind).toBe('http-bad-request');
        expect(r.error?.transient).toBe(false);
        // Crucial: the parsed body is returned even on the non-2xx so the
        // card can branch on the specific gate-rejection code.
        expect(r.payload?.error).toBe('security_code_invalid');
    });

    test('403 support_header_required → payload error preserved', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 403,
            text: () => Promise.resolve('{"error":"support_header_required"}'),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.enableRemoteSupport('1234');

        expect(r.ok).toBe(false);
        expect(r.payload?.error).toBe('support_header_required');
    });

    test('non-2xx with non-JSON body → payload undefined, error still set', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 500,
            text: () => Promise.resolve('<html>500</html>'),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.enableRemoteSupport('1234');

        expect(r.ok).toBe(false);
        expect(r.error?.kind).toBe('http-server');
        expect(r.payload).toBeUndefined();
    });

    test('network failure → network error (transient)', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.enableRemoteSupport('1234');

        expect(r.ok).toBe(false);
        expect(r.error?.kind).toBe('network');
        expect(r.error?.transient).toBe(true);
    });

    test('200 success carries verified status + installed_on_demand', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: () => Promise.resolve(JSON.stringify({
                success: true,
                exit_code: 0,
                status: {
                    installed: true, registered: true, active: true,
                    last_handshake_age_sec: 9,
                },
                installed_on_demand: false,
            })),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.enableRemoteSupport('1234');

        expect(r.ok).toBe(true);
        expect(r.payload?.success).toBe(true);
        // The verified ground-truth tunnel state (from status.sh) is surfaced.
        expect(r.payload?.status?.active).toBe(true);
        expect(r.payload?.installed_on_demand).toBe(false);
    });

    test('500 wireguard_not_installed → lifecycle error + flag preserved', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 500,
            text: () => Promise.resolve(JSON.stringify({
                success: false,
                error: 'wireguard_not_installed',
                exit_code: 2,
                installed_on_demand: true,
            })),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.enableRemoteSupport('1234');

        expect(r.ok).toBe(false);
        expect(r.error?.kind).toBe('http-server');
        // The card branches on this to show "couldn't finish install" copy.
        expect(r.payload?.error).toBe('wireguard_not_installed');
        expect(r.payload?.installed_on_demand).toBe(true);
    });

    test('500 tunnel_inactive_after_restart → verified-down status preserved', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 500,
            text: () => Promise.resolve(JSON.stringify({
                success: false,
                error: 'tunnel_inactive_after_restart',
                status: { installed: true, registered: true, active: false },
            })),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        const r = await c.enableRemoteSupport('1234');

        expect(r.ok).toBe(false);
        // status.sh's active:false is the ground truth that the restart didn't
        // bring the interface up — surfaced so the card shows the right copy.
        expect(r.payload?.error).toBe('tunnel_inactive_after_restart');
        expect(r.payload?.status?.active).toBe(false);
    });
});

describe('HttpAiClient.userReply / phoneContext', () => {
    test('userReply succeeds on 200', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: () => Promise.resolve(''),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        await expect(c.userReply('s', 'q1', 'hi')).resolves.toBeUndefined();
    });

    test('userReply throws AiClientError on 4xx', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            status: 400,
            text: () => Promise.resolve('bad'),
        }) as any;
        const c = new HttpAiClient('192.168.1.50');

        await expect(c.userReply('s', 'q1', 'hi')).rejects.toMatchObject({ kind: 'http-bad-request' });
    });

    test('phoneContext throws on network failure', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('net'));
        const c = new HttpAiClient('192.168.1.50');

        await expect(c.phoneContext('s', { foo: 'bar' })).rejects.toBeDefined();
    });
});

describe('HttpAiClient.cancel — best-effort', () => {
    test('swallows errors', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('whatever'));
        const c = new HttpAiClient('192.168.1.50');

        await expect(c.cancel('s')).resolves.toBeUndefined();
    });
});

describe('HttpAiClient.runAi — SSE lifecycle (Plan HTTP v2.2 regression test)', () => {
    /**
     * Codex Plan HTTP final-review BLOCK: react-native-sse's close()
     * synchronously dispatches the 'close' event. If `closed=true` is
     * set AFTER es.close() in the error path, the close handler fires
     * onComplete on the same tick as onError — caller sees both for
     * one error.
     *
     * The fix sets `closed = true` BEFORE es.close(). This test locks
     * that invariant in by mocking react-native-sse so it dispatches
     * error then close synchronously (matching the real lib's
     * behavior) and asserting onComplete was never called.
     */
    test('onError fires once, onComplete does NOT fire on same tick', () => {
        // Re-mock react-native-sse to capture handlers and let us
        // trigger error → close synchronously.
        const handlers: Record<string, Function[]> = {};
        const EventSourceMock = require('react-native-sse').default as jest.Mock;
        EventSourceMock.mockImplementation(() => ({
            addEventListener: jest.fn((event: string, fn: Function) => {
                handlers[event] = handlers[event] || [];
                handlers[event].push(fn);
            }),
            removeAllEventListeners: jest.fn(),
            close: jest.fn(() => {
                // Real react-native-sse dispatches close synchronously
                // when close() is called. Simulate that.
                (handlers.close || []).forEach(fn => fn({}));
            }),
        }));

        const c = new HttpAiClient('192.168.1.50');
        const onEvent = jest.fn();
        const onComplete = jest.fn();
        const onError = jest.fn();

        c.runAi('hi', undefined, { onEvent, onComplete, onError });

        // Simulate an SSE error with HTTP status 503 — should produce
        // a single onError(http-server, transient: true). Then close()
        // fires synchronously inside the error handler; if the
        // lifecycle is correct, the close listener short-circuits.
        (handlers.error || []).forEach(fn => fn({ xhrStatus: 503, message: 'boom' }));

        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'http-server', transient: true, httpStatus: 503 }),
        );
        // The bug this test guards against: onComplete would fire after
        // onError if `closed = true` is set AFTER es.close().
        expect(onComplete).not.toHaveBeenCalled();
    });

    test('cancel() does not fire onError or onComplete after close', () => {
        const handlers: Record<string, Function[]> = {};
        const EventSourceMock = require('react-native-sse').default as jest.Mock;
        EventSourceMock.mockImplementation(() => ({
            addEventListener: jest.fn((event: string, fn: Function) => {
                handlers[event] = handlers[event] || [];
                handlers[event].push(fn);
            }),
            removeAllEventListeners: jest.fn(),
            close: jest.fn(() => {
                (handlers.close || []).forEach(fn => fn({}));
            }),
        }));

        const c = new HttpAiClient('192.168.1.50');
        const onError = jest.fn();
        const onComplete = jest.fn();

        const session = c.runAi('hi', undefined, { onEvent: jest.fn(), onComplete, onError });

        session.cancel();

        // After cancel: neither callback should fire (closed=true set
        // before es.close() so the close listener short-circuits).
        expect(onError).not.toHaveBeenCalled();
        expect(onComplete).not.toHaveBeenCalled();
    });
});
