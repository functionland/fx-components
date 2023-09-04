import React, { useState } from 'react';
import {
  FxBox,
  FxButton,
  FxProgressBar,
  FxText,
  FxSafeAreaBox,
  useToast,
} from '@functionland/component-library';
import { DEFAULT_NETWORK_NAME } from '../../hooks/useIsConnectedToBox';
import { useInitialSetupNavigation } from '../../hooks/useTypedNavigation';
import { Routes } from '../../navigation/navigationConfig';
import { EConnectionStatus } from '../../models';
import BloxWifiDevice from '../../app/icons/blox-wifi-device.svg';
import { ActivityIndicator, PermissionsAndroid, Platform } from 'react-native';
import { NetInfoStateType, fetch } from '@react-native-community/netinfo';

const connectionStatusStrings = {
  [EConnectionStatus.connecting]: 'Checking...',
  [EConnectionStatus.connected]: 'Connected',
  [EConnectionStatus.failed]: 'Unable to connect to Hotspot',
  [EConnectionStatus.notConnected]: 'Not Connected',
};

export const ConnectToBloxScreen = () => {
  const navigation = useInitialSetupNavigation();
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
      }
    );
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      return true;
    } else {
      return false;
    }
  };
  const connectToBox = async () => {
    try {
      if (Platform.OS === 'android' && !(await checkAndroidPermission())) {
        queueToast({
          title: 'Permission denied!',
          message:
            'The Blox app needs location permission to connect to the WIFI, set it manually!',
          type: 'warning',
          autoHideDuration: 5000,
        });
        return;
      } else if (Platform.OS === 'ios') {
        handleNext();
        return;
      }
      setConnectionStatus(EConnectionStatus.connecting);
      const network = await fetch('wifi');
      if (
        network.type === NetInfoStateType.wifi &&
        network.details.ssid === DEFAULT_NETWORK_NAME &&
        network.isConnected
      ) {
        setConnectionStatus(EConnectionStatus.connected);
        handleNext();
        return;
      } else {
        setConnectionStatus(EConnectionStatus.notConnected);
        queueToast({
          title: 'Not connected!',
          message:
            "Unable to reach the blox!, please make sure your phone is connected to Blox's hotspot",
          type: 'warning',
          autoHideDuration: 5000,
        });
      }
      // WifiManager.connectToProtectedSSID(DEFAULT_NETWORK_NAME, null, false).then(
      //   () => {
      //     setConnectionStatus(EConnectionStatus.connected);
      //   },
      //   () => setConnectionStatus(EConnectionStatus.failed)
      // );
    } catch (error) {
      console.log('connectToBox', error);
      setConnectionStatus(EConnectionStatus.notConnected);
    }
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

        <FxBox flex={4}>
          {connectionStatus !== EConnectionStatus.connected && (
            <FxText
              variant="h200"
              marginBottom="40"
              textAlign="center"
              color="warningBase"
              //style={{ bottom: 0 }}
            >
              {connectionStatusStrings[connectionStatus]}
            </FxText>
          )}
          {connectionStatus !== EConnectionStatus.connected ? (
            <>
              <FxText variant="h200" textAlign="center">
                Please turn your Blox on and connect your phone to the Blox's
                hotspot manually, and turn off mobile data.
              </FxText>
              <FxText
                variant="bodyMediumRegular"
                textAlign="center"
                color="warningBase"
                paddingTop="8"
              >
                If you don't see FxBlox Wifi or connot connect to it, please
                restart (plug/unplug) your Blox
              </FxText>
              <FxText
                variant="bodySmallRegular"
                textAlign="center"
                color="warningBase"
                paddingTop="8"
              >
                In the first setup, you need to restart (plug/unplug) it 3 times
                with 1 min interval between each.
              </FxText>
            </>
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
      </FxBox>

      <FxBox flex={0} justifyContent="flex-end">
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
            width={150}
            onPress={connectToBox}
            disabled={connectionStatus === EConnectionStatus.connecting}
          >
            {connectionStatus !== EConnectionStatus.connecting ? (
              'Continue'
            ) : (
              <ActivityIndicator />
            )}
          </FxButton>
          {/* {connectionStatus !== EConnectionStatus.connected ? (
            <FxButton
              width={150}
              onPress={connectToBox}
              disabled={connectionStatus === EConnectionStatus.connecting}
            >
              {connectionStatus != EConnectionStatus.connecting ? (
                'Continue'
              ) : (
                <ActivityIndicator />
              )}
            </FxButton>
          ) : (
            <FxButton width={150} onPress={handleNext}>
              Next
            </FxButton>
          )} */}
        </FxBox>
      </FxBox>
    </FxSafeAreaBox>
  );
};
