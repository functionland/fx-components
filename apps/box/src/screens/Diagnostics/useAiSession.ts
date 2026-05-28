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
    clearPersistedSession,
    flushDebounce,
    loadPersistedSession,
    schedulePersist,
    type PersistedSession,
} from '../../utils/aiSessionPersistence';
import {
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
// Re-use the EXISTING typed shapes the modal components were built
// against. Plan A end-to-end follow-up: useAiSession originally made
// up loose types (Record<string, unknown>, {items: ...}) that didn't
// match — the Diagnostics screen wiring failed to typecheck against
// the actual modal prop interfaces. Importing the canonical types
// fixes the mismatch.
import { parsePendingResponse, type PendingActionsRecord } from '../../utils/parsePendingResponse';
import type { PhoneContext } from '../../utils/phoneLogger';
import {
    anonymizeTranscript,
    AnonymizerError,
    type AnonymizedTranscript,
    type RawTranscriptEvent,
} from '../../utils/anonymizeTranscript';
import type { FeedbackPayload, FeedbackRating } from '../../utils/buildFeedbackPayload';

// Re-export so Diagnostics.screen can import everything from one place.
export type {
    PendingActionsRecord,
    PhoneContext,
    AnonymizedTranscript,
    FeedbackPayload,
    FeedbackRating,
};

// Public types -------------------------------------------------------------

export type ActiveModal =
    | 'approval'
    | 'shareContext'
    | 'feedback'
    | 'uploadTranscript'
    | null;

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
    /**
     * Which scenario the user picked for the last-started session.
     * 'freeform' if they typed their own prompt; null before any
     * session starts. Persisted into the uploaded transcript so the
     * operator analytics can filter by symptom class without parsing
     * English text.
     */
    lastScenarioId: ScenarioId | 'freeform' | null;
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
        /**
         * Reset the chat surface so the user can begin a fresh session.
         * Pure local state reset — no BLE/HTTP traffic. Used by the
         * "Start new chat" button in BloxAIChat that appears after a
         * session has reached a verdict, been ended by the user, or
         * been aborted (e.g. SSE dropped while the phone was backgrounded).
         * Does NOT touch modals, pending recommendations, or
         * prefilledScenario — those are independent of the live chat.
         */
        clearSession: () => void;
        retryOverBle: () => Promise<void>;
        /**
         * Re-runs the most recent prompt + scenario with auto-selected
         * transport. Hooked up to the "Try again with the same question"
         * button BloxAIChat renders when the model failed to converge
         * (verdict.payload.root_cause is no_verdict_emitted or
         * max_turns_exceeded). Useful because the model is sampled
         * with non-zero temperature so a second attempt often produces
         * a real verdict where the first did not.
         */
        retrySamePrompt: () => Promise<void>;
        consumePrefill: () => void;

        // Recommendation flow — signatures match the modal/component
        // prop contracts so screens can pass the action verbatim.
        openApproval: (action: RecommendedActionEvent) => void;
        /** Matches ApprovalModal.onApprove: `(security_code: string | null) => void`. */
        confirmApproval: (securityCode: string | null) => void;
        dismissApproval: () => void;

        // Conversation
        submitReply: (questionId: string, replyText: string) => Promise<void>;

        // Phone context — types match SharePhoneContextModal.
        openShareContext: () => Promise<void>;
        confirmShareContext: () => Promise<void>;
        dismissShareContext: () => void;

        // Feedback + upload — types match FeedbackModal / UploadTranscriptModal.
        openFeedback: () => void;
        /** Matches FeedbackModal.onSubmit: `(payload: FeedbackPayload) => void`. */
        submitFeedback: (payload: FeedbackPayload) => void;
        dismissFeedback: () => void;
        openUploadTranscript: (payload: AnonymizedTranscript) => void;
        /**
         * One-shot helper for the FeedbackModal: builds an
         * AnonymizedTranscript from the live transcript + the user's
         * rating/comment and opens the preview/upload modal. Returns
         * false if nothing was opened (empty transcript, anonymizer
         * rejected the payload). No network traffic until the user
         * confirms inside the preview modal.
         */
        prepareTranscriptUpload: (rating: FeedbackRating, comment?: string) => boolean;
        dismissUploadTranscript: () => void;

        // Pending actions — `dismissPending` is parameterless to match
        // PendingActionsPanel.onDismiss (single Dismiss button on the
        // panel, not per-row).
        refreshPending: () => Promise<void>;
        approvePending: (action: RecommendedActionEvent) => void;
        dismissPending: () => void;
    };
}

