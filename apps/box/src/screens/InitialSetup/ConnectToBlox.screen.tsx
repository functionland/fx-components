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
import axios from 'axios';
import { API_URL } from '../../api/index';
import { FlashingCircle, FlashingTower } from '../../components';

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
        // Check if GET request to the specific URL is successful (HTTP status code 200)
        const response = await axios.head(API_URL + '/properties');
        console.log(response);
        if (response.status === 200) {
          setConnectionStatus(EConnectionStatus.connected);
          handleNext();
        } else {
          setConnectionStatus(EConnectionStatus.failed);
          queueToast({
            title: 'Connection Error',
            message:
              'You may have tried to connect to FxBlox but it seems your phone needs approval to connect. Check Wifi status again.',
            type: 'error',
            autoHideDuration: 5000,
          });
        }
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
        flex={6}
        justifyContent="center"
        alignItems="center"
        marginVertical="0"
      >
        <FxBox flex={5} justifyContent="center" alignItems="center">
          <FxText
            variant="h300"
            marginTop="0"
            textAlign="center"
            marginBottom="24"
          >
            Connect to Blox's Hotspot
          </FxText>
          <FlashingTower
            onColor="lightblue"
            onInterval={3000}
            offInterval={500}
          />
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
                1. Please turn your Blox on and connect your phone to the Blox's
                hotspot manually, and turn off mobile data.
              </FxText>
              <FxText variant="h200" textAlign="center">
                2. Make sure you have internal or external storage attached and
                format is either 'ext4' or 'vFat'.
              </FxText>
              <FxBox
                flexDirection="column"
                justifyContent="flex-end"
                alignItems="center"
                marginTop="16"
              >
                <FxBox flexDirection="row">
                  <FlashingCircle offInterval={0} color="lightgreen" />
                  <FxText> {'> '}</FxText>
                  <FlashingCircle offInterval={0} color="red" />
                  <FxText> {'> '}</FxText>
                  <FlashingCircle offInterval={0} color="black" />
                  <FxText> {'> '}</FxText>
                  <FlashingCircle offInterval={0} color="green" />
                  <FxText> {'> '}</FxText>
                  <FlashingCircle
                    color="lightblue"
                    onInterval={3000}
                    offInterval={700}
                  />
                </FxBox>
                <FxText
                  variant="bodySmallRegular"
                  textAlign="center"
                  color="warningBase"
                  paddingTop="8"
                >
                  After first boot please wait for 10 minutes until Blox flashes
                  'light-blue'
                </FxText>
              </FxBox>
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
