import React, { useEffect, useState } from 'react';
// @ts-ignore-next-line
import {
  FxBox,
  FxButton,
  FxKeyboardAwareScrollView,
  FxPressableOpacity,
  FxProgressBar,
  FxSafeAreaBox,
  FxText,
  FxTextInput,
  FxWarning,
  useToast,
} from '@functionland/component-library';
import BleManager from 'react-native-ble-manager';
import { ResponseAssembler } from '../../utils/ble';
import { useTranslation } from 'react-i18next'; // Import for translations

import {
  useFetch,
  useInitialSetupNavigation,
  useLogger,
  useFetchWithBLE,
} from '../../hooks';
import {
  InitialSetupStackParamList,
  Routes,
} from '../../navigation/navigationConfig';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { Modal, ActivityIndicator, Share, Alert } from 'react-native';
import { Helper } from '../../utils';
import {
  bloxDeleteFulaConfig,
  bloxFormatDisk,
  exchangeConfig,
  getBloxProperties,
} from '../../api/bloxHardware';
import { useBloxsStore } from '../../stores';
import { DeviceCard } from '../../components';
import { EDeviceStatus } from '../../api/hub';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { generateUniqueBloxName } from '../../utils/bloxName';

type Props = NativeStackScreenProps<InitialSetupStackParamList, Routes.SetBloxAuthorizer>;
export const SetBloxAuthorizerScreen = ({ route }: Props) => {
  const { t } = useTranslation(); // Add translation hook
  const navigation = useInitialSetupNavigation();
  const [newPeerId, setNewPeerId] = useState(undefined);
  const [newBloxPeerId, setNewBloxPeerId] = useState(undefined);
  const { queueToast } = useToast();
  const logger = useLogger();
  const { isManualSetup = false } = route.params || {};
  const [showSkipButton, setShowSkipButton] = useState(false);
  const [showFormatDiskButton, setShowFormatDiskButton] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipCode, setSkipCode] = useState('');

  const [setAppPeerId, signiture, password] = useUserProfileStore((state) => [
    state.setAppPeerId,
    state.signiture,
    state.password,
  ]);

  const [
    bloxs = {},
    currentBloxPeerId,
    updateBloxsStore,
    addBlox,
    removeBlox,
    updateBloxPropertyInfo,
    updateBloxSpaceInfo,
  ] = useBloxsStore((state) => [
    state.bloxs,
    state.currentBloxPeerId,
    state.update,
    state.addBlox,
    state.removeBlox,
    state.updateBloxPropertyInfo,
    state.updateBloxSpaceInfo,
  ]);

  const bloxsArray = Object.values(bloxs as Record<string, { name: string }>);
  const existingNames = bloxsArray.map((b) => b.name);
  const [newBloxName, setNewBloxName] = useState<string>(
    generateUniqueBloxName(
      t('setBloxAuthorizer.bloxUnitPrefix') + ` #${bloxsArray.length + 1}`,
      existingNames
    )
  );

  const blePeerExchange = async (params: { peer_id: string; seed: string }) => {
    const connectedPeripherals = await BleManager.getConnectedPeripherals([]);
    if (connectedPeripherals.length === 0) {
      throw new Error(t('setBloxAuthorizer.noBleDevicesConnected'));
    }

    const responseAssembler = new ResponseAssembler();
    try {
      const command = `peer/exchange ${params.peer_id} ${params.seed}`;
      const response = await responseAssembler.writeToBLEAndWaitForResponse(
        command,
        connectedPeripherals[0].id
      );
      return response;
    } finally {
      responseAssembler.cleanup();
    }
  };

  const {
    loading: loading_exchange,
    data: data_exchange,
    error: error_exchange,
    refetch: refetch_exchangeConfig,
  } = useFetchWithBLE({
    initialLoading: false,
    apiMethod: exchangeConfig,
    bleMethod: blePeerExchange,
  });

  const {
    loading: loading_bloxFormatDisk,
    data: data_bloxFormatDisk,
    error: error_bloxFormatDisk,
    refetch: refetch_bloxFormatDisk,
  } = useFetch({
    initialLoading: false,
    apiMethod: bloxFormatDisk,
  });
  const { refetch: refetch_bloxDeleteFulaConfig } = useFetch({
    initialLoading: false,
    apiMethod: bloxDeleteFulaConfig,
  });
  const {
    loading: loading_bloxProperties,
    data: data_bloxProperties,
    error: error_bloxProperties,
    refetch: refetch_bloxProperties,
  } = useFetch({
    initialLoading: false,
    apiMethod: getBloxProperties,
  });
  useEffect(() => {
    if (password && signiture) generateAppPeerId();
  }, [password, signiture]);

  useEffect(() => {
    if (!isManualSetup) {
      refetch_bloxProperties({ withLoading: true });
    }
    const timer = setTimeout(() => {
      setShowSkipButton(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFormatDiskButton(true);
    }, 10000); // 10000 milliseconds = 10 seconds

    // Cleanup function to clear the timer
    return () => clearTimeout(timer);
  }, []); // Empty dependency array means this effect runs only once on mount

  //echange config with blox when peerId is ready
  useEffect(() => {
    if (
      newPeerId &&
      data_bloxProperties?.data?.restartNeeded === 'false' &&
      (data_bloxProperties?.data?.bloxFreeSpace?.size || 0) > 0 &&
      !isManualSetup
    ) {
      handleExchangeConfig();
    }
  }, [newPeerId, data_bloxProperties, error_bloxProperties]);

  useEffect(() => {
    if (data_bloxProperties?.data?.bloxFreeSpace) {
      //setNewBloxPeerId(data_exchange?.data?.peer_id)
    } else if (error_bloxProperties) {
      console.log({ error_bloxProperties });
      queueToast({
        type: 'warning',
        title: t('setBloxAuthorizer.unableToGetProperties'),
        message: error_bloxProperties?.message,
      });
    }
    logger.log('refetch_bloxProperties:result', {
      data_bloxProperties,
      error_bloxProperties,
    });
    console.log(error_bloxProperties?.message);
  }, [data_bloxProperties, error_bloxProperties]);

  useEffect(() => {
    console.log('inside data_exchange useEffect', { data_exchange });
    if (data_exchange?.data?.peer_id) {
      const peer_id = data_exchange?.data?.peer_id?.trim()?.split(/\r?\n/)?.[0];
      console.log({ data_exchange, peer_id });
      if (!peer_id || peer_id?.length !== 52) {
        queueToast({
          type: 'error',
          title: t('setBloxAuthorizer.setAuthorizer'),
          message: t('setBloxAuthorizer.bloxPeerIdInvalid'),
        });
        refetch_bloxDeleteFulaConfig();
      } else {
        setNewBloxPeerId(peer_id);
      }
    } else if (error_exchange) {
      console.log('data exchange error', { data_exchange, error_exchange });
      queueToast({
        type: 'error',
        title: t('setBloxAuthorizer.setAuthorizer'),
        message: error_exchange?.message,
      });
      refetch_bloxDeleteFulaConfig();
    }
    logger.log('handleExchangeConfig:result', {
      data_exchange,
      error_exchange,
    });
  }, [data_exchange, error_exchange]);

  //Handle format disk API Response
  useEffect(() => {
    if (data_bloxFormatDisk?.data && !data_bloxFormatDisk?.data?.status) {
      queueToast({
        type: 'error',
        title: t('setBloxAuthorizer.formatDisk'),
        message: data_bloxFormatDisk?.data?.msg,
      });
    } else if (error_bloxFormatDisk?.message) {
      queueToast({
        type: 'error',
        title: t('setBloxAuthorizer.formatDisk'),
        message: error_bloxFormatDisk?.message,
      });
    }
  }, [data_bloxFormatDisk, error_bloxFormatDisk]);

  const handleExchangeConfig = async () => {
    try {
      const { secretKey } = Helper.getMyDIDKeyPair(password, signiture);
      const peer_id = newPeerId;
      const seed = secretKey.toString();

      refetch_exchangeConfig({
        params: {
          peer_id,
          seed,
        },
        withLoading: true,
        tryBLE: true, // Will try BLE first, then fall back to HTTP
      });
    } catch (error) {
      logger.logError('exchangeConfig', error);
    }
  };

  const generateAppPeerId = async () => {
    try {
      const peerId = await Helper.initFula({
        password,
        signiture,
      });
      setNewPeerId(peerId);
      logger.log('generateAppPeerId:Result', { peerId });
    } catch (error) {
      logger.logError('generateAppPeerId', error);
    }
  };
  const goBack = () => navigation.goBack();
  const skipConnectToInternet = () => navigation.navigate(Routes.ConnectToWifi);
  const handleNext = () => {
    if (
      !loading_exchange &&
      newBloxName &&
      newBloxPeerId &&
      newPeerId &&
      newBloxName
    ) {
      setAppPeerId(newPeerId);
      if (currentBloxPeerId === newBloxPeerId) {
        removeBlox(currentBloxPeerId);
      }
      // Ensure unique name before adding
      const finalName = generateUniqueBloxName(newBloxName, Object.values(bloxs as Record<string, { name: string }> ).map((b) => b.name));
      addBlox({
        peerId: newBloxPeerId,
        name: finalName,
      });
      updateBloxsStore({
        currentBloxPeerId: newBloxPeerId,
      });
      if (!isManualSetup) {
        updateBloxPropertyInfo(newBloxPeerId, data_bloxProperties?.data);
        updateBloxSpaceInfo(
          newBloxPeerId,
          data_bloxProperties?.data?.bloxFreeSpace
        );
      }
      logger.log('SetBloxAuthorizer.Screen:handleNext', {
        peerId: newBloxPeerId,
        name: newBloxName,
        freeSpace: data_bloxProperties?.data?.bloxFreeSpace,
        propertyInfo: data_bloxProperties?.data,
      });
      if (isManualSetup) {
        navigation.navigate(Routes.SetupComplete, { isManualSetup });
      } else {
        navigation.navigate(Routes.ConnectToWifi);
      }
    } else
      logger.logError('SetBloxAuthorizer.Screen:handleNext', {
        loading_exchange,
        newBloxName,
        newBloxPeerId,
        newPeerId,
      });
  };

  const handleSetOwnerPeerId = async () => {
    console.log('handleSetOwnerPeerId called');
    console.log({ newPeerId });
    if (newPeerId) {
      handleExchangeConfig();
    }
  };
  const handleFormatDisk = async () => {
    try {
      // Check for BLE connection
      const connectedPeripherals = await BleManager.getConnectedPeripherals([]);
      if (connectedPeripherals.length > 0) {
        // Try BLE first
        const responseAssembler = new ResponseAssembler();
        try {
          const response = await responseAssembler.writeToBLEAndWaitForResponse(
            'partition',
            connectedPeripherals[0].id
          );

          if (response) {
            // If BLE succeeded, update state as useFetch would
            console.log('response received');
            console.log({ response });
            goBack();
            return;
          }
        } catch (bleError) {
          console.log('BLE format disk failed:', bleError);
          // Continue to useFetch fallback
        } finally {
          responseAssembler.cleanup();
        }
      }

      // Fallback to useFetch if BLE failed or not connected
      refetch_bloxFormatDisk({ withLoading: true });
      goBack();
    } catch (error) {
      console.error('Format disk failed:', error);
    }
  };
  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxProgressBar progress={80} />
      <FxKeyboardAwareScrollView
        enableOnAndroid={true}
        extraScrollHeight={60}
        extraHeight={100}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <FxBox flex={3} paddingVertical="40">
          <FxText variant="h300" textAlign="center" marginBottom="40">
            {t('setBloxAuthorizer.title')}
          </FxText>
          <FxText variant="body" textAlign="center" marginBottom="20">
            {t('setBloxAuthorizer.description')}
          </FxText>
          {(error_exchange?.message === 'Network Error' ||
            error_bloxProperties?.message === 'Network Error') && (
            <FxWarning
              padding="16"
              marginBottom="8"
              error={t('setBloxAuthorizer.networkError')}
            />
          )}
          {data_bloxProperties?.data &&
            (!data_bloxProperties?.data?.restartNeeded ||
              data_bloxProperties?.data?.restartNeeded === 'true') && (
            <FxWarning
              padding="16"
              marginBottom="8"
              error={
                data_bloxProperties?.data?.restartNeeded //It is just for backend zero, to check the update needed
                  ? t('setBloxAuthorizer.updateNeeded')
                  : t('setBloxAuthorizer.backendUpdate')
              }
            />
          )}
          {!isManualSetup &&
            (!data_bloxProperties?.data?.bloxFreeSpace ||
              (data_bloxProperties?.data?.bloxFreeSpace?.size || 0) === 0) &&
            !loading_bloxProperties && (
            <FxWarning
              padding="16"
              marginBottom="8"
              error={t('setBloxAuthorizer.storageNeeded')}
            />
          )}
          {password && signiture ? (
            <FxBox>
              <FxText variant="h300" textAlign="center" marginBottom="8">
                {t('setBloxAuthorizer.appPeerId')}
              </FxText>
              <FxPressableOpacity
                onPress={() =>
                  Share.share({
                    title: t('setBloxAuthorizer.appPeerId'),
                    message: newPeerId,
                  })
                }
              >
                <FxText color="content3" textAlign="center" marginTop="8">
                  {newPeerId ?? t('setBloxAuthorizer.generating')}
                </FxText>
              </FxPressableOpacity>
            </FxBox>
          ) : null}

          {newBloxPeerId && !isManualSetup && (
            <FxBox marginTop="16">
              <FxText variant="h300" textAlign="center" marginBottom="8">
                {t('setBloxAuthorizer.bloxPeerId')}
              </FxText>
              <FxPressableOpacity
                onPress={() =>
                  Share.share({
                    title: t('setBloxAuthorizer.bloxPeerId'),
                    message: newBloxPeerId,
                  })
                }
              >
                <FxText color="content3" textAlign="center" marginTop="8">
                  {newBloxPeerId}
                </FxText>
              </FxPressableOpacity>
            </FxBox>
          )}
          {isManualSetup && (
            <FxBox marginTop="16">
              <FxText variant="h300" textAlign="center" marginBottom="8">
                {t('setBloxAuthorizer.enterBloxPeerId')}
              </FxText>
              <FxTextInput
                defaultValue={newBloxPeerId}
                onChangeText={setNewBloxPeerId}
              />
            </FxBox>
          )}
          {(newBloxPeerId || isManualSetup) && (
            <FxBox paddingTop="40">
              <FxTextInput
                caption={t('setBloxAuthorizer.setBloxName')}
                value={newBloxName}
                onChangeText={setNewBloxName}
              />
            </FxBox>
          )}
        </FxBox>
        {data_bloxProperties?.data?.bloxFreeSpace && (
          <DeviceCard
            data={{
              capacity: data_bloxProperties?.data?.bloxFreeSpace?.size || 0,
              free: data_bloxProperties?.data?.bloxFreeSpace?.avail,
              used: data_bloxProperties?.data?.bloxFreeSpace?.used,
              name: t('setBloxAuthorizer.hardDisk'),
              status: data_bloxProperties?.data?.bloxFreeSpace
                ? EDeviceStatus.InUse
                : EDeviceStatus.NotAvailable,
              associatedDevices: [t('setBloxAuthorizer.bloxSetUp')],
            }}
            onRefreshPress={refetch_bloxProperties}
            loading={loading_bloxProperties}
          >
            {data_bloxProperties?.data?.bloxFreeSpace?.size !== 0 &&
              showFormatDiskButton && (
                <FxButton
                  onPress={loading_bloxFormatDisk ? null : handleFormatDisk}
                >
                  {loading_bloxFormatDisk ? <ActivityIndicator /> : null}
                  {t('setBloxAuthorizer.formatDisk')}
                </FxButton>
              )}
          </DeviceCard>
        )}
      </FxKeyboardAwareScrollView>

      <FxBox
        flex={1}
        position="absolute"
        bottom={0}
        right={0}
        left={0}
        paddingHorizontal="20"
        paddingVertical="20"
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        {showSkipButton && (
          <>
            <FxButton
              variant="inverted"
              paddingHorizontal="20"
              marginRight="12"
              onPress={() => setShowSkipModal(true)}
            >
              {t('setBloxAuthorizer.skip')}
            </FxButton>

            <Modal
              visible={showSkipModal}
              transparent
              animationType="fade"
              onRequestClose={() => setShowSkipModal(false)}
            >
              <FxBox
                flex={1}
                justifyContent="center"
                alignItems="center"
                padding="24"
              >
                <FxBox
                  backgroundColor="backgroundSecondary"
                  padding="24"
                  width="100%"
                >
                  <FxText variant="h300" marginBottom="16">
                    {t('setBloxAuthorizer.skipAuthorization')}
                  </FxText>
                  <FxText variant="body" marginBottom="24">
                    {t('setBloxAuthorizer.skipDescription')}
                  </FxText>
                  <FxTextInput
                    value={skipCode}
                    onChangeText={setSkipCode}
                    keyboardType="number-pad"
                    secureTextEntry
                    style={{
                      borderWidth: 1,
                      borderColor: '#ccc',
                      borderRadius: 4,
                      padding: 8,
                      marginBottom: 16,
                    }}
                    maxLength={4}
                  />
                  <FxBox flexDirection="row" justifyContent="flex-end">
                    <FxButton
                      variant="inverted"
                      onPress={() => {
                        setShowSkipModal(false);
                        setSkipCode('');
                      }}
                      marginRight="12"
                    >
                      {t('setBloxAuthorizer.cancel')}
                    </FxButton>
                    <FxButton
                      onPress={() => {
                        if (skipCode === '1234') {
                          setShowSkipModal(false);
                          setSkipCode('');
                          skipConnectToInternet();
                        } else {
                          Alert.alert(
                            t('setBloxAuthorizer.invalidCode'),
                            t('setBloxAuthorizer.invalidCodeMessage')
                          );
                        }
                      }}
                    >
                      {t('setBloxAuthorizer.confirm')}
                    </FxButton>
                  </FxBox>
                </FxBox>
              </FxBox>
            </Modal>
          </>
        )}
        <FxBox
          flexDirection="row"
          justifyContent="flex-end"
          alignItems="center"
          flex={1}
        >
          <FxButton
            variant="inverted"
            paddingHorizontal="20"
            marginRight="12"
            onPress={goBack}
          >
            {t('setBloxAuthorizer.back')}
          </FxButton>
          {!newBloxPeerId && !isManualSetup ? (
            <FxButton
              disabled={
                !newPeerId ||
                loading_exchange ||
                loading_bloxProperties ||
                !data_bloxProperties?.data?.restartNeeded ||
                data_bloxProperties?.data?.restartNeeded === 'true' ||
                (data_bloxProperties?.data?.bloxFreeSpace?.size || 0) === 0
              }
              width={120}
              onPress={handleSetOwnerPeerId}
            >
              {!loading_exchange && !loading_bloxProperties ? (
                t('setBloxAuthorizer.setAuthorizer')
              ) : (
                <ActivityIndicator />
              )}
            </FxButton>
          ) : (
            <FxButton
              disabled={
                loading_exchange ||
                !newBloxName ||
                !newBloxPeerId ||
                !newPeerId ||
                loading_bloxProperties
              }
              width={150}
              onPress={handleNext}
            >
              {loading_exchange ? <ActivityIndicator /> : t('setBloxAuthorizer.next')}
            </FxButton>
          )}
        </FxBox>
      </FxBox>
    </FxSafeAreaBox>
  );
};