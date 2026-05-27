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
} from '@functionland/component-library';
import { useTranslation } from 'react-i18next';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TcpSocket from 'react-native-tcp-socket';
import BleManager from 'react-native-ble-manager';

import { usePluginsStore } from '../../stores/usePluginsStore';
import { useBloxsStore } from '../../stores/useBloxsStore';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { Routes } from '../../navigation/navigationConfig';
import * as Constants from '../../utils/constants';
// Plan A v2 — A2 wiring.
import { QuickStartCard } from './QuickStartCard';
import { BloxAIChat } from './BloxAIChat';
import { ApprovalModal } from './ApprovalModal';
import { SharePhoneContextModal } from './SharePhoneContextModal';
import { FeedbackModal } from './FeedbackModal';
import { UploadTranscriptModal } from './UploadTranscriptModal';
import { PendingActionsPanel } from './PendingActionsPanel';
import { useAiSession } from './useAiSession';
import { BleManagerWrapper } from '../../utils/ble';
import { gatherContext as gatherPhoneContext } from '../../utils/phoneLogger';
import type { ScenarioId } from './quickStartPrompts';
import type { RouteProp } from '@react-navigation/native';
import type { MainTabsParamList } from '../../navigation/navigationConfig';

// Generic captive-portal-style "is the phone online" probe. 204 No Content
// is the standard "internet works" signal — chosen over a Fula-specific URL
// because this card is about the PHONE's connectivity, not the device's
// (per Codex review: don't conflate the two).
const PHONE_INTERNET_PROBE_URL = 'https://www.google.com/generate_204';
const PHONE_INTERNET_PROBE_TIMEOUT_MS = 5000;
const DISCOVERY_PROBE_URL = `${Constants.FXDiscoveryURL}/relays`;
const DISCOVERY_PROBE_TIMEOUT_MS = 5000;
const RELAY_PROBE_TIMEOUT_MS = 5000;
// Standard kubo / libp2p TCP port. Fula relays are kubo-based and only
// expose the libp2p multistream on this port — no HTTPS on :443, no other
// admin ports. A successful TCP SYN-ACK on :4001 is the only meaningful
// "reachable from this phone" signal.
const RELAY_PROBE_PORT = 4001;
const BLOX_AI_PLUGIN_NAME = 'blox-ai';

type ProbeStatus = 'checking' | 'ok' | 'failed';
type PluginPresence = 'checking' | 'installed' | 'notInstalledOrUnavailable';
type RelayInfo = { dnsName: string; status: ProbeStatus };

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

// Probe the Fula discovery API and return the relay list. Falls back to the
// AsyncStorage cache when the live API is unreachable so we can still show
// per-relay status from the last-known list. Final fallback is the hardcoded
// FXRelay constant (parsed from its multiaddr) so the user always sees at
// least one relay to probe — matches the same resolution order helper.ts
// uses for actual connections.
async function probeDiscoveryAndListRelays(): Promise<{
    discovery: ProbeStatus;
    dnsNames: string[];
}> {
    let discovery: ProbeStatus = 'failed';
    let liveDnsNames: string[] | null = null;
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(),
                                 DISCOVERY_PROBE_TIMEOUT_MS);
        try {
            const r = await fetch(DISCOVERY_PROBE_URL, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    accept: 'application/json',
                    // Same WAF gate header helper.ts uses for /relays.
                    'x-fula-client': 'app',
                },
            });
            if (r.status >= 200 && r.status < 300) {
                discovery = 'ok';
                try {
                    const list = (await r.json()) as Array<{ dnsName?: string }>;
                    if (Array.isArray(list)) {
                        liveDnsNames = list
                            .map(x => x?.dnsName)
                            .filter((x): x is string => typeof x === 'string' && x.length > 0);
                    }
                } catch {
                    // Body parse failed but discovery is reachable; we'll
                    // fall through to cache/hardcoded for the relay list.
                }
            }
        } finally {
            clearTimeout(timer);
        }
    } catch {
        discovery = 'failed';
    }

    if (liveDnsNames && liveDnsNames.length > 0) {
        return { discovery, dnsNames: liveDnsNames };
    }

    // Discovery returned nothing usable (or failed entirely). Try cache.
    try {
        const raw = await AsyncStorage.getItem(Constants.FXRelayCacheKey);
        if (raw) {
            const parsed = JSON.parse(raw) as { list?: Array<{ dnsName?: string }> };
            const cached = (parsed?.list ?? [])
                .map(x => x?.dnsName)
                .filter((x): x is string => typeof x === 'string' && x.length > 0);
            if (cached.length > 0) {
                return { discovery, dnsNames: cached };
            }
        }
    } catch {
        // Cache unreadable; fall through to hardcoded.
    }

    // Last-resort: parse the hardcoded relay multiaddr to get a dnsName so
    // the user still sees one relay row to probe.
    const m = Constants.FXRelay.match(/^\/dns\/([^/]+)/);
    const hardcoded = m ? [m[1]] : [];
    return { discovery, dnsNames: hardcoded };
}

