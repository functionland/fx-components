/**
 * bleAiClient — BLE transport for the Blox AI plugin.
 *
 * Mirrors `HttpAiClient`'s surface so `useAiSession` can swap
 * transports transparently. Wraps `BleManagerWrapper`'s
 * `writeToBLEAndWaitForResponse` with `ble_stream` frame handling.
 *
 * Plan A v2 — A0 (the foundational deliverable; A1's hook depends on
 * this client existing). Built-in advisor catch on Plan A v1:
 * `bleManager.runAi` was vaporware in the v1 plan; this file makes it
 * real.
 *
 * BLE channel constraints — known degradation vs HTTP transport:
 *
 *  - `BleManagerWrapper.writeToBLEAndWaitForResponse` enforces a
 *    single-command-in-flight invariant ("Another command is in
 *    progress"). So multi-turn endpoints (`/troubleshoot/user-reply`,
 *    `/troubleshoot/phone-context`) CANNOT fire while `runAi`'s stream
 *    is open. We surface this as a typed error
 *    (`kind: 'ble-busy', transient: false`) so the hook can show a
 *    clear "switch to LAN to continue this conversation" UX rather
 *    than retrying blindly.
 *  - The blox-side BLE proxy serializes commands through the same
 *    HTTP endpoint contracts. Each BLE command is its own
 *    `writeToBLEAndWaitForResponse` call.
 *  - SSE-style events arrive as `ble_stream` frames; we relay each
 *    parsed event to `cb.onEvent` exactly as `HttpAiClient` does.
 */

import type {
    BloxAiEvent,
    RecommendedActionEvent,
    ExecutionResultEvent,
} from './bloxAiEvents';
import { parseBloxAiEvent } from './bloxAiEvents';
import { BleStreamTimeoutError, BleManagerWrapper } from './ble';
import type {
    AiCallbacks,
    AiClientError,
    HealthResult,
    SessionHandle,
    ExecuteResult,
    DiagBundle,
    DiagBundleResult,
} from './httpAiClient';

export const BLE_RUN_AI_TIMEOUT_MS = 300_000;     // 5 min — multi-turn AI sessions can run long
export const BLE_ONE_SHOT_TIMEOUT_MS = 30_000;
export const BLE_HEALTH_TIMEOUT_MS = 5_000;       // BLE is slow; give /health more room than HTTP's 1s
// diag/bundle: core BLE proxy waits up to 30s for the container (which has
// a 25s internal budget), then relays the result over the slow BLE wire —
// so the phone-side wait must clear 30s + transfer. Generous backstop.
export const BLE_DIAG_BUNDLE_TIMEOUT_MS = 45_000;

function bleError(kind: AiClientError['kind'], message: string, transient: boolean): AiClientError {
    return { kind, message, transient };
}

function bleBusyError(message: string = 'BLE channel busy; switch to LAN HTTP for multi-turn dialogue'): AiClientError {
    // Distinct from http-busy because the cause differs: HTTP 429 is
    // "device is mid-session"; BLE-busy is "the BLE wire serializes
    // commands and one is in flight." Same surface to the caller —
    // `transient: false` so the hook does NOT retry blindly.
    return { kind: 'http-busy', message, transient: false };
}

function networkError(message: string): AiClientError {
    return { kind: 'network', message, transient: true };
}

/**
 * Public surface mirrors HttpAiClient so `useAiSession` can hold one
 * union-typed client reference and call uniform methods. Differences
 * are intentional + minor (timeouts longer; user-reply/phone-context
 * may return ble-busy when streaming is active).
 */
export class BleAiClient {
    public readonly peripheralId: string;
    private bleManager: BleManagerWrapper;

    constructor(bleManager: BleManagerWrapper, peripheralId: string) {
        if (!bleManager) {
            throw new Error('BleAiClient: bleManager is required');
        }
        if (!peripheralId) {
            throw new Error('BleAiClient: peripheralId is required');
        }
        this.bleManager = bleManager;
        this.peripheralId = peripheralId;
    }

    /**
     * Cheap reachability probe. Asks the BLE proxy to forward a status
     * request to the container's /status endpoint. Not memoized (BLE is
     * slow; caller should invoke at most once per session).
     */
    public async health(timeoutMs: number = BLE_HEALTH_TIMEOUT_MS): Promise<HealthResult> {
        const start = Date.now();
        try {
            const cmd = JSON.stringify({ command: 'ai/status' });
            await this.bleManager.writeToBLEAndWaitForResponse(
                cmd, this.peripheralId, undefined, undefined, timeoutMs,
            );
            return { ok: true, latencyMs: Date.now() - start };
        } catch (e) {
            return { ok: false, latencyMs: Date.now() - start };
        }
    }

