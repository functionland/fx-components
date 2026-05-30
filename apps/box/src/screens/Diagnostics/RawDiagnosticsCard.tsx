/**
 * RawDiagnosticsCard — the "Raw diagnostics (for support)" card.
 *
 * When the Blox AI plugin is installed this card:
 *   1. "Fetch raw diagnostics" → picks the active transport (LAN HTTP via
 *      selectAiTransport, else BLE), pulls the full read-only diag bundle
 *      (every diag/* tool the three transports rely on), and merges it with
 *      the phone-side info the Diagnostics screen already computed (blox
 *      kubo + cluster peer ids, the app's own peer id, and the phone's
 *      internet / discovery / relay probe results).
 *   2. Renders the exact merged JSON that will be sent (WYSIWYG).
 *   3. "Send to support" → POSTs that bundle to ai-training.fx.land
 *      /diagnostics (the same intake server as transcript uploads, under
 *      source='diagnostics').
 *   4. "Enable remote support" → opens a security-code modal and starts /
 *      restarts the WireGuard support tunnel over LAN HTTP. LAN-only by
 *      design (the BLE proxy can't carry the custom header + body); over
 *      BLE the user is pointed at Settings > Bluetooth's "SUPPORT ON".
 *
 * When the plugin is NOT installed the card shows the original install-CTA
 * copy with disabled buttons — fetch/support are plugin endpoints.
 */
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Platform } from 'react-native';
import {
    FxBox,
    FxText,
    FxCard,
    FxButton,
    FxSpacer,
    useFxTheme,
} from '@functionland/component-library';
import { useTranslation } from 'react-i18next';

import { selectAiTransport } from '../../utils/aiTransport';
import { BleAiClient } from '../../utils/bleAiClient';
import type { BleManagerWrapper } from '../../utils/ble';
import type { DiagBundle } from '../../utils/httpAiClient';
import {
    buildDiagnosticsPayload,
    postDiagnostics,
    type DiagnosticsPayload,
    type DiagnosticsRelayInfo,
} from '../../utils/diagnosticsUpload';
import { RemoteSupportModal } from './RemoteSupportModal';

type ProbeStatus = 'checking' | 'ok' | 'failed';
export interface RawRelayInfo {
    dnsName: string;
    status: ProbeStatus;
}

export interface RawDiagnosticsCardProps {
    pluginInstalled: boolean;
    /** kubo peer id of the current blox (also used to qualify LAN HTTP). */
    bloxKuboPeerId: string;
    /** ipfs-cluster (pool) peer id; null when unknown / stale-migration. */
    bloxClusterPeerId: string | null;
    appPeerId: string;
    phoneInternet: ProbeStatus;
    discoveryStatus: ProbeStatus;
    relays: RawRelayInfo[] | null;
    bleManager: BleManagerWrapper;
    blePeripheralId: string | null;
}

type FetchState = 'idle' | 'fetching' | 'done';
type SendState = 'idle' | 'sending' | 'sent' | 'error';