// Probe a single relay's libp2p port via raw TCP. Fula relays are kubo-based
// and only expose libp2p multistream on TCP :4001 — no HTTPS on :443, no
// admin ports. A TCP SYN-ACK on :4001 is the only meaningful "the phone
// can reach this relay" signal.
//
// We rely on react-native-tcp-socket here (added as a native dep) because
// RN's built-in fetch + WebSocket can't probe a port that doesn't speak
// HTTP or TLS. An earlier HTTPS-HEAD-on-:443 probe was a false-negative
// machine — kubo relays always returned ✗ even when fully reachable.
//
// We resolve 'ok' the moment the connect callback fires (TCP handshake
// complete) and immediately destroy() the socket so we don't trigger the
// libp2p multistream handshake. The relay will close the connection on
// its side too once it sees us not speak; that's fine, we already have
// our signal.
async function probeRelay(dnsName: string): Promise<ProbeStatus> {
    return new Promise<ProbeStatus>((resolve) => {
        let settled = false;
        let client: ReturnType<typeof TcpSocket.createConnection> | null = null;

        const settle = (status: ProbeStatus) => {
            if (settled) return;
            settled = true;
            if (client) {
                try { client.destroy(); } catch { /* socket already torn down */ }
            }
            resolve(status);
        };

        // Connect timeout — TcpSocket's per-socket timeout fires AFTER
        // connect, not during. We need our own wall-clock guard so a host
        // that silently drops SYNs doesn't hang the probe forever.
        const timer = setTimeout(() => settle('failed'), RELAY_PROBE_TIMEOUT_MS);

        try {
            client = TcpSocket.createConnection(
                { host: dnsName, port: RELAY_PROBE_PORT },
                () => {
                    clearTimeout(timer);
                    settle('ok');
                }
            );
            client.on('error', () => {
                clearTimeout(timer);
                settle('failed');
            });
        } catch {
            clearTimeout(timer);
            settle('failed');
        }
    });
}

type DiagnosticsScreenProps = {
    route?: RouteProp<MainTabsParamList, Routes.DiagnosticsTab>;
};

