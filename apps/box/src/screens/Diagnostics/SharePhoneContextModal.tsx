/**
 * SharePhoneContextModal — Phase 12.
 *
 * When the user taps "Share my phone's context" in the Diagnostics screen,
 * this modal:
 *   1. Shows the literal JSON payload the app will send to the container's
 *      /troubleshoot/phone-context endpoint. NEVER auto-redact (per Codex
 *      Q6 — "keep phone_context preview explicit and literal JSON").
 *   2. Reassures the user that phone_context never leaves their blox (no
 *      central upload channel — matches fula-ota's Phase 11 PRIVACY contract).
 *   3. Confirms / cancels.
 *
 * Per Gemini Q6: pretty-print the JSON in monospace so the user can actually
 * read what they're approving.
 */
import React from 'react';
import { Modal, ScrollView, StyleSheet } from 'react-native';
import {
    FxBox,
    FxText,
    FxButton,
    FxSpacer,
    useFxTheme,
} from '@functionland/component-library';
import { useTranslation } from 'react-i18next';
import type { PhoneContext } from '../../utils/phoneLogger';

export interface SharePhoneContextModalProps {
    /** The gathered PhoneContext to preview. null = modal closed. */
    phoneContext: PhoneContext | null;
    /** Fired on confirm. Parent posts ai/phone-context + closes the modal. */
    onConfirm: () => void;
    /** Fired when the user cancels. */
    onCancel: () => void;
    /** True while the parent's ai/phone-context call is in flight. */
    sending?: boolean;
}

export const SharePhoneContextModal: React.FC<SharePhoneContextModalProps> = ({
    phoneContext,
    onConfirm,
    onCancel,
    sending = false,
}) => {
    const { t } = useTranslation();
    const { colors } = useFxTheme();

    if (!phoneContext) return null;
    const pretty = JSON.stringify(phoneContext, null, 2);

    return (
        <Modal
            transparent
            animationType="fade"
            visible
            onRequestClose={onCancel}
        >
            <FxBox
                flex={1}
                backgroundColor="backgroundSecondary"
                justifyContent="center"
                alignItems="center"
                padding="16"
            >
                <FxBox
                    backgroundColor="backgroundPrimary"
                    padding="16"
                    borderRadius="m"
                    width="100%"
                    maxWidth={480}
                    testID="share-phone-context-modal"
                >
                    <FxText variant="h300">
                        {t('diagnostics.sharePhoneContext.title')}
                    </FxText>
                    <FxSpacer height={8} />
                    <FxText variant="bodySmallRegular">
                        {t('diagnostics.sharePhoneContext.privacyAssurance')}
                    </FxText>
                    <FxSpacer height={8} />
                    <FxText variant="bodySmallRegular">
                        {t('diagnostics.sharePhoneContext.preview')}
                    </FxText>
                    <FxSpacer height={8} />
                    <ScrollView
                        style={[styles.previewScroll, { borderColor: colors.borderBase }]}
                        testID="share-phone-context-preview"
                    >
                        <FxText variant="bodySmallRegular" style={styles.previewText}>
                            {pretty}
                        </FxText>
                    </ScrollView>
                    <FxSpacer height={16} />
                    <FxBox flexDirection="row" justifyContent="flex-end">
                        <FxButton
                            variant="inverted"
                            onPress={onCancel}
                            marginRight="8"
                            disabled={sending}
                            testID="share-phone-context-cancel"
                        >
                            {t('diagnostics.sharePhoneContext.cancel')}
                        </FxButton>
                        <FxButton
                            onPress={onConfirm}
                            disabled={sending}
                            testID="share-phone-context-confirm"
                        >
                            {t('diagnostics.sharePhoneContext.confirm')}
                        </FxButton>
                    </FxBox>
                </FxBox>
            </FxBox>
        </Modal>
    );
};

const styles = StyleSheet.create({
    previewScroll: {
        maxHeight: 360,
        borderWidth: 1,
        borderRadius: 6,
        padding: 8,
    },
    previewText: {
        fontFamily: 'Courier',
        fontSize: 11,
    },
});
