import React, { useEffect, useState } from 'react';
// @ts-ignore-next-line
import {
  FxBox,
  FxButton,
  FxCard,
  FxCheckIcon,
  FxKeyboardAwareScrollView,
  FxPressableOpacity,
  FxProgressBar,
  FxRadioButton,
  FxSafeAreaBox,
  FxText,
  FxTextInput,
  FxWarning,
  FxWarningIcon,
  useToast,
} from '@functionland/component-library';

import { useFetch, useInitialSetupNavigation, useLogger } from '../../hooks';
import { Routes } from '../../navigation/navigationConfig';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { ActivityIndicator, Alert, Share } from 'react-native';
import { Helper } from '../../utils';
import { exchangeConfig, getBloxProperties } from '../../api/bloxHardware';
import shallow from 'zustand/shallow';
import { useBloxsStore } from '../../stores';
import { DeviceCard } from '../../components';
import { EDeviceStatus } from '../../api/hub';

export const SetBloxAuthorizerScreen = () => {
  const navigation = useInitialSetupNavigation();
  const [newPeerId, setNewPeerId] = useState(undefined);
  const [newBloxPeerId, setNewBloxPeerId] = useState(undefined);
  const { queueToast } = useToast()
  const logger = useLogger()

  const [setAppPeerId, signiture, password] = useUserProfileStore(
    (state) => [
      state.setAppPeerId,
      state.signiture,
      state.password,
    ],
    shallow
  );

  const [bloxs = {}, currentBloxPeerId, updateBloxsStore, addBlox, removeBlox, updateBloxPropertyInfo, updateBloxSpaceInfo] = useBloxsStore((state) => [
    state.bloxs,
    state.currentBloxPeerId,
    state.update,
    state.addBlox,
    state.removeBlox,
    state.updateBloxPropertyInfo,
    state.updateBloxSpaceInfo
  ], shallow);

  const bloxsArray = Object.values(bloxs)
  const [newBloxName, setNewBloxName] = useState(`Blox Unit #${bloxsArray.length + 1}`)
  const {
    loading: loading_exchange,
    data: data_exchange,
    error: error_exchange,
    refetch: refetch_exchangeConfig
  } = useFetch({
    initialLoading: false,
    apiMethod: exchangeConfig,
  })
  const {
    loading: loading_bloxProperties,
    data: data_bloxProperties,
    error: error_bloxProperties,
    refetch: refetch_bloxProperties
  } = useFetch({
    initialLoading: false,
    apiMethod: getBloxProperties,
  })
  useEffect(() => {
    if (password && signiture)
      generateAppPeerId();
  }, [password, signiture]);

  //echange config with blox when peerId is ready
  useEffect(() => {
    if (newPeerId) {
      handleExchangeConfig()
      refetch_bloxProperties()
    }
  }, [newPeerId])

  useEffect(() => {

    if (data_bloxProperties?.data?.bloxFreeSpace) {
      //setNewBloxPeerId(data_exchange?.data?.peer_id)
    } else if (error_bloxProperties) {
      queueToast({
        type: 'warning',
        title: 'Unable to get the blox properties!',
        message: error_bloxProperties?.message
      })
    }
    logger.log('refetch_bloxProperties:result', { data_bloxProperties, error_bloxProperties })
  }, [data_bloxProperties, error_bloxProperties])

  useEffect(() => {
    if (data_exchange?.data?.peer_id) {
      setNewBloxPeerId(data_exchange?.data?.peer_id)
    } else if (error_exchange) {
      queueToast({
        type: 'error',
        title: 'Set authotizer',
        message: error_exchange?.message
      })
    }
    logger.log('handleExchangeConfig:result', { data_exchange, error_exchange })
  }, [data_exchange, error_exchange])

  const handleExchangeConfig = () => {
    try {
      const { secretKey } = Helper.getMyDIDKeyPair(password, signiture)
      refetch_exchangeConfig({
        params: {
          peer_id: newPeerId,
          seed: secretKey.toString()
        }
      })
    } catch (error) {
      logger.logError('exchangeConfig', error)
    }
  }
  const generateAppPeerId = async () => {
    try {
      const peerId = await Helper.initFula({
        password,
        signiture,
      });
      setNewPeerId(peerId);
      logger.log('generateAppPeerId:Result', { peerId })
    } catch (error) {
      logger.logError('generateAppPeerId', error)
    }
  };
  const goBack = () => navigation.goBack();

  const handleNext = () => {
    if (!loading_exchange && newBloxName && newBloxPeerId && newPeerId && newBloxName) {
      setAppPeerId(newPeerId);
      if (currentBloxPeerId) {
        removeBlox(currentBloxPeerId)
      }
      addBlox({
        peerId: newBloxPeerId,
        name: newBloxName,
      })
      updateBloxPropertyInfo(newBloxPeerId, data_bloxProperties?.data)
      updateBloxSpaceInfo(newBloxPeerId, data_bloxProperties?.data?.bloxFreeSpace)
      updateBloxsStore({
        currentBloxPeerId: newBloxPeerId,
      })
      logger.log('SetBloxAuthorizer.Screen:handleNext', {
        peerId: newBloxPeerId,
        name: newBloxName,
        freeSpace: data_bloxProperties?.data?.bloxFreeSpace,
        propertyInfo: data_bloxProperties?.data
      })
      navigation.navigate(Routes.ConnectToWifi);
    } else
      logger.logError('SetBloxAuthorizer.Screen:handleNext', {
        loading_exchange,
        newBloxName,
        newBloxPeerId,
        newPeerId
      })
  };

  const handleSetOwnerPeerId = async () => {
    if (newPeerId) {
      handleExchangeConfig()
    }
  };

  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxProgressBar progress={80} />
      <FxKeyboardAwareScrollView enableOnAndroid={true} extraScrollHeight={60} extraHeight={100} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <FxBox flex={3} paddingVertical="40">
          <FxText variant="h300" textAlign="center" marginBottom="40">
            Set Blox Owner
          </FxText>
          <FxText variant="body" textAlign="center" marginBottom="20">
            Adding the Blox App peerId as an owner on the Blox
          </FxText>
          {error_exchange?.message === 'Network Error' &&
            <FxWarning padding='16' marginBottom='8' error="In some cases you need to turn the mobile data off, please make sure the phone is connected to the Blox's Hotspot and mobile data is off" />
          }
          {newBloxPeerId && !data_bloxProperties?.data?.bloxFreeSpace && !loading_bloxProperties &&
            <FxWarning padding='16' marginBottom='8' error='To proceed successfully you need to attach an external storage to the Blox!' />
          }
          {password && signiture ? (
            <FxBox>
              <FxText variant="h300" textAlign="center" marginBottom="8">
                The Blox App Peer ID
              </FxText>
              <FxPressableOpacity onPress={() => Share.share({
                title: 'The Blox App Peer ID',
                message: newPeerId
              })}>
                <FxText color="content3" textAlign="center" marginTop="8">
                  {newPeerId ?? 'Generating the app peerId...'}
                </FxText>
              </FxPressableOpacity>
            </FxBox>
          ) : null}

          {newBloxPeerId &&
            <FxBox marginTop='16'>
              <FxText variant="h300" textAlign="center" marginBottom="8">
                Your Blox Peer ID
              </FxText>
              <FxPressableOpacity onPress={() => Share.share({
                title: 'Your Blox Peer ID',
                message: newBloxPeerId
              })}>
                <FxText color="content3" textAlign="center" marginTop="8">
                  {newBloxPeerId}
                </FxText>
              </FxPressableOpacity>

            </FxBox>
          }
          {newBloxPeerId &&
            <FxBox paddingTop='40'>
              <FxTextInput
                caption="Set Blox name"
                value={newBloxName}
                onChangeText={setNewBloxName}
              />
            </FxBox>

          }
        </FxBox>
        {data_bloxProperties?.data?.bloxFreeSpace &&
          <DeviceCard
            data={{
              capacity: data_bloxProperties?.data?.bloxFreeSpace?.size || 0,
              free: data_bloxProperties?.data?.bloxFreeSpace?.avail,
              used: data_bloxProperties?.data?.bloxFreeSpace?.used,
              name: 'Hard Disk',
              status: data_bloxProperties?.data?.bloxFreeSpace ? EDeviceStatus.InUse : EDeviceStatus.NotAvailable,
              associatedDevices: ['Blox Set Up']
            }}
            onRefreshPress={refetch_bloxProperties}
            loading={loading_bloxProperties}
          />
        }
      </FxKeyboardAwareScrollView>

      <FxBox flex={1} position='absolute' bottom={0} right={0} left={0} paddingHorizontal='20' paddingVertical='20'>
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
          {(!newBloxPeerId) ? (
            <FxButton
              disabled={loading_exchange}

              width={150}
              onPress={handleSetOwnerPeerId}>
              {!loading_exchange && newPeerId ? 'Set authorizer' : <ActivityIndicator />}
            </FxButton>
          ) : (
            <FxButton
              disabled={loading_exchange || !newBloxName || !newBloxPeerId || !newPeerId || loading_bloxProperties}
              width={150} onPress={handleNext}>
              {loading_exchange ? <ActivityIndicator /> : 'Next'}
            </FxButton>
          )}
        </FxBox>
      </FxBox>
    </FxSafeAreaBox>
  );
};
