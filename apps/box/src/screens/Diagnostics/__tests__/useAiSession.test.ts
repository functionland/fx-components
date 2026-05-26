/**
 * Plan A v2 — A1 reducer + state-machine tests for useAiSession.
 *
 * Focus on the PURE reducer (no RN runtime needed); the hook's async
 * orchestration glue is exercised at lab/integration level. This file
 * locks the state transitions that all the modals + transport-switch
 * logic depend on.
 */

import { _internal } from '../useAiSession';
import type { BloxAiEvent, RecommendedActionEvent } from '../../../utils/bloxAiEvents';

const { reducer, initialState, QUICK_START_SCENARIOS } = _internal;

describe('useAiSession reducer — initial state', () => {
    test('starts empty with no transport / no session', () => {
        const s = initialState(null);
        expect(s.transcript).toEqual([]);
        expect(s.sessionId).toBeNull();
        expect(s.streaming).toBe(false);
        expect(s.transportKind).toBeNull();
        expect(s.modals.active).toBeNull();
        expect(s.pending).toBeNull();
        expect(s.lastPrompt).toBeNull();
        expect(s.lastTransportError).toBeNull();
        expect(s.prefilledScenario).toBeNull();
    });

    test('accepts initial prefilled scenario', () => {
        const s = initialState('disconnected');
        expect(s.prefilledScenario).toBe('disconnected');
    });
});

describe('useAiSession reducer — session lifecycle', () => {
    test('session/start-requested resets transcript, sets streaming + lastPrompt', () => {
        const before = { ...initialState(null), transcript: [{ id: 'old', event: { type: 'thought', payload: 'old' } as BloxAiEvent, receivedAt: 0 }] };
        const after = reducer(before, {
            type: 'session/start-requested',
            prompt: 'why disconnected?',
            transportKind: 'lan-http',
        });
        expect(after.transcript).toEqual([]);
        expect(after.streaming).toBe(true);
        expect(after.transportKind).toBe('lan-http');
        expect(after.lastPrompt).toBe('why disconnected?');
        expect(after.lastTransportError).toBeNull();
        expect(after.sessionId).toBeNull();   // cleared
    });

    test('session/started captures the sessionId', () => {
        const s = reducer(initialState(null), { type: 'session/started', sessionId: 'sess-42' });
        expect(s.sessionId).toBe('sess-42');
    });

    test('session/event appends to transcript', () => {
        const s = reducer(initialState(null), {
            type: 'session/event',
            event: { type: 'thought', payload: 'hmm' } as BloxAiEvent,
        });
        expect(s.transcript).toHaveLength(1);
        expect(s.transcript[0].event.type).toBe('thought');
    });

    test('session/event with session_started auto-captures sessionId', () => {
        const s = reducer(initialState(null), {
            type: 'session/event',
            event: { type: 'session_started', session_id: 'auto-1', protocol_version: 3 } as BloxAiEvent,
        });
        expect(s.sessionId).toBe('auto-1');
    });

    test('session/event with verdict stops streaming', () => {
        const start = reducer(initialState(null), {
            type: 'session/start-requested', prompt: 'p', transportKind: 'ble',
        });
        const after = reducer(start, {
            type: 'session/event',
            event: { type: 'verdict', payload: { summary: 'ok', severity: 'green' } } as BloxAiEvent,
        });
        expect(after.streaming).toBe(false);
    });

    test('session/event with recommended_action auto-opens approval modal when no other modal active', () => {
        const action: RecommendedActionEvent = {
            type: 'recommended_action',
            action_id: 'a1',
            action_name: 'restart_kubo',
            args: {},
            reasoning: 'because',
            confidence: 0.8,
            tier: 2,
            approval_token: 'tok',
        };
        const s = reducer(initialState(null), { type: 'session/event', event: action });
        expect(s.modals.active).toBe('approval');
        expect(s.modals.approvalAction?.action_id).toBe('a1');
    });

    test('session/event with recommended_action does NOT clobber an open feedback modal', () => {
        // Pre-open feedback modal.
        const withFeedback = reducer(initialState(null), {
            type: 'modal/open-feedback', sessionId: 'sess',
        });
        expect(withFeedback.modals.active).toBe('feedback');

        const action: RecommendedActionEvent = {
            type: 'recommended_action',
            action_id: 'a1', action_name: 'x', args: {}, reasoning: 'r',
            confidence: 0.5, tier: 2, approval_token: 't',
        };
        const after = reducer(withFeedback, { type: 'session/event', event: action });
        // Action lands in transcript but modal stays as feedback.
        expect(after.modals.active).toBe('feedback');
        expect(after.transcript.some(t => t.event.type === 'recommended_action')).toBe(true);
    });

    test('session/transport-error stops streaming + appends synthetic error entry + records lastTransportError', () => {
        const after = reducer(initialState(null), {
            type: 'session/transport-error',
            error: { kind: 'network', message: 'boom', transient: true },
        });
        expect(after.streaming).toBe(false);
        expect(after.lastTransportError?.kind).toBe('network');
        expect(after.transcript).toHaveLength(1);
        const last = after.transcript[0].event;
        if (last.type === 'error') {
            expect(last.code).toBe('network');
            expect(last.recoverable).toBe(true);
        } else {
            throw new Error('expected synthetic error event');
        }
    });

    test('session/ended-by-user opens feedback modal with the sessionId', () => {
        const after = reducer(initialState(null), {
            type: 'session/ended-by-user', sessionId: 'sess-9',
        });
        expect(after.streaming).toBe(false);
        expect(after.modals.active).toBe('feedback');
        expect(after.modals.feedbackSessionId).toBe('sess-9');
    });
});

