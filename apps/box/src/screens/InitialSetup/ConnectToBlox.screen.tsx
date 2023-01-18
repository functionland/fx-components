import React, { useState } from 'react';
import {
  FxBox,
  FxButton,
  FxProgressBar,
  FxText,
  FxSafeAreaBox,
  useToast,
} from '@functionland/component-library';
import WifiManager from 'react-native-wifi-reborn';
import { DEFAULT_NETWORK_NAME } from '../../hooks/useIsConnectedToBox';
import { useIsConnectedToBox } from '../../hooks/useIsConnectedToBox';
import { useInitialSetupNavigation } from '../../hooks/useTypedNavigation';
import { Routes } from '../../navigation/navigationConfig';
import { EConnectionStatus } from '../../models';
import BloxWifiDevice from '../../app/icons/blox-wifi-device.svg';
import { ActivityIndicator, PermissionsAndroid, Platform } from 'react-native';

const connectionStatusStrings = {
  [EConnectionStatus.connecting]: 'Connecting',
  [EConnectionStatus.connected]: 'Connected',
  [EConnectionStatus.failed]: 'Unable to connect to Hotspot',
  [EConnectionStatus.notConnected]: 'Not Connected',
};

export const ConnectToBloxScreen = () => {
  const navigation = useInitialSetupNavigation();
  const isConnectedToBox = useIsConnectedToBox();
  const { queueToast } = useToast();

  const [connectionStatus, setConnectionStatus] = useState<EConnectionStatus>(
    EConnectionStatus.notConnected
  );
  const checkAndroidPermission = async (): Promise<boolean> => {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location permission is required for WiFi connections',
        message:
          'This app needs location permission as this is required  ' +
          'to scan for wifi networks.',
        buttonNegative: 'DENY',
        buttonPositive: 'ALLOW',
      },
    );
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      return true;
    } else {
      return false;
    }
  }
  const connectToBox = async () => {
    if(Platform.OS==='android' && ! await checkAndroidPermission())
    {
      queueToast({
        title: 'Permission denied!',
        message: 'The Blox app needs location permission to connect to the WIFI, set it manually!',
        type: 'warning',
        autoHideDuration: 5000,
      });
      return
    }
    setConnectionStatus(EConnectionStatus.connecting);
    WifiManager.connectToProtectedSSID(DEFAULT_NETWORK_NAME, null, false).then(
      () => {
        setConnectionStatus(EConnectionStatus.connected);
      },
      () => setConnectionStatus(EConnectionStatus.failed)
    );
  };

  const goBack = () => navigation.goBack();

  const handleNext = () => {
    navigation.navigate(Routes.SetBloxAuthorizer);
  };

  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxProgressBar progress={60} />

      <FxBox
        flex={3}
        justifyContent="center"
        alignItems="center"
        marginVertical="0"
      >
        <FxBox flex={3} justifyContent="center" alignItems="center">
          <FxText
            variant="h300"
            marginTop="0"
            textAlign="center"
            marginBottom="24"
          >
            Connect to Blox's Hotspot
          </FxText>
          <BloxWifiDevice />
        </FxBox>

        <FxBox flex={1}>
          {!isConnectedToBox ? (
            <FxText variant="h200" marginTop="24" textAlign="center">
              Please turn your Blox on and make sure it is on Hotspot mode
            </FxText>
          ) : (
            <FxText
              variant="h200"
              marginTop="24"
              textAlign="center"
              color="primary"
            >
              Now your are connected to Blox's Hotspot
            </FxText>
          )}
        </FxBox>
        <FxBox flex={1}>
          {!isConnectedToBox && (
            <FxText
              variant="h200"
              marginBottom="80"
              textAlign="center"
              color="warningBase"
              style={{ bottom: 0 }}
            >
              {connectionStatusStrings[connectionStatus]}
            </FxText>
          )}
        </FxBox>
      </FxBox>

      <FxBox flex={1} justifyContent="flex-end">
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
          {!isConnectedToBox ? (
            <FxButton
              width={150}
              onPress={connectToBox}
              disabled={
                isConnectedToBox ||
                connectionStatus === EConnectionStatus.connecting
              }
            >
              {connectionStatus != EConnectionStatus.connecting ? (
                'Connect'
              ) : (
                <ActivityIndicator />
              )}
            </FxButton>
          ) : (
            <FxButton width={150} onPress={handleNext}>
              Next
            </FxButton>
          )}
        </FxBox>
      </FxBox>
    </FxSafeAreaBox>
  );
};
