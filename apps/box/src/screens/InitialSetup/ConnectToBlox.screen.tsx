import React, { useState, useEffect } from 'react';
import {
  FxBox,
  FxButton,
  FxProgressBar,
  FxText,
  FxSafeAreaBox,
} from '@functionland/component-library';
import WifiManager from 'react-native-wifi-reborn';
import { DEFAULT_NETWORK_NAME } from '../../hooks/useIsConnectedToBox';
import { useInitialSetupNavigation } from '../../hooks/useTypedNavigation';
import { Routes } from '../../navigation/navigationConfig';
import BloxWifiDevice from '../../app/icons/blox-wifi-device.svg';

enum EBloxConnectionStatus {
  connected = 'connected',
  connecting = 'connecting',
  failed = 'failed',
}

const connectionStatusStrings = {
  [EBloxConnectionStatus.connecting]: 'Connecting',
  [EBloxConnectionStatus.connected]: 'Connected',
  [EBloxConnectionStatus.failed]: 'Unable to connect to Blox.',
};

export const ConnectToBloxScreen = () => {
  const navigation = useInitialSetupNavigation();
  const [connectionStatus, setConnectionStatus] =
    useState<EBloxConnectionStatus>(EBloxConnectionStatus.connecting);

  useEffect(() => {
    WifiManager.connectToProtectedSSID(DEFAULT_NETWORK_NAME, null, false).then(
      () => setConnectionStatus(EBloxConnectionStatus.connected),
      () => setConnectionStatus(EBloxConnectionStatus.failed)
    );
  }, [navigation]);

  const goBack = () => navigation.goBack();

  const handleNext = () => {
    navigation.navigate(Routes.ConnectToWifi);
  };

  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxProgressBar progress={100 / 3} />
      <FxBox flex={1} justifyContent="center" alignItems="center">
        <BloxWifiDevice />
      </FxBox>
      <FxBox>
        <FxText variant="h300" marginBottom="12">
          Connect to Blox
        </FxText>
        <FxText variant="bodySmallRegular" marginBottom="8">
          {connectionStatusStrings[connectionStatus]}
        </FxText>
        <FxBox
          height={180}
          borderColor="border"
          borderWidth={1}
          borderRadius="s"
          paddingHorizontal="16"
        >
          <FxText variant="bodyMediumRegular" paddingVertical="16">
            Box
          </FxText>
        </FxBox>
        <FxBox
          flexDirection="row"
          justifyContent="flex-end"
          alignItems="center"
          marginTop="16"
        >
          <FxButton
            variant="inverted"
            paddingHorizontal="20"
            marginRight="12"
            onPress={goBack}
          >
            Back
          </FxButton>
          <FxButton
            paddingHorizontal="40"
            onPress={handleNext}
            // disabled={connectionStatus !== EBloxConnectionStatus.connected}
          >
            Next
          </FxButton>
        </FxBox>
      </FxBox>
    </FxSafeAreaBox>
  );
};
