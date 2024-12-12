import React, { useMemo, useState } from 'react';
import {
  FxBox,
  FxButton,
  FxProgressBar,
  FxText,
  FxSafeAreaBox,
  useToast,
} from '@functionland/component-library';
import BleManager from 'react-native-ble-manager';
import { useInitialSetupNavigation } from '../../hooks/useTypedNavigation';
import { Routes } from '../../navigation/navigationConfig';
import { EConnectionStatus } from '../../models';
import { BleManagerWrapper, ResponseAssembler } from '../../utils/ble';
import { ActivityIndicator } from 'react-native';
import axios from 'axios';
import { API_URL } from '../../api/index';
import { FlashingCircle, FlashingTower } from '../../components';

const connectionStatusStrings = {
  [EConnectionStatus.connecting]: 'Checking connection...',
  [EConnectionStatus.connected]: 'Connected',
  [EConnectionStatus.failed]: 'Unable to connect to Hotspot',
  [EConnectionStatus.notConnected]: 'Not Connected',
  [EConnectionStatus.bleConnecting]: 'Searching for Blox device...',
  [EConnectionStatus.bleConnected]: 'Connected to Blox via Bluetooth',
  [EConnectionStatus.bleFailed]:
    'Unable to connect via Bluetooth, trying WiFi...',
};

export const ConnectToBloxScreen = () => {
  const navigation = useInitialSetupNavigation();
  const { queueToast } = useToast();
  const [showHotspotInstructions, setShowHotspotInstructions] = useState(false);
  const bleManager = useMemo(
    () => new BleManagerWrapper(setConnectionStatus),
    []
  );

  const [connectionStatus, setConnectionStatus] = useState<EConnectionStatus>(
    EConnectionStatus.notConnected
  );

  const connectViaBLE = async (): Promise<boolean> => {
    try {
      if (connectionStatus === EConnectionStatus.connecting) {
        while (connectionStatus === EConnectionStatus.connecting) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        return connectionStatus === EConnectionStatus.connected;
      }

      setConnectionStatus(EConnectionStatus.connecting);
      const connected = await bleManager.connect();
      setConnectionStatus(
        connected ? EConnectionStatus.connected : EConnectionStatus.failed
      );
      return connected;
    } catch (error) {
      setConnectionStatus(EConnectionStatus.failed);
      return false;
    }
  };

  const checkApiAvailability = async () => {
    try {
      const connectedPeripherals = await BleManager.getConnectedPeripherals([]);
      console.log({connectedPeripherals});
      const isConnectedBLE = connectedPeripherals.length > 0;

      // Try BLE first if connected
      if (isConnectedBLE && connectedPeripherals[0]) {
        const responseAssembler = new ResponseAssembler();
        try {
          const response = await responseAssembler.writeToBLEAndWaitForResponse(
            'properties',
            connectedPeripherals[0].id,
          );
          if (response) {
            return true;
          }
          // If BLE response failed, continue to axios check
        } finally {
          responseAssembler.cleanup();
        }
      }

      // Try axios if BLE is not connected or BLE check failed
      const response = await axios.head(API_URL + '/properties', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.log('API availability check failed:', error);
      return false;
    }
  };

  const connectToBox = async () => {
    try {
      console.log('started connectToBox');
      setConnectionStatus(EConnectionStatus.bleConnecting);

      // Try BLE connection
      const bleResult = await connectViaBLE();
      console.log({ bleResult });
      if (bleResult) {
        setConnectionStatus(EConnectionStatus.bleConnected);
      } else {
        setConnectionStatus(EConnectionStatus.bleFailed);
        setShowHotspotInstructions(true);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      console.log('checking API availability');
      // Check API availability regardless of BLE connection result
      const apiAvailable = await checkApiAvailability();
      if (apiAvailable) {
        setConnectionStatus(EConnectionStatus.connected);
        handleNext();
        return;
      }

      setConnectionStatus(EConnectionStatus.failed);
      queueToast({
        title: 'Connection Error',
        message: 'Unable to connect to Blox. Please check your connection.',
        type: 'error',
        autoHideDuration: 5000,
      });
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
            Connect to Blox
          </FxText>
          <FlashingTower
            onColor="lightblue"
            onInterval={3000}
            offInterval={500}
          />
        </FxBox>

        <FxBox flex={4}>
          {![
            EConnectionStatus.connected,
            EConnectionStatus.bleConnected,
          ].includes(connectionStatus) && (
            <FxText
              variant="h200"
              marginBottom="40"
              textAlign="center"
              color={
                connectionStatus === EConnectionStatus.bleFailed
                  ? 'warningBase'
                  : 'primary'
              }
            >
              {connectionStatusStrings[connectionStatus]}
            </FxText>
          )}
          {connectionStatus !== EConnectionStatus.connected &&
          connectionStatus !== EConnectionStatus.bleConnected ? (
            <>
              {showHotspotInstructions &&
              connectionStatus !== EConnectionStatus.bleConnected ? (
                <FxText variant="h200" textAlign="center">
                  - Please turn your Blox on and connect your phone to the
                  Blox's hotspot manually, and turn off mobile data.
                </FxText>
              ) : null}
              <FxText variant="h200" textAlign="center">
                - Make sure you have internal or external storage attached and
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
              Now you are connected to Blox. Please wait...
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
            disabled={ connectionStatus !== EConnectionStatus.connected && connectionStatus !== EConnectionStatus.notConnected && connectionStatus !== EConnectionStatus.failed }
          >
            {(connectionStatus !== EConnectionStatus.connected && connectionStatus !== EConnectionStatus.notConnected && connectionStatus !== EConnectionStatus.failed) ? (
              <ActivityIndicator />
            ) : (
              'Continue'
            )}
          </FxButton>
        </FxBox>
      </FxBox>
    </FxSafeAreaBox>
  );
};
