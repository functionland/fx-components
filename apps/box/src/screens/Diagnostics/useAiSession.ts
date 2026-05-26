/**
 * useAiSession — Plan A v2 — A1.
 *
 * Single owner of an AI session's state machine. Wraps:
 *   - selectAiTransport (LAN HTTP vs BLE)
 *   - HttpAiClient / BleAiClient (transport handle + callbacks)
 *   - transcript accumulation
 *   - modal mutual exclusion via explicit `activeModal` enum
 *   - pending-actions fetch on mount (feature-gated)
 *   - SSE/BLE cleanup on unmount
 *   - mid-session transport-error → "Retry over BLE" surface (NOT
 *     auto-resume; codex Plan A v1 BLOCK on stream-resume contract)
 *
 * Caller responsibility (Diagnostics.screen.tsx):
 *   - render <BloxAIChat /> + the 4 modals based on state
 *   - feed bleManager + bloxPeerId + appPeerId
 *   - call hook's `startSession`, `confirmApproval`, etc. from
 *     component callbacks
 *
 * Design choices folded from advisor reviews:
 *   - useReducer (gemini + codex) — predictable state transitions,
 *     testable in isolation, no useState soup
 *   - sessionIdRef (codex) — closed-over state would be stale by the
 *     time session_started arrives async
 *   - activeModal enum (codex) — single source of truth for which
 *     modal is open; no separate booleans
 *   - SSE cleanup on unmount (gemini) — abort transport handle in
 *     useEffect cleanup
 *   - pending fetch feature-gated (codex) — skip BLE call if no
 *     plugin / no BLE
 *   - canonical prompts hardcoded English (codex + built-in)
 *   - end-of-session trigger explicit (built-in catch): user navigates
 *     away (handled by component unmount), user taps End (state
 *     transition), or 30 min idle (TTL timer). FeedbackModal opens on
 *     explicit End only.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { selectAiTransport, type AiTransportKind } from '../../utils/aiTransport';
import { HttpAiClient, type AiClientError, type SessionHandle } from '../../utils/httpAiClient';
import { BleAiClient } from '../../utils/bleAiClient';
import type { BleManagerWrapper } from '../../utils/ble';
import {
    parseBloxAiEvent,
    type BloxAiEvent,
    type RecommendedActionEvent,
    type ExecutionResultEvent,
    type TranscriptEntry,
} from '../../utils/bloxAiEvents';
import {
    QUICK_START_SCENARIOS,
    getScenario,
    type ScenarioId,
} from './quickStartPrompts';

// Public types -------------------------------------------------------------

export type ActiveModal =
    | 'approval'
    | 'shareContext'
    | 'feedback'
    | 'uploadTranscript'
    | null;

/** Phone context payload — narrow type since the modal accepts any shape. */
export type PhoneContext = Record<string, unknown>;

/** Pending-actions record shape returned by the `ai/pending` BLE command. */
export interface PendingActionsRecord {
    items: Array<{
        action_id: string;
        action_name: string;
        args: Record<string, unknown>;
        verdict_summary?: string;
        confidence?: number;
        tier: 2 | 3;
        approval_token: string;
        recorded_at: string;
    }>;
}

/** Anonymized transcript shape for the upload modal. */
export type AnonymizedTranscript = Record<string, unknown>;

/** Aggregated state surface returned by the hook. */
export interface AiSessionState {
    transcript: TranscriptEntry[];
    sessionId: string | null;
    streaming: boolean;
    busy: boolean;
    transportKind: AiTransportKind | null;
    prefilledScenario: ScenarioId | null;
    pending: PendingActionsRecord | null;
    pendingError: string | null;
    modals: {
        active: ActiveModal;
        approvalAction: RecommendedActionEvent | null;
        shareContextPreview: PhoneContext | null;
        feedbackSessionId: string | null;
        uploadTranscriptPayload: AnonymizedTranscript | null;
    };
    /** Last prompt sent — populated so "Retry over BLE" can re-fire it. */
    lastPrompt: string | null;
    /** Last transport error that yielded a retry surface. */
    lastTransportError: AiClientError | null;
}

