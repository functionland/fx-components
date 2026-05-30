/**
 * Tests for the "Send to Support" diagnostics upload module.
 *
 * Three surfaces, all pure / fetch-mockable:
 *   - uuidv4(): must emit the SAME canonical lowercase form the intake
 *     server validates with `str(uuid.UUID(s)) == s` — any drift here is a
 *     silent 400 in production.
 *   - buildDiagnosticsPayload(): the single source of truth for what's both
 *     rendered (WYSIWYG preview) and POSTed. Its blox/phone shaping is the
 *     contract the server's `_diagnostics_summary` reads.
 *   - postDiagnostics(): one-shot, never-throws, no-retry; flat result the
 *     card branches on.
 */
import {
    DIAGNOSTICS_UPLOAD_URL,
    uuidv4,
    buildDiagnosticsPayload,
    postDiagnostics,
} from '../diagnosticsUpload';
import type { DiagBundle } from '../httpAiClient';

const originalFetch = global.fetch;
afterEach(() => {
    global.fetch = originalFetch;
});

describe('DIAGNOSTICS_UPLOAD_URL', () => {
    test('points at the agreed /diagnostics intake endpoint', () => {
        expect(DIAGNOSTICS_UPLOAD_URL).toBe('https://ai-training.fx.land/diagnostics');
    });

    test('is HTTPS on an fx.land host', () => {
        const u = new URL(DIAGNOSTICS_UPLOAD_URL);
        expect(u.protocol).toBe('https:');
        expect(u.hostname.endsWith('.fx.land')).toBe(true);
    });
});

describe('uuidv4', () => {
    // The server accepts an upload_id only if it's the canonical lowercase
    // 8-4-4-4-12 v4 form. Mirror that exact shape.
    const CANONICAL_V4 =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

    test('matches the canonical lowercase v4 shape', () => {
        for (let i = 0; i < 200; i++) {
            expect(uuidv4()).toMatch(CANONICAL_V4);
        }
    });

    test('sets version nibble to 4 and variant nibble to 8/9/a/b', () => {
        const u = uuidv4();
        expect(u[14]).toBe('4');
        expect(['8', '9', 'a', 'b']).toContain(u[19]);
    });

    test('is lowercase (uppercase hex would fail the server canonical check)', () => {
        const u = uuidv4();
        expect(u).toBe(u.toLowerCase());
    });

    test('produces distinct ids across calls', () => {
        const seen = new Set<string>();
        for (let i = 0; i < 500; i++) seen.add(uuidv4());
        // Collisions are astronomically unlikely; even with the Math.random
        // fallback 500 draws should not collide.
        expect(seen.size).toBe(500);
    });
});

