/**
 * Diagnostics "Send to Support" upload — the user-initiated support-ticket
 * channel for the Blox AI Raw Diagnostics card.
 *
 * DELIBERATELY DISTINCT from utils/uploadTranscriptUrl.ts (the Phase 21
 * anonymized-transcript upload). That channel STRIPS identifiers before
 * sending; this one intentionally CARRIES them — blox kubo/cluster peer
 * ids, the app's own peer id, and the phone-side connectivity probe
 * results — because the entire point of a support bundle is to let the
 * developer correlate the exact device and its environment. The user sees
 * the full payload rendered in the card before tapping Send (WYSIWYG; no
 * hidden fields), so the identifier-sharing is explicit and per-tap.
 *
 * Server: POST https://ai-training.fx.land/diagnostics — the SAME intake
 * server as /transcripts (reuses its per-IP rate limiter, UUID-keyed
 * storage tree, and admin inbox under source='diagnostics'; see
 * fula-ai-training/server/app.py::post_diagnostics). HTTPS-only by
 * construction. The server requires `kind === "diagnostics"` and a strict
 * lowercase-canonical UUID `upload_id` (else a clean 400), so `uuidv4`
 * below emits exactly that form.
 */
import 'react-native-get-random-values';

import type { DiagBundle } from './httpAiClient';

export const DIAGNOSTICS_UPLOAD_URL = 'https://ai-training.fx.land/diagnostics';

// One-shot upload; matches the server's 256KB cap headroom. Not resumable
// and never auto-retried — same fail-loud posture as the transcript upload.
export const DIAGNOSTICS_POST_TIMEOUT_MS = 30_000;

export type ProbeStatusLike = 'checking' | 'ok' | 'failed';

export interface DiagnosticsRelayInfo {
    dns_name: string;
    status: string;
}

export interface DiagnosticsPhoneInfo {
    /** kubo peer id of the current blox, as the phone knows it. */
    blox_kubo_peer_id: string;
    /** ipfs-cluster (pool) peer id; null when unknown or a stale-migration
     *  default (clusterPeerId === kubo peerId). */
    blox_cluster_peer_id: string | null;
    /** this phone's own libp2p peer id (established at pairing). */
    app_peer_id: string;
    /** phone-side connectivity probe results lifted from the Diagnostics
     *  screen — the same checks the three transports rely on. */
    phone_internet: ProbeStatusLike;
    discovery_service: ProbeStatusLike;
    relays: DiagnosticsRelayInfo[] | null;
    /** which transport actually delivered the blox bundle. */
    transport_used: string; // 'lan-http' | 'ble' | 'none'
    app_platform: string; // 'android' | 'ios' | ...
}

export interface DiagnosticsBloxInfo {
    generated_at?: string;
    /** keyed by short tool name (e.g. "internet"); value is that tool's
     *  result dict, or `{error}` if it timed out / raised server-side. */
    tools?: Record<string, unknown>;
    /** populated INSTEAD of tools when the blox bundle couldn't be fetched
     *  at all (no transport, or the fetch failed). Phone info is still
     *  worth sending in that case — "device unreachable" is a finding. */
    error?: string;
}

export interface DiagnosticsPayload {
    kind: 'diagnostics';
    upload_id: string;
    generated_at: string;
    phone: DiagnosticsPhoneInfo;
    blox: DiagnosticsBloxInfo | null;
}

export interface PostDiagnosticsResult {
    ok: boolean;
    status?: number;
    error?: string;
}

// Precomputed byte→hex table so uuidv4 is a few array lookups, not 16
// toString(16) calls with manual zero-padding.
const BYTE_TO_HEX: string[] = [];
for (let i = 0; i < 256; i++) {
    BYTE_TO_HEX.push((i + 0x100).toString(16).slice(1));
}

function fillRandom(bytes: Uint8Array): void {
    // RN: react-native-get-random-values (imported above) polyfills
    // globalThis.crypto.getRandomValues. Node/jsdom test envs may lack it,
    // so fall back to Math.random — the upload_id is an idempotency key,
    // not a secret, so entropy quality is not security-relevant here.
    const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
    if (c && typeof c.getRandomValues === 'function') {
        c.getRandomValues(bytes);
        return;
    }
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
    }
}

