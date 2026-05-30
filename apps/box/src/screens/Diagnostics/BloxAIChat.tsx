/**
 * BloxAIChat — Phase 12 chat transcript + input subcomponent.
 *
 * Rendered inside DiagnosticsScreen when the blox-ai plugin is installed.
 * Owns the transcript state (append-only list of typed BloxAiEvents) and
 * the user_question reply input. ApprovalModal + SharePhoneContextModal
 * are owned by the parent screen so they can sit on top of the scroll view.
 *
 * Event rendering per advisor consensus + Phase 9-11 contracts:
 *   - session_started: silent (Q5) — but transitions the "connecting…" → "AI is analyzing…" label
 *   - thought: italic gray, collapsed by default
 *   - tool_call + matched tool_result: rendered as one chip "Ran `diag/X` → ✓/✗"
 *   - verdict: traffic-light banner (green/yellow/red)
 *   - recommended_action: action card; tap "Approve" → parent opens ApprovalModal
 *   - execution_result: "Action completed" or "Action failed: …" card
 *   - user_question: chat bubble + text input or boolean/choice picker
 *   - user_reply_received: collapsed; only used to mark the local reply as "delivered"
 *   - error: red banner; if recoverable, allow retry
 *
 * Unknown event types → already converted to synthetic `error` by parseBloxAiEvent
 * (Codex Q6: keep transcript renderable on malformed input).
 */
import React from 'react';
import { ActivityIndicator, TextInput, Pressable, StyleSheet } from 'react-native';
import {
    FxBox,
    FxText,
    FxButton,
    FxCard,
    FxSpacer,
    useFxTheme,
} from '@functionland/component-library';
import { useTranslation } from 'react-i18next';
import type {
    BloxAiEvent,
    TranscriptEntry,
    RecommendedActionEvent,
    UserQuestionEvent,
} from '../../utils/bloxAiEvents';
import { CUSTOM_QUESTION_ENABLED } from './quickStartPrompts';

export interface BloxAIChatProps {
    /** Transcript of events received so far. */
    transcript: TranscriptEntry[];
    /** True while a session is open + the model is generating. */
    streaming: boolean;
    /** session_id from session_started; null = no session yet. */
    sessionId: string | null;
    /** Fired when the user taps Approve on a recommended_action card. */
    onApprove: (action: RecommendedActionEvent) => void;
    /** Fired when the user submits a reply to a user_question. */
    onSubmitReply: (question_id: string, reply_text: string) => void;
    /** Fired when the user taps "Share my phone's context". */
    onShareContext: () => void;
    /** Fired when the user taps the initial CTA to start a session. */
    onStartSession: (prompt: string) => void;
    /**
     * Fired when the user taps "End session & share" — opens the
     * FeedbackModal where they can rate + optionally share the
     * anonymized transcript (Phase 21 / Phase 16). Only rendered as a
     * button when sessionId is set AND streaming is false (i.e. the
     * session has yielded its verdict). Until then the chat is still
     * live and we don't offer the end-CTA. */
    onOpenFeedback?: () => void;
    /**
     * Fired when the user taps "Start a new chat". Pure local state reset —
     * the parent's clearSession() wipes the transcript so a fresh prompt
     * can be entered. Rendered alongside onOpenFeedback when the active
     * session has ended (verdict reached, user ended it, OR transport
     * aborted — common after the phone returns from background and the
     * SSE stream surfaces "Software caused connection abort"). Without
     * this affordance the user is stuck on a dead transcript and has to
     * navigate away to reset. */
    onStartNewChat?: () => void;
    /**
     * Fired when the user taps "Try again with the same question". Re-runs
     * the most recent prompt + scenario without forcing the user to retype.
     * Rendered alongside onStartNewChat ONLY when the final verdict in the
     * transcript is one of the SYNTHETIC fallbacks the backend emits when
     * the model couldn't converge — root_cause "no_verdict_emitted" (model
     * went prose-only) or "max_turns_exceeded" (8-turn budget burned).
     * Useful because the model is sampled with non-zero temperature so a
     * second attempt often produces a real verdict where the first did not. */
    onRetrySamePrompt?: () => void;
    /** True while ai/execute or ai/phone-context is in flight (locks UI). */
    busy?: boolean;
}

