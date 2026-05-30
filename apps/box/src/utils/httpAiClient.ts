/**
 * httpAiClient — LAN HTTP transport for the Blox AI plugin's HTTP API.
 *
 * Mirrors the SSE event vocabulary already used over BLE (see
 * `bloxAiEvents.ts`). Uses `react-native-sse` for the `/troubleshoot`
 * streaming endpoint and plain `fetch` for one-shot POSTs.
 *
 * Plan HTTP (v2.1) — H1 deliverable. Server side is unchanged; this is
 * pure client work that talks to the existing port-8083 surface that
 * blox-ai has been exposing since Phase 7.
 *
 * Design choices folded in from advisor passes:
 *  - SSE via `react-native-sse` (codex: don't roll your own; RN streaming
 *    is too fragile across iOS/Android versions). POST + body support
 *    is in v1.2+.
 *  - 4xx errors do NOT fall back to BLE (deterministic; BLE would hit
 *    the same). Codex catch.
 *  - 429 surfaces a distinct "busy" error so the caller shows
 *    "device busy, please wait" instead of retrying BLE (gemini catch).
 *  - 5xx + network errors return `{transient: true}` so the selector
 *    can retry on BLE.
 *  - Session continuity: `runAi(prompt, sessionId?)` accepts an existing
 *    session_id so the BLE fallback can resume the same session in the
 *    container's 30-min TTL window (gemini catch).
 *  - Reachability cache: `health()` result memoized for 10 s so we
 *    don't re-probe per call within the same UI flow.
 */

import EventSource from 'react-native-sse';
import type {
    BloxAiEvent,
    RecommendedActionEvent,
    UserQuestionEvent,
    ExecutionResultEvent,
} from './bloxAiEvents';
import { parseBloxAiEvent } from './bloxAiEvents';

// Constants exported for tests + the selector module.
export const DEFAULT_BLOX_AI_PORT = 8083;
export const HEALTH_TIMEOUT_MS = 1000;
export const HEALTH_CACHE_TTL_MS = 10_000;
export const REQUEST_TIMEOUT_MS = 30_000;
// diag/bundle runs every read tool under a 25s server-side wall-clock
// budget (it returns partial {error} entries rather than hanging), so the
// client timeout is just a backstop with headroom over that budget.
export const DIAG_BUNDLE_TIMEOUT_MS = 35_000;
// support/wireguard now orchestrates a full lifecycle server-side: status
// pre-check → (install.sh on demand) → reset-failed → restart → status
// post-check. The common already-installed path is bounded by the restart's
// 60s server timeout (~90s incl. the two status checks); the rare cold-install
// path can run apt and take longer, but the server is authoritative — if this
// client times out mid-install, install finishes server-side and the
// idempotent retry completes fast. 120s is a backstop over the common path.
export const SUPPORT_TIMEOUT_MS = 120_000;

// Client-side fallback for POST /diag/bundle. A blox-ai image that predates the
// server's bundle aggregator still serves the individual GET /diag/{tool}
// routes, so when the POST comes back 405/404 we rebuild the snapshot from
// those. List mirrors the server's ToolName enum minus "summary" (which the
// server bundle also omits — it re-runs a subset of these).
export const DIAG_FALLBACK_TOOLS = [
    'internet', 'relay', 'time', 'power', 'storage', 'containers',
    'wireguard', 'heartbeat', 'events', 'readiness',
    'discovery_state', 'systemd_services', 'network_interface',
    'uniondrive', 'identity_health',
    'kubo_health', 'fula_go_health', 'image_versions', 'ble_state', 'plugins',
] as const;
// Matches the server's per-tool budget (diag/relay ~15s is the slow one).
const DIAG_FALLBACK_PER_TOOL_TIMEOUT_MS = 18_000;
// Cap in-flight GETs: each diag tool shells out (docker/wg/subprocess), so
// firing all ~20 at once could spike load on an already-busy edge device.
const DIAG_FALLBACK_CONCURRENCY = 5;

export type AiTransportName = 'lan-http' | 'ble';

export interface HealthResult {
    ok: boolean;
    latencyMs: number;
    /** True when result came from the in-memory TTL cache, not a fresh probe. */
    cached?: boolean;
}

