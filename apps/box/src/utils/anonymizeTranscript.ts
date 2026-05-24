/**
 * anonymizeTranscript — Phase 21 on-device anonymizer.
 *
 * Converts a raw Blox AI troubleshooting session (the captured SSE event
 * stream + the user's rating/comment) into the shape accepted by the
 * Phase 20 intake server at https://ai-training.fx.land/transcripts.
 *
 * This is the PRIMARY privacy defense. The server runs a defense-in-depth
 * scanner (anonymization_check.py) that rejects payloads where this
 * anonymizer missed something; both must agree on what counts as PII.
 *
 * Strips (replaced with sentinel placeholders so the model can still
 * learn from structural patterns):
 *   - IPv4 + IPv6 literals       → <IP>
 *   - libp2p peerIds (12D3KooW…) → <PEERID>
 *   - IPFS legacy CIDs (Qm…)     → <CID>
 *   - macOS/Linux home paths     → /home/<USER>/  or  /Users/<USER>/
 *   - WiFi SSIDs (any field
 *     named or pattern-matched
 *     as such)                   → <SSID>
 *   - BSSIDs (MAC addresses)     → <BSSID>
 *   - Wall-clock timestamps      → +Ns relative offset from session start
 *
 * The output MUST satisfy the Phase 20 anonymized_transcript.schema.json
 * v1 contract — closed schema, specific tripwires (session_relative_start
 * MUST equal "+0s"), explicit consent flags. The caller is responsible
 * for explicit_opt_in + preview_shown gating; this module just produces
 * a valid payload assuming consent has been obtained.
 *
 * The anonymizer is INTENTIONALLY conservative. False positives (matching
 * a clean string that happened to look like an IP) are preferred over
 * false negatives (failing to strip a real IP). This is a security
 * trade-off, not an accuracy goal.
 */

// Anonymizer semver. Bump on any change to the patterns or replacement
// behaviour. The intake server logs this version with every accepted
// transcript so a wave of bad rejections can be traced to a specific
// build.
export const ANONYMIZER_VERSION = '0.1.0';

// Sentinel tokens — match the Phase 20 server's expectation (the SSID hint
// scanner specifically allows '<SSID>' as the non-leaking value).
const SENTINELS = {
    ip: '<IP>',
    peerid: '<PEERID>',
    cid: '<CID>',
    user: '<USER>',
    ssid: '<SSID>',
    bssid: '<BSSID>',
    ts: '<TS>',
} as const;

// ---------------------------------------------------------------------------
// PII patterns
// ---------------------------------------------------------------------------

// IPv4: four dot-separated octets, each 0-255. The bounds keep us from
// false-matching version strings like "1.2.3.4-beta" (max 255 octet keeps
// it tight enough). Worth catching some marginal false positives — the
// alternative is a leaked IP.
const IPV4_RE =
    /\b(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}\b/g;

// IPv6: handle full + compressed (`::`) forms. The middle group's
// `[A-Fa-f0-9]{0,4}` allows zero-width matches for the `::` compression.
// Loose by design; better to false-positive than to leak.
const IPV6_RE = /\b[A-Fa-f0-9]{1,4}(?::[A-Fa-f0-9]{0,4}){2,}\b/g;

// libp2p peerIds (Ed25519, post-2020). Base58 alphabet, ~52 chars total.
const PEERID_LIBP2P_RE = /\b12D3KooW[A-HJ-NP-Za-km-z1-9]{40,}\b/g;

// IPFS legacy CIDs and pre-2020 peerIds (base58 multihash). Qm + 44 chars.
const PEERID_LEGACY_RE = /\bQm[A-HJ-NP-Za-km-z1-9]{40,46}\b/g;

// /home/<user>/ and /Users/<user>/ paths. Replacement keeps the structural
// "is a home dir" signal while removing the username.
const HOMEDIR_RE = /\/(home|Users)\/([A-Za-z0-9_.-]{1,32})(?=\/|\b)/g;

// BSSIDs (MAC addresses). Either colon- or dash-separated 6 hex pairs.
const BSSID_RE = /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g;

