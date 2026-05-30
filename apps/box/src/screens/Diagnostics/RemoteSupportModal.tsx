/**
 * RemoteSupportModal — confirm gate for "Enable remote support".
 *
 * Collects the 4-digit security code and confirms the user wants to
 * start/restart the WireGuard support tunnel on their Blox. The actual
 * call (HttpAiClient.enableRemoteSupport) is LAN-only — the core BLE
 * proxy can't send the custom `X-Fula-Support` header or a body — so the
 * parent runs the request and feeds the outcome back via `resultMessage`/
 * `resultOk`. On a bad code or a LAN-unavailable refusal the modal stays
 * open so the user can correct the code; on success the parent closes it.
 *
 * Unlike the tier-3 ApprovalModal there is no press-and-hold: enabling a
 * support tunnel is sensitive (hence the code) but not destructive, so the
 * code entry alone is the gate. Styling mirrors ApprovalModal's code input.
 *
 * Strings live under `diagnostics.remoteSupport.*` in en/translation.json.
 */
import React from 'react';
import { Modal, TextInput, StyleSheet } from 'react-native';
import {
    FxBox,
    FxText,
    FxButton,
    FxSpacer,
    useFxTheme,
} from '@functionland/component-library';
import { useTranslation } from 'react-i18next';

export interface RemoteSupportModalProps {
    visible: boolean;
    /** Fired with the entered 4-digit code when the user confirms. */
    onConfirm: (securityCode: string) => void;
    /** Fired on Cancel, backdrop, or hardware back. */
    onCancel: () => void;
    /** True while the parent's enableRemoteSupport call is in flight. */
    busy?: boolean;
    /** Inline result to show (failure detail or LAN-only refusal). */
    resultMessage?: string | null;
    resultOk?: boolean;
}

export const RemoteSupportModal: React.FC<RemoteSupportModalProps> = ({
    visible,
    onConfirm,
    onCancel,
    busy = false,
    resultMessage = null,
    resultOk = false,
}) => {
    const { t } = useTranslation();
    const { colors } = useFxTheme();
    const [code, setCode] = React.useState('');

    // Clear the code whenever the modal opens or closes so a stale code
    // never lingers across opens.
    React.useEffect(() => {
        if (!visible) setCode('');
    }, [visible]);

    const ready = code.length === 4 && !busy;

    const handleConfirm = React.useCallback(() => {
        if (!ready) return;
        onConfirm(code);
    }, [ready, code, onConfirm]);

    const close = React.useCallback(() => {
        if (busy) return; // never close mid-request
        onCancel();
    }, [busy, onCancel]);

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            onRequestClose={close}
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
                    maxWidth={420}
                    testID="remote-support-modal"
                >
                    <FxText variant="h300">
                        {t('diagnostics.remoteSupport.title')}
                    </FxText>
                    <FxSpacer height={8} />
                    <FxText variant="bodySmallRegular">
                        {t('diagnostics.remoteSupport.explanation')}
                    </FxText>

                    <FxSpacer height={16} />
                    <FxText variant="bodySmallRegular">
                        {t('diagnostics.remoteSupport.securityCodePrompt')}
                    </FxText>
                    <FxSpacer height={8} />
                    <TextInput
                        value={code}
                        onChangeText={setCode}
                        keyboardType="numeric"
                        maxLength={4}
                        secureTextEntry
                        editable={!busy}
                        testID="remote-support-code-input"
                        style={[styles.codeInput, { borderColor: colors.border }]}
                    />

                    {resultMessage ? (
                        <>
                            <FxSpacer height={12} />
                            <FxText
                                variant="bodySmallRegular"
                                color={resultOk ? 'successBase' : 'errorBase'}
                                testID="remote-support-result"
                            >
                                {resultMessage}
                            </FxText>
                        </>
                    ) : null}

                    <FxSpacer height={16} />
                    <FxBox flexDirection="row" justifyContent="flex-end">
                        <FxButton
                            variant="inverted"
                            onPress={close}
                            marginRight="8"
                            disabled={busy}
                            testID="remote-support-cancel"
                        >
                            {t('diagnostics.remoteSupport.cancel')}
                        </FxButton>
                        <FxButton
                            onPress={handleConfirm}
                            disabled={!ready}
                            testID="remote-support-confirm"
                        >
                            {busy
                                ? t('diagnostics.remoteSupport.enabling')
                                : t('diagnostics.remoteSupport.confirm')}
                        </FxButton>
                    </FxBox>
                </FxBox>
            </FxBox>
        </Modal>
    );
};

const styles = StyleSheet.create({
    codeInput: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 24,
        textAlign: 'center',
        letterSpacing: 8,
    },
});

export default RemoteSupportModal;
