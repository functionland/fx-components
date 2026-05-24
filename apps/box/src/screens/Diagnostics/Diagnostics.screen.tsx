/**
 * Diagnostics screen — Phase 5 shell.
 *
 * Always-on diagnostic surface that ships BEFORE the Blox AI plugin (Phases
 * 6-12) so users on devices that never install the plugin still get useful
 * troubleshooting visibility:
 *
 *   1. Phone-side connectivity preamble: NetInfo state + a cheap HTTPS probe
 *      to `generate_204` (proves the PHONE is online, distinct from "is the
 *      Blox reachable").
 *   2. Plugin-presence detection via `usePluginsStore.activePlugins` —
 *      tolerant of pre-plugin firmwares (modelled as `checking` /
 *      `installed` / `notInstalledOrUnavailable`).
 *   3. Support diagnostics shell — for Phase 5, an inert "Available once
 *      Blox AI is installed" placeholder. The actual state-file dump comes
 *      with the plugin in Phase 6+ (the plan's plugin-isolation requirement
 *      means we don't add a cross-repo `diag_raw` command in core).
 *
 * Wired into the Settings stack as the lowest-risk entry point for an
 * always-on utility screen (per Codex pre-implementation review). The Blox
 * screen's "Disconnected" CTA will route here in a later phase.
 *
 * No AI features (no chat, approvals, transcripts) — those land in Phase 12.
 */
import React from 'react';
import { ActivityIndicator } from 'react-native';
import {
    FxBox,
    FxText,
    FxCard,
    FxButton,
    FxKeyboardAwareScrollView,
    FxSpacer,
    useFxTheme,
} from '@functionland/component-library';
import { useTranslation } from 'react-i18next';
import NetInfo from '@react-native-community/netinfo';

import { usePluginsStore } from '../../stores/usePluginsStore';
import { Routes } from '../../navigation/navigationConfig';

// Generic captive-portal-style "is the phone online" probe. 204 No Content
// is the standard "internet works" signal — chosen over a Fula-specific URL
// because this card is about the PHONE's connectivity, not the device's
// (per Codex review: don't conflate the two).
const PHONE_INTERNET_PROBE_URL = 'https://www.google.com/generate_204';
const PHONE_INTERNET_PROBE_TIMEOUT_MS = 5000;
const BLOX_AI_PLUGIN_NAME = 'blox-ai';

type ProbeStatus = 'checking' | 'ok' | 'failed';
type PluginPresence = 'checking' | 'installed' | 'notInstalledOrUnavailable';

async function probePhoneInternet(): Promise<ProbeStatus> {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(),
                                 PHONE_INTERNET_PROBE_TIMEOUT_MS);
        try {
            const r = await fetch(PHONE_INTERNET_PROBE_URL, {
                method: 'GET',
                signal: controller.signal,
                // generate_204 is supposed to return 204 No Content; treat
                // any 2xx as success (proxies may rewrite to 200).
            });
            return r.status >= 200 && r.status < 300 ? 'ok' : 'failed';
        } finally {
            clearTimeout(timer);
        }
    } catch {
        return 'failed';
    }
}