/**
 * RFC4122 v4 UUID in lowercase canonical 8-4-4-4-12 form. The intake
 * server validates `str(uuid.UUID(s)) == s`, which is true only for the
 * lowercase canonical representation — so the hex MUST be lowercase and
 * correctly hyphenated.
 */
export function uuidv4(): string {
    const b = new Uint8Array(16);
    fillRandom(b);
    // RFC4122 §4.4 — set version (4) and variant (10xx) bits.
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    return (
        BYTE_TO_HEX[b[0]] + BYTE_TO_HEX[b[1]] + BYTE_TO_HEX[b[2]] + BYTE_TO_HEX[b[3]] + '-' +
        BYTE_TO_HEX[b[4]] + BYTE_TO_HEX[b[5]] + '-' +
        BYTE_TO_HEX[b[6]] + BYTE_TO_HEX[b[7]] + '-' +
        BYTE_TO_HEX[b[8]] + BYTE_TO_HEX[b[9]] + '-' +
        BYTE_TO_HEX[b[10]] + BYTE_TO_HEX[b[11]] + BYTE_TO_HEX[b[12]] +
        BYTE_TO_HEX[b[13]] + BYTE_TO_HEX[b[14]] + BYTE_TO_HEX[b[15]]
    );
}

export interface BuildDiagnosticsArgs {
    bloxKuboPeerId: string;
    bloxClusterPeerId: string | null;
    appPeerId: string;
    phoneInternet: ProbeStatusLike;
    discoveryStatus: ProbeStatusLike;
    relays: DiagnosticsRelayInfo[] | null;
    transportUsed: string;
    appPlatform: string;
    bundle: DiagBundle | null;
    bundleError?: string | null;
}

/**
 * Assemble the exact object that gets both RENDERED in the card and POSTed
 * to the server — single source of truth so the preview can't drift from
 * what's sent. A fresh upload_id + generated_at are minted per call.
 */
export function buildDiagnosticsPayload(args: BuildDiagnosticsArgs): DiagnosticsPayload {
    let blox: DiagnosticsBloxInfo | null;
    if (args.bundle) {
        blox = { generated_at: args.bundle.generated_at, tools: args.bundle.tools };
    } else if (args.bundleError) {
        blox = { error: args.bundleError };
    } else {
        blox = null;
    }
    return {
        kind: 'diagnostics',
        upload_id: uuidv4(),
        generated_at: new Date().toISOString(),
        phone: {
            blox_kubo_peer_id: args.bloxKuboPeerId,
            blox_cluster_peer_id: args.bloxClusterPeerId,
            app_peer_id: args.appPeerId,
            phone_internet: args.phoneInternet,
            discovery_service: args.discoveryStatus,
            relays: args.relays,
            transport_used: args.transportUsed,
            app_platform: args.appPlatform,
        },
        blox,
    };
}

/**
 * One-shot POST of an already-built diagnostics payload. Returns a flat
 * result the card can branch on; never throws. No retry — a failed send
 * surfaces a message and the user can tap again.
 */
export async function postDiagnostics(
    payload: DiagnosticsPayload,
    timeoutMs: number = DIAGNOSTICS_POST_TIMEOUT_MS,
): Promise<PostDiagnosticsResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const resp = await fetch(DIAGNOSTICS_UPLOAD_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        if (resp.ok) {
            return { ok: true, status: resp.status };
        }
        // Don't surface the server body — keep it to the status code, same
        // sanitization stance as UploadTranscriptModal.
        return { ok: false, status: resp.status, error: `HTTP ${resp.status}` };
    } catch (e) {
        const name = (e as { name?: string } | undefined)?.name;
        return { ok: false, error: name === 'AbortError' ? 'timeout' : 'network error' };
    } finally {
        clearTimeout(timer);
    }
}
