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

        es.addEventListener('message', (event: { data?: string }) => {
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
}

// Re-export commonly-used types so callers can `import { ... } from
// './httpAiClient'` without separately reaching into bloxAiEvents.
export type {
    BloxAiEvent,
    RecommendedActionEvent,
    UserQuestionEvent,
    ExecutionResultEvent,
} from './bloxAiEvents';