export interface UseAiSessionOptions {
    bloxPeerId: string;
    appPeerId: string;
    /**
     * Caller provides a BLE manager (typically a useMemo'd
     * `BleManagerWrapper` per the existing per-screen pattern). May
     * be `null` if BLE is unavailable on this device (e.g. permissions
     * denied) — the hook then runs LAN HTTP only and surfaces a
     * "BLE unavailable" error for transport-failure retries.
     */
    bleManager: BleManagerWrapper | null;
    /**
     * The BLE peripheral ID for the paired blox. May be `null` if no
     * peripheral has been discovered yet. The hook gates BLE operations
     * on this being non-null.
     */
    blePeripheralId: string | null;
    /** True if the plugin is detected as installed. Gates pending fetch. */
    pluginInstalled: boolean;
    /** Initial scenario to pre-select (from nav route param). */
    initialPrefilledScenario?: ScenarioId | null;
    /**
     * Hook for posting phone-context. App owns the gathering since it
     * touches NetInfo / AsyncStorage / ring buffers; hook only orchestrates
     * the modal + the POST.
     */
    gatherPhoneContext?: () => Promise<PhoneContext>;
}

export interface UseAiSessionResult {
    state: AiSessionState;
    actions: {
        // Session lifecycle
        startSession: (prompt: string) => Promise<void>;
        startQuickStart: (scenario: ScenarioId) => Promise<void>;
        endSession: () => void;
        cancelSession: () => void;
        retryOverBle: () => Promise<void>;
        consumePrefill: () => void;

        // Recommendation flow
        openApproval: (action: RecommendedActionEvent) => void;
        confirmApproval: (securityCode?: string) => Promise<void>;
        dismissApproval: () => void;

        // Conversation
        submitReply: (questionId: string, replyText: string) => Promise<void>;

        // Phone context
        openShareContext: () => Promise<void>;
        confirmShareContext: () => Promise<void>;
        dismissShareContext: () => void;

        // Feedback + upload
        openFeedback: () => void;
        submitFeedback: (rating: 1 | 0 | -1, comment?: string) => Promise<void>;
        dismissFeedback: () => void;
        openUploadTranscript: (payload: AnonymizedTranscript) => void;
        dismissUploadTranscript: () => void;

        // Pending actions
        refreshPending: () => Promise<void>;
        approvePending: (action: RecommendedActionEvent) => Promise<void>;
        dismissPending: (actionId: string) => Promise<void>;
    };
}

// Reducer ------------------------------------------------------------------

type Action =
    | { type: 'session/start-requested'; prompt: string; transportKind: AiTransportKind }
    | { type: 'session/started'; sessionId: string }
    | { type: 'session/event'; event: BloxAiEvent }
    | { type: 'session/transport-error'; error: AiClientError }
    | { type: 'session/ended-complete' }
    | { type: 'session/ended-by-user'; sessionId: string }
    | { type: 'session/cancelled' }
    | { type: 'busy/set'; busy: boolean }
    | { type: 'modal/open-approval'; action: RecommendedActionEvent }
    | { type: 'modal/dismiss' }
    | { type: 'modal/open-share-context'; preview: PhoneContext }
    | { type: 'modal/open-feedback'; sessionId: string }
    | { type: 'modal/open-upload-transcript'; payload: AnonymizedTranscript }
    | { type: 'pending/set'; record: PendingActionsRecord }
    | { type: 'pending/error'; message: string }
    | { type: 'pending/clear' }
    | { type: 'prefill/set'; scenario: ScenarioId | null }
    | { type: 'prefill/consume' };

function initialState(prefilled: ScenarioId | null): AiSessionState {
    return {
        transcript: [],
        sessionId: null,
        streaming: false,
        busy: false,
        transportKind: null,
        prefilledScenario: prefilled,
        pending: null,
        pendingError: null,
        modals: {
            active: null,
            approvalAction: null,
            shareContextPreview: null,
            feedbackSessionId: null,
            uploadTranscriptPayload: null,
        },
        lastPrompt: null,
        lastTransportError: null,
    };
}