export const DiagnosticsScreen: React.FC<DiagnosticsScreenProps> = ({ route }) => {
    const { t } = useTranslation();
    const { listActivePlugins, activePlugins } = usePluginsStore();
    // Plan A v2 wiring: pull peer ids from the existing stores.
    const appPeerId = useUserProfileStore((s) => s.appPeerId) ?? '';
    const currentBloxPeerId = useBloxsStore((s) => s.currentBloxPeerId) ?? '';
    // Plan A v2 — A4 prefill from nav route param. Consumed once by
    // the hook; the reducer clears it after first read so focus/remount
    // doesn't re-prefill (codex catch).
    const prefillScenario: ScenarioId | null =
        (route?.params?.prefillScenario as ScenarioId | undefined) ?? null;

    const [netInfoConnected, setNetInfoConnected] = React.useState<boolean | null>(null);
    const [phoneInternet, setPhoneInternet] = React.useState<ProbeStatus>('checking');
    const [discoveryStatus, setDiscoveryStatus] = React.useState<ProbeStatus>('checking');
    const [relays, setRelays] = React.useState<RelayInfo[] | null>(null);
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

    // Fula network reachability: discovery API + per-relay TCP probes.
    // Discovery resolves to a list of relay DNS names; we then probe each
    // relay in parallel. State is set as results arrive so the UI shows
    // progress without waiting for the slowest relay.
    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            const { discovery, dnsNames } = await probeDiscoveryAndListRelays();
            if (cancelled) return;
            setDiscoveryStatus(discovery);
            if (dnsNames.length === 0) {
                setRelays([]);
                return;
            }
            // Seed the relay list with 'checking' so the user sees the
            // hostnames immediately; per-relay status updates as probes
            // resolve.
            setRelays(dnsNames.map(dnsName => ({ dnsName, status: 'checking' })));
            await Promise.all(dnsNames.map(async (dnsName) => {
                const status = await probeRelay(dnsName);
                if (cancelled) return;
                setRelays(prev => {
                    if (!prev) return prev;
                    return prev.map(r =>
                        r.dnsName === dnsName ? { ...r, status } : r
                    );
                });
            }));
        })();
        return () => { cancelled = true; };
    }, []);

    // Plugin presence — tolerant of pre-plugin firmware per Codex review:
    // missing data ≠ "not installed", so the UI copy avoids overclaiming.
    //
    // Split into two effects to avoid the infinite-loop trap:
    //   (1) fetch once on mount — listActivePlugins() updates the store,
    //       which would re-fire any effect that depends on activePlugins.
    //   (2) react to store changes — derives pluginPresence from whatever
    //       activePlugins currently is. No fetching here, so updating
    //       activePlugins (whether via the mount fetch, an install action
    //       elsewhere, or a future polling refresh) flips presence without
    //       re-triggering the fetch.
    // The previous single-effect form (which called listActivePlugins
    // inside an effect that depended on activePlugins) looped forever
    // because the store creates a fresh `[]` reference on every empty
    // result and zustand's shallow equality flags that as a change.
    const [hasFetched, setHasFetched] = React.useState(false);

    React.useEffect(() => {
        listActivePlugins()
            .catch(() => {
                // listActivePlugins captures its own errors into the store
            })
            .finally(() => setHasFetched(true));
        // listActivePlugins is the zustand setter — referentially stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
        // Wait for the mount fetch before deriving presence — without this,
        // the initial activePlugins=[] from the store would flash a
        // one-frame "Blox AI not installed" before the real response lands.
        if (!hasFetched) return;
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
    }, [activePlugins, hasFetched]);

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

                {/* ───────── Fula network reachability ───────── */}
                <FxCard>
                    <FxCard.Title>
                        {t('diagnostics.fulaNetworkTitle')}
                    </FxCard.Title>
                    <FxBox paddingVertical="8">
                        {discoveryStatus === 'checking' ? (
                            <FxBox flexDirection="row" alignItems="center">
                                <ActivityIndicator size="small" />
                                <FxSpacer width={8} />
                                <FxText>{t('diagnostics.discoveryChecking')}</FxText>
                            </FxBox>
                        ) : discoveryStatus === 'ok' ? (
                            <FxText color="successBase">
                                {t('diagnostics.discoveryOk')}
                            </FxText>
                        ) : (
                            <FxText color="errorBase">
                                {t('diagnostics.discoveryFailed')}
                            </FxText>
                        )}
                        <FxSpacer height={8} />
                        {relays === null ? (
                            <FxBox flexDirection="row" alignItems="center">
                                <ActivityIndicator size="small" />
                                <FxSpacer width={8} />
                                <FxText>{t('diagnostics.relaysChecking')}</FxText>
                            </FxBox>
                        ) : relays.length === 0 ? (
                            <FxText variant="bodySmallRegular">
                                {t('diagnostics.relaysUnknown')}
                            </FxText>
                        ) : (
                            <>
                                <FxText variant="bodySmallRegular">
                                    {t('diagnostics.relaysListLabel')}
                                </FxText>
                                <FxSpacer height={4} />
                                {relays.map((r) => (
                                    <FxBox
                                        key={r.dnsName}
                                        flexDirection="row"
                                        alignItems="center"
                                        paddingVertical="4"
                                    >
                                        {r.status === 'checking' ? (
                                            <>
                                                <ActivityIndicator size="small" />
                                                <FxSpacer width={8} />
                                                <FxText variant="bodySmallRegular">
                                                    {r.dnsName}
                                                </FxText>
                                            </>
                                        ) : r.status === 'ok' ? (
                                            <FxText
                                                variant="bodySmallRegular"
                                                color="successBase"
                                            >
                                                ✓ {r.dnsName}
                                            </FxText>
                                        ) : (
                                            <FxText
                                                variant="bodySmallRegular"
                                                color="errorBase"
                                            >
                                                ✗ {r.dnsName}
                                            </FxText>
                                        )}
                                    </FxBox>
                                ))}
                            </>
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
                                {/* Plan A v2 (A2): AI session UI is rendered
                                    below this card, OUTSIDE this branch so it
                                    can stretch + own its own modals. */}
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

                {/* ───────── Support diagnostics (deferred-to-plugin shell) ─────────
                    Two states:
                      - plugin NOT installed → "Unavailable until Blox AI is installed"
                        (the original Phase 5 copy; encourages install)
                      - plugin installed → "Coming soon — raw state-file dump …"
                        (the feature itself is still deferred to a future app version;
                        the plugin install is no longer the blocker)
                    Don't render anything while presence is still 'checking' — would
                    flash the wrong message between mount and the first fetch. */}
                {/* ───────── Plan A v2 (A2): Blox AI session UI ─────────
                    Rendered when the plugin is installed AND both peer IDs
                    are known. Owned by this screen so modals can sit on
                    top of the scroll view. Hook accepts nullable BLE
                    args; for the first cut bleManager is null (no
                    discovery wired here yet — follow-up). LAN HTTP path
                    works regardless when mDNS cache is populated. */}
                {pluginPresence === 'installed' && appPeerId && currentBloxPeerId && (
                    <BloxAiSessionBlock
                        appPeerId={appPeerId}
                        bloxPeerId={currentBloxPeerId}
                        prefillScenario={prefillScenario}
                    />
                )}

                {pluginPresence !== 'checking' && (
                    <FxCard>
                        <FxCard.Title>
                            {t('diagnostics.rawDiagnosticsTitle')}
                        </FxCard.Title>
                        <FxBox paddingVertical="8">
                            {pluginPresence === 'installed' ? (
                                <>
                                    <FxText variant="bodySmallRegular">
                                        {t('diagnostics.rawDiagnosticsComingSoon')}
                                    </FxText>
                                    <FxSpacer height={8} />
                                    <FxButton disabled>
                                        {t('diagnostics.rawDiagnosticsComingSoonButton')}
                                    </FxButton>
                                </>
                            ) : (
                                <>
                                    <FxText variant="bodySmallRegular">
                                        {t('diagnostics.rawDiagnosticsPluginRequired')}
                                    </FxText>
                                    <FxSpacer height={8} />
                                    <FxButton disabled>
                                        {t('diagnostics.rawDiagnosticsUnavailable')}
                                    </FxButton>
                                </>
                            )}
                        </FxBox>
                    </FxCard>
                )}
            </FxBox>
        </FxKeyboardAwareScrollView>
    );
};