    /**
     * Start an AI session via the `ai/troubleshoot` BLE command. The
     * stream's `ble_stream` frames are parsed + dispatched to
     * cb.onEvent. Lifecycle invariant (mirroring HttpAiClient): onError
     * fires once; onComplete does NOT fire on the same tick after an
     * error (Plan HTTP v2.2 catch).
     */
    public runAi(
        prompt: string,
        sessionId: string | undefined,
        cb: AiCallbacks,
    ): SessionHandle {
        const seedSession = sessionId ?? '';
        const body: Record<string, unknown> = { prompt };
        if (seedSession) body.session_id = seedSession;
        const cmd = JSON.stringify({ command: 'ai/troubleshoot', args: body });

        let resolvedSessionId = seedSession;
        let closed = false;

        const safeError = (err: AiClientError) => {
            if (closed) return;
            try { cb.onError?.(err); } catch (_) { /* swallow */ }
        };
        const safeComplete = () => {
            if (closed) return;
            try { cb.onComplete?.(); } catch (_) { /* swallow */ }
        };

        const onStreamFrame = (framePayload: unknown) => {
            if (closed) return;
            // The assembler hands us the already-decoded JSON object
            // (it parses ble_stream.data before invoking the callback).
            const parsed = parseBloxAiEvent(framePayload);
            if (parsed.type === 'session_started') {
                resolvedSessionId = parsed.session_id;
            }
            try { cb.onEvent(parsed); } catch (_) { /* swallow */ }
        };

        // writeToBLEAndWaitForResponse returns a promise. Resolution
        // means the stream's final frame arrived; rejection means
        // timeout or BLE error. The streaming frames flow through
        // onStreamFrame DURING the await.
        this.bleManager
            .writeToBLEAndWaitForResponse(
                cmd,
                this.peripheralId,
                undefined, undefined,
                BLE_RUN_AI_TIMEOUT_MS,
                onStreamFrame,
            )
            .then(() => {
                // Successful end of stream — invoke onComplete IF we
                // haven't been cancelled/errored.
                // Order matches HttpAiClient: do NOT set closed before
                // we decide whether to fire onComplete; if cancel
                // happened, closed is already true and safeComplete
                // short-circuits.
                safeComplete();
                closed = true;
            })
            .catch((err: unknown) => {
                if (closed) return;
                // BleStreamTimeoutError carries partial frames; we've
                // already delivered them via onStreamFrame, so just
                // surface the error.
                if (err instanceof BleStreamTimeoutError) {
                    // Order matters (Plan HTTP v2.2 lifecycle fix
                    // applied here too): safeError FIRST, then closed.
                    safeError(networkError(`BLE stream timeout: ${err.message}`));
                    closed = true;
                    return;
                }
                const msg = err instanceof Error ? err.message : String(err);
                if (/Another command is in progress/i.test(msg)) {
                    safeError(bleBusyError(msg));
                } else {
                    safeError(networkError(`BLE error: ${msg}`));
                }
                closed = true;
            });

        const cancel = () => {
            if (closed) return;
            closed = true;
            // Best-effort backend cancel. Note: writeToBLEAndWaitForResponse
            // has no cooperative cancellation today; we mark `closed = true`
            // so callbacks short-circuit. The underlying BLE timeout
            // (5 min) will free the channel eventually.
            if (resolvedSessionId) {
                this.cancel(resolvedSessionId).catch(() => undefined);
            }
        };

        return {
            get sessionId() { return resolvedSessionId; },
            cancel,
        } as unknown as SessionHandle;
    }

    public async userReply(
        sessionId: string,
        questionId: string,
        replyText: string,
    ): Promise<void> {
        const cmd = JSON.stringify({
            command: 'ai/user-reply',
            args: { session_id: sessionId, question_id: questionId, reply_text: replyText },
        });
        try {
            await this.bleManager.writeToBLEAndWaitForResponse(
                cmd, this.peripheralId, undefined, undefined, BLE_ONE_SHOT_TIMEOUT_MS,
            );
        } catch (e) {
            throw this.normalizeBleError(e);
        }
    }