function reducer(state: AiSessionState, action: Action): AiSessionState {
    switch (action.type) {
        case 'session/start-requested':
            return {
                ...state,
                transcript: [],
                sessionId: null,
                streaming: true,
                transportKind: action.transportKind,
                lastPrompt: action.prompt,
                lastTransportError: null,
            };

        case 'session/started':
            return { ...state, sessionId: action.sessionId };

        case 'session/event': {
            // Append; if event has its own id field, use it for stable
            // React keys (avoids re-render keying collisions when two
            // events arrive in the same tick).
            const ev = action.event;
            const id = (ev as any).action_id
                ?? (ev as any).call_id
                ?? (ev as any).question_id
                ?? (ev as any).session_id
                ?? `idx-${state.transcript.length}`;
            const entry: TranscriptEntry = {
                id: String(id),
                event: ev,
                receivedAt: Date.now(),
            };
            const next: AiSessionState = {
                ...state,
                transcript: [...state.transcript, entry],
            };
            // Side-effect-style state updates colocated by event type:
            if (ev.type === 'session_started') {
                next.sessionId = ev.session_id;
            } else if (ev.type === 'verdict' || ev.type === 'error') {
                // verdict/error terminate active streaming flag (the
                // container may still be running but the UI flow is at
                // a decision point).
                next.streaming = false;
            } else if (ev.type === 'recommended_action') {
                // Auto-open approval modal on recommended_action arrival
                // ONLY if no other modal is currently open. If e.g.
                // feedback modal is open the new action sits in
                // transcript until user dismisses it (avoids modal
                // stack collisions).
                if (state.modals.active === null) {
                    next.modals = {
                        ...next.modals,
                        active: 'approval',
                        approvalAction: ev,
                    };
                }
            }
            return next;
        }

        case 'session/transport-error':
            return {
                ...state,
                streaming: false,
                lastTransportError: action.error,
                // Inject a synthetic error entry into the transcript so
                // the chat UI can render the "Retry over BLE" prompt
                // inline rather than as an out-of-band banner.
                transcript: [
                    ...state.transcript,
                    {
                        id: `err-${Date.now()}`,
                        event: {
                            type: 'error',
                            code: action.error.kind,
                            message: action.error.message,
                            recoverable: action.error.transient,
                        } as BloxAiEvent,
                        receivedAt: Date.now(),
                    },
                ],
            };

        case 'session/ended-complete':
            return { ...state, streaming: false };

        case 'session/ended-by-user':
            return {
                ...state,
                streaming: false,
                modals: {
                    ...state.modals,
                    active: 'feedback',
                    feedbackSessionId: action.sessionId,
                },
            };

        case 'session/cancelled':
            return { ...state, streaming: false };

        case 'busy/set':
            return { ...state, busy: action.busy };

        case 'modal/open-approval':
            return {
                ...state,
                modals: {
                    ...state.modals,
                    active: 'approval',
                    approvalAction: action.action,
                },
            };

        case 'modal/dismiss':
            return {
                ...state,
                modals: {
                    active: null,
                    approvalAction: null,
                    shareContextPreview: null,
                    feedbackSessionId: null,
                    uploadTranscriptPayload: null,
                },
            };

        case 'modal/open-share-context':
            return {
                ...state,
                modals: {
                    ...state.modals,
                    active: 'shareContext',
                    shareContextPreview: action.preview,
                },
            };

        case 'modal/open-feedback':
            return {
                ...state,
                modals: {
                    ...state.modals,
                    active: 'feedback',
                    feedbackSessionId: action.sessionId,
                },
            };

        case 'modal/open-upload-transcript':
            return {
                ...state,
                modals: {
                    ...state.modals,
                    active: 'uploadTranscript',
                    uploadTranscriptPayload: action.payload,
                },
            };

        case 'pending/set':
            return { ...state, pending: action.record, pendingError: null };

        case 'pending/error':
            return { ...state, pending: null, pendingError: action.message };

        case 'pending/clear':
            return { ...state, pending: null, pendingError: null };

        case 'prefill/set':
            return { ...state, prefilledScenario: action.scenario };

        case 'prefill/consume':
            // Consume once + leave it cleared so focus/remount doesn't
            // re-prefill (codex catch).
            return { ...state, prefilledScenario: null };

        default:
            return state;
    }
}

// Hook ---------------------------------------------------------------------

type AiClient = HttpAiClient | BleAiClient;