/**
 * Inner block that instantiates the AI session hook and renders the
 * chat + modals + pending panel. Split into its own component so the
 * hook only mounts when both peer IDs are known (avoids the hook
 * doing pending fetches before pairing completes).
 *
 * BLE wiring follow-up: for this PR's first cut, bleManager and
 * blePeripheralId are null. The LAN HTTP path works for users on the
 * same LAN as their blox once the mDNS cache is populated (Plan HTTP
 * follow-up: wire the pairing flow's Zeroconf 'resolved' handler to
 * call mdnsCache.noteRecord()). BLE fallback comes online when this
 * screen mirrors the BluetoothCommands.screen pattern of useMemo'd
 * BleManagerWrapper + getConnectedPeripherals on mount.
 */
const BloxAiSessionBlock: React.FC<{
    appPeerId: string;
    bloxPeerId: string;
    prefillScenario: ScenarioId | null;
}> = ({ appPeerId, bloxPeerId, prefillScenario }) => {
    // BLE wiring (Plan A end-to-end follow-up #1):
    // useMemo a BleManagerWrapper bound to this screen's lifecycle,
    // mirroring the BluetoothCommands.screen pattern. On mount, query
    // for already-connected peripherals (cheap, no permissions
    // prompt). If the user paired their blox earlier in this app
    // session, the peripheral.id is already cached by the OS and we
    // can use it for BLE AI commands. If nothing is connected, BLE
    // operations return ble-busy/network errors and the hook surfaces
    // them in the transcript — at least LAN HTTP still works for
    // users on the same LAN as their blox.
    const bleManager = React.useMemo(
        () => new BleManagerWrapper(() => {
            // Status changes are a no-op for the AI screen — we don't
            // need to render connection-status badges here; if the
            // peripheral drops, the next AI session attempt will
            // surface the failure.
        }),
        [],
    );
    const [blePeripheralId, setBlePeripheralId] = React.useState<string | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        // Discover any already-connected blox peripheral. Empty array
        // filter returns ALL connected peripherals; we match by name
        // prefix (fulatower / fxblox) — same naming convention the
        // BluetoothCommands screen uses.
        BleManager.getConnectedPeripherals([]).then((peripherals) => {
            if (cancelled) return;
            const blox = peripherals.find((p) => {
                const n = (p.name || '').toLowerCase();
                return n === 'fulatower' || n === 'fxblox-rk1' || n.startsWith('fulatower') || n.startsWith('fxblox');
            });
            if (blox?.id) {
                setBlePeripheralId(blox.id);
            }
        }).catch(() => {
            // BLE permissions might not be granted; not an error for
            // this screen. LAN HTTP still works.
        });
        return () => { cancelled = true; };
    }, []);

    const { state, actions } = useAiSession({
        appPeerId,
        bloxPeerId,
        bleManager,
        blePeripheralId,
        pluginInstalled: true,
        initialPrefilledScenario: prefillScenario,
        // Wire the phone-context gatherer so the "Share my phone's context"
        // button (BloxAIChat.tsx) actually does something. Without this,
        // useAiSession.openShareContext bails out at the `if (!gatherPhoneContext) return;`
        // guard and the button is a no-op.
        gatherPhoneContext,
    });

    // Consume the route param after the first render so re-focus
    // doesn't re-prefill (codex catch).
    React.useEffect(() => {
        if (state.prefilledScenario !== null) {
            // Read once; reducer clears it on consume.
            actions.consumePrefill();
        }
        // Run only once on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <FxSpacer height={12} />
            {state.pending && state.pending.actions.length > 0 && (
                <>
                    <PendingActionsPanel
                        pending={state.pending}
                        onApprove={actions.approvePending}
                        onDismiss={actions.dismissPending}
                        busy={state.busy}
                    />
                    <FxSpacer height={12} />
                </>
            )}

            <BloxAIChat
                transcript={state.transcript}
                streaming={state.streaming}
                sessionId={state.sessionId}
                busy={state.busy}
                onApprove={actions.openApproval}
                onSubmitReply={actions.submitReply}
                onShareContext={actions.openShareContext}
                onStartSession={actions.startSession}
                // Opens FeedbackModal where the user rates the session
                // AND can opt-in to share an anonymized transcript
                // (Phase 21 — the only path that triggers the upload to
                // ai-training.fx.land/transcripts).
                onOpenFeedback={actions.openFeedback}
                // Wipes the local transcript so the user can begin a
                // fresh session. Primary recovery after the SSE stream
                // aborts (phone backgrounded mid-session, OS suspended
                // the JS engine, "Software caused connection abort"
                // surfaces on resume). Also offered alongside the
                // rate-and-share button after a normal session end so
                // users aren't forced through the rate flow to chat again.
                onStartNewChat={actions.clearSession}
            />

            {/* Quick-start card sits below the chat when no session is
                active; once a session starts the chat takes over. */}
            {!state.sessionId && !state.streaming && (
                <>
                    <FxSpacer height={12} />
                    <QuickStartCard
                        onSelectScenario={actions.startQuickStart}
                        onSubmitFreeform={actions.startSession}
                        disabled={state.streaming}
                        prefilledScenario={state.prefilledScenario}
                    />
                </>
            )}

            {/* Modal stack — only one is rendered at a time per the
                reducer's activeModal invariant. */}
            <ApprovalModal
                action={
                    state.modals.active === 'approval'
                        ? state.modals.approvalAction
                        : null
                }
                onApprove={actions.confirmApproval}
                onCancel={actions.dismissApproval}
                executing={state.busy}
            />
            <SharePhoneContextModal
                phoneContext={
                    state.modals.active === 'shareContext'
                        ? state.modals.shareContextPreview
                        : null
                }
                onConfirm={actions.confirmShareContext}
                onCancel={actions.dismissShareContext}
                sending={state.busy}
            />
            <FeedbackModal
                sessionId={
                    state.modals.active === 'feedback'
                        ? state.modals.feedbackSessionId
                        : null
                }
                onSubmit={actions.submitFeedback}
                onDismiss={actions.dismissFeedback}
                busy={state.busy}
                // Phase 21 opt-in upload — anonymize the live transcript
                // + open the preview modal where the user reviews the
                // JSON before any POST to ai-training.fx.land/transcripts.
                onShareTranscript={actions.prepareTranscriptUpload}
            />
            <UploadTranscriptModal
                payload={
                    state.modals.active === 'uploadTranscript'
                        ? state.modals.uploadTranscriptPayload
                        : null
                }
                onUploaded={actions.dismissUploadTranscript}
                onDismiss={actions.dismissUploadTranscript}
            />
        </>
    );
};
