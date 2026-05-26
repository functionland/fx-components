/**
 * aiTransport — picks the right transport for the Blox AI plugin.
 *
 * Plan HTTP v2.1 — H2 deliverable. Today's chain:
 *   1. LAN HTTP (when mDNS authorizer + RFC1918/link-local IP + 1 s
 *      /health probe all pass)
 *   2. BLE (fallback)
 *
 * Libp2p slot is reserved for a future plan when someone builds the
 * go-fula libp2p-stream-to-AI bridge; the selector's shape leaves room
 * for it without a redesign.
 *
 * IMPORTANT: this module does NOT modify `helper.ts:initFula` (built-in
 * advisor catch from v1 review). initFula is for general libp2p
 * (kubo/cluster) client setup; AI transport is a separate concern with
 * its own selector. Keeping them orthogonal avoids coupling AI session
 * lifecycle to the general blox-connection retry loop.
 */

import {
    HttpAiClient,
    DEFAULT_BLOX_AI_PORT,
} from './httpAiClient';
import * as mdnsCache from './mdnsCache';

export const LAN_HTTP_PROBE_TIMEOUT_MS = 1000;
export const MDNS_FRESHNESS_MAX_AGE_MS = 90_000;

export type AiTransportKind = 'lan-http' | 'ble';

export interface AiTransportChoice {
    kind: AiTransportKind;
    /** Populated when kind === 'lan-http'. */
    httpClient?: HttpAiClient;
    /** Why this transport was chosen (for telemetry + debugging). */
    reason: string;
}

/**
 * Whitelist-style check for IPs we'd accept as a LAN HTTP target.
 *
 * - Accept RFC1918 (`10/8`, `172.16-31/12`, `192.168/16`) and link-local
 *   `169.254/16`.
 * - Reject loopback (`127/8`).
 * - **Do NOT** blanket-reject `10.42.0.0/24` — codex Plan HTTP v2
 *   final-review catch: in this codebase that's the hotspot AP subnet,
 *   not WireGuard. WG exclusion is upstream (routing/interface), not
 *   our concern here.
 */
export function ipIsPrivateLan(ip: string): boolean {
    if (!ip || typeof ip !== 'string') return false;
    const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return false;
    const o1 = Number(m[1]);
    const o2 = Number(m[2]);
    if ([o1, o2, Number(m[3]), Number(m[4])].some(o => o < 0 || o > 255)) return false;
    // 127/8 loopback — reject
    if (o1 === 127) return false;
    // 10/8
    if (o1 === 10) return true;
    // 192.168/16
    if (o1 === 192 && o2 === 168) return true;
    // 172.16/12
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
    // 169.254/16 link-local
    if (o1 === 169 && o2 === 254) return true;
    return false;
}

export interface SelectorOptions {
    /** How long to wait for /health before giving up on LAN HTTP. */
    probeTimeoutMs?: number;
    /** Max mDNS record age. Older records aren't trusted for LAN HTTP. */
    mdnsMaxAgeMs?: number;
    /**
     * If true, run a one-shot Zeroconf scan before checking the cache.
     * Default true on first call per process; set false for tests or
     * when the caller has already populated the cache.
     */
    scanIfEmpty?: boolean;
}

/**
 * Pick a transport for an AI session targeting `bloxPeerId`. `appPeerId`
 * must be the phone's own peer ID (already known from pairing).
 *
 * On success returns `{kind: 'lan-http', httpClient}` or `{kind: 'ble'}`.
 * Callers handle the BLE path through their existing BLE manager — this
 * selector doesn't construct a BLE client (BLE wiring is platform-heavy
 * and lives in `ble.ts` / `BleManagerWrapper`).
 *
 * The selector NEVER throws. Worst case it returns BLE with a reason
 * string explaining why LAN HTTP was skipped.
 */
export async function selectAiTransport(
    bloxPeerId: string,
    appPeerId: string,
    opts: SelectorOptions = {},
): Promise<AiTransportChoice> {
    const probeTimeoutMs = opts.probeTimeoutMs ?? LAN_HTTP_PROBE_TIMEOUT_MS;
    const mdnsMaxAgeMs = opts.mdnsMaxAgeMs ?? MDNS_FRESHNESS_MAX_AGE_MS;
    const scanIfEmpty = opts.scanIfEmpty ?? true;

    if (!bloxPeerId || !appPeerId) {
        return { kind: 'ble', reason: 'missing bloxPeerId or appPeerId — cannot qualify LAN HTTP' };
    }

    // 1) Try the cache first (fast path; recent scan or external noteRecord).
    let hit = mdnsCache.findAuthorizedBlox(bloxPeerId, appPeerId, mdnsMaxAgeMs);

    // 2) If empty and caller permits, run a one-shot scan.
    if (!hit && scanIfEmpty) {
        await mdnsCache.refreshOnce();
        hit = mdnsCache.findAuthorizedBlox(bloxPeerId, appPeerId, mdnsMaxAgeMs);
    }

    if (!hit) {
        return { kind: 'ble', reason: 'no fresh mDNS record matching bloxPeerId+appPeerId' };
    }

    const ip = hit.service.txt?.ipAddress ?? hit.service.host ?? '';
    if (!ipIsPrivateLan(ip)) {
        return { kind: 'ble', reason: `IP "${ip}" is not RFC1918/link-local; refusing LAN HTTP` };
    }

    // mDNS records may carry a `port` field — that's typically the kubo
    // gateway (8080), NOT the AI port. We default to 8083; per-device
    // overrides go through a future mDNS TXT field (`bloxAiPort`) which
    // isn't published yet (documented in Plan HTTP v2.1 README).
    const port = readBloxAiPortFromTxt(hit.service.txt) ?? DEFAULT_BLOX_AI_PORT;
    const client = new HttpAiClient(ip, port);

    // 3) 1 s health probe gates LAN HTTP. A timeout here doesn't mean
    // the device is unreachable forever — selector just won't prefer
    // LAN HTTP for THIS attempt.
    const probe = await client.health(probeTimeoutMs);
    if (probe.ok) {
        return {
            kind: 'lan-http',
            httpClient: client,
            reason: `mDNS verified, /health 200 in ${probe.latencyMs}ms`,
        };
    }
    return {
        kind: 'ble',
        reason: `LAN HTTP /health probe failed (latency=${probe.latencyMs}ms)`,
    };
}

/**
 * If the mDNS broadcaster ever publishes a custom AI port, expose it as
 * a TXT field. Until then this always returns undefined and we default
 * to DEFAULT_BLOX_AI_PORT.
 */
function readBloxAiPortFromTxt(txt: Record<string, unknown> | undefined): number | undefined {
    if (!txt) return undefined;
    const raw = (txt as any).bloxAiPort ?? (txt as any).ai_port;
    if (raw === undefined || raw === null) return undefined;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 65535) return undefined;
    return n;
}
