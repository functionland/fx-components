import { FxText } from '@functionland/component-library';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native';
import WifiManager from 'react-native-wifi-reborn';
import { DEFAULT_NETWORK_NAME } from '../../hooks/useIsConnectedToBox';
import { useInitialSetupNavigation } from '../../hooks/useTypedNavigation';
import { Routes } from '../../navigation/navigationConfig';

export const ConnectToBloxScreen = () => {
  const navigation = useInitialSetupNavigation();
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  useEffect(() => {
    WifiManager.connectToProtectedSSID(DEFAULT_NETWORK_NAME, null, false).then(
      () => navigation.navigate(Routes.SetupWifi),
      () => setConnectionStatus('Unable to connect to Box.')
    );
  }, [navigation]);

  return (
    <SafeAreaView>
      <FxText variant="body" color="primary" margin="16">
        Make sure your Box is turned on and in range of your mobile device.
      </FxText>
      <FxText variant="body" color="secondary" margin="16">
        {connectionStatus}
      </FxText>
    </SafeAreaView>
  );
};
