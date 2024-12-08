import React, { useState } from 'react';
import {
  FxBox,
  FxButton,
  FxProgressBar,
  FxText,
  FxSafeAreaBox,
  useToast,
} from '@functionland/component-library';
import BleManager from 'react-native-ble-manager';
import { DEFAULT_NETWORK_NAME } from '../../hooks/useIsConnectedToBox';
import { useInitialSetupNavigation } from '../../hooks/useTypedNavigation';
import { Routes } from '../../navigation/navigationConfig';
import { EConnectionStatus } from '../../models';
import BloxWifiDevice from '../../app/icons/blox-wifi-device.svg';
import {
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';
import { NetInfoStateType, fetch } from '@react-native-community/netinfo';
import axios from 'axios';
import { API_URL } from '../../api/index';
import { FlashingCircle, FlashingTower } from '../../components';

const connectionStatusStrings = {
  [EConnectionStatus.connecting]: 'Checking WiFi connection...',
  [EConnectionStatus.connected]: 'Connected',
  [EConnectionStatus.failed]: 'Unable to connect to Hotspot',
  [EConnectionStatus.notConnected]: 'Not Connected',
  [EConnectionStatus.bleConnecting]: 'Searching for Blox device...',
  [EConnectionStatus.bleConnected]: 'Connected to Blox via Bluetooth',
  [EConnectionStatus.bleFailed]:
    'Unable to connect via Bluetooth, trying WiFi...',
};
const initializeBLE = () => {
  BleManager.start({ showAlert: false }).then(() => {
    console.log('BLE Manager initialized');
  });
};
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const DEVICE_NAME = 'fulatower';
const DEVICE_MAC = '2C:05:47:85:39:3F';

export const ConnectToBloxScreen = () => {
  const navigation = useInitialSetupNavigation();
  const { queueToast } = useToast();
  const [showHotspotInstructions, setShowHotspotInstructions] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState<EConnectionStatus>(
    EConnectionStatus.notConnected
  );

  const requestPermissions = async () => {
    if (Platform.OS === 'ios') {
      return true;
    }

    if (Platform.OS === 'android' && Platform.Version >= 31) {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];

      const results = await Promise.all(
        permissions.map((permission) => PermissionsAndroid.request(permission))
      );

      return results.every((result) => result === 'granted');
    }

    return true;
  };

  const checkAndEnableBluetooth = async (): Promise<boolean> => {
    try {
      let permitted = await requestPermissions();
      if ( !permitted ){
        return false;
      }
      const state = await BleManager.checkState();

      if (state === 'on') {
        return true;
      }

      if (Platform.OS === 'android') {
        try {
          await BleManager.enableBluetooth();
          return true;
        } catch (error) {
          queueToast({
            title: 'Bluetooth Error',
            message:
              'Failed to enable Bluetooth automatically. Please enable it manually.',
            type: 'warning',
          });
          return false;
        }
      } else {
        queueToast({
          title: 'Bluetooth Required',
          message:
            'Please enable Bluetooth in your device settings to connect to Blox',
          type: 'warning',
        });
        return false;
      }
    } catch (error) {
      console.error('Bluetooth state check failed:', error);
      return false;
    }
  };

  const connectViaBLE = async (): Promise<boolean> => {
    try {
      setConnectionStatus(EConnectionStatus.connecting);

      const bluetoothReady = await checkAndEnableBluetooth();
      if (!bluetoothReady) {
        return false;
      }

      return new Promise((resolve) => {
        const discoveredDevices: Array<{
          peripheral: string;
          rssi: number;
          timestamp: number;
        }> = [];

        const SCAN_DURATION = 5000;

        // Set up event listener
        const discoveryListener = bleManagerEmitter.addListener(
          'BleManagerDiscoverPeripheral',
          (peripheral) => {
            if (
              peripheral.name === DEVICE_NAME ||
              peripheral.id === DEVICE_MAC
            ) {
              discoveredDevices.push({
                peripheral: peripheral.id,
                rssi: peripheral.rssi,
                timestamp: Date.now(),
              });
            }
          }
        );

        BleManager.scan([], SCAN_DURATION, true)
          .then(() => {
            console.log('Scanning...');
          })
          .catch((err) => {
            console.error('Scan failed', err);
            discoveryListener.remove();
            resolve(false);
          });

        setTimeout(async () => {
          // Clean up listener
          discoveryListener.remove();

          if (discoveredDevices.length === 0) {
            resolve(false);
            return;
          }

          const sortedDevices = discoveredDevices.sort(
            (a, b) => b.rssi - a.rssi
          );
          const strongestDevice = sortedDevices[0];

          try {
            await BleManager.connect(strongestDevice.peripheral);
            await BleManager.retrieveServices(strongestDevice.peripheral);
            resolve(true);
          } catch (error) {
            console.error('Connection error:', error);
            resolve(false);
          }
        }, SCAN_DURATION + 1000);
      });
    } catch (error) {
      console.error('Scan error:', error);
      return false;
    }
  };

  const isDefaultNetwork = async () => {
    try {
      const network = await fetch('wifi');
      return (
        network.type === NetInfoStateType.wifi &&
        network.details.ssid === DEFAULT_NETWORK_NAME &&
        network.isConnected
      );
    } catch (error) {
      console.log('checking network failed:', error);
      return false;
    }
  };

  const checkApiAvailability = async () => {
    try {
      const response = await axios.head(API_URL + '/properties', {
        timeout: 5000, // 5 seconds timeout
      });
      return response.status === 200;
    } catch (error) {
      console.log('API availability check failed:', error);
      return false;
    }
  };

  const connectToBox = async () => {
    try {
      setConnectionStatus(EConnectionStatus.bleConnecting);

      // Try BLE connection first
      const bleResult = await connectViaBLE();
      if (bleResult) {
        setConnectionStatus(EConnectionStatus.bleConnected);
        handleNext();
        return;
      }

      // If BLE fails, show message and try WiFi
      setConnectionStatus(EConnectionStatus.bleFailed);
      setShowHotspotInstructions(true);

      // Wait a moment to show the BLE failed message
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setConnectionStatus(EConnectionStatus.connecting);
      if ((await isDefaultNetwork()) || (await checkApiAvailability())) {
        const response = await axios.head(API_URL + '/properties');
        if (response.status === 200) {
          setConnectionStatus(EConnectionStatus.connected);
          handleNext();
        } else {
          setConnectionStatus(EConnectionStatus.failed);
          queueToast({
            title: 'Connection Error',
            message: 'Unable to connect to Blox. Please check your connection.',
            type: 'error',
            autoHideDuration: 5000,
          });
        }
      } else {
        setConnectionStatus(EConnectionStatus.notConnected);
        queueToast({
          title: 'Not connected!',
          message: "Please connect to Blox's hotspot manually",
          type: 'warning',
          autoHideDuration: 5000,
        });
      }
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
            disabled={[
              EConnectionStatus.connecting,
              EConnectionStatus.bleConnecting,
            ].includes(connectionStatus)}
          >
            {[
              EConnectionStatus.connecting,
              EConnectionStatus.bleConnecting,
            ].includes(connectionStatus) ? (
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
