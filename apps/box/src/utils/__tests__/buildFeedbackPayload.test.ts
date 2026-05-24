/**
 * Phase 16 — buildFeedbackPayload tests.
 *
 * The helper builds the JSON body for the ai/feedback BLE command. Tests
 * verify it matches the fula-ota feedback_request.schema.json contract:
 *   - session_id required
 *   - rating closed enum {-1, 0, 1}
 *   - optional comment, trimmed, CR/LF-stripped, ≤2000 chars
 *   - empty-after-normalize comment is OMITTED (not sent as empty string)
 */
import {
    buildFeedbackPayload,
    COMMENT_MAX_LENGTH,
} from '../buildFeedbackPayload';

describe('buildFeedbackPayload', () => {
    test('builds minimal thumbs-up payload', () => {
        const p = buildFeedbackPayload({ sessionId: 'sess-1', rating: 1 });
        expect(p).toEqual({ session_id: 'sess-1', rating: 1 });
    });

    test('builds thumbs-down payload with comment', () => {
        const p = buildFeedbackPayload({
            sessionId: 'sess-1',
            rating: -1,
            comment: 'still offline',
        });
        expect(p).toEqual({
            session_id: 'sess-1',
            rating: -1,
            comment: 'still offline',
        });
    });

    test('explicit skip (rating=0) is distinct from modal-dismissed', () => {
        const p = buildFeedbackPayload({ sessionId: 'sess-1', rating: 0 });
        expect(p.rating).toBe(0);
    });

    test('rejects empty sessionId', () => {
        expect(() => buildFeedbackPayload({ sessionId: '', rating: 1 })).toThrow();
        expect(() => buildFeedbackPayload({ sessionId: '   ', rating: 1 })).toThrow();
    });

    test('rejects invalid rating', () => {
        for (const bad of [2, -2, 5, 0.5, NaN] as const) {
            expect(() => buildFeedbackPayload({
                sessionId: 's', rating: bad as unknown as 0,
            })).toThrow();
        }
    });

    test('trims whitespace from comment', () => {
        const p = buildFeedbackPayload({
            sessionId: 's', rating: 1, comment: '   ok thanks   ',
        });
        expect(p.comment).toBe('ok thanks');
    });

    test('strips CR/LF from comment (log-injection defense)', () => {
        const p = buildFeedbackPayload({
            sessionId: 's', rating: -1,
            comment: 'line1\nline2\r\nline3',
        });
        expect(p.comment).toBe('line1 line2 line3');
        expect(p.comment).not.toMatch(/[\r\n]/);
    });

    test('omits comment when it is empty after normalization', () => {
        const p1 = buildFeedbackPayload({
            sessionId: 's', rating: 0, comment: '   ',
        });
        expect(p1).not.toHaveProperty('comment');

        const p2 = buildFeedbackPayload({
            sessionId: 's', rating: 0, comment: '',
        });
        expect(p2).not.toHaveProperty('comment');

        const p3 = buildFeedbackPayload({
            sessionId: 's', rating: 0, comment: '\n\r\n',
        });
        expect(p3).not.toHaveProperty('comment');
    });

    test('truncates oversized comment to COMMENT_MAX_LENGTH', () => {
        const p = buildFeedbackPayload({
            sessionId: 's', rating: 1, comment: 'x'.repeat(5000),
        });
        expect(p.comment).toHaveLength(COMMENT_MAX_LENGTH);
    });

    test('preserves comment exactly at the cap', () => {
        const exact = 'a'.repeat(COMMENT_MAX_LENGTH);
        const p = buildFeedbackPayload({
            sessionId: 's', rating: 1, comment: exact,
        });
        expect(p.comment).toBe(exact);
    });

    test('omitted comment in args means no comment field', () => {
        const p = buildFeedbackPayload({ sessionId: 's', rating: 1 });
        expect(p).not.toHaveProperty('comment');
    });

    test('payload key order is deterministic for snapshot-friendly comparison', () => {
        const p = buildFeedbackPayload({
            sessionId: 'abc', rating: 1, comment: 'great',
        });
        expect(Object.keys(p)).toEqual(['session_id', 'rating', 'comment']);
    });
});
