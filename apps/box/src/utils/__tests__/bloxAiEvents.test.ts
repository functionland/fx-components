/**
 * Phase 12 tests for bloxAiEvents.parseBloxAiEvent — typed discrimination of
 * the 10 SSE event variants Phase 11 added. Codex Q6: parse errors must
 * become synthetic `error` events so the chat transcript stays renderable.
 */
import { parseBloxAiEvent } from '../bloxAiEvents';

describe('parseBloxAiEvent — happy path for each variant', () => {
    test.each([
        ['session_started', { type: 'session_started', session_id: 'sess-1', protocol_version: 3 }],
        ['thought',          { type: 'thought', payload: 'looking…' }],
        ['tool_call',        { type: 'tool_call', call_id: 'c1', payload: { tool: 'diag/internet', args: {} } }],
        ['tool_result',      { type: 'tool_result', call_id: 'c1', ok: true, payload: { x: 1 } }],
        ['verdict',          { type: 'verdict', payload: { summary: 'ok', severity: 'green' } }],
        ['recommended_action', { type: 'recommended_action', action_id: 'a1', action_name: 'restart_fula', args: {}, reasoning: 'x', confidence: 0.5, tier: 2, approval_token: 't'.repeat(64) }],
        ['execution_result', { type: 'execution_result', action_id: 'a1', success: true, duration_ms: 100 }],
        ['user_question',    { type: 'user_question', question_id: 'q1', payload: { question: 'when?' } }],
        ['user_reply_received', { type: 'user_reply_received', question_id: 'q1', session_id: 'sess-1' }],
        ['error',            { type: 'error', code: 'X', message: 'm', recoverable: true }],
    ])('parses %s', (_name, frame) => {
        const ev = parseBloxAiEvent(frame);
        expect(ev.type).toBe((frame as any).type);
    });
});

describe('parseBloxAiEvent — malformed inputs become synthetic error events', () => {
    test.each([
        ['null',                      null],
        ['undefined',                 undefined],
        ['string',                    'hello'],
        ['number',                    42],
        ['no type field',             { payload: 'x' }],
        ['type not string',           { type: 123 }],
        ['unknown type',              { type: 'mystery', payload: 'x' }],
        ['thought.payload not string', { type: 'thought', payload: 123 }],
        ['tool_call missing call_id', { type: 'tool_call', payload: { tool: 'x', args: {} } }],
        ['tool_call missing tool',    { type: 'tool_call', call_id: 'c', payload: { args: {} } }],
        ['tool_result missing ok',    { type: 'tool_result', call_id: 'c', payload: {} }],
        ['verdict bad severity',      { type: 'verdict', payload: { summary: 's', severity: 'purple' } }],
        ['recommended_action bad tier', { type: 'recommended_action', action_id: 'a', action_name: 'x', args: {}, reasoning: 'r', confidence: 0.5, tier: 1, approval_token: 't' }],
        ['execution_result missing fields', { type: 'execution_result', action_id: 'a' }],
        ['user_question missing question', { type: 'user_question', question_id: 'q', payload: {} }],
        ['user_reply_received missing session_id', { type: 'user_reply_received', question_id: 'q' }],
        ['session_started wrong protocol', { type: 'session_started', session_id: 's', protocol_version: 2 }],
        ['error missing recoverable', { type: 'error', code: 'X', message: 'm' }],
    ])('rejects %s as synthetic error', (_name, frame) => {
        const ev = parseBloxAiEvent(frame);
        expect(ev.type).toBe('error');
        if (ev.type === 'error') {
            expect(ev.code).toBe('MALFORMED_FRAME');
            expect(ev.recoverable).toBe(true);
        }
    });
});

describe('parseBloxAiEvent — tier and severity guards', () => {
    test('verdict.severity yellow is accepted', () => {
        expect(parseBloxAiEvent({
            type: 'verdict', payload: { summary: 'meh', severity: 'yellow' },
        }).type).toBe('verdict');
    });

    test('recommended_action tier 3 is accepted', () => {
        const ev = parseBloxAiEvent({
            type: 'recommended_action',
            action_id: 'a', action_name: 'reset', args: {}, reasoning: 'x',
            confidence: 0.9, tier: 3, approval_token: 'k'.repeat(80),
        });
        expect(ev.type).toBe('recommended_action');
    });
});
