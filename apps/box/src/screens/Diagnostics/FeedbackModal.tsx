/**
 * FeedbackModal — Phase 16.
 *
 * Shown at end-of-session in the Diagnostics screen. Three primary CTAs:
 *
 *   - 👍 (rating=1, "helpful")
 *   - 👎 (rating=-1, "didn't help")
 *   - Skip (rating=0, explicit skip)
 *
 * An optional comment field appears below. The submit handler is parent-
 * supplied; the parent owns the BLE call (ai/feedback) and the navigation
 * after success. Modal closes on either submit or backdrop tap.
 *
 * Distinct from Phase 12's ApprovalModal — this one is non-blocking and
 * carries no security boundary; it just logs the user's signal.
 *
 * The payload construction is in `utils/buildFeedbackPayload.ts` so the
 * pure logic is testable without dragging @functionland/component-library
 * into the jest path (Phase 5 lesson).
 */
import React, { useState } from 'react';
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
    /** Called when the user picks a rating + optional comment. */
    onSubmit: (payload: FeedbackPayload) => void;
    /** Called when the user dismisses without rating. */
    onDismiss: () => void;
    /** True while the parent's POST is in flight. */
    busy?: boolean;
    /**
     * Optional: called when the user opts to ALSO share an anonymized
     * transcript to help train the AI (Phase 21). Wired by the screen
     * to useAiSession.prepareTranscriptUpload — that builds the payload
     * + opens UploadTranscriptModal (where the user reviews the JSON
     * before the actual POST). When this prop is omitted, the share
     * button stays hidden.
     */
    onShareTranscript?: (rating: FeedbackRating, comment: string) => boolean;
}

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

    const visible = sessionId !== null;

    const submit = (rating: FeedbackRating) => {
        if (!sessionId) return;
        try {
            const payload = buildFeedbackPayload({
                sessionId,
                rating,
                comment,
            });
            onSubmit(payload);
            setComment('');
        } catch {
            // Should never happen: buildFeedbackPayload only throws on
            // invalid sessionId / rating, and we control both. If it
            // does, fall through to dismiss so the user isn't stuck.
            onDismiss();
        }
    };

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
                        {t('diagnostics.feedback.subtitle')}
                    </FxText>
                    <FxSpacer height={12} />

                    <FxBox flexDirection="row" justifyContent="space-around">
                        <FxButton
                            disabled={busy}
                            onPress={() => submit(1)}
                            testID="feedback-thumbs-up"
                        >
                            {t('diagnostics.feedback.thumbsUp')}
                        </FxButton>
                        <FxButton
                            disabled={busy}
                            onPress={() => submit(-1)}
                            testID="feedback-thumbs-down"
                            variant="inverted"
                        >
                            {t('diagnostics.feedback.thumbsDown')}
                        </FxButton>
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
                    <FxBox flexDirection="row" justifyContent="space-between">
                        <FxButton
                            disabled={busy}
                            onPress={onDismiss}
                            variant="inverted"
                            testID="feedback-dismiss"
                        >
                            {t('diagnostics.feedback.dismiss')}
                        </FxButton>
                        <FxButton
                            disabled={busy}
                            onPress={() => submit(0)}
                            testID="feedback-skip"
                        >
                            {t('diagnostics.feedback.skip')}
                        </FxButton>
                    </FxBox>

                    {/* Phase 21 opt-in transcript upload offer. Independent
                        of the 👍/👎/Skip choice so the user can share a
                        session even if they don't want to also rate it.
                        Tapping this button does NOT upload immediately — it
                        opens UploadTranscriptModal where the user can
                        REVIEW the anonymized JSON before any network call. */}
                    {onShareTranscript && (
                        <>
                            <FxSpacer height={14} />
                            <FxBox
                                paddingTop="8"
                                borderTopWidth={1}
                                style={{ borderTopColor: 'rgba(127,127,127,0.3)' }}
                            >
                                <FxText variant="bodyXSRegular">
                                    {t('diagnostics.feedback.shareHint')}
                                </FxText>
                                <FxSpacer height={6} />
                                <FxButton
                                    disabled={busy}
                                    onPress={() => {
                                        // Use the current rating selection
                                        // signal (skip=0) if user hasn't
                                        // tapped 👍/👎 — the upload modal
                                        // will show the rating in the
                                        // preview JSON so the user can
                                        // confirm/abort there.
                                        const opened = onShareTranscript(0, comment);
                                        if (opened) {
                                            // FeedbackModal closes; the
                                            // UploadTranscriptModal takes over.
                                            setComment('');
                                            onDismiss();
                                        }
                                    }}
                                    variant="inverted"
                                    testID="feedback-share-transcript"
                                >
                                    {t('diagnostics.feedback.shareButton')}
                                </FxButton>
                            </FxBox>
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