export const RawDiagnosticsCard: React.FC<RawDiagnosticsCardProps> = (props) => {
    const { t } = useTranslation();
    const { colors } = useFxTheme();

    const [fetchState, setFetchState] = React.useState<FetchState>('idle');
    const [payload, setPayload] = React.useState<DiagnosticsPayload | null>(null);
    const [transportUsed, setTransportUsed] = React.useState<string | null>(null);
    const [fetchError, setFetchError] = React.useState<string | null>(null);

    const [sendState, setSendState] = React.useState<SendState>('idle');
    const [sendError, setSendError] = React.useState<string | null>(null);

    const [supportModalVisible, setSupportModalVisible] = React.useState(false);
    const [supportBusy, setSupportBusy] = React.useState(false);
    const [supportResult, setSupportResult] = React.useState<{ ok: boolean; message: string } | null>(null);

    // Guard against setState after unmount — fetches can outlive a quick
    // back-navigation off the screen.
    const mountedRef = React.useRef(true);
    React.useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const handleFetch = React.useCallback(async () => {
        setFetchState('fetching');
        setFetchError(null);
        setPayload(null);
        setTransportUsed(null);
        setSendState('idle');
        setSendError(null);

        let chosen = 'none';
        let bundle: DiagBundle | null = null;
        let bundleError: string | null = null;

        try {
            const choice = await selectAiTransport(
                props.bloxKuboPeerId,
                props.appPeerId,
                { scanIfEmpty: true },
            );
            if (choice.kind === 'lan-http' && choice.httpClient) {
                chosen = 'lan-http';
                const r = await choice.httpClient.fetchDiagBundle();
                if (r.ok && r.payload) {
                    bundle = r.payload;
                } else {
                    bundleError = r.error?.message ?? 'LAN fetch failed';
                    // Health probe passed but the bundle fetch failed; fall
                    // back to BLE if a peripheral is available.
                    if (props.blePeripheralId) {
                        const ble = new BleAiClient(props.bleManager, props.blePeripheralId);
                        const rb = await ble.fetchDiagBundle();
                        if (rb.ok && rb.payload) {
                            bundle = rb.payload;
                            bundleError = null;
                            chosen = 'ble';
                        } else {
                            bundleError = rb.error?.message ?? bundleError;
                        }
                    }
                }
            } else if (props.blePeripheralId) {
                chosen = 'ble';
                const ble = new BleAiClient(props.bleManager, props.blePeripheralId);
                const rb = await ble.fetchDiagBundle();
                if (rb.ok && rb.payload) {
                    bundle = rb.payload;
                } else {
                    bundleError = rb.error?.message ?? 'BLE fetch failed';
                }
            } else {
                chosen = 'none';
                bundleError = choice.reason || 'no transport available';
            }
        } catch (e) {
            bundleError = e instanceof Error ? e.message : 'fetch failed';
        }

        if (!mountedRef.current) return;

        const relaysForPayload: DiagnosticsRelayInfo[] | null = props.relays
            ? props.relays.map((r) => ({ dns_name: r.dnsName, status: r.status }))
            : null;

        const built = buildDiagnosticsPayload({
            bloxKuboPeerId: props.bloxKuboPeerId,
            bloxClusterPeerId: props.bloxClusterPeerId,
            appPeerId: props.appPeerId,
            phoneInternet: props.phoneInternet,
            discoveryStatus: props.discoveryStatus,
            relays: relaysForPayload,
            transportUsed: chosen,
            appPlatform: Platform.OS,
            bundle,
            bundleError,
        });

        setPayload(built);
        setTransportUsed(chosen);
        setFetchError(bundleError);
        setFetchState('done');
    }, [
        props.bloxKuboPeerId,
        props.appPeerId,
        props.bloxClusterPeerId,
        props.phoneInternet,
        props.discoveryStatus,
        props.relays,
        props.bleManager,
        props.blePeripheralId,
    ]);

    const handleSend = React.useCallback(async () => {
        if (!payload) return;
        setSendState('sending');
        setSendError(null);
        const r = await postDiagnostics(payload);
        if (!mountedRef.current) return;
        if (r.ok) {
            setSendState('sent');
        } else {
            setSendState('error');
            setSendError(r.error ?? 'failed');
        }
    }, [payload]);

    const handleConfirmSupport = React.useCallback(
        async (code: string) => {
            setSupportBusy(true);
            setSupportResult(null);
            try {
                // Enable-remote-support selects its own transport so it works
                // independently of whether a diagnostics fetch happened. It is
                // LAN-only: refuse politely over BLE.
                const choice = await selectAiTransport(
                    props.bloxKuboPeerId,
                    props.appPeerId,
                    { scanIfEmpty: true },
                );
                if (choice.kind !== 'lan-http' || !choice.httpClient) {
                    if (!mountedRef.current) return;
                    setSupportBusy(false);
                    setSupportResult({
                        ok: false,
                        message: t('diagnostics.remoteSupport.lanOnly'),
                    });
                    return;
                }
                const r = await choice.httpClient.enableRemoteSupport(code);
                if (!mountedRef.current) return;
                setSupportBusy(false);
                if (r.ok && r.payload?.success) {
                    setSupportModalVisible(false);
                    setSupportResult({
                        ok: true,
                        message: t('diagnostics.remoteSupport.success'),
                    });
                    return;
                }
                // Map the specific server codes: gate rejections (403) plus the
                // lifecycle failures (500) the verified flow can now return.
                let message = t('diagnostics.remoteSupport.failed');
                const errCode = r.payload?.error;
                if (errCode === 'security_code_invalid') {
                    message = t('diagnostics.remoteSupport.badCode');
                } else if (errCode === 'security_code_file_missing') {
                    message = t('diagnostics.remoteSupport.noCodeFile');
                } else if (errCode === 'support_header_required') {
                    message = t('diagnostics.remoteSupport.headerRejected');
                } else if (errCode === 'wireguard_not_installed') {
                    message = t('diagnostics.remoteSupport.notInstalled');
                } else if (errCode === 'tunnel_inactive_after_restart') {
                    message = t('diagnostics.remoteSupport.tunnelInactive');
                } else if (r.error?.message) {
                    message = r.error.message;
                }
                setSupportResult({ ok: false, message });
            } catch (e) {
                if (!mountedRef.current) return;
                setSupportBusy(false);
                setSupportResult({
                    ok: false,
                    message: e instanceof Error ? e.message : t('diagnostics.remoteSupport.failed'),
                });
            }
        },
        [props.bloxKuboPeerId, props.appPeerId, t],
    );

    const openSupportModal = React.useCallback(() => {
        setSupportResult(null);
        setSupportModalVisible(true);
    }, []);

    const closeSupportModal = React.useCallback(() => {
        setSupportModalVisible(false);
    }, []);

    // ── Plugin-not-installed branch: keep the original install-CTA copy. ──
    if (!props.pluginInstalled) {
        return (
            <FxCard>
                <FxCard.Title>{t('diagnostics.rawDiagnosticsTitle')}</FxCard.Title>
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
        );
    }

    const previewJson = payload ? JSON.stringify(payload, null, 2) : '';
    const fetching = fetchState === 'fetching';

    return (
        <FxCard>
            <FxCard.Title>{t('diagnostics.rawDiagnosticsTitle')}</FxCard.Title>
            <FxBox paddingVertical="8">
                <FxText variant="bodySmallRegular">
                    {t('diagnostics.rawDiag.intro')}
                </FxText>
                <FxSpacer height={12} />

                {/* Fetch button */}
                <FxButton
                    onPress={handleFetch}
                    disabled={fetching}
                    testID="raw-diag-fetch"
                >
                    {fetching
                        ? t('diagnostics.rawDiag.fetching')
                        : fetchState === 'done'
                            ? t('diagnostics.rawDiag.refetch')
                            : t('diagnostics.rawDiag.fetch')}
                </FxButton>

                {fetching && (
                    <FxBox flexDirection="row" alignItems="center" paddingVertical="8">
                        <ActivityIndicator size="small" />
                        <FxSpacer width={8} />
                        <FxText variant="bodySmallRegular">
                            {t('diagnostics.rawDiag.fetchingHint')}
                        </FxText>
                    </FxBox>
                )}

                {/* Transport + error summary */}
                {fetchState === 'done' && (
                    <>
                        <FxSpacer height={8} />
                        <FxText variant="bodyXSRegular">
                            {transportUsed === 'lan-http'
                                ? t('diagnostics.rawDiag.viaLan')
                                : transportUsed === 'ble'
                                    ? t('diagnostics.rawDiag.viaBle')
                                    : t('diagnostics.rawDiag.viaNone')}
                        </FxText>
                        {fetchError ? (
                            <>
                                <FxSpacer height={4} />
                                <FxText variant="bodyXSRegular" color="errorBase">
                                    {t('diagnostics.rawDiag.bloxUnreachable')}
                                </FxText>
                            </>
                        ) : null}
                    </>
                )}

                {/* Rendered (WYSIWYG) payload preview */}
                {payload && (
                    <>
                        <FxSpacer height={8} />
                        <FxText variant="bodyXSRegular">
                            {t('diagnostics.rawDiag.previewIntro')}
                        </FxText>
                        <FxSpacer height={4} />
                        <ScrollView
                            style={[styles.preview, { borderColor: colors.border ?? '#888' }]}
                            testID="raw-diag-preview"
                            nestedScrollEnabled
                        >
                            <FxText variant="bodyXSRegular">{previewJson}</FxText>
                        </ScrollView>

                        {/* Send to support */}
                        <FxSpacer height={12} />
                        <FxButton
                            onPress={handleSend}
                            disabled={sendState === 'sending' || sendState === 'sent'}
                            testID="raw-diag-send"
                        >
                            {sendState === 'sending'
                                ? t('diagnostics.rawDiag.sending')
                                : sendState === 'sent'
                                    ? t('diagnostics.rawDiag.sent')
                                    : t('diagnostics.rawDiag.send')}
                        </FxButton>
                        {sendState === 'sent' && (
                            <>
                                <FxSpacer height={6} />
                                <FxText variant="bodySmallRegular" color="successBase">
                                    {t('diagnostics.rawDiag.sentConfirmation')}
                                </FxText>
                            </>
                        )}
                        {sendState === 'error' && (
                            <>
                                <FxSpacer height={6} />
                                <FxText variant="bodySmallRegular" color="errorBase">
                                    {t('diagnostics.rawDiag.sendFailed')} {sendError ?? ''}
                                </FxText>
                            </>
                        )}
                    </>
                )}

                {/* Enable remote support (LAN-only WireGuard start/restart) */}
                <FxSpacer height={16} />
                <FxText variant="bodySmallRegular">
                    {t('diagnostics.remoteSupport.sectionHint')}
                </FxText>
                <FxSpacer height={8} />
                <FxButton
                    variant="inverted"
                    onPress={openSupportModal}
                    testID="raw-diag-enable-support"
                >
                    {t('diagnostics.remoteSupport.openButton')}
                </FxButton>
                {supportResult && !supportModalVisible && (
                    <>
                        <FxSpacer height={6} />
                        <FxText
                            variant="bodySmallRegular"
                            color={supportResult.ok ? 'successBase' : 'errorBase'}
                            testID="raw-diag-support-result"
                        >
                            {supportResult.message}
                        </FxText>
                    </>
                )}
            </FxBox>

            <RemoteSupportModal
                visible={supportModalVisible}
                onConfirm={handleConfirmSupport}
                onCancel={closeSupportModal}
                busy={supportBusy}
                resultMessage={supportModalVisible ? supportResult?.message ?? null : null}
                resultOk={supportResult?.ok ?? false}
            />
        </FxCard>
    );
};

const styles = StyleSheet.create({
    preview: {
        flexGrow: 0,
        borderWidth: 1,
        borderRadius: 6,
        padding: 8,
        maxHeight: 320,
    },
});

export default RawDiagnosticsCard;
