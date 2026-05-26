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

jest.mock('react-native-sse', () => {
    return jest.fn().mockImplementation(() => ({
        addEventListener: jest.fn(),
        removeAllEventListeners: jest.fn(),
        close: jest.fn(),
    }));
});

import { HttpAiClient, HEALTH_CACHE_TTL_MS } from '../httpAiClient';

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
