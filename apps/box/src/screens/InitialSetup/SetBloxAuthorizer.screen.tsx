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

import { useFetch, useInitialSetupNavigation, useLogger, useFetchWithBLE } from '../../hooks';
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

type Props = NativeStackScreenProps<
  InitialSetupStackParamList,
  Routes.SetBloxAuthorizer
>;
export const SetBloxAuthorizerScreen = ({ route }: Props) => {
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

  const bloxsArray = Object.values(bloxs);
  const [newBloxName, setNewBloxName] = useState(
    `Blox Unit #${bloxsArray.length + 1}`
  );

  const blePeerExchange = async (params: { peer_id: string, seed: string }) => {
    const connectedPeripherals = await BleManager.getConnectedPeripherals([]);
    if (connectedPeripherals.length === 0) {
      throw new Error('No BLE devices connected');
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
        title: 'Unable to get the blox properties!',
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
    console.log('inside data_exchange useEffect', {data_exchange});
    if (data_exchange?.data?.peer_id) {
      const peer_id = data_exchange?.data?.peer_id?.trim()?.split(/\r?\n/)?.[0];
      console.log({data_exchange, peer_id});
      if (!peer_id || peer_id?.length !== 52) {
        queueToast({
          type: 'error',
          title: 'Set authotizer',
          message: 'Blox peerId is invalid!',
        });
        refetch_bloxDeleteFulaConfig();
      } else {
        setNewBloxPeerId(peer_id);
      }
    } else if (error_exchange) {
      console.log('data exchange error' , {data_exchange, error_exchange});
      queueToast({
        type: 'error',
        title: 'Set authotizer',
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
        title: 'Format disk',
        message: data_bloxFormatDisk?.data?.msg,
      });
    } else if (error_bloxFormatDisk?.message) {
      queueToast({
        type: 'error',
        title: 'Format disk',
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
      if (currentBloxPeerId) {
        removeBlox(currentBloxPeerId);
      }
      addBlox({
        peerId: newBloxPeerId,
        name: newBloxName,
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
            Set Blox Owner
          </FxText>
          <FxText variant="body" textAlign="center" marginBottom="20">
            Adding the Blox App Peer ID as an owner on the Blox
          </FxText>
          {(error_exchange?.message === 'Network Error' ||
            error_bloxProperties?.message === 'Network Error') && (
            <FxWarning
              padding="16"
              marginBottom="8"
              error="In some cases you need to turn the mobile data off, please make sure the phone is connected to the Blox's Hotspot and mobile data/VPN is off, Then press back and try again please"
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
                    ? 'An update is awaiting a manual restart to be applied. You should unplug and plug back your blox to restart it and then try again.'
                    : "You should update your blox backend, Please press 'Skip' button and connect it to your Wifi network."
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
                error="To proceed successfully you need to attach an external storage to the Blox!"
              />
            )}
          {password && signiture ? (
            <FxBox>
              <FxText variant="h300" textAlign="center" marginBottom="8">
                The Blox App Peer ID
              </FxText>
              <FxPressableOpacity
                onPress={() =>
                  Share.share({
                    title: 'The Blox App Peer ID',
                    message: newPeerId,
                  })
                }
              >
                <FxText color="content3" textAlign="center" marginTop="8">
                  {newPeerId ?? 'Generating the app peerId...'}
                </FxText>
              </FxPressableOpacity>
            </FxBox>
          ) : null}

          {newBloxPeerId && !isManualSetup && (
            <FxBox marginTop="16">
              <FxText variant="h300" textAlign="center" marginBottom="8">
                Your Blox Peer ID
              </FxText>
              <FxPressableOpacity
                onPress={() =>
                  Share.share({
                    title: 'Your Blox Peer ID',
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
                Enter Your Blox Peer ID
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
                caption="Set Blox name"
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
              name: 'Hard Disk',
              status: data_bloxProperties?.data?.bloxFreeSpace
                ? EDeviceStatus.InUse
                : EDeviceStatus.NotAvailable,
              associatedDevices: ['Blox Set Up'],
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
                  Format Disk
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
              Skip
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
                    Skip Authorization
                  </FxText>
                  <FxText variant="body" marginBottom="24">
                    The Skip is only intended when you are instructed to do so
                    by the support team. Please enter the code given to you:
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
                      Cancel
                    </FxButton>
                    <FxButton
                      onPress={() => {
                        if (skipCode === '1234') {
                          setShowSkipModal(false);
                          setSkipCode('');
                          skipConnectToInternet();
                        } else {
                          Alert.alert(
                            'Invalid Code',
                            'The code you entered is incorrect. Please contact support if you need assistance.'
                          );
                        }
                      }}
                    >
                      Confirm
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
          //marginTop="16"
        >
          <FxButton
            variant="inverted"
            paddingHorizontal="20"
            marginRight="12"
            onPress={goBack}
          >
            Back
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
                'Set Authorizer'
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
              {loading_exchange ? <ActivityIndicator /> : 'Next'}
            </FxButton>
          )}
        </FxBox>
      </FxBox>
    </FxSafeAreaBox>
  );
};
