import React, { useState, useEffect } from 'react';
import {
  FxBox,
  FxButton,
  FxPressableOpacity,
  FxProgressBar,
  FxText,
  FxSafeAreaBox,
} from '@functionland/component-library';
import WifiManager from 'react-native-wifi-reborn';
import { DEFAULT_NETWORK_NAME } from '../../hooks/useIsConnectedToBox';
import { useIsConnectedToBox } from '../../hooks/useIsConnectedToBox';
import { useInitialSetupNavigation } from '../../hooks/useTypedNavigation';
import { Routes } from '../../navigation/navigationConfig';
import { EConnectionStatus } from '../../models';
import BloxWifiDevice from '../../app/icons/blox-wifi-device.svg';

const connectionStatusStrings = {
  [EConnectionStatus.connecting]: 'Connecting',
  [EConnectionStatus.connected]: 'Connected',
  [EConnectionStatus.failed]: 'Unable to connect to Blox.',
};

export const ConnectToBloxScreen = () => {
  const navigation = useInitialSetupNavigation();
  const isConnectedToBox = useIsConnectedToBox();
  const [connectionStatus, setConnectionStatus] = useState<EConnectionStatus>(
    EConnectionStatus.connecting
  );

  useEffect(() => {
    if (isConnectedToBox) {
      handleNext();
    } else {
      connectToBox();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnectedToBox]);

  const connectToBox = () => {
    setConnectionStatus(EConnectionStatus.connecting);
    WifiManager.connectToProtectedSSID(DEFAULT_NETWORK_NAME, null, false).then(
      () => {
        setConnectionStatus(EConnectionStatus.connected);
        handleNext();
      },
      () => setConnectionStatus(EConnectionStatus.failed)
    );
  };

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
          <FxPressableOpacity
            disabled={connectionStatus === EConnectionStatus.connected}
            onPress={connectToBox}
          >
            <FxText variant="bodyMediumRegular" paddingVertical="16">
              Box
            </FxText>
          </FxPressableOpacity>
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
            disabled={connectionStatus !== EConnectionStatus.connected}
          >
            Next
          </FxButton>
        </FxBox>
      </FxBox>
    </FxSafeAreaBox>
  );
};