    public async phoneContext(
        sessionId: string,
        context: Record<string, unknown>,
    ): Promise<void> {
        const cmd = JSON.stringify({
            command: 'ai/phone-context',
            args: { session_id: sessionId, phone_context: context },
        });
        try {
            await this.bleManager.writeToBLEAndWaitForResponse(
                cmd, this.peripheralId, undefined, undefined, BLE_ONE_SHOT_TIMEOUT_MS,
            );
        } catch (e) {
            throw this.normalizeBleError(e);
        }
    }

    public async executeAction(
        action: Pick<RecommendedActionEvent, 'action_id' | 'approval_token'>,
        securityCode?: string,
    ): Promise<ExecuteResult> {
        const args: Record<string, unknown> = {
            action_id: action.action_id,
            approval_token: action.approval_token,
        };
        if (securityCode) args.security_code = securityCode;

        let raw: unknown;
        try {
            raw = await this.bleManager.writeToBLEAndWaitForResponse(
                JSON.stringify({ command: 'ai/execute', args }),
                this.peripheralId, undefined, undefined, BLE_ONE_SHOT_TIMEOUT_MS,
            );
        } catch (e) {
            // Underlying BLE write/wait failure — distinct from a
            // malformed response. Map via normalizeBleError so busy
            // states + timeouts get the right kind.
            return { ok: false, error: this.normalizeBleError(e) };
        }
        // Response shape parsing — failures here are "BLE returned
        // bytes but they weren't the expected execution_result event,"
        // which is a malformed/protocol issue rather than a network
        // issue. Distinguish so callers don't trigger fall-back retries.
        let payload: unknown;
        try {
            payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
            return {
                ok: false,
                error: bleError('sse-malformed', 'BLE execute-action body is not JSON', false),
            };
        }
        if (payload && typeof payload === 'object' && (payload as any).type === 'execution_result') {
            return { ok: true, payload: payload as ExecutionResultEvent };
        }
        return {
            ok: false,
            error: bleError('sse-malformed', 'BLE execute-action returned no execution_result', false),
        };
    }

    public async cancel(sessionId: string): Promise<void> {
        // Best-effort. Failures swallowed — caller doesn't depend on
        // server-side cancel succeeding; setting closed=true locally
        // is what actually stops UI updates.
        try {
            await this.bleManager.writeToBLEAndWaitForResponse(
                JSON.stringify({ command: 'ai/cancel', args: { session_id: sessionId } }),
                this.peripheralId, undefined, undefined, 5_000,
            );
        } catch {
            // ignore
        }
    }

    /**
     * Fetch the read-only diagnostics snapshot over BLE via the registered
     * `diag/bundle` proxy command. The core proxy POSTs json={} to the
     * container's /diag/bundle and relays the JSON result back as a single
     * (non-stream) response, so this is a one-shot wait, not a stream.
     *
     * Mirrors HttpAiClient.fetchDiagBundle's result shape so the UI can
     * call it transport-agnostically. NOTE: there is deliberately NO BLE
     * enableRemoteSupport — that endpoint is LAN-only (custom header +
     * body the BLE proxy can't send); the Settings "SUPPORT ON" button
     * covers the BLE path.
     */
    public async fetchDiagBundle(): Promise<DiagBundleResult> {
        let raw: unknown;
        try {
            raw = await this.bleManager.writeToBLEAndWaitForResponse(
                JSON.stringify({ command: 'diag/bundle' }),
                this.peripheralId, undefined, undefined, BLE_DIAG_BUNDLE_TIMEOUT_MS,
            );
        } catch (e) {
            return { ok: false, error: this.normalizeBleError(e) };
        }
        let payload: unknown;
        try {
            payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
            return {
                ok: false,
                error: bleError('sse-malformed', 'BLE diag/bundle body is not JSON', false),
            };
        }
        if (payload && typeof payload === 'object' && 'tools' in (payload as Record<string, unknown>)) {
            return { ok: true, payload: payload as DiagBundle };
        }
        return {
            ok: false,
            error: bleError('sse-malformed', 'BLE diag/bundle returned no tools snapshot', false),
        };
    }

    private normalizeBleError(e: unknown): AiClientError {
        if (e instanceof BleStreamTimeoutError) {
            return networkError(`BLE stream timeout: ${e.message}`);
        }
        const msg = e instanceof Error ? e.message : String(e);
        if (/Another command is in progress/i.test(msg)) {
            return bleBusyError(msg);
        }
        return networkError(`BLE error: ${msg}`);
    }
}

// Re-export the shared types so callers can `import` everything from
// one transport-agnostic module if they prefer.
export type {
    BloxAiEvent,
    RecommendedActionEvent,
    ExecutionResultEvent,
} from './bloxAiEvents';