// Wall-clock ISO-8601 timestamps. Year-2000-or-later, optional fractional
// seconds, mandatory Z or numeric offset.
const ISO_TS_RE =
    /\b20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):?[0-5]\d)\b/g;

// SSID-like field hints in serialised text. Replaces the entire value
// (best-effort; pattern-matching SSIDs is not soluble in general, so we
// rely on the field naming convention here).
const SSID_HINT_RE = /(ssid["']?\s*[:=]\s*["']?)([^"',\s}]{1,32})/gi;

// Keys whose VALUE in object form is always considered an SSID/BSSID/path.
// Strict allowlist; we explicitly enumerate to avoid surprises.
const SSID_KEYS = new Set(['wifi_ssid', 'ssid', 'currentSSID', 'wifiSSID']);
const BSSID_KEYS = new Set(['wifi_bssid', 'bssid', 'currentBSSID', 'wifiBSSID']);

// ---------------------------------------------------------------------------
// String-level anonymization
// ---------------------------------------------------------------------------

/**
 * Apply all regex substitutions to a single string. Pure; idempotent —
 * running twice produces the same output (sentinels don't match any
 * pattern).
 *
 * Order matters: BSSID before IPv6 because some MAC formats look like
 * partial IPv6 groups. Homedir before IPV4 in case a path contains an IP.
 */
export function anonymizeString(s: string): string {
    if (typeof s !== 'string' || s.length === 0) return s;
    let out = s;
    // ISO timestamps first — converting them to relative is the caller's
    // job (needs session_start_ts), but at the string-walk level we
    // sanitize any that slipped through to a sentinel-ish "<TS>" so the
    // server's wallclock_ts scanner doesn't fire. Caller will overwrite
    // properly in the event-walk path.
    out = out.replace(ISO_TS_RE, SENTINELS.ts);
    out = out.replace(BSSID_RE, SENTINELS.bssid);
    out = out.replace(HOMEDIR_RE, (_full, kind) => `/${kind}/${SENTINELS.user}`);
    out = out.replace(PEERID_LIBP2P_RE, SENTINELS.peerid);
    out = out.replace(PEERID_LEGACY_RE, SENTINELS.cid);
    out = out.replace(IPV4_RE, SENTINELS.ip);
    out = out.replace(IPV6_RE, SENTINELS.ip);
    out = out.replace(SSID_HINT_RE, (_m, prefix) => `${prefix}${SENTINELS.ssid}`);
    return out;
}

// ---------------------------------------------------------------------------
// Recursive walker
// ---------------------------------------------------------------------------

/**
 * Walk arbitrary JSON-shaped data, replacing strings + keyed SSID/BSSID
 * values with sanitized equivalents. Returns a NEW object — input is not
 * mutated.
 */
export function anonymizeValue(value: unknown, parentKey?: string): unknown {
    if (typeof value === 'string') {
        if (parentKey && SSID_KEYS.has(parentKey)) return SENTINELS.ssid;
        if (parentKey && BSSID_KEYS.has(parentKey)) return SENTINELS.bssid;
        return anonymizeString(value);
    }
    if (Array.isArray(value)) {
        return value.map((v) => anonymizeValue(v, undefined));
    }
    if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            out[k] = anonymizeValue(v, k);
        }
        return out;
    }
    // number / boolean / null pass through.
    return value;
}

// ---------------------------------------------------------------------------
// Timestamp → relative offset
// ---------------------------------------------------------------------------

/**
 * Convert an ISO-8601 timestamp to a "+Ns" offset from session start.
 * Returns "+0s" when ts === sessionStart or when input can't be parsed
 * (defensive — the upload server's tripwire requires session_relative_start
 * to be exactly "+0s", so we never let an unparsed timestamp leak through).
 */
export function toRelativeTs(ts: string, sessionStartIsoMs: number): string {
    const parsed = Date.parse(ts);
    if (!Number.isFinite(parsed)) return '+0s';
    const deltaMs = parsed - sessionStartIsoMs;
    if (deltaMs <= 0) return '+0s';
    const sec = Math.round(deltaMs / 1000);
    return `+${sec}s`;
}