export const DiagnosticsScreen: React.FC = () => {
    const { t } = useTranslation();
    const { colors } = useFxTheme();
    const { listActivePlugins, activePlugins } = usePluginsStore();

    const [netInfoConnected, setNetInfoConnected] = React.useState<boolean | null>(null);
    const [phoneInternet, setPhoneInternet] = React.useState<ProbeStatus>('checking');
    const [pluginPresence, setPluginPresence] = React.useState<PluginPresence>('checking');

    // Phone-side probes run once on mount. Re-fetching on every focus would
    // be nice but adds complexity; Phase 12's chat UX can trigger a refresh
    // when it needs one. NetInfo subscription updates the connected flag
    // live so disconnecting while on the screen flips the card.
    React.useEffect(() => {
        const unsub = NetInfo.addEventListener((s) => {
            setNetInfoConnected(s.isConnected ?? null);
        });
        probePhoneInternet().then(setPhoneInternet);
        return () => unsub();
    }, []);

    // Plugin presence — tolerant of pre-plugin firmware per Codex review:
    // missing data ≠ "not installed", so the UI copy avoids overclaiming.
    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await listActivePlugins();
            } catch {
                // listActivePlugins captures its own errors into the store
            }
            if (cancelled) return;
            const list = (activePlugins || []) as string[];
            if (!Array.isArray(list)) {
                setPluginPresence('notInstalledOrUnavailable');
                return;
            }
            setPluginPresence(
                list.includes(BLOX_AI_PLUGIN_NAME)
                    ? 'installed'
                    : 'notInstalledOrUnavailable'
            );
        })();
        return () => { cancelled = true; };
    // listActivePlugins/activePlugins from zustand are stable enough; we want
    // this to run on every mount AND when activePlugins flips
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePlugins]);

    return (
        <FxKeyboardAwareScrollView>
            <FxBox paddingHorizontal="20" paddingVertical="16">
                <FxText variant="h300">{t('diagnostics.screenTitle')}</FxText>
                <FxSpacer height={16} />

                {/* ───────── Phone-side preamble ───────── */}
                <FxCard>
                    <FxCard.Title>
                        {t('diagnostics.phoneConnectivityTitle')}
                    </FxCard.Title>
                    <FxBox paddingVertical="8">
                        <FxText>
                            {netInfoConnected === null
                                ? t('diagnostics.netInfoChecking')
                                : netInfoConnected
                                    ? t('diagnostics.netInfoConnected')
                                    : t('diagnostics.netInfoDisconnected')}
                        </FxText>
                        <FxSpacer height={4} />
                        {phoneInternet === 'checking' ? (
                            <FxBox flexDirection="row" alignItems="center">
                                <ActivityIndicator size="small" />
                                <FxSpacer width={8} />
                                <FxText>{t('diagnostics.phoneInternetChecking')}</FxText>
                            </FxBox>
                        ) : phoneInternet === 'ok' ? (
                            <FxText color="successBase">
                                {t('diagnostics.phoneInternetOk')}
                            </FxText>
                        ) : (
                            <FxText color="errorBase">
                                {t('diagnostics.phoneInternetFailed')}
                            </FxText>
                        )}
                    </FxBox>
                </FxCard>

                <FxSpacer height={12} />

                {/* ───────── Plugin presence ───────── */}
                <FxCard>
                    <FxCard.Title>{t('diagnostics.pluginStatusTitle')}</FxCard.Title>
                    <FxBox paddingVertical="8">
                        {pluginPresence === 'checking' ? (
                            <FxBox flexDirection="row" alignItems="center">
                                <ActivityIndicator size="small" />
                                <FxSpacer width={8} />
                                <FxText>{t('diagnostics.pluginChecking')}</FxText>
                            </FxBox>
                        ) : pluginPresence === 'installed' ? (
                            <>
                                <FxText color="successBase">
                                    {t('diagnostics.pluginInstalled')}
                                </FxText>
                                <FxSpacer height={4} />
                                <FxText variant="bodySmallRegular">
                                    {t('diagnostics.pluginInstalledHint')}
                                </FxText>
                                <FxSpacer height={8} />
                                {/* Deliberately disabled in Phase 5 — Phase 12 wires
                                    this CTA to the AI chat screen. Disabled + "Coming
                                    soon" is honest; a tappable no-op looks broken
                                    (Codex pre-implementation review). */}
                                <FxButton disabled>
                                    {t('diagnostics.openBloxAiComingSoon')}
                                </FxButton>
                            </>
                        ) : (
                            <>
                                <FxText>{t('diagnostics.pluginNotDetected')}</FxText>
                                <FxSpacer height={4} />
                                <FxText variant="bodySmallRegular">
                                    {t('diagnostics.pluginNotDetectedHint')}
                                </FxText>
                            </>
                        )}
                    </FxBox>
                </FxCard>

                <FxSpacer height={12} />

                {/* ───────── Support diagnostics (deferred-to-plugin shell) ───────── */}
                <FxCard>
                    <FxCard.Title>
                        {t('diagnostics.rawDiagnosticsTitle')}
                    </FxCard.Title>
                    <FxBox paddingVertical="8">
                        <FxText variant="bodySmallRegular">
                            {t('diagnostics.rawDiagnosticsPluginRequired')}
                        </FxText>
                        <FxSpacer height={8} />
                        <FxButton disabled>
                            {t('diagnostics.rawDiagnosticsUnavailable')}
                        </FxButton>
                    </FxBox>
                </FxCard>
            </FxBox>
        </FxKeyboardAwareScrollView>
    );
};
