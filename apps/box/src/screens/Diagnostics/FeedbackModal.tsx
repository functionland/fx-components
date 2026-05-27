/**
 * FeedbackModal — Phase 16 + Phase 21 (rewritten 2026-05-26).
 *
 * Shown at end-of-session in the Diagnostics screen. Two phases:
 *
 *   Phase 1: 'rate' — user picks 👍 / 👎 / Skip.
 *   Phase 2: 'recorded' — modal stays open, shows the rating they
 *            recorded + an optional "Share anonymized transcript…"
 *            button (Phase 21 path to the developer team's training
 *            server) + a Close button.
 *
 * Three UX bugs this rewrite fixes (lab-observed 2026-05-26):
 *
 *   (a) Buttons were sized to text only ("Yes" / "No" / "Skip" /
 *       "Close" each ~40px wide). Now each button is `flex: 1`
 *       inside a row, so they share the modal width evenly.
 *
 *   (b) Picking 👍 / 👎 / Skip auto-dismissed the modal (because
 *       useAiSession.submitFeedback dispatched modal/dismiss). That
 *       killed the user's ability to ALSO tap "Share anonymized
 *       transcript…". Now: rating switches the modal to Phase 2
 *       and the share button is reachable.
 *
 *   (c) Tapping "Share anonymized transcript…" did nothing — the
 *       previous handler called onShareTranscript() (which dispatches
 *       modal/open-upload-transcript) AND THEN onDismiss() (which
 *       dispatches modal/dismiss, clearing uploadTranscriptPayload
 *       back to null in the same tick). Upload modal opened then
 *       immediately died. Now: share button does NOT call onDismiss;
 *       activeModal transition auto-hides this modal.
 *
 * Payload construction stays in `utils/buildFeedbackPayload.ts` so the
 * pure logic is testable without dragging @functionland/component-library
 * into the jest path.
 */
import React, { useEffect, useState } from 'react';
import {
    Modal,
    TextInput,
    StyleSheet,
} from 'react-native';
import {
    FxBox,
    FxText,
    FxButton,
    FxSpacer,
    useFxTheme,
} from '@functionland/component-library';
import { useTranslation } from 'react-i18next';
import {
    buildFeedbackPayload,
    COMMENT_MAX_LENGTH,
    type FeedbackPayload,
    type FeedbackRating,
} from '../../utils/buildFeedbackPayload';

export interface FeedbackModalProps {
    /** When non-null, modal is visible and bound to this session. */
    sessionId: string | null;
    /** Called when the user picks a rating + optional comment.
     *  Fire-and-forget on the parent side: must NOT dismiss the modal
     *  (FeedbackModal manages its own dismiss in Phase 2). */
    onSubmit: (payload: FeedbackPayload) => void;
    /** Called when the user explicitly closes the modal. */
    onDismiss: () => void;
    /** True while the parent's POST is in flight. */
    busy?: boolean;
    /**
     * Optional: called when the user opts to ALSO share an anonymized
     * transcript to help train the AI (Phase 21). Wired by the screen
     * to useAiSession.prepareTranscriptUpload — that builds the payload
     * + opens UploadTranscriptModal (where the user reviews the JSON
     * before the actual POST). Returns false if the payload couldn't
     * be built (empty transcript, anonymizer rejection); we show an
     * inline error so the user isn't left staring at "nothing happened".
     */
    onShareTranscript?: (rating: FeedbackRating, comment: string) => boolean;
}

