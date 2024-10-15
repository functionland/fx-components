import React, { useEffect, useState } from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxButton,
  FxCard,
  FxInvertedCheckIcon,
  FxText,
} from '@functionland/component-library';
import {
  ActivityIndicator,
  FlatList,
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Permission,
  Platform,
  StyleSheet,
} from 'react-native';
import { scaleByWidth } from '../../../../constants/layout';
import BleManager, {
  BleScanCallbackType,
  BleScanMatchMode,
  BleScanMode,
  Peripheral,
} from 'react-native-ble-manager';
import { request, PERMISSIONS } from 'react-native-permissions';

const SECONDS_TO_SCAN_FOR = 5;
const ALLOW_DUPLICATES = false;
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const requestIOSBluetoothPermission = async () => {
  if (Platform.OS === 'ios') {
    const result = await request(PERMISSIONS.IOS.BLUETOOTH);
    return result === 'granted';
  }
  return true;
};

type ScanBluetoothModalProps = {
  onSelect?: (item: Peripheral) => void;
};
const ScanBluetoothModal = React.forwardRef<
  FxBottomSheetModalMethods,
  ScanBluetoothModalProps
>(({ onSelect }, ref) => {
  const [scanning, setScanning] = useState(false);
  const [connectingId, setConnectingId] = useState('');
  const [peripherals, setPeripherals] = useState(
    new Map<Peripheral['id'], Peripheral>()
  );
  const [connectedPeripherals, setConnectedPeripherals] = useState(
    new Map<Peripheral['id'], Peripheral>()
  );

  useEffect(() => {
    startBluetooth();
    const listeners = [
      bleManagerEmitter.addListener(
        'BleManagerDiscoverPeripheral',
        handleDiscoverPeripheral
      ),
      bleManagerEmitter.addListener('BleManagerStopScan', handleStopScan),
    ];
    return () => {
      console.debug('[app] main component unmounting. Removing listeners...');
      for (const listener of listeners) {
        listener.remove();
      }
    };
  }, []);

  const addOrUpdatePeripheral = (id: string, updatedPeripheral: Peripheral) => {
    setPeripherals((map) => new Map(map.set(id, updatedPeripheral)));
  };
  const handleStopScan = async () => {
    try {
      await updateConnectedPeripherals();
    } catch (error) {
      console.log('handleStopScan', error);
    } finally {
      setScanning(false);
    }
  };
  const startBluetooth = async () => {
    try {
      await BleManager.start();
    } catch (error) {
      console.log('startBluetooth', error);
    }
  };
  const scan = async () => {
    try {
      if (Platform.OS === 'android') {
        const permissions: Permission[] = [];
        if (Platform.Version >= 31) {
          permissions.push(
            ...[
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            ]
          );
        } else if (Platform.Version >= 23) {
          permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        }
        console.log('permissions', permissions);

        const granted = await PermissionsAndroid.requestMultiple(permissions);
        console.log('granted', granted);
        if (
          !(
            granted['android.permission.BLUETOOTH_SCAN'] === 'granted' ||
            granted['android.permission.ACCESS_FINE_LOCATION'] === 'granted'
          )
        )
          return;
      } else if (Platform.OS === 'ios') {
        const granted = await requestIOSBluetoothPermission();
        if (!granted) return;
      }
      setPeripherals(new Map());
      setConnectedPeripherals(new Map());
      setScanning(true);
      await BleManager.scan([], SECONDS_TO_SCAN_FOR, ALLOW_DUPLICATES, {
        matchMode: BleScanMatchMode.Sticky,
        scanMode: BleScanMode.LowLatency,
        callbackType: BleScanCallbackType.AllMatches,
      });
    } catch (error) {
      console.log('scan error', error);
      setScanning(false);
    }
  };
  const handleDiscoverPeripheral = (peripheral: Peripheral) => {
    if (!peripheral.name) {
      peripheral.name = 'NO NAME';
    }
    if (peripheral?.name.includes?.('fulatower'))
      addOrUpdatePeripheral(peripheral.id, peripheral);
  };
  const handleConnectToPeripheral = async (item: Peripheral) => {
    try {
      setConnectingId(item.id);
      setConnectedPeripherals((map) => {
        map.delete(item.id);
        return new Map(map);
      });
      await BleManager.connect(item.id);
      await updateConnectedPeripherals();
      onSelect?.(item)
    } catch (error) {
      console.log('handleConnectToPeripheral error', error);
    } finally {
      setConnectingId('');
    }
  };
  const updateConnectedPeripherals = async () => {
    try {
      const connectedDevices = await BleManager.getConnectedPeripherals();
      setConnectedPeripherals((map) => {
        connectedDevices.forEach((item) => map.set(item.id, item));
        return new Map(map);
      });
    } catch (error) {
      console.log('updateConnectedPeripherals', error);
    }
  };
  const renderItem = ({ item }: { item: Peripheral }) => {
    return (
      <FxCard
        flexDirection="row"
        justifyContent="space-between"
        marginBottom="8"
        paddingHorizontal="16"
        paddingVertical="8"
        onPress={() => handleConnectToPeripheral(item)}
      >
        <FxBox flex={1}>
          <FxText variant="bodyMediumRegular">{item?.name}</FxText>
          <FxText variant="bodyXXSRegular" marginRight="8">
            {item?.id}
          </FxText>
        </FxBox>
        <FxBox justifyContent="center">
          {connectingId === item.id && <ActivityIndicator />}
          {connectingId === '' && connectedPeripherals.has(item.id) && (
            <FxInvertedCheckIcon color="greenBase" width={30} height={30} />
          )}
        </FxBox>
      </FxCard>
    );
  };
  return (
    <>
      <FxBottomSheetModal ref={ref} title="Bloxs">
        {!scanning && Array.from(peripherals.values()).length === 0 && (
          <FxBox padding="20">
            <FxText textAlign="center">
              No Blox Peripherals, press "Scan Bluetooth" below.
            </FxText>
          </FxBox>
        )}
        <FlatList
          data={Array.from(peripherals.values())}
          contentContainerStyle={{
            paddingTop: 20,
          }}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.id + index}
        />
        <FxButton size="large" onPress={scan} marginTop="40">
          {scanning ? <ActivityIndicator /> : 'Scan Bluetooth'}
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