export type AiClientErrorKind =
    | 'http-busy'              // 429 — device is mid-session; do NOT fall back to BLE
    | 'http-bad-request'       // 4xx (non-429) — deterministic; do NOT fall back
    | 'http-not-found'         // 404 on session/action lookups — do NOT fall back
    | 'http-server'            // 5xx — transient; try BLE
    | 'network'                // TCP/DNS/timeout — transient; try BLE
    | 'no-transport'           // neither LAN HTTP nor BLE reachable at session-start time
    | 'sse-malformed'          // SSE stream emitted garbage we can't parse
    | 'sse-aborted'            // client cancelled or aborted mid-stream
    | 'unknown';

export interface AiClientError {
    kind: AiClientErrorKind;
    message: string;
    transient: boolean;
    httpStatus?: number;
}

export interface AiCallbacks {
    onEvent: (event: BloxAiEvent) => void;
    /**
     * Optional — fires per event with the SSE `id:` field (per-session
     * monotonic seq number) so the caller can persist it for resume.
     * Synthetic events (e.g. the truncation marker injected by the
     * server on resume) carry seq=null because they're not part of
     * the canonical buffer — the caller should NOT use null seqs as
     * a resume offset (they'd advance lastEventSeq past real events).
     */
    onSeq?: (seq: number | null) => void;
    onComplete?: () => void;
    onError?: (err: AiClientError) => void;
}

export interface SessionHandle {
    sessionId: string;
    cancel: () => void;
}

export interface ExecuteResult {
    ok: boolean;
    payload?: ExecutionResultEvent;
    error?: AiClientError;
}

/** Snapshot returned by POST /diag/bundle — one entry per read-only tool. */
export interface DiagBundle {
    generated_at: string;
    /** Keyed by short tool name (e.g. "internet"); value is that tool's
     * result dict, or `{error: ...}` if it timed out / raised. */
    tools: Record<string, unknown>;
}

export interface DiagBundleResult {
    ok: boolean;
    payload?: DiagBundle;
    error?: AiClientError;
}

/** Parsed output of the host's wireguard/status.sh, surfaced by
 * /support/wireguard so the app can show verified tunnel state. Every field
 * is optional — older server builds omit `status` entirely, and status.sh may
 * be unavailable on a given device. `active` is the ground truth for "is the
 * tunnel up" (it comes from `ip link show support`, not the lying
 * `systemctl is-active` on this RemainAfterExit=yes oneshot unit). */
export interface WireguardStatus {
    installed?: boolean;
    registered?: boolean;
    active?: boolean;
    endpoint?: string;
    assigned_ip?: string;
    peer_id_registered?: boolean;
    last_handshake_age_sec?: number;
    rx_bytes?: number;
    tx_bytes?: number;
    persistent_keepalive_sec?: number;
}

/** Body shape of POST /support/wireguard (success, a lifecycle failure, or the
 * gate-rejection 403s which carry a specific `error` code). */
export interface RemoteSupportPayload {
    success?: boolean;
    exit_code?: number;
    stdout_excerpt?: string;
    stderr_excerpt?: string;
    /** Gate rejection (403): "security_code_invalid" | "support_header_required"
     * | "security_code_file_missing".
     * Lifecycle failure (500): "wireguard_not_installed" (the device wasn't set
     * up and install.sh failed) | "tunnel_inactive_after_restart" (the restart
     * ran but status.sh still reports no `support` interface — verified down). */
    error?: string;
    /** Verified post-restart state from status.sh — the ground truth for "did
     * the tunnel come up". `null`/absent when status.sh was unavailable or the
     * server build predates this field. */
    status?: WireguardStatus | null;
    /** True when the device wasn't installed and install.sh was run on demand
     * as part of servicing this request. */
    installed_on_demand?: boolean;
}

export interface RemoteSupportResult {
    ok: boolean;
    payload?: RemoteSupportPayload;
    error?: AiClientError;
}

// Local helpers --------------------------------------------------------------

function isAbortError(e: unknown): boolean {
    if (!e || typeof e !== 'object') return false;
    const name = (e as { name?: unknown }).name;
    return name === 'AbortError';
}

function networkError(message: string): AiClientError {
    return { kind: 'network', message, transient: true };
}

