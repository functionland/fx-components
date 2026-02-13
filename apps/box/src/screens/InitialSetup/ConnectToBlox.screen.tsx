import React, { useMemo, useRef, useState } from 'react';
import {
  FxBox,
  FxButton,
  FxProgressBar,
  FxText,
  FxSafeAreaBox,
  useToast,
  FxDropdown, // Added for language selector
  FxBottomSheetModalMethods,
} from '@functionland/component-library';
import BleManager from 'react-native-ble-manager';
import { useInitialSetupNavigation } from '../../hooks/useTypedNavigation';
import { Routes } from '../../navigation/navigationConfig';
import { EConnectionStatus } from '../../models';
import { BleManagerWrapper, DiscoveredDevice, ResponseAssembler } from '../../utils/ble';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import axios from 'axios';
import { API_URL } from '../../api/index';
import { BleDeviceSelectionBottomSheet, FlashingCircle, FlashingTower } from '../../components';
import { useTranslation } from 'react-i18next'; // Import for translations

export const ConnectToBloxScreen = () => {
  const { t, i18n } = useTranslation(); // Add translation hook
  const navigation = useInitialSetupNavigation();
  const { queueToast } = useToast();
  const [showHotspotInstructions, setShowHotspotInstructions] = useState(false);
  const bleManager = useMemo(
    () => new BleManagerWrapper(setConnectionStatus),
    []
  );

  // Language options for dropdown
  const languageOptions = [
    { label: 'English', value: 'en' },
    { label: '中文', value: 'zh' }
  ];

  // Handle language change
  const handleLanguageChange = (language) => {
    i18n.changeLanguage(language);
  };

  const [connectionStatus, setConnectionStatus] = useState<EConnectionStatus>(
    EConnectionStatus.notConnected
  );

  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const deviceSelectionResolverRef = useRef<((id: string | null) => void) | null>(null);
  const bottomSheetRef = useRef<FxBottomSheetModalMethods>(null);

  const handleMultipleDevicesFound = (devices: DiscoveredDevice[]): Promise<string | null> => {
    return new Promise((resolve) => {
      deviceSelectionResolverRef.current = resolve;
      setDiscoveredDevices(devices);
      bottomSheetRef.current?.present();
    });
  };

  const handleDeviceSelect = (peripheralId: string) => {
    bottomSheetRef.current?.close();
    deviceSelectionResolverRef.current?.(peripheralId);
    deviceSelectionResolverRef.current = null;
  };

  const handleDeviceSelectionDismiss = () => {
    deviceSelectionResolverRef.current?.(null);
    deviceSelectionResolverRef.current = null;
  };

  // Use translations for connection status strings
  const getConnectionStatusText = (status: EConnectionStatus): string => {
    switch(status) {
      case EConnectionStatus.connecting:
        return t('connectToBlox.checkingConnection');
      case EConnectionStatus.connected:
        return t('connectToBlox.connected');
      case EConnectionStatus.failed:
        return t('connectToBlox.failed');
      case EConnectionStatus.notConnected:
        return t('connectToBlox.notConnected');
      case EConnectionStatus.bleConnecting:
        return t('connectToBlox.bleConnecting');
      case EConnectionStatus.bleConnected:
        return t('connectToBlox.bleConnected');
      case EConnectionStatus.bleFailed:
        return t('connectToBlox.bleFailed');
      default:
        return '';
    }
  };

  const connectViaBLE = async (): Promise<boolean> => {
    try {
      if (connectionStatus === EConnectionStatus.connecting) {
        while (connectionStatus === EConnectionStatus.connecting) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        return connectionStatus === EConnectionStatus.connected;
      }

      setConnectionStatus(EConnectionStatus.connecting);
      const connected = await bleManager.connect({
        onMultipleDevicesFound: handleMultipleDevicesFound,
      });
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
        title: t('connectToBlox.connectionError'),
        message: t('connectToBlox.connectionErrorMessage'),
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
            {t('connectToBlox.title')}
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
              {getConnectionStatusText(connectionStatus)}
            </FxText>
          )}
          {connectionStatus !== EConnectionStatus.connected &&
          connectionStatus !== EConnectionStatus.bleConnected ? (
            <>
              {showHotspotInstructions &&
              connectionStatus !== EConnectionStatus.bleConnected ? (
                <FxText variant="h200" textAlign="center">
                  {t('connectToBlox.hotspotInstructions')}
                </FxText>
              ) : null}
              {Platform.OS === 'ios' &&
              (connectionStatus === EConnectionStatus.bleFailed ||
                connectionStatus === EConnectionStatus.failed) ? (
                <FxBox
                  marginTop="12"
                  padding="12"
                  borderRadius="s"
                  backgroundColor="warningBase"
                >
                  <FxText variant="bodySmallRegular" color="backgroundApp" textAlign="center">
                    If your device is not found, go to iOS Settings → Bluetooth,
                    find your Blox device (fulatower/fxblox), tap the (i) icon,
                    and select "Forget This Device". Then try again.
                  </FxText>
                </FxBox>
              ) : null}
              <FxText variant="h200" textAlign="center">
                {t('connectToBlox.formatInstructions')}
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
                  {t('connectToBlox.waitForBlueLight')}
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
              {t('connectToBlox.connectedMessage')}
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
            {t('connectToBlox.back')}
          </FxButton>
          <FxButton
            width={150}
            onPress={connectToBox}
            disabled={ connectionStatus !== EConnectionStatus.connected && connectionStatus !== EConnectionStatus.notConnected && connectionStatus !== EConnectionStatus.failed }
          >
            {(connectionStatus !== EConnectionStatus.connected && connectionStatus !== EConnectionStatus.notConnected && connectionStatus !== EConnectionStatus.failed) ? (
              <ActivityIndicator />
            ) : (
              t('connectToBlox.continue')
            )}
          </FxButton>
        </FxBox>
      </FxBox>
      <BleDeviceSelectionBottomSheet
        ref={bottomSheetRef}
        devices={discoveredDevices}
        onSelect={handleDeviceSelect}
        onDismiss={handleDeviceSelectionDismiss}
      />
    </FxSafeAreaBox>
  );
};