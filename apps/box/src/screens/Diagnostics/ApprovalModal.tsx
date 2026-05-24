/**
 * ApprovalModal — Phase 12.
 *
 * Renders the confirmation modal for a `recommended_action` SSE event. Two
 * variants discriminated by `action.tier`:
 *
 *   - tier 2 (idempotent: restart_fula, docker.restart, etc.): single
 *     "Approve" button. Post on tap.
 *   - tier 3 (destructive: reset, node_delete, ipfs_delete, partition,
 *     force_update): 4-digit numeric security-code input + press-and-hold
 *     for 2 seconds to confirm. The hold gesture has a visible Animated
 *     progress bar so the user understands what's happening.
 *
 * The press-and-hold uses manual onPressIn/onPressOut + a useRef timer
 * (per Q1 advisor consensus: avoid adding react-native-gesture-handler just
 * for this modal). Codex pre-impl defensive checklist applied: timer in
 * useRef, cleared on every state transition, modal close, unmount; disabled
 * while executing; reset on security code edit; requires BOTH code length
 * 4 AND completed hold.
 *
 * Codex Q6: approval execution guards against duplicate taps/holds via the
 * `executing` flag.
 *
 * Translations live under `diagnostics.approval.*` in en/translation.json.
 */
import React from 'react';
import {
    Modal,
    Animated,
    Easing,
    Pressable,
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
import type { RecommendedActionEvent } from '../../utils/bloxAiEvents';

const TIER_3_HOLD_MS = 2000;

export interface ApprovalModalProps {
    /** The recommended_action event being confirmed. null = modal closed. */
    action: RecommendedActionEvent | null;
    /** Fired on confirm. The parent posts ai/execute and closes the modal. */
    onApprove: (security_code: string | null) => void;
    /** Fired when the user cancels or taps outside. */
    onCancel: () => void;
    /** True while the parent's ai/execute call is in flight. Disables the
     *  Approve button to prevent double-submit (Codex Q6 catch). */
    executing?: boolean;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
    action,
    onApprove,
    onCancel,
    executing = false,
}) => {
    const { t } = useTranslation();
    const { colors } = useFxTheme();
    const [securityCode, setSecurityCode] = React.useState('');
    const [holdProgress] = React.useState(new Animated.Value(0));
    const holdTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const holdAnimationRef = React.useRef<Animated.CompositeAnimation | null>(null);

    const isTier3 = action?.tier === 3;
    const codeReady = !isTier3 || securityCode.length === 4;

    const resetHold = React.useCallback(() => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        if (holdAnimationRef.current) {
            holdAnimationRef.current.stop();
            holdAnimationRef.current = null;
        }
        holdProgress.setValue(0);
    }, [holdProgress]);

    // Reset hold + code on every modal open/close + when action changes
    React.useEffect(() => {
        resetHold();
        setSecurityCode('');
        return () => {
            // Cleanup on unmount per Codex defensive checklist
            resetHold();
        };
    }, [action, resetHold]);

    // Reset hold when security code changes (Codex defensive: code edit
    // should require a fresh hold)
    React.useEffect(() => {
        resetHold();
    }, [securityCode, resetHold]);

    const handlePressIn = React.useCallback(() => {
        if (!codeReady || executing) return;
        holdAnimationRef.current = Animated.timing(holdProgress, {
            toValue: 1,
            duration: TIER_3_HOLD_MS,
            easing: Easing.linear,
            useNativeDriver: false, // we read .value in interpolations for width
        });
        holdAnimationRef.current.start();
        holdTimerRef.current = setTimeout(() => {
            holdTimerRef.current = null;
            holdAnimationRef.current = null;
            if (action) {
                onApprove(securityCode);
            }
        }, TIER_3_HOLD_MS);
    }, [codeReady, executing, holdProgress, action, securityCode, onApprove]);

    const handlePressOut = React.useCallback(() => {
        resetHold();
    }, [resetHold]);

    const handleTier2Approve = React.useCallback(() => {
        if (executing) return; // Codex Q6 dedup guard
        if (action) onApprove(null);
    }, [executing, action, onApprove]);

    if (!action) return null;

    const widthInterp = holdProgress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <Modal
            transparent
            animationType="fade"
            visible={!!action}
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
                    maxWidth={420}
                    testID="approval-modal"
                >
                    <FxText variant="h300">
                        {isTier3
                            ? t('diagnostics.approval.tier3Title')
                            : t('diagnostics.approval.tier2Title')}
                    </FxText>
                    <FxSpacer height={8} />
                    <FxText variant="bodyMediumRegular" testID="approval-action-name">
                        {action.action_name}
                    </FxText>
                    <FxSpacer height={8} />
                    <FxText variant="bodySmallRegular" testID="approval-reasoning">
                        {action.reasoning}
                    </FxText>
                    <FxSpacer height={8} />
                    <FxText variant="bodySmallRegular">
                        {t('diagnostics.approval.confidenceLabel', {
                            pct: Math.round(action.confidence * 100),
                        })}
                    </FxText>

                    {isTier3 && (
                        <>
                            <FxSpacer height={16} />
                            <FxText variant="bodySmallRegular">
                                {t('diagnostics.approval.securityCodePrompt')}
                            </FxText>
                            <FxSpacer height={8} />
                            <TextInput
                                value={securityCode}
                                onChangeText={setSecurityCode}
                                keyboardType="numeric"
                                maxLength={4}
                                secureTextEntry
                                editable={!executing}
                                testID="approval-security-code-input"
                                style={[
                                    styles.codeInput,
                                    { borderColor: colors.border },
                                ]}
                            />
                            <FxSpacer height={16} />
                            <FxText variant="bodySmallRegular">
                                {t('diagnostics.approval.tier3HoldHint')}
                            </FxText>
                            <FxSpacer height={8} />
                            <Pressable
                                testID="approval-tier3-hold"
                                onPressIn={handlePressIn}
                                onPressOut={handlePressOut}
                                disabled={!codeReady || executing}
                                style={[
                                    styles.holdButton,
                                    {
                                        backgroundColor: codeReady
                                            ? colors.errorBase
                                            : colors.backgroundApp,
                                        opacity: executing ? 0.6 : 1,
                                    },
                                ]}
                            >
                                <Animated.View
                                    testID="approval-hold-progress"
                                    style={[
                                        styles.holdProgressFill,
                                        {
                                            backgroundColor: colors.errorBase,
                                            opacity: 0.4,
                                            width: widthInterp,
                                        },
                                    ]}
                                />
                                <FxText variant="bodyMediumRegular">
                                    {t('diagnostics.approval.tier3HoldLabel')}
                                </FxText>
                            </Pressable>
                        </>
                    )}

                    <FxSpacer height={16} />
                    <FxBox flexDirection="row" justifyContent="flex-end">
                        <FxButton
                            variant="inverted"
                            onPress={onCancel}
                            marginRight="8"
                            disabled={executing}
                            testID="approval-cancel"
                        >
                            {t('diagnostics.approval.cancel')}
                        </FxButton>
                        {!isTier3 && (
                            <FxButton
                                onPress={handleTier2Approve}
                                disabled={executing}
                                testID="approval-tier2-approve"
                            >
                                {t('diagnostics.approval.tier2Approve')}
                            </FxButton>
                        )}
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
    holdButton: {
        height: 56,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    holdProgressFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
    },
});
