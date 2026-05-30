/**
 * ManualIpCard — user-typed LAN IP fallback for the Blox AI plugin.
 *
 * Why this exists: the blox normally broadcasts its LAN IP over mDNS (via
 * go-fula). When go-fula / zeroconf is down — which is exactly the kind of
 * failure Blox AI is asked to diagnose — nothing broadcasts the IP and the
 * only transport left is slow BLE. Letting the user type the IP they already
 * know (router admin page, a sticker, an earlier session) restores the fast
 * LAN-HTTP path with only blox-ai's own container running.
 *
 * Validation split (gemini security review 2026-05-29):
 *   - FORMAT is a HARD gate: Save is disabled unless the draft passes
 *     `ipIsPrivateLan` (the single source of truth, shared with the selector).
 *     This catches typos and refuses public / loopback / IPv6 addresses up
 *     front — we must never POST AI actions to a non-private host.
 *   - REACHABILITY is a SOFT probe: on Save we optionally hit /health and
 *     surface "reachable" / "couldn't reach" as advice only. We still persist
 *     the IP either way, because the selector falls through to mDNS → BLE on a
 *     failed probe — a momentarily-down blox shouldn't block the user from
 *     saving an IP they know is correct.
 *
 * This component never persists or probes directly; the parent supplies
 * `onSave` / `onClear` / `onProbe` so the card stays free of AsyncStorage and
 * transport imports (easy to test, no circular deps).
 */
import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import {
    FxBox,
    FxText,
    FxCard,
    FxButton,
    FxSpacer,
    useFxTheme,
} from '@functionland/component-library';
import { useTranslation } from 'react-i18next';

import { ipIsPrivateLan } from '../../utils/aiTransport';

type ProbeState = 'idle' | 'checking' | 'reachable' | 'unreachable';

export interface ManualIpCardProps {
    /** The currently-persisted manual IP for this blox, or null if none. */
    savedIp: string | null;
    /** Persist a new (already format-valid) IP. May be async. */
    onSave: (ip: string) => void | Promise<void>;
    /** Forget the saved IP (return to pure auto-discovery). May be async. */
    onClear: () => void | Promise<void>;
    /**
     * Optional reachability probe — returns true if /health answered. Used
     * only to show soft advice; the IP is saved regardless of the result.
     */
    onProbe?: (ip: string) => Promise<boolean>;
    /** Disable inputs while a session is starting / in flight. */
    disabled?: boolean;
}

