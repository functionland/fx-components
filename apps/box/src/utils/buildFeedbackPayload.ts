/**
 * buildFeedbackPayload — Phase 16 pure helper.
 *
 * Constructs the body the app POSTs to the ai/feedback BLE proxy. Mirrors
 * fula-ota's feedback_request.schema.json v1 byte-for-byte.
 *
 * Extracted from FeedbackModal.tsx (per Phase 5 lesson: jest can't import
 * @functionland/component-library, so the pure construction logic lives
 * here and is tested without rendering the modal).
 */

export type FeedbackRating = -1 | 0 | 1;

export interface BuildFeedbackPayloadArgs {
    sessionId: string;
    rating: FeedbackRating;
    /** Raw user-typed comment. Empty / whitespace-only is treated as absent. */
    comment?: string;
}

export interface FeedbackPayload {
    session_id: string;
    rating: FeedbackRating;
    comment?: string;
}

/** Max length matches the schema cap. UI MUST also cap the input field so
 *  the user doesn't type past the limit; this is the last-line guard. */
export const COMMENT_MAX_LENGTH = 2000;

/**
 * Build the BLE payload.
 *
 * - sessionId is required; an empty/whitespace value throws. The modal
 *   parent must have a real session_id from the SSE session_started event;
 *   if we don't, the upstream code is broken and silently dropping is worse
 *   than failing fast.
 * - rating MUST be -1 | 0 | 1; any other value throws. Closed enum mirror.
 * - comment is normalized: trimmed; CR/LF replaced with single spaces
 *   (defense-in-depth log-injection prevention, even though container also
 *   sanitizes); truncated to COMMENT_MAX_LENGTH; omitted if empty after
 *   normalization.
 */
export function buildFeedbackPayload(args: BuildFeedbackPayloadArgs): FeedbackPayload {
    const { sessionId, rating, comment } = args;
    if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
        throw new Error('buildFeedbackPayload: sessionId is required');
    }
    if (rating !== -1 && rating !== 0 && rating !== 1) {
        throw new Error('buildFeedbackPayload: rating must be -1 | 0 | 1');
    }
    const payload: FeedbackPayload = {
        session_id: sessionId,
        rating,
    };
    if (typeof comment === 'string') {
        // Strip CR/LF (log-injection defense), trim, then truncate.
        const normalised = comment
            .replace(/[\r\n]+/g, ' ')
            .trim()
            .slice(0, COMMENT_MAX_LENGTH);
        if (normalised.length > 0) {
            payload.comment = normalised;
        }
    }
    return payload;
}
