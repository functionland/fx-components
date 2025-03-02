import { FxText } from '@functionland/component-library';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native';
import WifiManager from 'react-native-wifi-reborn';
import { getWifiStatus, putApDisable } from '../../api/wifi';
import { DEFAULT_NETWORK_NAME } from '../../hooks';
import { useTranslation } from 'react-i18next'; // Import for translations

enum NetworkStatus {
  Connected = 'connected',
  Connecting = 'connecting',
  CheckConnection = 'check-connection',
  FailedConnection = 'failed-connection',
  Disconnected = 'disconnected',
}

export const CheckConnectionScreen = ({ route }) => {
  const { t } = useTranslation(); // Add translation hook
  const [status, setStatus] = useState(NetworkStatus.Connecting);
  const { ssid } = route.params;

  const confirmNetworkConnection = useCallback(async () => {
    try {
      const {
        data: { status: wifiStatus },
      } = await getWifiStatus();
      setStatus(wifiStatus);
      if (wifiStatus === NetworkStatus.Connected) {
        // eslint-disable-next-line no-alert
        alert(t('checkConnection.allDone'));
        putApDisable();
      }
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert(error.response ? error.response.data.message : error.message);
    }
  }, [setStatus, t]);

  const connectToBox = useCallback(async (callback: () => void) => {
    await WifiManager.connectToProtectedSSID(DEFAULT_NETWORK_NAME, null, false);
    callback();
  }, []);

  const checkNetwork = useCallback(async () => {
    WifiManager.getCurrentWifiSSID().then((actualSsid) => {
      if (actualSsid === DEFAULT_NETWORK_NAME) {
        setStatus(NetworkStatus.CheckConnection);
        confirmNetworkConnection();
      } else {
        setStatus(NetworkStatus.Connecting);
        connectToBox(checkNetwork);
      }
    });
  }, [confirmNetworkConnection, connectToBox]);

  useEffect(() => {
    const timeout = setTimeout(checkNetwork, 10000);
    return () => clearTimeout(timeout);
  }, [checkNetwork]);

  const statusMessage = useMemo(() => {
    switch (status) {
      case NetworkStatus.Connected:
        return t('checkConnection.successfullyConnected', { ssid });
      case NetworkStatus.CheckConnection:
        return t('checkConnection.verifyingConnection');
      case NetworkStatus.FailedConnection:
        return t('checkConnection.couldntConnect', { ssid });
      case NetworkStatus.Disconnected:
        return t('checkConnection.couldntConnectTryAgain', { ssid });
      case NetworkStatus.Connecting:
      default:
        return t('checkConnection.connectingWith', { ssid });
    }
  }, [status, ssid, t]);

  return (
    <SafeAreaView>
      <FxText variant="body" margin="16" color="primary">
        {t('checkConnection.verifyingConnectionWith', { ssid })}
      </FxText>
      <FxText variant="body" margin="16" color="secondary">
        {statusMessage}
      </FxText>
    </SafeAreaView>
  );
};