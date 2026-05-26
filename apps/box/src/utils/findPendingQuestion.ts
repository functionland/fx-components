/**
 * findPendingQuestion — Phase 12 pure helper extracted from BloxAIChat.
 *
 * Given a transcript of BloxAiEvents in arrival order, returns the most-recent
 * user_question that has NOT been answered yet (no user_reply_received after
 * it). Phase 11 guarantees at most one pending user_question per session
 * (container REJECTS consecutive user_question events; see api/README §3a),
 * so this is straightforward.
 *
 * Extracted from the BloxAIChat component so it can be unit-tested without
 * the @functionland/component-library native-module render path that Phase 5
 * explicitly avoided in test scope.
 */
import type { BloxAiEvent, UserQuestionEvent, TranscriptEntry } from './bloxAiEvents';

export function findPendingQuestion(transcript: TranscriptEntry[]): UserQuestionEvent | null {
    for (let i = transcript.length - 1; i >= 0; i--) {
        const e = transcript[i].event;
        if (e.type === 'user_reply_received') {
            // Newer reply received — no pending question
            return null;
        }
        if (e.type === 'user_question') {
            return e;
        }
    }
    return null;
}