export const ManualIpCard: React.FC<ManualIpCardProps> = ({
    savedIp,
    onSave,
    onClear,
    onProbe,
    disabled = false,
}) => {
    const { t } = useTranslation();
    const { colors } = useFxTheme();
    const [expanded, setExpanded] = React.useState(false);
    const [draft, setDraft] = React.useState('');
    const [probeState, setProbeState] = React.useState<ProbeState>('idle');

    const trimmed = draft.trim();
    // FORMAT gate (hard): non-empty AND passes the RFC1918/link-local check.
    const formatValid = trimmed.length > 0 && ipIsPrivateLan(trimmed);
    // Show the inline format error only once the user has typed something
    // that doesn't parse — never on an empty field.
    const showFormatError = trimmed.length > 0 && !formatValid;
    const checking = probeState === 'checking';
    const saveDisabled = disabled || !formatValid || checking;

    const onChangeDraft = React.useCallback((text: string) => {
        setDraft(text);
        // A prior probe verdict no longer applies once the IP changes.
        setProbeState('idle');
    }, []);

    const beginEdit = React.useCallback(() => {
        setDraft(savedIp ?? '');
        setProbeState('idle');
        setExpanded(true);
    }, [savedIp]);

    const handleSave = React.useCallback(async () => {
        const ip = draft.trim();
        // Backstop — the button is already disabled when this fails, but never
        // trust the disabled state alone for a security-relevant gate.
        if (!ipIsPrivateLan(ip)) return;
        await onSave(ip);
        // Persisted — collapse to the summary view (parent will re-render with
        // savedIp set). The probe verdict, if any, still renders in summary.
        setExpanded(false);
        if (!onProbe) {
            setProbeState('idle');
            return;
        }
        setProbeState('checking');
        try {
            const ok = await onProbe(ip);
            setProbeState(ok ? 'reachable' : 'unreachable');
        } catch {
            setProbeState('unreachable');
        }
    }, [draft, onSave, onProbe]);

    const handleClear = React.useCallback(async () => {
        await onClear();
        setDraft('');
        setProbeState('idle');
        setExpanded(false);
    }, [onClear]);

    const renderProbeMessage = () => {
        if (probeState === 'checking') {
            return (
                <FxText variant="bodyXSRegular" color="content2">
                    {t('diagnostics.manualIp.checking')}
                </FxText>
            );
        }
        if (probeState === 'reachable') {
            return (
                <FxText
                    testID="manual-ip-reachable"
                    variant="bodyXSRegular"
                    color="successBase"
                >
                    {t('diagnostics.manualIp.reachable')}
                </FxText>
            );
        }
        if (probeState === 'unreachable') {
            return (
                <FxText
                    testID="manual-ip-unreachable"
                    variant="bodyXSRegular"
                    color="warningBase"
                >
                    {t('diagnostics.manualIp.unreachable')}
                </FxText>
            );
        }
        return null;
    };

    return (
        <FxCard testID="manual-ip-card">
            <FxCard.Title>{t('diagnostics.manualIp.title')}</FxCard.Title>
            <FxBox paddingVertical="8">
                <FxText variant="bodySmallRegular" color="content2">
                    {t('diagnostics.manualIp.subtitle')}
                </FxText>
                <FxSpacer height={12} />

                {savedIp && !expanded ? (
                    // COMPACT SUMMARY — an IP is saved and we're not editing.
                    <FxBox>
                        <FxText
                            testID="manual-ip-summary"
                            variant="bodySmallRegular"
                            color="content1"
                        >
                            {t('diagnostics.manualIp.currentlyUsing', { ip: savedIp })}
                        </FxText>
                        {renderProbeMessage()}
                        <FxSpacer height={8} />
                        <FxButton
                            testID="manual-ip-change"
                            variant="inverted"
                            onPress={beginEdit}
                            disabled={disabled}
                        >
                            {t('diagnostics.manualIp.changeButton')}
                        </FxButton>
                        <FxSpacer height={8} />
                        <FxButton
                            testID="manual-ip-clear"
                            variant="inverted"
                            onPress={handleClear}
                            disabled={disabled}
                        >
                            {t('diagnostics.manualIp.clearButton')}
                        </FxButton>
                    </FxBox>
                ) : expanded ? (
                    // INPUT — typing a new / replacement IP.
                    <FxBox>
                        <TextInput
                            testID="manual-ip-input"
                            value={draft}
                            onChangeText={onChangeDraft}
                            placeholder={t('diagnostics.manualIp.placeholder')}
                            editable={!disabled}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="numbers-and-punctuation"
                            style={[
                                styles.input,
                                {
                                    color: colors.content1,
                                    borderColor: showFormatError
                                        ? colors.errorBase
                                        : colors.backgroundSecondary,
                                },
                            ]}
                        />
                        {showFormatError && (
                            <>
                                <FxSpacer height={4} />
                                <FxText
                                    testID="manual-ip-error"
                                    variant="bodyXSRegular"
                                    color="errorBase"
                                >
                                    {t('diagnostics.manualIp.invalid')}
                                </FxText>
                            </>
                        )}
                        {renderProbeMessage()}
                        <FxSpacer height={8} />
                        <FxButton
                            testID="manual-ip-save"
                            onPress={handleSave}
                            disabled={saveDisabled}
                        >
                            {checking
                                ? t('diagnostics.manualIp.checking')
                                : t('diagnostics.manualIp.saveButton')}
                        </FxButton>
                        {savedIp && (
                            <>
                                <FxSpacer height={8} />
                                <FxButton
                                    testID="manual-ip-clear"
                                    variant="inverted"
                                    onPress={handleClear}
                                    disabled={disabled}
                                >
                                    {t('diagnostics.manualIp.clearButton')}
                                </FxButton>
                            </>
                        )}
                    </FxBox>
                ) : (
                    // DISCLOSURE — no IP saved yet, collapsed.
                    <FxButton
                        testID="manual-ip-disclose"
                        variant="inverted"
                        onPress={beginEdit}
                        disabled={disabled}
                    >
                        {t('diagnostics.manualIp.disclose')}
                    </FxButton>
                )}
            </FxBox>
        </FxCard>
    );
};

const styles = StyleSheet.create({
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        minHeight: 44,
    },
});