// The most-recent user_question that hasn't been answered yet, if any.
function findPendingQuestion(t: TranscriptEntry[]): UserQuestionEvent | null {
    for (let i = t.length - 1; i >= 0; i--) {
        const e = t[i].event;
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

// Synthetic root_cause codes the rkllm backend emits when the model
// couldn't converge on a real verdict. Kept in sync with
// `blox-ai/src/runtime/rkllm_runtime.py` (search FORCE_VERDICT_DIRECTIVE,
// the no-evidence guardrail, and the two yield {"type":"verdict",
// … "root_cause": …} sites).
const SYNTHETIC_VERDICT_CODES = new Set<string>([
    'no_verdict_emitted',
    'max_turns_exceeded',
    // 2026-05-28 no-evidence guardrail: backend overrides a
    // hallucinated verdict (model claimed red severity with zero
    // successful tool calls) with this synthetic code so the
    // Try-Again button surfaces.
    'insufficient_data',
]);

const SCHEMA_ERROR_CODES = new Set<string>([
    'SCHEMA_VIOLATION',
    'SCHEMA_VIOLATION_RECOVERED',
]);

// "Try again with the same question" surfaces when the chat ended in
// a state the user can't reasonably act on:
//   (a) the final verdict's root_cause is one of the synthetic codes
//       (model couldn't converge / no data / exceeded turn budget), OR
//   (b) the model emitted a schema-violating event AND no real verdict
//       followed it (the chat just stops on the recovered error).
// Both states leave the user staring at a dead-end chat; the
// retry-same-prompt button gives them a one-tap recovery.
function shouldOfferRetry(t: TranscriptEntry[]): boolean {
    // Walk backwards to find the last verdict OR the last schema error
    // (whichever came first from the end).
    for (let i = t.length - 1; i >= 0; i--) {
        const e = t[i].event as { type?: string; code?: string; payload?: { root_cause?: string } };
        if (e.type === 'verdict') {
            const rc = e.payload?.root_cause;
            return typeof rc === 'string' && SYNTHETIC_VERDICT_CODES.has(rc);
        }
        if (e.type === 'error' && typeof e.code === 'string' && SCHEMA_ERROR_CODES.has(e.code)) {
            // Schema error with no verdict following → offer retry.
            return true;
        }
    }
    return false;
}

export const BloxAIChat: React.FC<BloxAIChatProps> = ({
    transcript,
    streaming,
    sessionId,
    onApprove,
    onSubmitReply,
    onShareContext,
    onStartSession,
    onOpenFeedback,
    onStartNewChat,
    onRetrySamePrompt,
    busy = false,
}) => {
    const { t } = useTranslation();
    const { colors } = useFxTheme();
    const [initialPrompt, setInitialPrompt] = React.useState('');
    const [replyText, setReplyText] = React.useState('');

    const pendingQuestion = findPendingQuestion(transcript);

    // Reset reply text when the pending question changes
    React.useEffect(() => {
        setReplyText('');
    }, [pendingQuestion?.question_id]);

    const handleStart = React.useCallback(() => {
        if (!initialPrompt.trim()) return;
        onStartSession(initialPrompt.trim());
        setInitialPrompt('');
    }, [initialPrompt, onStartSession]);

    const handleSubmitReply = React.useCallback(() => {
        if (!pendingQuestion || !replyText.trim()) return;
        onSubmitReply(pendingQuestion.question_id, replyText.trim());
    }, [pendingQuestion, replyText, onSubmitReply]);

    // Streaming flipped on but session_started + first events haven't
    // arrived yet → user just tapped a quick-start scenario or Start.
    // Show an immediate "Connecting…" card so they don't think the tap
    // did nothing (and don't double-tap).
    if (streaming && !sessionId && transcript.length === 0) {
        return (
            <FxCard testID="blox-ai-chat-connecting">
                <FxCard.Title>{t('diagnostics.chat.connectingTitle')}</FxCard.Title>
                <FxBox paddingVertical="8" flexDirection="row" alignItems="center">
                    <ActivityIndicator size="small" />
                    <FxSpacer width={8} />
                    <FxText variant="bodySmallRegular" style={{ flex: 1 }}>
                        {t('diagnostics.chat.connectingSubtitle')}
                    </FxText>
                </FxBox>
            </FxCard>
        );
    }

    // No session yet AND not streaming: show CTA (the "type your own
    // prompt" entry point).
    if (!sessionId && transcript.length === 0) {
        // Free-text ("custom question") entry point — gated off while the
        // on-device model is decommissioned (BLOX_AI_MODEL_ENABLED=0). With
        // the flag off, QuickStartCard's preset scenarios (deterministic YAML
        // trees, no LLM) are the only empty-state entry point. Re-enable by
        // flipping CUSTOM_QUESTION_ENABLED in quickStartPrompts.ts.
        if (!CUSTOM_QUESTION_ENABLED) {
            return null;
        }
        return (
            <FxCard testID="blox-ai-chat-cta">
                <FxCard.Title>{t('diagnostics.chat.ctaTitle')}</FxCard.Title>
                <FxBox paddingVertical="8">
                    <FxText variant="bodySmallRegular">
                        {t('diagnostics.chat.ctaSubtitle')}
                    </FxText>
                    <FxSpacer height={8} />
                    <TextInput
                        value={initialPrompt}
                        onChangeText={setInitialPrompt}
                        placeholder={t('diagnostics.chat.promptPlaceholder')}
                        editable={!busy}
                        multiline
                        style={[styles.input, { borderColor: colors.borderBase }]}
                        testID="blox-ai-initial-prompt"
                    />
                    <FxSpacer height={8} />
                    <FxButton
                        onPress={handleStart}
                        disabled={busy || !initialPrompt.trim()}
                        testID="blox-ai-start-session"
                    >
                        {t('diagnostics.chat.startButton')}
                    </FxButton>
                </FxBox>
            </FxCard>
        );
    }

    return (
        <FxCard testID="blox-ai-chat-active">
            <FxCard.Title>
                {streaming
                    ? t('diagnostics.chat.streaming')
                    : t('diagnostics.chat.sessionTitle')}
            </FxCard.Title>
            <FxBox paddingVertical="8">
                {transcript.map((entry) => (
                    <EventRow
                        key={entry.id}
                        entry={entry}
                        onApprove={onApprove}
                        busy={busy}
                    />
                ))}
                {streaming && !pendingQuestion && (
                    <FxBox flexDirection="row" alignItems="center" paddingVertical="8">
                        <ActivityIndicator size="small" />
                        <FxSpacer width={8} />
                        <FxText variant="bodySmallRegular">
                            {t('diagnostics.chat.thinking')}
                        </FxText>
                    </FxBox>
                )}

                {pendingQuestion && (
                    <ReplyInput
                        question={pendingQuestion}
                        replyText={replyText}
                        onChangeReply={setReplyText}
                        onSubmit={handleSubmitReply}
                        busy={busy}
                    />
                )}

                <FxSpacer height={12} />
                <FxButton
                    variant="inverted"
                    onPress={onShareContext}
                    disabled={busy}
                    testID="blox-ai-share-context"
                >
                    {t('diagnostics.chat.shareContext')}
                </FxButton>
                <FxSpacer height={4} />
                <FxText variant="bodyXSRegular" style={{ opacity: 0.65 }}>
                    {t('diagnostics.chat.shareContextHint')}
                </FxText>

                {/* Ended-session CTAs: render Start-new-chat whenever the
                    chat is sitting idle on something the user can read
                    (a verdict, an error, an aborted half-session). The
                    SSE-aborted case includes the dropped-before-
                    session_started scenario (phone backgrounded
                    immediately after tapping Start), so sessionId may
                    still be null — gate Start-new-chat on transcript +
                    !streaming ONLY. End-and-rate additionally requires a
                    real sessionId because FeedbackModal posts the rating
                    against that id; if no session ever started, there's
                    nothing to rate. */}
                {!streaming && transcript.length > 0 && (
                    <>
                        {onRetrySamePrompt && shouldOfferRetry(transcript) && (
                            <>
                                <FxSpacer height={12} />
                                <FxButton
                                    onPress={onRetrySamePrompt}
                                    disabled={busy}
                                    testID="blox-ai-retry-same-prompt"
                                >
                                    {t('diagnostics.chat.retrySamePromptButton')}
                                </FxButton>
                                <FxSpacer height={4} />
                                <FxText variant="bodyXSRegular" style={{ opacity: 0.65 }}>
                                    {t('diagnostics.chat.retrySamePromptHint')}
                                </FxText>
                            </>
                        )}
                        {onStartNewChat && (
                            <>
                                <FxSpacer height={12} />
                                <FxButton
                                    onPress={onStartNewChat}
                                    disabled={busy}
                                    testID="blox-ai-start-new-chat"
                                >
                                    {t('diagnostics.chat.startNewChatButton')}
                                </FxButton>
                                <FxSpacer height={4} />
                                <FxText variant="bodyXSRegular" style={{ opacity: 0.65 }}>
                                    {t('diagnostics.chat.startNewChatHint')}
                                </FxText>
                            </>
                        )}
                        {onOpenFeedback && sessionId && (
                            <>
                                <FxSpacer height={12} />
                                <FxButton
                                    variant="inverted"
                                    onPress={onOpenFeedback}
                                    disabled={busy}
                                    testID="blox-ai-end-and-rate"
                                >
                                    {t('diagnostics.chat.endAndRateButton')}
                                </FxButton>
                                <FxSpacer height={4} />
                                <FxText variant="bodyXSRegular" style={{ opacity: 0.65 }}>
                                    {t('diagnostics.chat.endAndRateHint')}
                                </FxText>
                            </>
                        )}
                    </>
                )}
            </FxBox>
        </FxCard>
    );
};

// ───────────────────────────────────────────────────────────────────
// Per-event row renderer. Unknown event types reach here as synthetic
// `error` events (parseBloxAiEvent normalizes).
// ───────────────────────────────────────────────────────────────────

const EventRow: React.FC<{
    entry: TranscriptEntry;
    onApprove: (a: RecommendedActionEvent) => void;
    busy: boolean;
}> = ({ entry, onApprove, busy }) => {
    const { t } = useTranslation();
    const { colors } = useFxTheme();
    const ev = entry.event;

    switch (ev.type) {
        case 'session_started':
        case 'user_reply_received':
            // Silent per Q5 + Phase 11 design: ack-only events.
            return null;

        case 'thought':
            return (
                <FxBox paddingVertical="4" testID={`event-thought-${entry.id}`}>
                    <FxText variant="bodySmallRegular" style={styles.thought}>
                        {ev.payload}
                    </FxText>
                </FxBox>
            );

        case 'tool_call':
            return (
                <FxBox paddingVertical="4" testID={`event-tool-call-${entry.id}`}>
                    <FxText variant="bodySmallRegular" style={styles.toolChip}>
                        {t('diagnostics.chat.calling', { tool: ev.payload.tool })}
                    </FxText>
                </FxBox>
            );

        case 'tool_result':
            return (
                <FxBox paddingVertical="4" testID={`event-tool-result-${entry.id}`}>
                    <FxText
                        variant="bodySmallRegular"
                        style={[styles.toolChip, { color: ev.ok ? colors.successBase : colors.errorBase }]}
                    >
                        {ev.ok
                            ? t('diagnostics.chat.toolOk')
                            : t('diagnostics.chat.toolFailed', { error: ev.error ?? '' })}
                    </FxText>
                </FxBox>
            );

        case 'verdict': {
            const severityColor =
                ev.payload.severity === 'green' ? colors.successBase :
                ev.payload.severity === 'yellow' ? colors.warningBase :
                colors.errorBase;
            return (
                <FxBox
                    paddingVertical="8"
                    paddingHorizontal="12"
                    borderRadius="m"
                    marginVertical="8"
                    style={{ backgroundColor: severityColor }}
                    testID={`event-verdict-${entry.id}`}
                >
                    <FxText variant="bodyMediumRegular">{ev.payload.summary}</FxText>
                    {ev.payload.root_cause && (
                        <>
                            <FxSpacer height={4} />
                            <FxText variant="bodySmallRegular">
                                {t('diagnostics.chat.rootCause', { cause: ev.payload.root_cause })}
                            </FxText>
                        </>
                    )}
                </FxBox>
            );
        }

        case 'recommended_action':
            return (
                <FxCard
                    marginVertical="8"
                    testID={`event-recommended-action-${entry.id}`}
                >
                    <FxBox padding="12">
                        <FxText variant="bodyMediumRegular">{ev.action_name}</FxText>
                        <FxSpacer height={4} />
                        <FxText variant="bodySmallRegular">{ev.reasoning}</FxText>
                        <FxSpacer height={4} />
                        <FxText variant="bodySmallRegular">
                            {t('diagnostics.chat.confidence', {
                                pct: Math.round(ev.confidence * 100),
                            })}
                            {' • '}
                            {ev.tier === 2
                                ? t('diagnostics.chat.tier2Label')
                                : t('diagnostics.chat.tier3Label')}
                        </FxText>
                        <FxSpacer height={8} />
                        <FxButton
                            onPress={() => onApprove(ev)}
                            disabled={busy}
                            testID={`event-approve-${entry.id}`}
                        >
                            {t('diagnostics.chat.approveButton')}
                        </FxButton>
                    </FxBox>
                </FxCard>
            );

        case 'execution_result':
            return (
                <FxBox
                    paddingVertical="8"
                    paddingHorizontal="12"
                    borderRadius="m"
                    marginVertical="4"
                    style={{
                        backgroundColor: ev.success ? colors.successMuted : colors.errorMuted,
                    }}
                    testID={`event-execution-result-${entry.id}`}
                >
                    <FxText variant="bodySmallRegular">
                        {ev.success
                            ? t('diagnostics.chat.executionSuccess', { ms: ev.duration_ms })
                            : t('diagnostics.chat.executionFailure')}
                    </FxText>
                    {ev.follow_up && (
                        <>
                            <FxSpacer height={4} />
                            <FxText variant="bodySmallRegular">{ev.follow_up}</FxText>
                        </>
                    )}
                </FxBox>
            );

        case 'user_question':
            // Rendered inline (input handled by ReplyInput at the bottom of
            // the transcript). Show the question bubble here.
            return (
                <FxBox
                    paddingVertical="8"
                    paddingHorizontal="12"
                    borderRadius="m"
                    marginVertical="4"
                    style={{ backgroundColor: colors.backgroundApp }}
                    testID={`event-user-question-${entry.id}`}
                >
                    <FxText variant="bodyMediumRegular">{ev.payload.question}</FxText>
                </FxBox>
            );

        case 'error': {
            // Friendly per-code translations override the default
            // "[{code}] {message}" technical rendering. Falls through to
            // the generic format for any other error code so we don't
            // accidentally swallow a useful technical message.
            //
            // SCHEMA_VIOLATION_RECOVERED surfaces in lab when the model
            // emits a malformed event (missing field, bad enum value,
            // etc.). It's recoverable — the chat keeps streaming — but
            // the raw "[SCHEMA_VIOLATION_RECOVERED] backend emitted an
            // invalid …" copy reads like a crash to users. Replace
            // with a plain-language hint that maps to the Try-Again
            // button rendered below.
            const friendlyKey =
                ev.code === 'no-transport'
                    ? 'diagnostics.chat.errorEvent_noTransport'
                    : (ev.code === 'SCHEMA_VIOLATION_RECOVERED' || ev.code === 'SCHEMA_VIOLATION')
                    ? 'diagnostics.chat.errorEvent_schemaViolation'
                    : null;
            return (
                <FxBox
                    paddingVertical="8"
                    paddingHorizontal="12"
                    borderRadius="m"
                    marginVertical="4"
                    style={{ backgroundColor: colors.errorMuted }}
                    testID={`event-error-${entry.id}`}
                >
                    <FxText variant="bodySmallRegular">
                        {friendlyKey
                            ? t(friendlyKey)
                            : t('diagnostics.chat.errorEvent', {
                                  code: ev.code,
                                  message: ev.message,
                              })}
                    </FxText>
                </FxBox>
            );
        }
    }
};

// ───────────────────────────────────────────────────────────────────
// ReplyInput renders the input/picker for the pending user_question
// ───────────────────────────────────────────────────────────────────

const ReplyInput: React.FC<{
    question: UserQuestionEvent;
    replyText: string;
    onChangeReply: (s: string) => void;
    onSubmit: () => void;
    busy: boolean;
}> = ({ question, replyText, onChangeReply, onSubmit, busy }) => {
    const { t } = useTranslation();
    const { colors } = useFxTheme();
    const type = question.payload.expected_response_type ?? 'text';

    if (type === 'boolean') {
        return (
            <FxBox flexDirection="row" paddingVertical="8" testID="reply-boolean">
                <FxButton
                    onPress={() => { onChangeReply('yes'); onSubmit(); }}
                    disabled={busy}
                    marginRight="8"
                    testID="reply-boolean-yes"
                >
                    {t('diagnostics.chat.yes')}
                </FxButton>
                <FxButton
                    variant="inverted"
                    onPress={() => { onChangeReply('no'); onSubmit(); }}
                    disabled={busy}
                    testID="reply-boolean-no"
                >
                    {t('diagnostics.chat.no')}
                </FxButton>
            </FxBox>
        );
    }
    if (type === 'choice' && question.payload.options) {
        return (
            <FxBox paddingVertical="8" testID="reply-choice">
                {question.payload.options.map((opt) => (
                    <FxBox key={opt} paddingVertical="4">
                        <Pressable
                            onPress={() => { onChangeReply(opt); onSubmit(); }}
                            disabled={busy}
                            testID={`reply-choice-${opt}`}
                            style={[
                                styles.choiceButton,
                                { borderColor: colors.borderBase },
                            ]}
                        >
                            <FxText variant="bodySmallRegular">{opt}</FxText>
                        </Pressable>
                    </FxBox>
                ))}
            </FxBox>
        );
    }
    // text — default
    return (
        <FxBox paddingVertical="8" testID="reply-text">
            <TextInput
                value={replyText}
                onChangeText={onChangeReply}
                placeholder={t('diagnostics.chat.replyPlaceholder')}
                editable={!busy}
                multiline
                style={[styles.input, { borderColor: colors.borderBase }]}
                testID="reply-text-input"
            />
            <FxSpacer height={8} />
            <FxButton
                onPress={onSubmit}
                disabled={busy || !replyText.trim()}
                testID="reply-text-submit"
            >
                {t('diagnostics.chat.submitReply')}
            </FxButton>
        </FxBox>
    );
};

const styles = StyleSheet.create({
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
        minHeight: 48,
        textAlignVertical: 'top',
    },
    thought: {
        fontStyle: 'italic',
        opacity: 0.65,
    },
    toolChip: {
        fontFamily: 'Courier',
        fontSize: 11,
    },
    choiceButton: {
        borderWidth: 1,
        borderRadius: 6,
        padding: 10,
    },
});
