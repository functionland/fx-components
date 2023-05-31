import React, { useEffect, useState } from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxButton,
  FxCard,
  FxTag,
} from '@functionland/component-library';
import {
  ActivityIndicator,
  ActivityIndicatorBase,
  Alert,
  Image,
  PermissionsAndroid,
  StyleSheet,
} from 'react-native';
import { scaleByWidth } from '../../../../constants/layout';
import { imageMap } from '../../../../api/connectedDApps';
import { ExternalLinkIcon } from '../../../../components';
import { TDApp } from '../../../../models';
import BluetoothMng from 'react-native-ble-manager';
type ScanBluetoothModalProps = {};
const ScanBluetoothModal = React.forwardRef<
  FxBottomSheetModalMethods,
  ScanBluetoothModalProps
>(({}, ref) => {
  const [scanning, setScanning] = useState(false);
  useEffect(() => {
    startBluetooth();
  }, []);
  const startBluetooth = async () => {
    try {
      await BluetoothMng.start();
      console.log('started Bluetooth');
    } catch (error) {
      console.log('startBluetooth', error);
    }
  };
  const scan = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        {
          title: 'FxBlox Bluetooth Permission',
          message:
            'FxBlox App needs access to your camera ' +
            'so you can connect to the bloxs.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      console.log('granted', granted);
      if (granted !== 'granted') return;
      setScanning(true);
      //await BluetoothMng.scan([], 5, false);
      const getConnectedPeripherals =
        await BluetoothMng.getConnectedPeripherals();
      console.log('getConnectedPeripherals', getConnectedPeripherals);
      const getBondedPeripherals = await BluetoothMng.getBondedPeripherals();
      getBondedPeripherals.forEach((per) => {
        console.log('getBondedPeripherals', per.name);
      });
      const fulatower = getBondedPeripherals.find(
        (per) => per.name === "Mahdi's Buds2"
      );
      console.log('fulatower', fulatower);
      if (fulatower) {
        console.log(
          'isPeripheralConnected',
          await BluetoothMng.isPeripheralConnected(fulatower.id)
        );
        await BluetoothMng.connect(fulatower.id);
        console.log('connected');
      }
    } catch (error) {
      console.log('scan error', error);
    } finally {
      setScanning(false);
    }
  };
  return (
    <>
      <FxBottomSheetModal ref={ref}>
        <FxBox alignItems="center" marginTop="24">
          <FxCard.Title marginTop="16">{'name'}</FxCard.Title>
        </FxBox>

        <FxButton size="large" onPress={scan}>
          {scanning ? <ActivityIndicator /> : 'Scan'}
        </FxButton>
      </FxBottomSheetModal>
    </>
  );
});

export default ScanBluetoothModal;

const s = StyleSheet.create({
  image: {
    width: scaleByWidth(64),
    height: scaleByWidth(64),
    resizeMode: 'contain',
  },
});