describe('useAiSession reducer — modal mutual exclusion', () => {
    test('modal/dismiss clears all modal state at once', () => {
        const action: RecommendedActionEvent = {
            type: 'recommended_action', action_id: 'a', action_name: 'x', args: {},
            reasoning: 'r', confidence: 0.5, tier: 2, approval_token: 't',
        };
        const withApproval = reducer(initialState(null), { type: 'modal/open-approval', action });
        expect(withApproval.modals.active).toBe('approval');

        const dismissed = reducer(withApproval, { type: 'modal/dismiss' });
        expect(dismissed.modals.active).toBeNull();
        expect(dismissed.modals.approvalAction).toBeNull();
    });

    test('opening one modal replaces another (mutual exclusion via activeModal enum)', () => {
        const action: RecommendedActionEvent = {
            type: 'recommended_action', action_id: 'a', action_name: 'x', args: {},
            reasoning: 'r', confidence: 0.5, tier: 2, approval_token: 't',
        };
        // Use the canonical PhoneContext shape from phoneLogger.
        const samplePhoneCtx = {
            app_version: '2.5.6',
            os: 'android' as const,
            os_version: '14',
        };
        const withApproval = reducer(initialState(null), { type: 'modal/open-approval', action });
        const withShare = reducer(withApproval, {
            type: 'modal/open-share-context', preview: samplePhoneCtx,
        });
        expect(withShare.modals.active).toBe('shareContext');
        // Approval data is preserved in slot but UI reads `active`.
        expect(withShare.modals.approvalAction?.action_id).toBe('a');
        expect(withShare.modals.shareContextPreview).toEqual(samplePhoneCtx);
    });

    test('opening upload-transcript modal stores the payload', () => {
        // AnonymizedTranscript has a tight schema — supply minimum
        // required fields per anonymizeTranscript.ts.
        const sampleAnon = {
            schema_version: 1 as const,
            upload_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
            session_relative_start: '+0s' as const,
            events: [],
            user_rating: 1 as const,
            consent: {
                explicit_opt_in: true as const,
                preview_shown: true as const,
                anonymizer_version: 'v1',
            },
            device_class: 'rk3588' as const,
        };
        const after = reducer(initialState(null), {
            type: 'modal/open-upload-transcript', payload: sampleAnon,
        });
        expect(after.modals.active).toBe('uploadTranscript');
        expect(after.modals.uploadTranscriptPayload).toEqual(sampleAnon);
    });
});

describe('useAiSession reducer — pending actions', () => {
    // Canonical PendingActionsRecord shape per parsePendingResponse.ts —
    // matches the blox-side pending_response.schema.json contract.
    const samplePending = {
        ts: '2026-01-01T00:00:00Z',
        trigger: 'isolation_mode' as const,
        verdict: null,
        actions: [{
            type: 'recommended_action' as const,
            action_id: 'a',
            action_name: 'x',
            args: {},
            reasoning: 'r',
            confidence: 0.5,
            tier: 2 as const,
            approval_token: 't',
        }],
    };

    test('pending/set stores the record + clears errors', () => {
        const errored = reducer(initialState(null), { type: 'pending/error', message: 'oh no' });
        expect(errored.pendingError).toBe('oh no');
        const after = reducer(errored, {
            type: 'pending/set',
            record: samplePending,
        });
        expect(after.pending?.actions).toHaveLength(1);
        expect(after.pendingError).toBeNull();
    });

    test('pending/clear resets both', () => {
        const set = reducer(initialState(null), {
            type: 'pending/set',
            record: samplePending,
        });
        const cleared = reducer(set, { type: 'pending/clear' });
        expect(cleared.pending).toBeNull();
        expect(cleared.pendingError).toBeNull();
    });
});

describe('useAiSession reducer — prefill consumption', () => {
    test('prefill/consume clears it (no re-prefill on focus/remount per codex catch)', () => {
        const before = initialState('disconnected');
        expect(before.prefilledScenario).toBe('disconnected');
        const after = reducer(before, { type: 'prefill/consume' });
        expect(after.prefilledScenario).toBeNull();
    });

    test('prefill/set overrides the current value', () => {
        const s = reducer(initialState(null), { type: 'prefill/set', scenario: 'not-earning' });
        expect(s.prefilledScenario).toBe('not-earning');
    });
});

describe('quick-start scenarios — canonical English prompts', () => {
    test('disconnected scenario carries the expected English prompt', () => {
        const p = QUICK_START_SCENARIOS['disconnected'].canonicalPrompt;
        expect(p).toContain('Blox');
        expect(p).toContain('disconnected');
    });

    test('all 3 scenarios are present', () => {
        expect(Object.keys(QUICK_START_SCENARIOS).sort()).toEqual(
            ['cannot-join-pool', 'disconnected', 'not-earning'],
        );
    });
});