// ---------------------------------------------------------------------------
// Top-level transcript shape (matches the Phase 20 server schema)
// ---------------------------------------------------------------------------

export type FeedbackRating = -1 | 0 | 1;

export interface RawTranscriptEvent {
    type: string;
    /** ISO-8601 wall-clock from when the event was captured locally. */
    ts: string;
    payload?: unknown;
    [k: string]: unknown;
}

export interface AnonymizedEvent {
    type: string;
    relative_ts: string;
    payload?: unknown;
}

export interface AnonymizeArgs {
    /** Client-supplied UUID v4 (lowercase). Used as idempotency key. */
    uploadId: string;
    /** ISO-8601 ts for when the session started (event 0). */
    sessionStartTs: string;
    /** Captured SSE events for the session. */
    events: RawTranscriptEvent[];
    rating: FeedbackRating;
    comment?: string;
}

export interface AnonymizedTranscript {
    schema_version: 1;
    upload_id: string;
    session_relative_start: '+0s';
    events: AnonymizedEvent[];
    user_rating: FeedbackRating;
    user_comment?: string;
    consent: {
        explicit_opt_in: true;
        preview_shown: true;
        anonymizer_version: string;
    };
    device_class: 'rk3588';
}

export class AnonymizerError extends Error {}

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const KNOWN_EVENT_TYPES = new Set([
    'session_started',
    'thought',
    'tool_call',
    'tool_result',
    'verdict',
    'recommended_action',
    'execution_result',
    'user_question',
    'user_reply_received',
    'error',
]);

/**
 * Top-level entry. Produces a shape ready to POST to
 * `https://ai-training.fx.land/transcripts`. Throws on structural errors
 * (caller bug — should never happen at runtime).
 */
export function anonymizeTranscript(args: AnonymizeArgs): AnonymizedTranscript {
    if (!UUID_RE.test(args.uploadId)) {
        throw new AnonymizerError('uploadId must be a lowercase UUID v4');
    }
    if (!Array.isArray(args.events) || args.events.length === 0) {
        throw new AnonymizerError('events must be a non-empty array');
    }
    if (args.events.length > 200) {
        throw new AnonymizerError('events exceeds upper bound (200)');
    }
    if (args.rating !== -1 && args.rating !== 0 && args.rating !== 1) {
        throw new AnonymizerError('rating must be -1 | 0 | 1');
    }
    const startMs = Date.parse(args.sessionStartTs);
    if (!Number.isFinite(startMs)) {
        throw new AnonymizerError('sessionStartTs must be a parseable ISO timestamp');
    }
    const out: AnonymizedTranscript = {
        schema_version: 1,
        upload_id: args.uploadId,
        session_relative_start: '+0s',
        events: args.events.map((ev) => _anonymizeEvent(ev, startMs)),
        user_rating: args.rating,
        consent: {
            explicit_opt_in: true,
            preview_shown: true,
            anonymizer_version: ANONYMIZER_VERSION,
        },
        device_class: 'rk3588',
    };
    if (typeof args.comment === 'string') {
        const sanitized = anonymizeString(
            args.comment.replace(/[\r\n]+/g, ' ').trim(),
        ).slice(0, 2000);
        if (sanitized.length > 0) {
            out.user_comment = sanitized;
        }
    }
    return out;
}

function _anonymizeEvent(
    ev: RawTranscriptEvent,
    sessionStartMs: number,
): AnonymizedEvent {
    const type = String(ev.type);
    if (!KNOWN_EVENT_TYPES.has(type)) {
        // Don't ship unknown event types upstream — could be an
        // attacker-injected variant designed to bypass our payload scan.
        throw new AnonymizerError(`unknown event type: ${type}`);
    }
    const relTs = toRelativeTs(String(ev.ts ?? ''), sessionStartMs);
    const out: AnonymizedEvent = {
        type,
        relative_ts: relTs,
    };
    if ('payload' in ev) {
        out.payload = anonymizeValue(ev.payload, undefined);
    }
    return out;
}