describe('buildDiagnosticsPayload', () => {
    const baseArgs = {
        bloxKuboPeerId: '12D3KooKubo',
        bloxClusterPeerId: '12D3KooCluster',
        appPeerId: '12D3KooApp',
        phoneInternet: 'ok' as const,
        discoveryStatus: 'failed' as const,
        relays: [{ dns_name: 'relay1.fx.land', status: 'ok' }],
        transportUsed: 'lan-http',
        appPlatform: 'android',
    };

    test('kind is always "diagnostics" and ids/timestamps are minted', () => {
        const p = buildDiagnosticsPayload({ ...baseArgs, bundle: null });
        expect(p.kind).toBe('diagnostics');
        expect(p.upload_id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
        // generated_at is a valid ISO timestamp.
        expect(Number.isNaN(Date.parse(p.generated_at))).toBe(false);
    });

    test('phone block carries every identifier + probe verbatim', () => {
        const p = buildDiagnosticsPayload({ ...baseArgs, bundle: null });
        expect(p.phone).toEqual({
            blox_kubo_peer_id: '12D3KooKubo',
            blox_cluster_peer_id: '12D3KooCluster',
            app_peer_id: '12D3KooApp',
            phone_internet: 'ok',
            discovery_service: 'failed',
            relays: [{ dns_name: 'relay1.fx.land', status: 'ok' }],
            transport_used: 'lan-http',
            app_platform: 'android',
        });
    });

    test('blox = {generated_at, tools} when a bundle was fetched', () => {
        const bundle: DiagBundle = {
            generated_at: '2026-05-29T00:00:00.000Z',
            tools: { internet: { dns_ok: true } },
        };
        const p = buildDiagnosticsPayload({ ...baseArgs, bundle });
        expect(p.blox).toEqual({
            generated_at: '2026-05-29T00:00:00.000Z',
            tools: { internet: { dns_ok: true } },
        });
    });

    test('blox = {error} when the bundle fetch failed (device unreachable is a finding)', () => {
        const p = buildDiagnosticsPayload({
            ...baseArgs,
            bundle: null,
            bundleError: 'no transport available',
        });
        expect(p.blox).toEqual({ error: 'no transport available' });
    });

    test('blox = null when neither a bundle nor an error is supplied', () => {
        const p = buildDiagnosticsPayload({ ...baseArgs, bundle: null });
        expect(p.blox).toBeNull();
    });

    test('bundle wins over bundleError when both are present', () => {
        const bundle: DiagBundle = { generated_at: 't', tools: {} };
        const p = buildDiagnosticsPayload({
            ...baseArgs,
            bundle,
            bundleError: 'ignored because bundle present',
        });
        expect(p.blox).toEqual({ generated_at: 't', tools: {} });
    });

    test('null cluster peer id is preserved (stale-migration default)', () => {
        const p = buildDiagnosticsPayload({
            ...baseArgs,
            bloxClusterPeerId: null,
            bundle: null,
        });
        expect(p.phone.blox_cluster_peer_id).toBeNull();
    });

    test('two calls mint distinct upload_ids', () => {
        const a = buildDiagnosticsPayload({ ...baseArgs, bundle: null });
        const b = buildDiagnosticsPayload({ ...baseArgs, bundle: null });
        expect(a.upload_id).not.toBe(b.upload_id);
    });
});

describe('postDiagnostics', () => {
    const payload = buildDiagnosticsPayload({
        bloxKuboPeerId: 'k',
        bloxClusterPeerId: null,
        appPeerId: 'a',
        phoneInternet: 'ok',
        discoveryStatus: 'ok',
        relays: null,
        transportUsed: 'none',
        appPlatform: 'ios',
        bundle: null,
    });

    test('200 → ok:true with status', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 }) as any;
        const r = await postDiagnostics(payload);
        expect(r).toEqual({ ok: true, status: 200 });
    });

    test('POSTs JSON to the diagnostics URL with the exact payload', async () => {
        const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
        global.fetch = fetchMock as any;

        await postDiagnostics(payload);

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(DIAGNOSTICS_UPLOAD_URL);
        expect(init.method).toBe('POST');
        expect(init.headers['Content-Type']).toBe('application/json');
        expect(init.headers['Accept']).toBe('application/json');
        // Body is the verbatim payload (WYSIWYG: same object that's rendered).
        expect(JSON.parse(init.body)).toEqual(payload);
    });

    test('non-2xx → ok:false with sanitized "HTTP <status>" (no server body)', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 413 }) as any;
        const r = await postDiagnostics(payload);
        expect(r).toEqual({ ok: false, status: 413, error: 'HTTP 413' });
    });

    test('network failure → ok:false, error "network error" (never throws)', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as any;
        const r = await postDiagnostics(payload);
        expect(r.ok).toBe(false);
        expect(r.error).toBe('network error');
    });

    test('abort/timeout → ok:false, error "timeout"', async () => {
        global.fetch = jest.fn().mockRejectedValue(
            Object.assign(new Error('aborted'), { name: 'AbortError' }),
        ) as any;
        const r = await postDiagnostics(payload, 5);
        expect(r.ok).toBe(false);
        expect(r.error).toBe('timeout');
    });
});