export function useAiSession(opts: UseAiSessionOptions): UseAiSessionResult {
    const {
        bloxPeerId,
        appPeerId,
        bleManager,
        blePeripheralId,
        pluginInstalled,
        initialPrefilledScenario = null,
        gatherPhoneContext,
    } = opts;

    const [state, dispatch] = useReducer(
        reducer,
        initialPrefilledScenario,
        initialState,
    );

    // Refs that bypass closure staleness (codex catch on sessionId).
    const sessionIdRef = useRef<string | null>(null);
    sessionIdRef.current = state.sessionId;

    const activeClientRef = useRef<AiClient | null>(null);
    const activeHandleRef = useRef<SessionHandle | null>(null);
    const mountedRef = useRef(true);

    // Track unmount for "don't setState after unmount" discipline.
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            // SSE / BLE cleanup on unmount (gemini catch).
            try {
                activeHandleRef.current?.cancel();
            } catch {
                // swallow
            }
            activeHandleRef.current = null;
            activeClientRef.current = null;
        };
    }, []);

    // ---- Pending fetch ---------------------------------------------------

    const refreshPending = useCallback(async () => {
        // Feature gate (codex catch): don't fire BLE commands on
        // devices that obviously can't support AI.
        if (!pluginInstalled) {
            dispatch({ type: 'pending/clear' });
            return;
        }
        if (!bleManager || !blePeripheralId) {
            // BLE not wired (yet) — don't fire any commands.
            dispatch({ type: 'pending/clear' });
            return;
        }
        try {
            const raw = await bleManager.writeToBLEAndWaitForResponse(
                JSON.stringify({ command: 'ai/pending' }),
                blePeripheralId,
                undefined, undefined,
                10_000,
            );
            const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).items)) {
                if (mountedRef.current) {
                    dispatch({ type: 'pending/set', record: parsed as PendingActionsRecord });
                }
            } else {
                if (mountedRef.current) {
                    dispatch({ type: 'pending/error', message: 'unexpected pending payload' });
                }
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            // "unknown command" on older firmwares is expected; don't
            // surface noise.
            if (mountedRef.current) {
                dispatch({ type: 'pending/error', message: msg });
            }
        }
    }, [pluginInstalled, bleManager, blePeripheralId]);

    // Initial pending fetch + AppState foreground refresh.
    useEffect(() => {
        refreshPending();
        const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
            if (s === 'active') refreshPending();
        });
        return () => sub.remove();
    }, [refreshPending]);

    // ---- Session lifecycle ----------------------------------------------

    const buildCallbacks = useCallback(() => {
        return {
            onEvent: (ev: BloxAiEvent) => {
                if (!mountedRef.current) return;
                dispatch({ type: 'session/event', event: ev });
            },
            onComplete: () => {
                if (!mountedRef.current) return;
                dispatch({ type: 'session/ended-complete' });
            },
            onError: (err: AiClientError) => {
                if (!mountedRef.current) return;
                dispatch({ type: 'session/transport-error', error: err });
            },
        };
    }, []);

    const startSessionInternal = useCallback(
        async (prompt: string, opts?: { forceTransport?: 'lan-http' | 'ble' }) => {
            // Don't start a new session if one is already streaming.
            if (state.streaming) return;

            // Cancel any lingering handle (paranoia — useEffect cleanup
            // should have done this on unmount).
            try {
                activeHandleRef.current?.cancel();
            } catch {
                // swallow
            }
            activeHandleRef.current = null;
            activeClientRef.current = null;

            let chosenKind: AiTransportKind;
            let client: AiClient;

            const bleAvailable = !!bleManager && !!blePeripheralId;

            if (opts?.forceTransport === 'ble') {
                if (!bleAvailable) {
                    dispatch({
                        type: 'session/transport-error',
                        error: { kind: 'network', message: 'BLE not available on this device', transient: false },
                    });
                    return;
                }
                chosenKind = 'ble';
                client = new BleAiClient(bleManager!, blePeripheralId!);
            } else {
                const choice = await selectAiTransport(bloxPeerId, appPeerId);
                chosenKind = choice.kind;
                if (choice.kind === 'lan-http') {
                    client = choice.httpClient!;
                } else if (bleAvailable) {
                    client = new BleAiClient(bleManager!, blePeripheralId!);
                } else {
                    // No transport available — neither LAN HTTP candidate
                    // qualified nor BLE wired. Surface a clean error so
                    // the screen can show "no transport available; check
                    // that you're paired with your blox" rather than
                    // throwing.
                    dispatch({
                        type: 'session/transport-error',
                        error: { kind: 'network', message: 'No transport available (LAN unreachable + BLE not paired)', transient: false },
                    });
                    return;
                }
            }

            activeClientRef.current = client;
            dispatch({ type: 'session/start-requested', prompt, transportKind: chosenKind });

            // Start a fresh session each time (codex catch: do not
            // try to "resume" because there's no event-cursor contract).
            const handle = client.runAi(prompt, undefined, buildCallbacks());
            activeHandleRef.current = handle;

            // session_started will arrive async via onEvent.
        },
        [bleManager, blePeripheralId, bloxPeerId, appPeerId, state.streaming, buildCallbacks],
    );

    const startSession = useCallback(
        (prompt: string) => startSessionInternal(prompt),
        [startSessionInternal],
    );

    const startQuickStart = useCallback(
        (id: ScenarioId) => {
            const scenario = getScenario(id);
            return startSessionInternal(scenario.canonicalPrompt);
        },
        [startSessionInternal],
    );

    const retryOverBle = useCallback(async () => {
        if (!state.lastPrompt) return;
        // Fresh session over BLE — codex's "do not claim seamless
        // resume" stance. Container's SessionManager will mint a new
        // sessionId; transcript shows the old error row + the new
        // session rows; no duplicate events.
        await startSessionInternal(state.lastPrompt, { forceTransport: 'ble' });
    }, [state.lastPrompt, startSessionInternal]);

    const cancelSession = useCallback(() => {
        try {
            activeHandleRef.current?.cancel();
        } catch {
            // swallow
        }
        activeHandleRef.current = null;
        activeClientRef.current = null;
        dispatch({ type: 'session/cancelled' });
    }, []);

    const endSession = useCallback(() => {
        const sid = sessionIdRef.current;
        try {
            activeHandleRef.current?.cancel();
        } catch {
            // swallow
        }
        activeHandleRef.current = null;
        activeClientRef.current = null;
        if (sid) {
            dispatch({ type: 'session/ended-by-user', sessionId: sid });
        } else {
            dispatch({ type: 'session/cancelled' });
        }
    }, []);

    // ---- Recommendation flow --------------------------------------------

    const openApproval = useCallback((action: RecommendedActionEvent) => {
        dispatch({ type: 'modal/open-approval', action });
    }, []);

    const dismissApproval = useCallback(() => {
        dispatch({ type: 'modal/dismiss' });
    }, []);

    const confirmApproval = useCallback(
        async (securityCode?: string): Promise<void> => {
            const action = state.modals.approvalAction;
            const client = activeClientRef.current;
            if (!action || !client) {
                dispatch({ type: 'modal/dismiss' });
                return;
            }
            dispatch({ type: 'busy/set', busy: true });
            try {
                const result = await client.executeAction(
                    { action_id: action.action_id, approval_token: action.approval_token },
                    securityCode,
                );
                if (result.ok && result.payload) {
                    // Append the execution_result to the transcript.
                    dispatch({
                        type: 'session/event',
                        event: result.payload as ExecutionResultEvent,
                    });
                } else if (result.error) {
                    dispatch({ type: 'session/transport-error', error: result.error });
                }
            } finally {
                dispatch({ type: 'busy/set', busy: false });
                dispatch({ type: 'modal/dismiss' });
            }
        },
        [state.modals.approvalAction],
    );

    // ---- Conversation (user reply) --------------------------------------

    const submitReply = useCallback(
        async (questionId: string, replyText: string): Promise<void> => {
            const sid = sessionIdRef.current;
            const client = activeClientRef.current;
            if (!sid || !client) return;
            dispatch({ type: 'busy/set', busy: true });
            try {
                await client.userReply(sid, questionId, replyText);
                // Optimistic transcript update — the container will also
                // emit `user_reply_received` via the stream, but we
                // surface the local reply immediately for UX.
                dispatch({
                    type: 'session/event',
                    event: {
                        type: 'user_reply_received',
                        question_id: questionId,
                        session_id: sid,
                    } as BloxAiEvent,
                });
            } catch (e) {
                const err = (e as any)?.kind
                    ? (e as AiClientError)
                    : { kind: 'network', message: String(e), transient: true } as AiClientError;
                dispatch({ type: 'session/transport-error', error: err });
            } finally {
                dispatch({ type: 'busy/set', busy: false });
            }
        },
        [],
    );

    // ---- Phone context --------------------------------------------------

    const openShareContext = useCallback(async () => {
        if (!gatherPhoneContext) return;
        const ctx = await gatherPhoneContext();
        dispatch({ type: 'modal/open-share-context', preview: ctx });
    }, [gatherPhoneContext]);

    const dismissShareContext = useCallback(() => {
        dispatch({ type: 'modal/dismiss' });
    }, []);

    const confirmShareContext = useCallback(async () => {
        const ctx = state.modals.shareContextPreview;
        const sid = sessionIdRef.current;
        const client = activeClientRef.current;
        if (!ctx || !sid || !client) {
            dispatch({ type: 'modal/dismiss' });
            return;
        }
        dispatch({ type: 'busy/set', busy: true });
        try {
            await client.phoneContext(sid, ctx);
        } catch (e) {
            const err = (e as any)?.kind
                ? (e as AiClientError)
                : { kind: 'network', message: String(e), transient: true } as AiClientError;
            dispatch({ type: 'session/transport-error', error: err });
        } finally {
            dispatch({ type: 'busy/set', busy: false });
            dispatch({ type: 'modal/dismiss' });
        }
    }, [state.modals.shareContextPreview]);

    // ---- Feedback + upload ---------------------------------------------

    const openFeedback = useCallback(() => {
        const sid = sessionIdRef.current;
        if (sid) dispatch({ type: 'modal/open-feedback', sessionId: sid });
    }, []);

    const dismissFeedback = useCallback(() => {
        dispatch({ type: 'modal/dismiss' });
    }, []);

    const submitFeedback = useCallback(
        async (rating: 1 | 0 | -1, comment?: string): Promise<void> => {
            const sid = state.modals.feedbackSessionId;
            if (!sid) return;
            if (!bleManager || !blePeripheralId) {
                dispatch({ type: 'modal/dismiss' });
                return;
            }
            // Feedback goes via BLE today (no HTTP /feedback in the
            // client; container exposes it but we don't need the
            // streaming surface). Best-effort.
            try {
                await bleManager.writeToBLEAndWaitForResponse(
                    JSON.stringify({
                        command: 'ai/feedback',
                        args: { session_id: sid, rating, ...(comment ? { comment } : {}) },
                    }),
                    blePeripheralId, undefined, undefined, 10_000,
                );
            } catch {
                // swallow — local-only feedback log on the device;
                // not critical that the network call succeeds.
            } finally {
                dispatch({ type: 'modal/dismiss' });
            }
        },
        [state.modals.feedbackSessionId, bleManager, blePeripheralId],
    );

    const openUploadTranscript = useCallback((payload: AnonymizedTranscript) => {
        dispatch({ type: 'modal/open-upload-transcript', payload });
    }, []);

    const dismissUploadTranscript = useCallback(() => {
        dispatch({ type: 'modal/dismiss' });
    }, []);

    // ---- Pending action approve/dismiss --------------------------------

    const approvePending = useCallback(
        async (action: RecommendedActionEvent): Promise<void> => {
            // Open approval modal for the pending action.
            dispatch({ type: 'modal/open-approval', action });
        },
        [],
    );

    const dismissPending = useCallback(
        async (actionId: string): Promise<void> => {
            if (!bleManager || !blePeripheralId) {
                await refreshPending();
                return;
            }
            // Best-effort: tell the blox to drop this pending entry.
            try {
                await bleManager.writeToBLEAndWaitForResponse(
                    JSON.stringify({
                        command: 'ai/pending-dismiss',
                        args: { action_id: actionId },
                    }),
                    blePeripheralId, undefined, undefined, 5_000,
                );
            } catch {
                // swallow
            }
            await refreshPending();
        },
        [bleManager, blePeripheralId, refreshPending],
    );

    // ---- Prefill consumption -------------------------------------------

    const consumePrefill = useCallback(() => {
        dispatch({ type: 'prefill/consume' });
    }, []);

    // ---- Public surface -------------------------------------------------

    return useMemo<UseAiSessionResult>(
        () => ({
            state,
            actions: {
                startSession,
                startQuickStart,
                endSession,
                cancelSession,
                retryOverBle,
                consumePrefill,
                openApproval,
                confirmApproval,
                dismissApproval,
                submitReply,
                openShareContext,
                confirmShareContext,
                dismissShareContext,
                openFeedback,
                submitFeedback,
                dismissFeedback,
                openUploadTranscript,
                dismissUploadTranscript,
                refreshPending,
                approvePending,
                dismissPending,
            },
        }),
        [
            state, startSession, startQuickStart, endSession, cancelSession,
            retryOverBle, consumePrefill, openApproval, confirmApproval,
            dismissApproval, submitReply, openShareContext, confirmShareContext,
            dismissShareContext, openFeedback, submitFeedback, dismissFeedback,
            openUploadTranscript, dismissUploadTranscript,
            refreshPending, approvePending, dismissPending,
        ],
    );
}

// Internal exports for tests -----------------------------------------------

export const _internal = {
    reducer,
    initialState,
    QUICK_START_SCENARIOS,
};
