/**
 * UploadTranscriptModal — Phase 21.
 *
 * The ONLY central network call in the Blox AI feature. Shown after the
 * user picked thumbs-down on the Phase 16 feedback prompt AND tapped
 * "help improve the AI". Per the parent plan:
 *
 *   - Per-session opt-in. NO settings toggle. NO auto-retry. NO history
 *     of past uploads kept on the device beyond the feedback log's
 *     `anonymized_transcript_uploaded: true` flag.
 *   - Default-cancel-on-dismiss. Tap-outside, hardware back, or the
 *     Cancel button all dismiss without uploading.
 *   - User sees the FULL payload before tapping Upload. No abbreviation,
 *     no truncation in the preview.
 *
 * The transcript anonymization runs on-device in
 * utils/anonymizeTranscript.ts BEFORE this modal opens — the parent
 * passes a ready-anonymized object as the `payload` prop. This modal
 * doesn't anonymize; it shows + uploads.
 *
 * Failure handling: any non-2xx from the server, or any network error,
 * surfaces a generic "could not upload — try again" message. No retry
 * button. User can dismiss + start a new session if they really want
 * to. Failing-loud is the right UX here — a silent retry on an upload
 * the user explicitly approved would be a trust violation.
 */
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet } from 'react-native';
import {
    FxBox,
    FxText,
    FxButton,
    FxSpacer,
    useFxTheme,
} from '@functionland/component-library';
import { useTranslation } from 'react-i18next';
import type { AnonymizedTranscript } from '../../utils/anonymizeTranscript';
import {
    TRANSCRIPT_UPLOAD_URL,
    buildUploadHeaders,
} from '../../utils/uploadTranscriptUrl';

export interface UploadTranscriptModalProps {
    /** When non-null, modal is visible and bound to this anonymized payload. */
    payload: AnonymizedTranscript | null;
    /** Called after a successful upload (2xx). Parent updates the feedback
     *  log's `anonymized_transcript_uploaded` flag and closes the modal. */
    onUploaded: () => void;
    /** Called on dismiss (Cancel, backdrop, hardware back). Parent closes. */
    onDismiss: () => void;
}

type UploadState = 'idle' | 'uploading' | 'error';

export const UploadTranscriptModal: React.FC<UploadTranscriptModalProps> = ({
    payload,
    onUploaded,
    onDismiss,
}) => {
    const { t } = useTranslation();
    const theme = useFxTheme();
    const [state, setState] = useState<UploadState>('idle');
    const [errorDetail, setErrorDetail] = useState<string | null>(null);

    const visible = payload !== null;

    const handleUpload = async () => {
        if (!payload) return;
        setState('uploading');
        setErrorDetail(null);
        try {
            const resp = await fetch(TRANSCRIPT_UPLOAD_URL, {
                method: 'POST',
                headers: buildUploadHeaders(payload.consent.anonymizer_version),
                body: JSON.stringify(payload),
            });
            if (resp.ok) {
                setState('idle');
                onUploaded();
            } else {
                setState('error');
                // Show only the status code. Don't render server response
                // body to avoid surfacing anything the server might echo.
                setErrorDetail(`HTTP ${resp.status}`);
            }
        } catch (e) {
            // Pin to a generic message. RN Android's fetch error includes
            // the request URL in e.message; even though our URL is public,
            // rendering it would leak the choice of endpoint to anyone
            // shoulder-surfing the device. Sanitize at display time.
            setState('error');
            setErrorDetail('network error');
        }
    };

    const close = () => {
        if (state === 'uploading') return; // never close mid-upload
        setState('idle');
        setErrorDetail(null);
        onDismiss();
    };

    // Stable, indented JSON for the preview. Done on every render but the
    // tradeoff is acceptable — preview's the whole point of the modal.
    const previewJson = payload ? JSON.stringify(payload, null, 2) : '';

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={close}
        >
            <FxBox style={styles.backdrop}>
                <FxBox
                    backgroundColor="backgroundApp"
                    borderRadius="m"
                    padding="20"
                    width="92%"
                    maxHeight="80%"
                    testID="upload-transcript-modal"
                >
                    <FxText variant="h300">
                        {t('diagnostics.uploadTranscript.title')}
                    </FxText>
                    <FxSpacer height={6} />
                    <FxText variant="bodySmallRegular">
                        {t('diagnostics.uploadTranscript.subtitle')}
                    </FxText>
                    <FxSpacer height={8} />
                    <FxText variant="bodyXSRegular">
                        {t('diagnostics.uploadTranscript.previewIntro')}
                    </FxText>
                    <FxSpacer height={4} />
                    <ScrollView
                        style={[
                            styles.preview,
                            { borderColor: theme.colors.border ?? '#888' },
                        ]}
                        testID="upload-transcript-preview"
                    >
                        <FxText variant="bodyXSRegular">{previewJson}</FxText>
                    </ScrollView>

                    {state === 'error' && (
                        <>
                            <FxSpacer height={6} />
                            <FxText variant="bodySmallRegular">
                                {t('diagnostics.uploadTranscript.errorPrefix')}{' '}
                                {errorDetail ?? ''}
                            </FxText>
                        </>
                    )}

                    <FxSpacer height={12} />
                    <FxBox flexDirection="row" justifyContent="space-between">
                        <FxButton
                            variant="inverted"
                            disabled={state === 'uploading'}
                            onPress={close}
                            testID="upload-transcript-cancel"
                        >
                            {t('diagnostics.uploadTranscript.cancel')}
                        </FxButton>
                        <FxButton
                            disabled={state === 'uploading'}
                            onPress={handleUpload}
                            testID="upload-transcript-confirm"
                        >
                            {state === 'uploading'
                                ? t('diagnostics.uploadTranscript.uploading')
                                : t('diagnostics.uploadTranscript.upload')}
                        </FxButton>
                    </FxBox>
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
    preview: {
        flexGrow: 1,
        flexShrink: 1,
        borderWidth: 1,
        borderRadius: 6,
        padding: 8,
        maxHeight: 360,
    },
});

export default UploadTranscriptModal;