type Phase = 'rate' | 'recorded';

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
    sessionId,
    onSubmit,
    onDismiss,
    busy = false,
    onShareTranscript,
}) => {
    const { t } = useTranslation();
    const theme = useFxTheme();
    const [comment, setComment] = useState('');
    const [phase, setPhase] = useState<Phase>('rate');
    const [ratedAs, setRatedAs] = useState<FeedbackRating | null>(null);
    const [shareError, setShareError] = useState<string | null>(null);

    const visible = sessionId !== null;

    // Reset state every time the modal opens fresh (sessionId becoming
    // non-null after being null). Avoids stale phase from a prior session.
    useEffect(() => {
        if (visible) {
            setPhase('rate');
            setRatedAs(null);
            setShareError(null);
            // Don't reset `comment` here — user might have typed before
            // tapping a rating and we want to preserve it in the share
            // call below.
        }
    }, [visible]);

    const submit = (rating: FeedbackRating) => {
        if (!sessionId) return;
        try {
            const payload = buildFeedbackPayload({ sessionId, rating, comment });
            onSubmit(payload);
            setRatedAs(rating);
            setPhase('recorded');
        } catch {
            // Should never happen at runtime — buildFeedbackPayload only
            // throws on bogus session/rating combos. If it does, fail
            // safe by dismissing so the user isn't stuck.
            onDismiss();
        }
    };

    const handleShare = () => {
        if (!onShareTranscript) return;
        setShareError(null);
        const ratingToShare = ratedAs ?? 0;
        const opened = onShareTranscript(ratingToShare, comment);
        if (!opened) {
            // anonymizeTranscript rejected (empty transcript, unknown
            // event type, etc.). Show the error inline rather than
            // silently doing nothing — the previous silent behavior
            // wasted the user's tap.
            setShareError(t('diagnostics.feedback.shareFailed'));
            return;
        }
        // SUCCESS path — do NOT call onDismiss. The reducer's
        // modal/open-upload-transcript dispatch switched activeModal
        // to 'uploadTranscript', which makes this modal's `sessionId`
        // prop become null (gated by the Diagnostics screen), which
        // auto-hides this modal. Calling onDismiss here would dispatch
        // modal/dismiss and clear uploadTranscriptPayload back to null
        // in the same tick, killing the upload modal before it renders.
    };

    const ratingLabel =
        ratedAs === 1
            ? t('diagnostics.feedback.thumbsUp')
            : ratedAs === -1
                ? t('diagnostics.feedback.thumbsDown')
                : ratedAs === 0
                    ? t('diagnostics.feedback.skip')
                    : '';

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <FxBox style={styles.backdrop}>
                <FxBox
                    backgroundColor="backgroundApp"
                    borderRadius="m"
                    padding="20"
                    width="86%"
                    testID="feedback-modal"
                >
                    <FxText variant="h300">
                        {t('diagnostics.feedback.title')}
                    </FxText>
                    <FxSpacer height={6} />
                    <FxText variant="bodySmallRegular">
                        {phase === 'rate'
                            ? t('diagnostics.feedback.subtitle')
                            : t('diagnostics.feedback.recordedSubtitle', {
                                  rating: ratingLabel,
                              })}
                    </FxText>
                    <FxSpacer height={12} />

                    {phase === 'rate' && (
                        <>
                            {/* Yes / No row — each button takes 50% via
                                flex:1 + a gap. Was previously sized to
                                text only (Yes ≈ 40px wide). */}
                            <FxBox flexDirection="row">
                                <FxBox flex={1}>
                                    <FxButton
                                        disabled={busy}
                                        onPress={() => submit(1)}
                                        testID="feedback-thumbs-up"
                                    >
                                        {t('diagnostics.feedback.thumbsUp')}
                                    </FxButton>
                                </FxBox>
                                <FxSpacer width={8} />
                                <FxBox flex={1}>
                                    <FxButton
                                        disabled={busy}
                                        onPress={() => submit(-1)}
                                        testID="feedback-thumbs-down"
                                        variant="inverted"
                                    >
                                        {t('diagnostics.feedback.thumbsDown')}
                                    </FxButton>
                                </FxBox>
                            </FxBox>

                            <FxSpacer height={14} />
                            <FxText variant="bodyXSRegular">
                                {t('diagnostics.feedback.commentLabel')}
                            </FxText>
                            <FxSpacer height={4} />
                            <TextInput
                                value={comment}
                                onChangeText={setComment}
                                multiline
                                maxLength={COMMENT_MAX_LENGTH}
                                editable={!busy}
                                style={[styles.comment, { color: theme.colors.content1 }]}
                                placeholder={t('diagnostics.feedback.commentPlaceholder')}
                                placeholderTextColor={theme.colors.content3}
                                testID="feedback-comment-input"
                            />

                            <FxSpacer height={12} />
                            {/* Close / Skip row — also each flex:1. */}
                            <FxBox flexDirection="row">
                                <FxBox flex={1}>
                                    <FxButton
                                        disabled={busy}
                                        onPress={onDismiss}
                                        variant="inverted"
                                        testID="feedback-dismiss"
                                    >
                                        {t('diagnostics.feedback.dismiss')}
                                    </FxButton>
                                </FxBox>
                                <FxSpacer width={8} />
                                <FxBox flex={1}>
                                    <FxButton
                                        disabled={busy}
                                        onPress={() => submit(0)}
                                        testID="feedback-skip"
                                    >
                                        {t('diagnostics.feedback.skip')}
                                    </FxButton>
                                </FxBox>
                            </FxBox>
                        </>
                    )}

                    {phase === 'recorded' && (
                        <>
                            {/* Phase 21 share offer — independent action.
                                Tap to anonymize + open the upload preview
                                modal. The share button is the ONLY path to
                                ai-training.fx.land/transcripts. */}
                            {onShareTranscript && (
                                <>
                                    <FxText variant="bodyXSRegular">
                                        {t('diagnostics.feedback.shareHint')}
                                    </FxText>
                                    {shareError && (
                                        <>
                                            <FxSpacer height={4} />
                                            <FxText
                                                variant="bodyXSRegular"
                                                color="errorBase"
                                            >
                                                {shareError}
                                            </FxText>
                                        </>
                                    )}
                                    <FxSpacer height={8} />
                                    <FxButton
                                        disabled={busy}
                                        onPress={handleShare}
                                        testID="feedback-share-transcript"
                                    >
                                        {t('diagnostics.feedback.shareButton')}
                                    </FxButton>
                                    <FxSpacer height={10} />
                                </>
                            )}
                            {/* Close button is FULL WIDTH in Phase 2. */}
                            <FxButton
                                disabled={busy}
                                onPress={onDismiss}
                                variant="inverted"
                                testID="feedback-close"
                            >
                                {t('diagnostics.feedback.dismiss')}
                            </FxButton>
                        </>
                    )}
                </FxBox>
            </FxBox>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    comment: {
        borderWidth: 1,
        borderColor: 'rgba(127,127,127,0.4)',
        borderRadius: 8,
        padding: 8,
        minHeight: 64,
        textAlignVertical: 'top',
    },
});

export default FeedbackModal;