// Reducer ------------------------------------------------------------------

type Action =
    | { type: 'session/start-requested'; prompt: string; scenarioId: ScenarioId | 'freeform'; transportKind: AiTransportKind | null }
    | { type: 'session/transport-selected'; transportKind: AiTransportKind }
    | { type: 'session/started'; sessionId: string }
    | { type: 'session/event'; event: BloxAiEvent }
    | { type: 'session/transport-error'; error: AiClientError }
    | { type: 'session/ended-complete' }
    | { type: 'session/ended-by-user'; sessionId: string }
    | { type: 'session/cancelled' }
    | { type: 'session/clear' }
    | { type: 'session/resumed'; sessionId: string; prompt: string; scenarioId: ScenarioId | 'freeform' }
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
        lastScenarioId: null,
        lastTransportError: null,
    };
}

function reducer(state: AiSessionState, action: Action): AiSessionState {
    switch (action.type) {
        case 'session/start-requested':
            // Bug fix 2026-05-26: dispatched IMMEDIATELY on user tap (before
            // selectAiTransport awaits) so the UI flips out of the
            // QuickStart/CTA card and into a "Connecting..." state straight
            // away — otherwise the user sees no feedback while transport
            // selection (mDNS scan, etc.) runs and may double-tap.
            // transportKind can be null at this point; updated by the
            // session/transport-selected dispatch once the choice is made.
            return {
                ...state,
                transcript: [],
                sessionId: null,
                streaming: true,
                transportKind: action.transportKind,
                lastPrompt: action.prompt,
                lastScenarioId: action.scenarioId,
                lastTransportError: null,
            };

        case 'session/transport-selected':
            return { ...state, transportKind: action.transportKind };

        case 'session/started':
            return { ...state, sessionId: action.sessionId };

        case 'session/event': {
            // Append; build a React key that is BOTH semantically meaningful
            // (so testID / debugging stays readable) AND guaranteed unique.
            //
            // Bug observed in lab (2026-05-26): the previous logic fell
            // through to session_id when an event had no action_id /
            // call_id / question_id, but session_id is the SAME for every
            // event in a session, so all such events collided on the same
            // React key. React's reconciler then warned ("Encountered two
            // children with the same key, `rk-0-0`") and silently kept
            // only the first instance — which is why later recommended_action
            // cards (with their Approve buttons) failed to render.
            //
            // Fix: always suffix the semantic prefix with the monotonic
            // transcript position. Identical prefixes never collide.
            const ev = action.event;
            const baseId = (ev as any).action_id
                ?? (ev as any).call_id
                ?? (ev as any).question_id
                ?? (ev as any).session_id
                ?? 'evt';
            const entry: TranscriptEntry = {
                id: `${String(baseId)}-${state.transcript.length}`,
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
                // Phase 1.e (Session 2 2026-05-28) — action-replay
                // idempotency: if the transcript already contains a
                // matching execution_result for this action_id, the
                // action already ran (either before background, or
                // it was emitted by a deterministic tree which is
                // re-emitting on SSE replay). Do NOT auto-open the
                // approval modal — that would re-prompt the user for
                // an action that already ran successfully.
                //
                // The server caches the execution_result and returns
                // it to /execute-action token replays (200 + cached);
                // this client-side guard avoids the modal pop entirely
                // so the UX is "already done" not "redo this".
                const alreadyExecuted = state.transcript.some((t) => {
                    const ee = t.event as { type?: string; action_id?: string };
                    return ee?.type === 'execution_result' && ee.action_id === ev.action_id;
                });
                if (alreadyExecuted) {
                    // Leave the recommended_action card in the
                    // transcript so the user sees the history; just
                    // don't auto-open the modal.
                    return next;
                }
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
                //
                // Bug fix 2026-05-26: id was `err-${Date.now()}` — two
                // transport errors in the same millisecond (or React-strict-
                // mode dispatching the reducer twice) produced duplicate
                // React keys. Suffix with monotonic transcript position so
                // collisions are mechanically impossible.
                transcript: [
                    ...state.transcript,
                    {
                        id: `err-${Date.now()}-${state.transcript.length}`,
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

        case 'session/clear':
            // Reset the conversation surface so the user can start a fresh
            // chat after a previous session ended (verdict reached, user
            // tapped End-and-rate, OR the SSE stream aborted because the
            // phone went to background). Leaves modals / pending /
            // prefilledScenario alone — those are independent surfaces and
            // resetting them would dismiss in-progress UX the user didn't
            // ask to close.
            return {
                ...state,
                transcript: [],
                sessionId: null,
                streaming: false,
                transportKind: null,
                lastPrompt: null,
                lastScenarioId: null,
                lastTransportError: null,
            };

        case 'session/resumed':
            // Auto-resume after the app was backgrounded-or-killed. The
            // server's /troubleshoot/resume endpoint replays buffered
            // events from `from=<lastEventSeq+1>`, so we DON'T see the
            // original session_started event — set sessionId directly
            // from the persisted snapshot. Transcript starts empty;
            // upcoming SSE events from the replay rebuild it. If the
            // server returns 404 the buildCallbacks onError path
            // clears the persisted state.
            return {
                ...state,
                transcript: [],
                sessionId: action.sessionId,
                streaming: true,
                transportKind: 'lan-http',  // resume is HTTP-only
                lastPrompt: action.prompt,
                lastScenarioId: action.scenarioId,
                lastTransportError: null,
            };

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
    // Mirror lastPrompt + lastScenarioId in refs for the same reason:
    // buildCallbacks reads them, and attemptAutoResume dispatches
    // session/resumed THEN immediately calls buildCallbacks() — React
    // hasn't re-rendered between those statements so `state.lastPrompt`
    // inside the closure is still the OLD value (null on cold launch).
    // Without these refs the first onSeq after auto-resume skips the
    // persist (prompt is falsy), the snapshot ages out, a second
    // kill-then-relaunch loses the session. advisor 2026-05-28.
    const lastPromptRef = useRef<string | null>(null);
    lastPromptRef.current = state.lastPrompt;
    const lastScenarioIdRef = useRef<ScenarioId | 'freeform' | null>(null);
    lastScenarioIdRef.current = state.lastScenarioId;

    const activeClientRef = useRef<AiClient | null>(null);
    const activeHandleRef = useRef<SessionHandle | null>(null);
    const mountedRef = useRef(true);
    // Highest SSE id field observed for the current session. Updated
    // from the HttpAiClient.runAi/resume `onSeq` callback and persisted
    // to AsyncStorage with debounce so a backgrounded-or-killed app
    // can reattach via /troubleshoot/resume?from=<lastEventSeq>. Reset
    // to -1 when a new session starts (next real seq is 0). Persisted
    // value is what the server's _stream_from_buffer compares against.
    const lastEventSeqRef = useRef<number>(-1);
    // Guard against re-running auto-resume more than once per
    // foreground transition (StrictMode + AppState can fire 'active'
    // multiple times). Cleared after the attempt completes.
    const autoResumeInFlightRef = useRef<boolean>(false);

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
            // Use the canonical parser that matches the
            // pending_response.schema.json contract on the blox side.
            // parsePendingResponse returns null on any malformed input
            // so the panel silently hides rather than rendering noise.
            const record = parsePendingResponse(parsed);
            if (record && mountedRef.current) {
                dispatch({ type: 'pending/set', record });
            } else if (mountedRef.current) {
                dispatch({ type: 'pending/clear' });
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
            // Track + persist the SSE id field (per-session monotonic
            // seq) so a backgrounded-or-killed app can resume via
            // GET /troubleshoot/resume?from=<lastEventSeq>. Null seqs
            // (synthetic truncation marker) intentionally don't update
            // the ref — they're not real buffer positions.
            onSeq: (seq: number | null) => {
                if (!mountedRef.current) return;
                if (seq === null) return;
                if (seq <= lastEventSeqRef.current) return;
                lastEventSeqRef.current = seq;
                // Read prompt + scenarioId from refs (not closure-
                // captured state) so attemptAutoResume's dispatch-then-
                // immediately-call-this codepath sees the JUST-set
                // values instead of the pre-resume null.
                const sid = sessionIdRef.current;
                const prompt = lastPromptRef.current;
                if (sid && prompt) {
                    schedulePersist({
                        sessionId: sid,
                        lastEventSeq: seq,
                        lastPrompt: prompt,
                        lastScenarioId: lastScenarioIdRef.current ?? 'freeform',
                        savedAt: Date.now(),
                    });
                }
            },
            onComplete: () => {
                if (!mountedRef.current) return;
                dispatch({ type: 'session/ended-complete' });
                // Generator finished — keep the persisted snapshot for
                // a brief replay window (user might still want resume
                // to view the verdict). Container's 30-min TTL +
                // PERSISTED_SESSION_MAX_AGE_MS in aiSessionPersistence
                // age it out naturally.
            },
            onError: (err: AiClientError) => {
                if (!mountedRef.current) return;
                dispatch({ type: 'session/transport-error', error: err });
                // 404 from /resume means the container evicted the
                // session (TTL elapsed, LRU, container restart).
                // Synchronously cancel any pending debounced write +
                // clear the snapshot so the next AppState foreground
                // doesn't immediately retry the dead session.
                if (err.kind === 'http-not-found') {
                    void (async () => {
                        await flushDebounce();
                        await clearPersistedSession();
                    })();
                }
            },
        };
    }, []);  // refs handle staleness; no closure deps needed

    // --------------------------------------------------------------------
    // Auto-resume after background / app-kill (2026-05-28 resume support).
    //
    // Flow:
    //   1. On hook mount AND on every AppState 'active' transition:
    //   2. Load persisted snapshot from AsyncStorage.
    //   3. If a snapshot exists AND we're not currently streaming AND
    //      we don't already have an active sessionId in local state:
    //   4. selectAiTransport() — resume is LAN-HTTP-only (the server's
    //      buffer + /resume endpoint only exist over HTTP; BLE has no
    //      equivalent state-replay surface).
    //   5. Dispatch session/resumed (sets sessionId + streaming=true).
    //   6. Call httpClient.resume(sessionId, lastEventSeq+1, callbacks).
    //   7. Buffered events replay via the same onEvent path; the chat
    //      transcript rebuilds inline. The truncation marker (synthetic
    //      `thought`) renders if events fell off the server-side cap.
    //
    // On 404 from /resume (session evicted): buildCallbacks' onError
    // already clears persistence + dispatches transport-error so the
    // chat surfaces Start-new-chat. We don't need to handle 404 here.
    // --------------------------------------------------------------------
    const attemptAutoResume = useCallback(async () => {
        if (autoResumeInFlightRef.current) return;
        if (state.streaming) return;
        if (sessionIdRef.current) return;  // already attached
        autoResumeInFlightRef.current = true;
        try {
            const snap = await loadPersistedSession();
            if (snap === null) return;
            if (!mountedRef.current) return;
            // Resume is LAN-HTTP-only — select transport explicitly so
            // we get an HttpAiClient. If only BLE is available, skip
            // auto-resume entirely (the persisted snapshot stays on
            // disk for the next foreground attempt).
            const choice = await selectAiTransport(bloxPeerId, appPeerId, {
                scanIfEmpty: true,
            });
            if (!mountedRef.current) return;
            if (choice.kind !== 'lan-http' || !choice.httpClient) {
                return;  // BLE or no transport — silently retain snapshot
            }
            const httpClient = choice.httpClient;
            // Restore local state BEFORE firing the SSE so onSeq
            // callbacks (which read state.lastPrompt/scenarioId)
            // have non-null values.
            const scenarioId = (snap.lastScenarioId as ScenarioId | 'freeform') ?? 'freeform';
            dispatch({
                type: 'session/resumed',
                sessionId: snap.sessionId,
                prompt: snap.lastPrompt,
                scenarioId,
            });
            sessionIdRef.current = snap.sessionId;
            lastEventSeqRef.current = snap.lastEventSeq;

            activeClientRef.current = httpClient;
            const handle = httpClient.resume(
                snap.sessionId,
                snap.lastEventSeq + 1,
                buildCallbacks(),
            );
            activeHandleRef.current = handle;
        } catch (e) {
            // selectAiTransport / loadPersistedSession failures are
            // non-fatal — the user can still tap Start session and a
            // fresh /troubleshoot will work normally.
            // eslint-disable-next-line no-console
            console.warn('attemptAutoResume failed', e);
        } finally {
            autoResumeInFlightRef.current = false;
        }
    }, [state.streaming, bloxPeerId, appPeerId, buildCallbacks]);

    useEffect(() => {
        // Mount-time attempt + every foreground transition.
        void attemptAutoResume();
        const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
            if (s === 'active') void attemptAutoResume();
        });
        return () => sub.remove();
    }, [attemptAutoResume]);

    const startSessionInternal = useCallback(
        async (
            prompt: string,
            opts?: {
                forceTransport?: 'lan-http' | 'ble';
                scenarioId?: ScenarioId | 'freeform';
            },
        ) => {
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

            // Flip streaming=true IMMEDIATELY so the UI can show a
            // "Connecting..." card while we run selectAiTransport
            // (which may take a couple seconds for an mDNS scan). Without
            // this the user sees the QuickStart card / CTA card stay put
            // for a while and may double-tap thinking nothing happened.
            // transportKind is filled in by `session/transport-selected`
            // once a choice is made; the UI doesn't need it to render
            // "Connecting...".
            dispatch({
                type: 'session/start-requested',
                prompt,
                scenarioId: opts?.scenarioId ?? 'freeform',
                transportKind: null,
            });

            let chosenKind: AiTransportKind;
            let client: AiClient;

            const bleAvailable = !!bleManager && !!blePeripheralId;

            if (opts?.forceTransport === 'ble') {
                if (!bleAvailable) {
                    dispatch({
                        type: 'session/transport-error',
                        error: { kind: 'no-transport', message: 'BLE not available on this device', transient: false },
                    });
                    return;
                }
                chosenKind = 'ble';
                client = new BleAiClient(bleManager!, blePeripheralId!);
            } else {
                // Plan A end-to-end follow-up: opt INTO `scanIfEmpty:
                // true` here. The Zeroconf-conflict concern (codex
                // Plan HTTP final-review BLOCK) only matters when the
                // pairing flow's Zeroconf is running concurrently —
                // that's only during InitialSetup. By the time
                // useAiSession.startSession fires, the user has tapped
                // a quick-start button in Diagnostics, which means
                // they're past pairing and no other scan is active.
                // Safe to run a one-shot scan to warm the mdnsCache if
                // it's empty on cold start.
                const choice = await selectAiTransport(bloxPeerId, appPeerId, {
                    scanIfEmpty: true,
                });
                chosenKind = choice.kind;
                if (choice.kind === 'lan-http') {
                    client = choice.httpClient!;
                } else if (bleAvailable) {
                    client = new BleAiClient(bleManager!, blePeripheralId!);
                } else {
                    // No transport available — neither LAN HTTP candidate
                    // qualified nor BLE wired. Use the dedicated
                    // 'no-transport' error kind so the chat renders a
                    // friendly, user-facing sentence (i18n key
                    // diagnostics.chat.errorEvent_noTransport) instead of
                    // the technical "[network] No transport available..."
                    // string.
                    dispatch({
                        type: 'session/transport-error',
                        error: { kind: 'no-transport', message: 'Cannot reach your Blox over LAN or Bluetooth', transient: false },
                    });
                    return;
                }
            }

            activeClientRef.current = client;
            dispatch({ type: 'session/transport-selected', transportKind: chosenKind });

            // Reset the persisted seq counter — every fresh session
            // starts at seq=0 on the server, so the persisted snapshot
            // from any prior session is now stale.
            lastEventSeqRef.current = -1;

            // Start a fresh session each time (codex catch: do not
            // try to "resume" via this path; that's what
            // attemptAutoResume + the /resume endpoint are for).
            const handle = client.runAi(prompt, undefined, buildCallbacks());
            activeHandleRef.current = handle;

            // session_started will arrive async via onEvent.
        },
        [bleManager, blePeripheralId, bloxPeerId, appPeerId, state.streaming, buildCallbacks],
    );

    // Phase 1.c/1.d/1.f (Session 2 2026-05-28) — start a deterministic
    // tree session via POST /troubleshoot/tree. LAN-HTTP only (BLE
    // path falls back to LLM via startSessionInternal). If LAN HTTP
    // isn't reachable, we surface the no-transport error.
    const startTreeInternal = useCallback(
        async (scenarioId: string, displayPrompt: string) => {
            if (state.streaming) return;
            try {
                activeHandleRef.current?.cancel();
            } catch { /* swallow */ }
            activeHandleRef.current = null;
            activeClientRef.current = null;

            dispatch({
                type: 'session/start-requested',
                prompt: displayPrompt,
                scenarioId: (scenarioId as ScenarioId | 'freeform'),
                transportKind: null,
            });

            const choice = await selectAiTransport(bloxPeerId, appPeerId, {
                scanIfEmpty: true,
            });
            if (choice.kind !== 'lan-http' || !choice.httpClient) {
                // Tree endpoint is HTTP-only. Fall back to LLM via the
                // standard LLM path so the user still gets help.
                await startSessionInternal(displayPrompt, {
                    scenarioId: (scenarioId as ScenarioId | 'freeform'),
                });
                return;
            }
            const httpClient = choice.httpClient;
            activeClientRef.current = httpClient;
            dispatch({ type: 'session/transport-selected', transportKind: 'lan-http' });
            lastEventSeqRef.current = -1;
            const handle = httpClient.runTree(
                scenarioId,
                undefined,
                buildCallbacks(),
            );
            activeHandleRef.current = handle;
        },
        [bloxPeerId, appPeerId, state.streaming, buildCallbacks, startSessionInternal],
    );

    const startSession = useCallback(
        async (prompt: string) => {
            // Phase 1.d: classify free-text first. If the LLM maps it
            // to a known scenario, route to the deterministic tree;
            // else fall through to the LLM path.
            const trimmed = prompt.trim();
            if (!trimmed) return;
            const choice = await selectAiTransport(bloxPeerId, appPeerId, {
                scanIfEmpty: true,
            });
            if (choice.kind === 'lan-http' && choice.httpClient) {
                const sid = await choice.httpClient.classify(trimmed).catch(() => 'other');
                if (sid === 'disconnected' || sid === 'not-earning' || sid === 'cannot-join-pool') {
                    await startTreeInternal(sid, trimmed);
                    return;
                }
            }
            await startSessionInternal(trimmed);
        },
        [bloxPeerId, appPeerId, startSessionInternal, startTreeInternal],
    );

    const startQuickStart = useCallback(
        async (id: ScenarioId) => {
            // Phase 1.f: quick-start buttons skip the classifier and
            // jump straight to the deterministic tree for that scenario.
            // The display prompt is still the scenario's canonical
            // English so the transcript reads naturally for the user.
            const scenario = getScenario(id);
            const treeScenarioId = id;   // ScenarioId values match server tree ids
            await startTreeInternal(treeScenarioId, scenario.canonicalPrompt);
        },
        [startTreeInternal],
    );

    const retryOverBle = useCallback(async () => {
        if (!state.lastPrompt) return;
        // Fresh session over BLE — codex's "do not claim seamless
        // resume" stance. Container's SessionManager will mint a new
        // sessionId; transcript shows the old error row + the new
        // session rows; no duplicate events. Preserve the scenarioId
        // from the original attempt so the uploaded transcript still
        // carries the right symptom-class label.
        await startSessionInternal(state.lastPrompt, {
            forceTransport: 'ble',
            scenarioId: state.lastScenarioId ?? 'freeform',
        });
    }, [state.lastPrompt, state.lastScenarioId, startSessionInternal]);

    const retrySamePrompt = useCallback(async () => {
        // Re-run the same prompt + scenario with auto-selected transport
        // (LAN HTTP preferred, BLE fallback). Used by the "Try again"
        // CTA the chat surface renders alongside synthetic verdicts
        // (root_cause: no_verdict_emitted | max_turns_exceeded) so the
        // user can re-roll without retyping. session/start-requested
        // resets the transcript inside the reducer, so we don't need
        // to call clearSession() first.
        if (!state.lastPrompt) return;
        await startSessionInternal(state.lastPrompt, {
            scenarioId: state.lastScenarioId ?? 'freeform',
        });
    }, [state.lastPrompt, state.lastScenarioId, startSessionInternal]);

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

    const clearSession = useCallback(() => {
        // Cancel any lingering SSE handle before we wipe the local state.
        // If the previous session already terminated (verdict or
        // transport-error), cancel() is a safe no-op.
        try {
            activeHandleRef.current?.cancel();
        } catch {
            // swallow
        }
        activeHandleRef.current = null;
        activeClientRef.current = null;
        sessionIdRef.current = null;
        lastEventSeqRef.current = -1;
        dispatch({ type: 'session/clear' });
        // Discard persisted resume state — user explicitly closed the
        // conversation, no point holding the snapshot for a
        // foreground/relaunch auto-resume that would re-show the same
        // dead chat.
        void (async () => {
            await flushDebounce();
            await clearPersistedSession();
        })();
    }, []);

    // ---- Recommendation flow --------------------------------------------

    const openApproval = useCallback((action: RecommendedActionEvent) => {
        dispatch({ type: 'modal/open-approval', action });
    }, []);

    const dismissApproval = useCallback(() => {
        dispatch({ type: 'modal/dismiss' });
    }, []);

    // confirmApproval matches ApprovalModal's onApprove signature:
    //   (security_code: string | null) => void
    // ApprovalModal passes `null` for tier-2 (no code) and the user's
    // 4-digit string for tier-3. Internally we await executeAction but
    // the modal contract is fire-and-forget.
    const confirmApproval = useCallback(
        (securityCode: string | null): void => {
            const action = state.modals.approvalAction;
            const client = activeClientRef.current;
            if (!action || !client) {
                dispatch({ type: 'modal/dismiss' });
                return;
            }
            dispatch({ type: 'busy/set', busy: true });
            void (async () => {
                try {
                    const result = await client.executeAction(
                        { action_id: action.action_id, approval_token: action.approval_token },
                        securityCode ?? undefined,
                    );
                    if (result.ok && result.payload) {
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
            })();
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
            // HttpAiClient/BleAiClient accept Record<string, unknown>;
            // PhoneContext is structurally compatible (its fields are
            // all serializable scalars/arrays/objects). Cast at the
            // boundary rather than widening the client surface.
            await client.phoneContext(sid, ctx as unknown as Record<string, unknown>);
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

    // submitFeedback matches FeedbackModal's onSubmit signature:
    //   (payload: FeedbackPayload) => void
    // The modal builds the payload internally via buildFeedbackPayload
    // and hands it to us already-shaped to the schema.
    //
    // Bug fix 2026-05-26: previously this dispatched modal/dismiss after
    // the BLE write completed, which auto-closed FeedbackModal the
    // instant the user picked 👍/👎/Skip. That killed the chance for
    // the user to ALSO tap "Share anonymized transcript…" — the share
    // button was visually present but unreachable. Now: this function
    // is fire-and-forget for the rating signal, and the modal manages
    // its own lifecycle (records "ratedAs" internally, shows the share
    // button afterward, dismisses only when the user explicitly closes
    // OR when the share action transitions activeModal away from
    // 'feedback').
    const submitFeedback = useCallback(
        (payload: FeedbackPayload): void => {
            if (!bleManager || !blePeripheralId) {
                // BLE unavailable — silently no-op the BLE write. The
                // modal stays open so the user can still share + close.
                return;
            }
            void (async () => {
                try {
                    await bleManager.writeToBLEAndWaitForResponse(
                        JSON.stringify({
                            command: 'ai/feedback',
                            args: payload,
                        }),
                        blePeripheralId, undefined, undefined, 10_000,
                    );
                } catch {
                    // Best-effort. Local-only feedback log on the
                    // device; not critical the network call succeeds.
                }
                // Intentionally NOT dispatching modal/dismiss here —
                // the modal stays open for the share follow-up.
            })();
        },
        [bleManager, blePeripheralId],
    );

    const openUploadTranscript = useCallback((payload: AnonymizedTranscript) => {
        dispatch({ type: 'modal/open-upload-transcript', payload });
    }, []);

    /**
     * Bridge action — wires the dead `openUploadTranscript` path to actual
     * user gestures. Builds an AnonymizedTranscript from the current live
     * transcript + the rating/comment the user just gave in FeedbackModal,
     * then opens UploadTranscriptModal so the user can REVIEW the JSON
     * before tapping Upload.
     *
     * Returns true iff the payload was built + the modal opened. Returns
     * false on any structural problem (no transcript, empty events,
     * anonymizer rejection) — caller can show a toast.
     *
     * Privacy: the actual POST to ai-training.fx.land/transcripts happens
     * inside UploadTranscriptModal's onUpload handler, NOT here. This
     * function only stages the preview. No network traffic.
     */
    const prepareTranscriptUpload = useCallback(
        (rating: FeedbackRating, comment?: string): boolean => {
            const entries = state.transcript;
            if (entries.length === 0) return false;
            // Session start = receivedAt of the first entry (we expect this
            // to be the session_started SSE event but don't require it).
            const sessionStartTs = new Date(entries[0].receivedAt).toISOString();

            // Convert hook's TranscriptEntry → anonymizer's RawTranscriptEvent.
            // The hook's `event` is the raw SSE event JSON (any extra fields
            // pass through); we just add a `ts` field from receivedAt.
            const rawEvents: RawTranscriptEvent[] = entries.map((e) => ({
                ...(e.event as unknown as Record<string, unknown>),
                type: (e.event as { type?: string }).type ?? 'unknown',
                ts: new Date(e.receivedAt).toISOString(),
            }));

            // Generate a fresh UUID for the upload (idempotency key on the
            // server). Hermes 0.74+ has crypto.randomUUID; fall back to a
            // simple v4 polyfill if unavailable.
            let uploadId: string;
            const cryptoObj = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
            if (cryptoObj?.randomUUID) {
                uploadId = cryptoObj.randomUUID();
            } else {
                // Minimal RFC4122 v4. Math.random is OK here — uploadId is an
                // idempotency key, not a security token.
                uploadId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                    const r = (Math.random() * 16) | 0;
                    const v = c === 'x' ? r : (r & 0x3) | 0x8;
                    return v.toString(16);
                });
            }

            try {
                const payload = anonymizeTranscript({
                    uploadId,
                    sessionStartTs,
                    events: rawEvents,
                    rating,
                    comment: comment && comment.trim() ? comment.trim() : undefined,
                    // Include the prompt + scenario the user picked so the
                    // operator analyzing this transcript has the full
                    // context — without these the verdict and recommended
                    // actions are hard to interpret. Anonymizer strips
                    // any PII from the prompt before it lands in the
                    // payload.
                    userPrompt: state.lastPrompt ?? undefined,
                    scenarioId: state.lastScenarioId ?? undefined,
                });
                dispatch({ type: 'modal/open-upload-transcript', payload });
                return true;
            } catch (e) {
                // AnonymizerError covers structural issues (too many events,
                // bad UUID, unknown event type, etc.). Non-fatal but the
                // share button MUST fail visibly — silent returns led to
                // a "tapped, nothing happens" bug (2026-05-26 lab report).
                // Log to console so the React Native DevTools / Metro log
                // captures it, AND return false so the caller can show a
                // toast/banner.
                const reason = e instanceof Error ? e.message : String(e);
                // eslint-disable-next-line no-console
                console.warn(
                    'prepareTranscriptUpload: anonymizeTranscript failed:',
                    reason,
                    { transcriptLen: rawEvents.length, eventTypes: rawEvents.map((r) => r.type) },
                );
                return false;
            }
        },
        [state.transcript, state.lastPrompt, state.lastScenarioId],
    );

    const dismissUploadTranscript = useCallback(() => {
        dispatch({ type: 'modal/dismiss' });
    }, []);

    // ---- Pending action approve/dismiss --------------------------------

    const approvePending = useCallback(
        (action: RecommendedActionEvent): void => {
            // Open approval modal for the pending action.
            dispatch({ type: 'modal/open-approval', action });
        },
        [],
    );

    // dismissPending matches PendingActionsPanel.onDismiss: `() => void`.
    // Clears the local pending state. Server-side dismissal (telling
    // the blox to drop the staged record) is best-effort and fire-and-
    // forget — refreshPending will get the updated list on next mount /
    // foreground.
    const dismissPending = useCallback(
        (): void => {
            dispatch({ type: 'pending/clear' });
            if (!bleManager || !blePeripheralId) return;
            void (async () => {
                try {
                    await bleManager.writeToBLEAndWaitForResponse(
                        JSON.stringify({
                            command: 'ai/pending-dismiss-all',
                            args: {},
                        }),
                        blePeripheralId, undefined, undefined, 5_000,
                    );
                } catch {
                    // swallow — local dispatch already cleared the panel
                }
            })();
        },
        [bleManager, blePeripheralId],
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
                clearSession,
                retryOverBle,
                retrySamePrompt,
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
                prepareTranscriptUpload,
                dismissUploadTranscript,
                refreshPending,
                approvePending,
                dismissPending,
            },
        }),
        [
            state, startSession, startQuickStart, endSession, cancelSession,
            clearSession, retryOverBle, retrySamePrompt, consumePrefill, openApproval, confirmApproval,
            dismissApproval, submitReply, openShareContext, confirmShareContext,
            dismissShareContext, openFeedback, submitFeedback, dismissFeedback,
            openUploadTranscript, prepareTranscriptUpload, dismissUploadTranscript,
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
