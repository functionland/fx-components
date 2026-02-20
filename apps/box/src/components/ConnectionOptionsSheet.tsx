import React, { useState, useCallback } from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxText,
  useFxTheme,
  FxPressableOpacity,
} from '@functionland/component-library';
import { ActivityIndicator } from 'react-native';
import { useBloxsStore } from '../stores';
import axios from 'axios';

const PING_URL = 'https://pools.fx.land/ping';
const PING_CLUSTER_URL = 'https://pools.fx.land/ping-cluster';
const POOLS_URL = 'https://pools.fx.land';

type PingStatus = 'idle' | 'pinging' | 'connected' | 'disconnected' | 'error';

export type ConnectionOptionsType = 'RETRY' | 'CONNECT-TO-WIFI' | 'RESET-CHAIN'
type ConnectionOptionsSheetProps = {
  closeBottomSheet: VoidFunction;
  onSelected?: (item: ConnectionOptionsType) => void
};

async function pingPeerId(peerId: string): Promise<{ status: PingStatus; message?: string }> {
  // Step 1: Check that pools.fx.land is accessible
  // Accept any HTTP response (even 404) as proof the server is reachable
  try {
    await axios.get(POOLS_URL, { timeout: 10000, validateStatus: () => true });
  } catch {
    return { status: 'error', message: 'Cannot reach pools.fx.land' };
  }

  // Step 2: Ping the peerId
  try {
    const response = await axios.post(PING_URL, { peerId }, { timeout: 60000 });
    const data = response.data;

    if (data?.status === 'err') {
      return { status: 'error', message: data.msg || 'Rate limited' };
    }
    if (data?.success === true) {
      return { status: 'connected', message: `${data.latency}ms` };
    }
    return { status: 'disconnected', message: 'Not reachable' };
  } catch (err: any) {
    const data = err?.response?.data;
    if (data?.status === 'err') {
      return { status: 'error', message: data.msg || 'Rate limited' };
    }
    if (data?.success === false) {
      return { status: 'disconnected', message: 'Not reachable' };
    }
    return { status: 'error', message: err?.message || 'Ping failed' };
  }
}

async function pingCluster(peerId: string): Promise<{ status: PingStatus; message?: string }> {
  // Step 1: Check that pools.fx.land is accessible
  try {
    await axios.get(POOLS_URL, { timeout: 10000, validateStatus: () => true });
  } catch {
    return { status: 'error', message: 'Cannot reach pools.fx.land' };
  }

  // Step 2: Ping the cluster using the kubo peerId
  try {
    const response = await axios.post(PING_CLUSTER_URL, { peerId }, { timeout: 60000 });
    const data = response.data;

    if (data?.status === 'err') {
      return { status: 'error', message: data.msg || 'Rate limited' };
    }
    if (data?.success === true) {
      return { status: 'connected', message: `${data.latency}ms` };
    }
    return { status: 'disconnected', message: 'Not reachable' };
  } catch (err: any) {
    const data = err?.response?.data;
    if (data?.status === 'err') {
      return { status: 'error', message: data.msg || 'Rate limited' };
    }
    if (data?.success === false) {
      return { status: 'disconnected', message: 'Not reachable' };
    }
    return { status: 'error', message: err?.message || 'Ping failed' };
  }
}

function PingStatusText({ status, message }: { status: PingStatus; message?: string }) {
  const { colors } = useFxTheme();

  if (status === 'idle') return null;
  if (status === 'pinging') return <ActivityIndicator size="small" />;

  const color = status === 'connected' ? colors.successBase
    : status === 'disconnected' ? colors.errorBase
    : colors.warningBase;

  const label = status === 'connected' ? 'Connected'
    : status === 'disconnected' ? 'Disconnected'
    : 'Error';

  return (
    <FxBox flexDirection="row" alignItems="center">
      <FxText style={{ color }} variant="bodySmallRegular">
        {label}{message ? ` (${message})` : ''}
      </FxText>
    </FxBox>
  );
}

export const ConnectionOptionsSheet = React.forwardRef<
  FxBottomSheetModalMethods,
  ConnectionOptionsSheetProps
>(({ onSelected }, ref) => {
  const currentBloxPeerId = useBloxsStore((state) => state.currentBloxPeerId);
  const bloxs = useBloxsStore((state) => state.bloxs);
  const currentBlox = currentBloxPeerId ? bloxs[currentBloxPeerId] : null;
  const clusterPeerId = currentBlox?.clusterPeerId || currentBloxPeerId;

  const [bloxPingStatus, setBloxPingStatus] = useState<PingStatus>('idle');
  const [bloxPingMessage, setBloxPingMessage] = useState<string | undefined>();
  const [clusterPingStatus, setClusterPingStatus] = useState<PingStatus>('idle');
  const [clusterPingMessage, setClusterPingMessage] = useState<string | undefined>();

  const handlePingBlox = useCallback(async () => {
    if (!currentBloxPeerId || bloxPingStatus === 'pinging') return;
    setBloxPingStatus('pinging');
    setBloxPingMessage(undefined);
    const result = await pingPeerId(currentBloxPeerId);
    setBloxPingStatus(result.status);
    setBloxPingMessage(result.message);
  }, [currentBloxPeerId, bloxPingStatus]);

  const handlePingCluster = useCallback(async () => {
    if (!currentBloxPeerId || clusterPingStatus === 'pinging') return;
    setClusterPingStatus('pinging');
    setClusterPingMessage(undefined);
    const result = await pingCluster(currentBloxPeerId);
    setClusterPingStatus(result.status);
    setClusterPingMessage(result.message);
  }, [currentBloxPeerId, clusterPingStatus]);

  return (
    <FxBottomSheetModal ref={ref}>
      <FxBox>
        <FxPressableOpacity
          paddingVertical='8'
          paddingHorizontal='8'
          onPress={() => onSelected?.('RETRY')}
        >
          <FxText variant='bodyMediumRegular'>Retry</FxText>
        </FxPressableOpacity>
        <FxPressableOpacity
          paddingVertical='8'
          paddingHorizontal='8'
          onPress={() => onSelected?.('CONNECT-TO-WIFI')}
        >
          <FxText variant='bodyMediumRegular'>Connect blox to Wi-Fi</FxText>
        </FxPressableOpacity>

        {currentBloxPeerId && (
          <FxPressableOpacity
            paddingVertical='8'
            paddingHorizontal='8'
            onPress={handlePingBlox}
            disabled={bloxPingStatus === 'pinging'}
          >
            <FxBox flexDirection="row" justifyContent="space-between" alignItems="center">
              <FxText variant='bodyMediumRegular'>Ping Blox PeerID</FxText>
              <PingStatusText status={bloxPingStatus} message={bloxPingMessage} />
            </FxBox>
          </FxPressableOpacity>
        )}

        {currentBloxPeerId && (
          <FxPressableOpacity
            paddingVertical='8'
            paddingHorizontal='8'
            onPress={handlePingCluster}
            disabled={clusterPingStatus === 'pinging'}
          >
            <FxBox flexDirection="row" justifyContent="space-between" alignItems="center">
              <FxText variant='bodyMediumRegular'>Ping Blox Cluster</FxText>
              <PingStatusText status={clusterPingStatus} message={clusterPingMessage} />
            </FxBox>
          </FxPressableOpacity>
        )}
      </FxBox>
    </FxBottomSheetModal>
  );
});