function fromHttpStatus(status: number, body: string): AiClientError {
    if (status === 429) {
        return { kind: 'http-busy', message: body || 'device busy', transient: false, httpStatus: status };
    }
    if (status === 404) {
        return { kind: 'http-not-found', message: body || 'not found', transient: false, httpStatus: status };
    }
    if (status >= 400 && status < 500) {
        return { kind: 'http-bad-request', message: body || `HTTP ${status}`, transient: false, httpStatus: status };
    }
    return { kind: 'http-server', message: body || `HTTP ${status}`, transient: true, httpStatus: status };
}

async function fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number,
): Promise<Response> {
    const controller = new AbortController();
    // Caller may have provided their own signal — combine.
    const callerSignal = init.signal;
    if (callerSignal) {
        if (callerSignal.aborted) {
            controller.abort();
        } else {
            callerSignal.addEventListener('abort', () => controller.abort());
        }
    }
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Map `fn` over `items` with at most `limit` calls in flight, returning results
 * in input order. A fixed pool of workers drains a shared cursor — no external
 * dependency. (`cursor++` is safe: each worker grabs its index synchronously
 * before awaiting, and JS is single-threaded.)
 */
async function mapWithConcurrency<T, R>(
    items: readonly T[],
    limit: number,
    fn: (item: T) => Promise<R>,
): Promise<R[]> {
    const results = new Array<R>(items.length);
    let cursor = 0;
    const worker = async (): Promise<void> => {
        while (cursor < items.length) {
            const i = cursor++;
            results[i] = await fn(items[i]);
        }
    };
    const size = Math.max(1, Math.min(limit, items.length));
    await Promise.all(Array.from({ length: size }, () => worker()));
    return results;
}

// Public client --------------------------------------------------------------

export class HttpAiClient {
    public readonly baseUrl: string;
    public readonly lanIp: string;
    public readonly port: number;

    // Health probe result memoization. Single entry — same client instance
    // is bound to a single (lanIp, port) so no key needed.
    private healthCache: { result: HealthResult; cachedAt: number } | null = null;

    constructor(lanIp: string, port: number = DEFAULT_BLOX_AI_PORT) {
        if (!lanIp) {
            throw new Error('HttpAiClient: lanIp is required');
        }
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new Error(`HttpAiClient: invalid port ${port}`);
        }
        this.lanIp = lanIp;
        this.port = port;
        this.baseUrl = `http://${lanIp}:${port}`;
    }

    /**
     * Cheap reachability probe. Result memoized for HEALTH_CACHE_TTL_MS to
     * avoid re-probing per call within the same UI flow.
     */
    public async health(timeoutMs: number = HEALTH_TIMEOUT_MS): Promise<HealthResult> {
        if (this.healthCache) {
            const age = Date.now() - this.healthCache.cachedAt;
            if (age < HEALTH_CACHE_TTL_MS) {
                return { ...this.healthCache.result, cached: true };
            }
        }

        const start = Date.now();
        try {
            const res = await fetchWithTimeout(
                `${this.baseUrl}/health`,
                { method: 'GET' },
                timeoutMs,
            );
            const latencyMs = Date.now() - start;
            // Read body so the connection closes cleanly.
            const body = await res.text().catch(() => '');
            const ok = res.status === 200 && /"ok"\s*:\s*true/.test(body);
            const result: HealthResult = { ok, latencyMs };
            this.healthCache = { result, cachedAt: Date.now() };
            return result;
        } catch (e) {
            const latencyMs = Date.now() - start;
            const result: HealthResult = { ok: false, latencyMs };
            this.healthCache = { result, cachedAt: Date.now() };
            return result;
        }
    }

    /**
     * Invalidate the health cache. Selector calls this on network change
     * so the next probe is fresh.
     */
    public invalidateHealthCache(): void {
        this.healthCache = null;
    }

    /**
     * Start an AI session via POST /troubleshoot (SSE response stream).
     *
     * `sessionId` may be passed to resume an existing session — the
     * container's SessionManager honors it within the 30-min TTL.
     */
    public runAi(
        prompt: string,
        sessionId: string | undefined,
        cb: AiCallbacks,
    ): SessionHandle {
        const seedSession = sessionId ?? '';
        const url = `${this.baseUrl}/troubleshoot`;
        const body = JSON.stringify({
            prompt,
            ...(seedSession ? { session_id: seedSession } : {}),
        });

        let resolvedSessionId = seedSession;
        let closed = false;
        // react-native-sse v1.x typing is loose; cast at the boundary.
        const es: any = new (EventSource as any)(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'text/event-stream',
            },
            body,
            // Don't auto-reconnect; we want explicit control over reconnect
            // semantics (caller may be switching transports).
            pollingInterval: 0,
        });

        const safeError = (err: AiClientError) => {
            if (closed) return;
            try { cb.onError?.(err); } catch (e) { /* swallow */ }
        };
        const safeComplete = () => {
            if (closed) return;
            try { cb.onComplete?.(); } catch (e) { /* swallow */ }
        };

        es.addEventListener('open', (_e: unknown) => {
            // Stream opened — nothing to do until first event arrives.
        });

        es.addEventListener('message', (event: { data?: string; lastEventId?: string }) => {
            if (closed) return;
            const raw = event?.data;
            if (typeof raw !== 'string' || !raw.length) return;
            let frame: unknown;
            try {
                frame = JSON.parse(raw);
            } catch {
                safeError({
                    kind: 'sse-malformed',
                    message: 'SSE frame is not JSON',
                    transient: false,
                });
                return;
            }
            const parsed = parseBloxAiEvent(frame);
            if (parsed.type === 'session_started') {
                resolvedSessionId = parsed.session_id;
            }
            // Surface the SSE id field (per-session monotonic seq number,
            // added 2026-05-28 for resume support) so the caller can
            // persist lastEventSeq. Sentinel id "-1" marks the synthetic
            // truncation marker the server injects on resume — that's
            // NOT a real buffer position so we report null and the
            // caller leaves their stored seq untouched.
            const rawId = event?.lastEventId;
            if (cb.onSeq) {
                let seq: number | null = null;
                if (typeof rawId === 'string' && rawId !== '' && rawId !== '-1') {
                    const n = Number(rawId);
                    if (Number.isInteger(n) && n >= 0) {
                        seq = n;
                    }
                }
                try { cb.onSeq(seq); } catch (e) { /* swallow */ }
            }
            try { cb.onEvent(parsed); } catch (e) { /* swallow */ }
        });

        es.addEventListener('error', (event: any) => {
            if (closed) return;
            // react-native-sse v1.x exposes xhrStatus on error events when
            // the initial response wasn't 200. `event.status` isn't in v1.x
            // types; only xhrStatus is real (codex catch). Mid-stream TCP
            // drops surface as xhrStatus=0 (or sometimes a stale 200) — the
            // `>= 400` gate falls through to networkError which is correct.
            const status: number | undefined = event?.xhrStatus;
            // Order matters (codex Plan HTTP final-review BLOCK):
            //   1. safeError runs FIRST while closed===false so onError fires.
            //   2. Set closed=true.
            //   3. es.close() — react-native-sse dispatches 'close'
            //      synchronously; our close listener short-circuits on
            //      closed===true and DOES NOT call onComplete.
            // Earlier (v2.1) order was `safeError → es.close() → closed=true`,
            // which let the synchronous close listener see closed===false
            // and fire onComplete on the same tick as onError.
            if (typeof status === 'number' && status >= 400) {
                safeError(fromHttpStatus(status, event?.message ?? ''));
            } else if (isAbortError(event)) {
                safeError({ kind: 'sse-aborted', message: 'aborted', transient: true });
            } else {
                safeError(networkError(event?.message ?? 'SSE network error'));
            }
            closed = true;
            try { es.close(); } catch (e) { /* */ }
        });

        es.addEventListener('close', () => {
            if (closed) return;
            closed = true;
            safeComplete();
        });

        const cancel = () => {
            if (closed) return;
            closed = true;
            try { es.close(); } catch (e) { /* */ }
            // Best-effort server-side cancel (don't await; UI shouldn't block on it).
            if (resolvedSessionId) {
                this.cancel(resolvedSessionId).catch(() => undefined);
            }
        };

        return {
            // Return a getter that exposes the latest resolvedSessionId,
            // but the public type is just `string` for ergonomic destructuring.
            // Callers typically read `sessionId` AFTER `session_started`
            // arrives; the seed value is what they get before then.
            get sessionId() { return resolvedSessionId; },
            cancel,
        } as unknown as SessionHandle;
    }

    /**
     * Phase 1.c (Session 2 2026-05-28) — start a DETERMINISTIC TREE
     * session via POST /troubleshoot/tree (SSE response stream).
     *
     * Same callback shape + SessionHandle as runAi; same SSE event
     * vocabulary; same session/buffer/resume infrastructure on the
     * server. Difference: the events come from a YAML-authored tree
     * walker, not the LLM. Used by:
     *  - quick-start buttons (the user picked the scenario)
     *  - the classifier-returned scenario_id branch of startSession
     *
     * Server returns:
     *  - 200 + SSE stream → normal path
     *  - 404 → scenario_id not in registry (caller bug)
     *  - 503 → tree runner failed to load at container start
     */
    public runTree(
        scenarioId: string,
        sessionId: string | undefined,
        cb: AiCallbacks,
    ): SessionHandle {
        const seedSession = sessionId ?? '';
        const url = `${this.baseUrl}/troubleshoot/tree`;
        const body = JSON.stringify({
            scenario_id: scenarioId,
            ...(seedSession ? { session_id: seedSession } : {}),
        });

        let resolvedSessionId = seedSession;
        let closed = false;
        const es: any = new (EventSource as any)(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'text/event-stream',
            },
            body,
            pollingInterval: 0,
        });

        const safeError = (err: AiClientError) => {
            if (closed) return;
            try { cb.onError?.(err); } catch { /* swallow */ }
        };
        const safeComplete = () => {
            if (closed) return;
            try { cb.onComplete?.(); } catch { /* swallow */ }
        };

        es.addEventListener('open', (_e: unknown) => { /* awaiting events */ });

        es.addEventListener('message', (event: { data?: string; lastEventId?: string }) => {
            if (closed) return;
            const raw = event?.data;
            if (typeof raw !== 'string' || !raw.length) return;
            let frame: unknown;
            try {
                frame = JSON.parse(raw);
            } catch {
                safeError({
                    kind: 'sse-malformed',
                    message: 'SSE frame is not JSON',
                    transient: false,
                });
                return;
            }
            const parsed = parseBloxAiEvent(frame);
            if (parsed.type === 'session_started') {
                resolvedSessionId = parsed.session_id;
            }
            const rawId = event?.lastEventId;
            if (cb.onSeq) {
                let seq: number | null = null;
                if (typeof rawId === 'string' && rawId !== '' && rawId !== '-1') {
                    const n = Number(rawId);
                    if (Number.isInteger(n) && n >= 0) {
                        seq = n;
                    }
                }
                try { cb.onSeq(seq); } catch { /* swallow */ }
            }
            try { cb.onEvent(parsed); } catch { /* swallow */ }
        });

        es.addEventListener('error', (event: any) => {
            if (closed) return;
            const status: number | undefined = event?.xhrStatus;
            if (typeof status === 'number' && status >= 400) {
                safeError(fromHttpStatus(status, event?.message ?? ''));
            } else if (isAbortError(event)) {
                safeError({ kind: 'sse-aborted', message: 'aborted', transient: true });
            } else {
                safeError(networkError(event?.message ?? 'SSE network error'));
            }
            closed = true;
            try { es.close(); } catch { /* */ }
        });

        es.addEventListener('close', () => {
            if (closed) return;
            closed = true;
            safeComplete();
        });

        const cancel = () => {
            if (closed) return;
            closed = true;
            try { es.close(); } catch { /* */ }
            if (resolvedSessionId) {
                this.cancel(resolvedSessionId).catch(() => undefined);
            }
        };

        return {
            get sessionId() { return resolvedSessionId; },
            cancel,
        } as unknown as SessionHandle;
    }

    /**
     * Phase 1.d (Session 2 2026-05-28) — one-shot LLM classifier.
     * POST /troubleshoot/classify {prompt} → {scenario_id}.
     *
     * Returns the classification or 'other' on any error (server
     * returns 'other' itself for graceful degradation; we never throw
     * up to the caller). Used by useAiSession.startSession (free-text
     * path) to route to /troubleshoot/tree when the prompt maps to a
     * known scenario, falling back to /troubleshoot (LLM) for 'other'.
     */
    public async classify(prompt: string): Promise<string> {
        try {
            const res = await fetchWithTimeout(
                `${this.baseUrl}/troubleshoot/classify`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt }),
                },
                REQUEST_TIMEOUT_MS,
            );
            if (!res.ok) return 'other';
            const body = await res.json().catch(() => null) as { scenario_id?: string } | null;
            const sid = body?.scenario_id;
            if (typeof sid === 'string' && sid.length) {
                return sid;
            }
            return 'other';
        } catch {
            return 'other';
        }
    }

    /**
     * Submit a reply to a user_question event mid-session.
     */
    public async userReply(
        sessionId: string,
        questionId: string,
        replyText: string,
    ): Promise<void> {
        const res = await fetchWithTimeout(
            `${this.baseUrl}/troubleshoot/user-reply`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    question_id: questionId,
                    reply_text: replyText,
                }),
            },
            REQUEST_TIMEOUT_MS,
        );
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw fromHttpStatus(res.status, body);
        }
    }

    /**
     * Submit a phone-context snapshot mid-session. The container attaches
     * it to the session's prompt context.
     */
    public async phoneContext(
        sessionId: string,
        context: Record<string, unknown>,
    ): Promise<void> {
        const res = await fetchWithTimeout(
            `${this.baseUrl}/troubleshoot/phone-context`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, phone_context: context }),
            },
            REQUEST_TIMEOUT_MS,
        );
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw fromHttpStatus(res.status, body);
        }
    }

    /**
     * Execute a previously-issued recommended_action. The container
     * validates the HMAC token + nonce + tier-3 security code before
     * actually running the action.
     */
    public async executeAction(
        action: Pick<RecommendedActionEvent, 'action_id' | 'approval_token'>,
        securityCode?: string,
    ): Promise<ExecuteResult> {
        const body: Record<string, unknown> = {
            action_id: action.action_id,
            approval_token: action.approval_token,
        };
        if (securityCode) body.security_code = securityCode;

        try {
            const res = await fetchWithTimeout(
                `${this.baseUrl}/execute-action`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                },
                REQUEST_TIMEOUT_MS,
            );
            const raw = await res.text();
            if (!res.ok) {
                return { ok: false, error: fromHttpStatus(res.status, raw) };
            }
            let parsed: unknown;
            try {
                parsed = JSON.parse(raw);
            } catch {
                return {
                    ok: false,
                    error: { kind: 'sse-malformed', message: 'execute-action body is not JSON', transient: false },
                };
            }
            return { ok: true, payload: parsed as ExecutionResultEvent };
        } catch (e: any) {
            if (isAbortError(e)) {
                return { ok: false, error: networkError('execute-action aborted') };
            }
            return { ok: false, error: networkError(e?.message ?? 'execute-action failed') };
        }
    }

    /**
     * Reattach to an in-flight (or completed-but-buffered) session via
     * GET /troubleshoot/resume. The server replays buffered events with
     * seq > `fromSeq`, injects a synthetic `thought` truncation marker
     * if `fromSeq` predates the oldest buffered event, then awaits new
     * events until the generator marks itself done.
     *
     * Returns the same `SessionHandle` shape as `runAi` so callers
     * (useAiSession) can swap one for the other transparently.
     *
     * On 404 from the server (session evicted by TTL/LRU/container
     * restart): fires onError with kind 'http-not-found' so the caller
     * can synchronously clear its persisted state and surface the
     * Start-new-chat affordance.
     */
    public resume(
        sessionId: string,
        fromSeq: number,
        cb: AiCallbacks,
    ): SessionHandle {
        const safeFrom = Number.isInteger(fromSeq) && fromSeq >= 0 ? fromSeq : 0;
        const url =
            `${this.baseUrl}/troubleshoot/resume`
            + `?session_id=${encodeURIComponent(sessionId)}`
            + `&from=${safeFrom}`;

        let resolvedSessionId = sessionId;
        let closed = false;
        const es: any = new (EventSource as any)(url, {
            method: 'GET',
            headers: { Accept: 'text/event-stream' },
            pollingInterval: 0,
        });

        const safeError = (err: AiClientError) => {
            if (closed) return;
            try { cb.onError?.(err); } catch (e) { /* swallow */ }
        };
        const safeComplete = () => {
            if (closed) return;
            try { cb.onComplete?.(); } catch (e) { /* swallow */ }
        };

        es.addEventListener('open', (_e: unknown) => { /* awaiting events */ });

        es.addEventListener('message', (event: { data?: string; lastEventId?: string }) => {
            if (closed) return;
            const raw = event?.data;
            if (typeof raw !== 'string' || !raw.length) return;
            let frame: unknown;
            try {
                frame = JSON.parse(raw);
            } catch {
                safeError({
                    kind: 'sse-malformed',
                    message: 'SSE frame is not JSON',
                    transient: false,
                });
                return;
            }
            const parsed = parseBloxAiEvent(frame);
            if (parsed.type === 'session_started') {
                resolvedSessionId = parsed.session_id;
            }
            // Same id-handling as runAi: skip "-1" (truncation marker)
            // so the caller's persisted lastEventSeq stays anchored to
            // a real buffer position.
            const rawId = event?.lastEventId;
            if (cb.onSeq) {
                let seq: number | null = null;
                if (typeof rawId === 'string' && rawId !== '' && rawId !== '-1') {
                    const n = Number(rawId);
                    if (Number.isInteger(n) && n >= 0) {
                        seq = n;
                    }
                }
                try { cb.onSeq(seq); } catch (e) { /* swallow */ }
            }
            try { cb.onEvent(parsed); } catch (e) { /* swallow */ }
        });

        es.addEventListener('error', (event: any) => {
            if (closed) return;
            const status: number | undefined = event?.xhrStatus;
            if (typeof status === 'number' && status >= 400) {
                safeError(fromHttpStatus(status, event?.message ?? ''));
            } else if (isAbortError(event)) {
                safeError({ kind: 'sse-aborted', message: 'aborted', transient: true });
            } else {
                safeError(networkError(event?.message ?? 'SSE network error'));
            }
            closed = true;
            try { es.close(); } catch (e) { /* */ }
        });

        es.addEventListener('close', () => {
            if (closed) return;
            closed = true;
            safeComplete();
        });

        const cancel = () => {
            if (closed) return;
            closed = true;
            try { es.close(); } catch (e) { /* */ }
        };

        return {
            get sessionId() { return resolvedSessionId; },
            cancel,
        } as unknown as SessionHandle;
    }

    public async cancel(sessionId: string): Promise<void> {
        // Cancel is best-effort; we don't care about the response.
        try {
            await fetchWithTimeout(
                `${this.baseUrl}/cancel`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: sessionId }),
                },
                5_000,
            );
        } catch {
            // ignore
        }
    }

    /**
     * Fetch the full read-only diagnostics snapshot via POST /diag/bundle.
     *
     * POST (not GET) so the identical call works whether it reaches the
     * container directly over LAN HTTP or via the core BLE proxy (which
     * always POSTs json={}). The server runs every diag/* tool concurrently
     * under its own ~25s wall-clock budget and returns partial results
     * (per-tool `{error}` entries) rather than failing the whole snapshot,
     * so the client timeout here is a generous backstop, not the deadline.
     */
    public async fetchDiagBundle(): Promise<DiagBundleResult> {
        try {
            const res = await fetchWithTimeout(
                `${this.baseUrl}/diag/bundle`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{}',
                },
                DIAG_BUNDLE_TIMEOUT_MS,
            );
            const raw = await res.text();
            if (!res.ok) {
                // A blox-ai image predating the POST /diag/bundle aggregator
                // still serves the per-tool GET /diag/{tool} routes, so the POST
                // comes back 405 (method not allowed on the path) or 404 (no
                // such path). Rebuild the snapshot from the per-tool GETs so Raw
                // Diagnostics keeps working until the image is updated.
                if (res.status === 405 || res.status === 404) {
                    return this.fetchDiagBundleViaTools();
                }
                return { ok: false, error: fromHttpStatus(res.status, raw) };
            }
            let parsed: unknown;
            try {
                parsed = JSON.parse(raw);
            } catch {
                return {
                    ok: false,
                    error: { kind: 'sse-malformed', message: 'diag/bundle body is not JSON', transient: false },
                };
            }
            return { ok: true, payload: parsed as DiagBundle };
        } catch (e: any) {
            if (isAbortError(e)) {
                return { ok: false, error: networkError('diag/bundle aborted') };
            }
            return { ok: false, error: networkError(e?.message ?? 'diag/bundle failed') };
        }
    }

    /**
     * GET a single /diag/{tool}, returning its result dict. Any failure (4xx,
     * 5xx, timeout, network) collapses to an `{error}` marker so one missing or
     * slow tool doesn't sink the whole snapshot — the same partial-failure
     * semantics the server's own bundle uses.
     */
    private async fetchDiagTool(tool: string): Promise<unknown> {
        try {
            const res = await fetchWithTimeout(
                `${this.baseUrl}/diag/${tool}`,
                { method: 'GET' },
                DIAG_FALLBACK_PER_TOOL_TIMEOUT_MS,
            );
            const raw = await res.text();
            if (!res.ok) {
                return { error: `HTTP ${res.status}`, http_status: res.status };
            }
            try {
                return JSON.parse(raw);
            } catch {
                return { error: 'non-JSON response' };
            }
        } catch (e: any) {
            if (isAbortError(e)) return { error: 'timeout' };
            return { error: e?.message ?? 'fetch failed' };
        }
    }

    /**
     * Reconstruct a diag bundle from the individual GET /diag/{tool} routes.
     * Fallback for blox-ai images that predate the POST /diag/bundle aggregator
     * (they 405/404 the POST but still serve the per-tool GETs). Output is
     * shape-compatible with the server bundle so callers can't tell which path
     * produced it. Concurrency-capped to avoid spiking the edge device.
     */
    private async fetchDiagBundleViaTools(): Promise<DiagBundleResult> {
        const values = await mapWithConcurrency(
            DIAG_FALLBACK_TOOLS,
            DIAG_FALLBACK_CONCURRENCY,
            (tool) => this.fetchDiagTool(tool),
        );
        const tools: Record<string, unknown> = {};
        DIAG_FALLBACK_TOOLS.forEach((tool, i) => {
            tools[tool] = values[i];
        });
        // If every single tool failed, the device almost certainly isn't
        // serving diag at all — surface a network error rather than a "bundle"
        // that's nothing but {error} entries.
        const allFailed = values.every(
            (v) => v != null && typeof v === 'object' && 'error' in (v as object),
        );
        if (allFailed) {
            return { ok: false, error: networkError('no diag tools reachable') };
        }
        return {
            ok: true,
            payload: { generated_at: new Date().toISOString(), tools },
        };
    }

    /**
     * Start/restart the WireGuard support tunnel via POST /support/wireguard.
     *
     * LAN-only by design: the endpoint requires a custom `X-Fula-Support`
     * header (which forces a CORS preflight, blocking a same-LAN browser
     * drive-by) plus the tier-3 security code. The core BLE proxy can send
     * neither a custom header nor a body, so the existing BLE "SUPPORT ON"
     * button covers the BLE path; this method is the LAN equivalent.
     *
     * Returns the parsed body even on a non-2xx so the caller can read the
     * specific gate-rejection code (e.g. "security_code_invalid").
     */
    public async enableRemoteSupport(securityCode: string): Promise<RemoteSupportResult> {
        try {
            const res = await fetchWithTimeout(
                `${this.baseUrl}/support/wireguard`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Fula-Support': 'enable',
                    },
                    body: JSON.stringify({ security_code: securityCode }),
                },
                SUPPORT_TIMEOUT_MS,
            );
            const raw = await res.text();
            let parsed: RemoteSupportPayload | undefined;
            try {
                parsed = JSON.parse(raw) as RemoteSupportPayload;
            } catch {
                parsed = undefined;
            }
            if (!res.ok) {
                return { ok: false, error: fromHttpStatus(res.status, raw), payload: parsed };
            }
            return { ok: true, payload: parsed };
        } catch (e: any) {
            if (isAbortError(e)) {
                return { ok: false, error: networkError('support/wireguard aborted') };
            }
            return { ok: false, error: networkError(e?.message ?? 'support/wireguard failed') };
        }
    }
}

// Re-export commonly-used types so callers can `import { ... } from
// './httpAiClient'` without separately reaching into bloxAiEvents.
export type {
    BloxAiEvent,
    RecommendedActionEvent,
    UserQuestionEvent,
    ExecutionResultEvent,
} from './bloxAiEvents';
