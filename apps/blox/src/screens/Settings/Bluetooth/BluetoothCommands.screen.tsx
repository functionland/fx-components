import React, { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  FxArrowLeftIcon,
  FxBottomSheetModalMethods,
  FxBox,
  FxPlugIcon,
  FxPressableOpacity,
  FxSafeAreaBox,
  FxText,
  useToast,
} from '@functionland/component-library';
import BleManager, { Peripheral } from 'react-native-ble-manager';
import { SmallHeaderText } from '../../../components/Text';
import ScanBluetoothModal from './modals/ScanBluetoothModal';
import { BleCommandsMenu } from '../../../components/SettingsList/BleCommandsMenu';
import { Constants } from '../../../utils';
import { InputWifiPasswordModal } from './modals/InputWifiPasswordModal';
import { useLogger, useRootNavigation } from '../../../hooks';
export const BluetoothCommandsScreen = () => {
  const rootNavigation = useRootNavigation();
  const scanBluetoothModalRef = useRef<FxBottomSheetModalMethods>(null);
  const inputWifiPasswordModalRef = useRef<FxBottomSheetModalMethods>(null);
  const [currentPeripheral, setCurrentPeripheral] = useState<Peripheral>(null);
  const [runningCommand, setRunningCommand] = useState(false);
  const handleOnBloxSelect = (peripheral: Peripheral) => {
    setCurrentPeripheral(peripheral);
    scanBluetoothModalRef.current.close();
  };
  const { queueToast } = useToast();
  const logger = useLogger();
  const handleRunCommand = async (
    command: Constants.BluetoothCommandType,
    params?: string
  ) => {
    try {
      try {
        const isConnected = await BleManager.isPeripheralConnected(
          currentPeripheral.id
        );
        if (!isConnected) {
          queueToast({
            type: 'warning',
            title: 'The blox is not connected!',
            message: 'Try to reconnect to the device',
          });
          setCurrentPeripheral(null);
          return;
        }
      } catch (error) {
        console.log('BleManager.connect error', error);
        queueToast({
          type: 'warning',
          title: 'Unable to check the blox bluetooth conectivity!',
        });
        return;
      }
      switch (command) {
        case 'connect':
          if (!params) {
            inputWifiPasswordModalRef?.current.present();
            break;
          }
        default:
          setRunningCommand(true);
          await runBleCommand(
            currentPeripheral.id,
            Constants.BluetoothServices['command'].serviceUUID,
            Constants.BluetoothServices['command'].characteristicUUID,
            command + (params ? ` ${params}` : '')
          );
          queueToast({
            type: 'success',
            title: 'Your command sent successfully!',
          });
          break;
      }
    } catch (error) {
      queueToast({
        type: 'error',
        title: 'Unable to send the command!',
        message: error?.message,
      });
      logger.logError('handleRunCommand', error);
      console.log('handleRunCommand error', error);
    } finally {
      setRunningCommand(false);
    }
  };
  const runBleCommand = async (
    peripheralId: string,
    serviceUUId: string,
    characteristicUUID: string,
    commandStr: string
  ) => {
    const command = Buffer.from(commandStr);
    await BleManager.write(
      peripheralId,
      serviceUUId,
      characteristicUUID,
      command.toJSON().data
    );
  };
  const handleConnectToWifi = (ssid: string, password: string) => {
    inputWifiPasswordModalRef?.current.close();
    handleRunCommand('connect', `${ssid} ${password}`);
  };
  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxPressableOpacity onPress={() => rootNavigation.pop()}>
        <FxArrowLeftIcon color="white" />
      </FxPressableOpacity>
      <FxBox
        marginTop="16"
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <SmallHeaderText>Bluetooth commands</SmallHeaderText>
        <FxPlugIcon
          color={currentPeripheral ? 'greenBase' : 'white'}
          onPress={() =>
            !runningCommand ? scanBluetoothModalRef.current.present() : null
          }
        />
      </FxBox>
      {!currentPeripheral?.id && (
        <FxBox flex={1} justifyContent="center">
          <FxPressableOpacity
            alignItems="center"
            onPress={() => scanBluetoothModalRef.current.present()}
          >
            <FxPlugIcon color="primary" width={60} height={60} />
            <FxBox marginTop="16" paddingHorizontal="8">
              <FxText variant="bodyMediumRegular">
                To pair the Blox device with your phone, follow these steps:
              </FxText>
              <FxText paddingTop="16" marginStart="16" lineHeight={20}>
                1. Begin by restarting the Blox device. Once restart, you will
                have a 4-minute window to pair it with your phone (Through your
                phone bluetooth settings).
              </FxText>
              <FxText paddingTop="8" marginStart="16" lineHeight={20}>
                2. Choose the Blox device available devices list by pressing the
                plug icon and select the desired command.
              </FxText>
            </FxBox>
          </FxPressableOpacity>
        </FxBox>
      )}
      {currentPeripheral?.id && (
        <FxBox padding="8" borderBottomColor="border" borderBottomWidth={1}>
          <FxText variant="bodyLargeRegular">{currentPeripheral?.name}</FxText>
          <FxText variant="bodyXSRegular" marginRight="8">
            {currentPeripheral?.id}
          </FxText>
        </FxBox>
      )}
      {currentPeripheral?.id && (
        <BleCommandsMenu
          disableAll={runningCommand}
          onPress={handleRunCommand}
        />
      )}
      <ScanBluetoothModal
        ref={scanBluetoothModalRef}
        onSelect={handleOnBloxSelect}
      />
      <InputWifiPasswordModal
        ref={inputWifiPasswordModalRef}
        connect={handleConnectToWifi}
      />
    </FxSafeAreaBox>
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 20,
  },
});
