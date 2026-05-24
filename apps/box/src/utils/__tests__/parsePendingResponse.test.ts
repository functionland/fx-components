/**
 * Phase 15 — parsePendingResponse tests (pure helper).
 */
import { parsePendingResponse } from '../parsePendingResponse';

function makeAction(id = 'a1', tier: 2 | 3 = 2) {
    return {
        type: 'recommended_action',
        action_id: id,
        action_name: 'restart_fula',
        args: {},
        reasoning: 'kubo hung; restart will clear it',
        confidence: 0.8,
        tier,
        approval_token: 't'.repeat(64),
    };
}

describe('parsePendingResponse', () => {
    test('returns null for null/undefined/non-object input', () => {
        expect(parsePendingResponse(null)).toBeNull();
        expect(parsePendingResponse(undefined)).toBeNull();
        expect(parsePendingResponse(42)).toBeNull();
        expect(parsePendingResponse('hello')).toBeNull();
    });

    test('returns null when trigger is not isolation_mode', () => {
        expect(parsePendingResponse({
            ts: '2026-05-24T07:00:00Z',
            trigger: 'manual',
            actions: [makeAction()],
        })).toBeNull();
    });

    test('returns null when ts is missing', () => {
        expect(parsePendingResponse({
            trigger: 'isolation_mode',
            actions: [makeAction()],
        })).toBeNull();
    });

    test('returns null when actions is not an array', () => {
        expect(parsePendingResponse({
            ts: '2026-05-24T07:00:00Z',
            trigger: 'isolation_mode',
            actions: 'not-an-array',
        })).toBeNull();
    });

    test('returns null when all actions are malformed', () => {
        expect(parsePendingResponse({
            ts: '2026-05-24T07:00:00Z',
            trigger: 'isolation_mode',
            actions: [
                {action_id: 'incomplete'},
                {type: 'recommended_action'},
            ],
        })).toBeNull();
    });

    test('parses a minimal valid response (no verdict)', () => {
        const r = parsePendingResponse({
            ts: '2026-05-24T07:00:00Z',
            trigger: 'isolation_mode',
            actions: [makeAction('a1'), makeAction('a2')],
        });
        expect(r).not.toBeNull();
        expect(r!.actions).toHaveLength(2);
        expect(r!.verdict).toBeNull();
        expect(r!.trigger).toBe('isolation_mode');
    });

    test('preserves a valid verdict', () => {
        const verdict = {
            type: 'verdict',
            payload: {summary: 'wifi flaky', severity: 'yellow', root_cause: 'wifi'},
        };
        const r = parsePendingResponse({
            ts: '2026-05-24T07:00:00Z',
            trigger: 'isolation_mode',
            verdict,
            actions: [makeAction()],
        });
        expect(r!.verdict).toEqual(verdict);
    });

    test('drops malformed verdict but keeps valid actions', () => {
        const r = parsePendingResponse({
            ts: '2026-05-24T07:00:00Z',
            trigger: 'isolation_mode',
            verdict: {type: 'verdict', payload: {summary: 'x', severity: 'purple'}},
            actions: [makeAction()],
        });
        expect(r!.verdict).toBeNull();
        expect(r!.actions).toHaveLength(1);
    });

    test('skips malformed actions but keeps well-formed ones', () => {
        const r = parsePendingResponse({
            ts: '2026-05-24T07:00:00Z',
            trigger: 'isolation_mode',
            actions: [
                makeAction('good1'),
                {type: 'recommended_action', action_id: 'bad'},
                makeAction('good2'),
                {nonsense: true},
                makeAction('good3', 3),
            ],
        });
        expect(r!.actions).toHaveLength(3);
        expect(r!.actions.map(a => a.action_id)).toEqual(['good1', 'good2', 'good3']);
    });

    test('rejects action with tier 1 (read-only) or invalid tier', () => {
        const r = parsePendingResponse({
            ts: '2026-05-24T07:00:00Z',
            trigger: 'isolation_mode',
            actions: [
                {...makeAction(), tier: 1},
                {...makeAction(), tier: 4},
                {...makeAction(), tier: 'two'},
                makeAction('keep'),
            ],
        });
        expect(r!.actions).toHaveLength(1);
        expect(r!.actions[0].action_id).toBe('keep');
    });
});
