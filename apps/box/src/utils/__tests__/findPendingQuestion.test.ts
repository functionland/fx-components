/**
 * Phase 12 — findPendingQuestion tests. Pure helper extracted from
 * BloxAIChat for testability (Phase 5 lesson: avoid full component renders
 * against @functionland/component-library).
 */
import { findPendingQuestion } from '../findPendingQuestion';
import type { TranscriptEntry, BloxAiEvent } from '../bloxAiEvents';

function entry(id: string, event: BloxAiEvent): TranscriptEntry {
    return { id, event, receivedAt: Date.now() };
}

describe('findPendingQuestion', () => {
    test('returns null for empty transcript', () => {
        expect(findPendingQuestion([])).toBeNull();
    });

    test('returns null when transcript has no user_question', () => {
        const t = [
            entry('1', { type: 'thought', payload: 'thinking…' }),
            entry('2', { type: 'verdict', payload: { summary: 'OK', severity: 'green' } }),
        ];
        expect(findPendingQuestion(t)).toBeNull();
    });

    test('returns the user_question when present + unanswered', () => {
        const q: BloxAiEvent = {
            type: 'user_question', question_id: 'q-1',
            payload: { question: 'When did this start?' },
        };
        const t = [
            entry('1', { type: 'thought', payload: 'x' }),
            entry('2', q),
        ];
        expect(findPendingQuestion(t)).toBe(q);
    });

    test('returns null when user_reply_received follows the user_question', () => {
        const q: BloxAiEvent = {
            type: 'user_question', question_id: 'q-1',
            payload: { question: 'When?' },
        };
        const ack: BloxAiEvent = {
            type: 'user_reply_received', question_id: 'q-1', session_id: 's-1',
        };
        const t = [entry('1', q), entry('2', ack)];
        expect(findPendingQuestion(t)).toBeNull();
    });

    test('returns the most-recent user_question when multiple appear (Phase 11 contract: container rejects consecutive — so this is a defensive guard)', () => {
        const q1: BloxAiEvent = {
            type: 'user_question', question_id: 'q-1',
            payload: { question: 'A?' },
        };
        const ack1: BloxAiEvent = {
            type: 'user_reply_received', question_id: 'q-1', session_id: 's-1',
        };
        const q2: BloxAiEvent = {
            type: 'user_question', question_id: 'q-2',
            payload: { question: 'B?' },
        };
        const t = [entry('1', q1), entry('2', ack1), entry('3', q2)];
        expect(findPendingQuestion(t)).toBe(q2);
    });

    test('intervening tool_call / tool_result do not clear the pending question', () => {
        const q: BloxAiEvent = {
            type: 'user_question', question_id: 'q-1',
            payload: { question: 'When?' },
        };
        const t = [
            entry('1', q),
            entry('2', {
                type: 'tool_call', call_id: 'c-1',
                payload: { tool: 'diag/internet', args: {} },
            }),
            entry('3', {
                type: 'tool_result', call_id: 'c-1', ok: true, payload: {},
            }),
        ];
        expect(findPendingQuestion(t)).toBe(q);
    });
});
