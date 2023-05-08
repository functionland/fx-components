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
  useToast,
} from '@functionland/component-library';

import { useFetch, useInitialSetupNavigation, useLogger } from '../../hooks';
import { Routes } from '../../navigation/navigationConfig';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { ActivityIndicator, Alert, Share } from 'react-native';
import { Helper } from '../../utils';
import { exchangeConfig } from '../../api/bloxHardware';
import shallow from 'zustand/shallow';
import { useBloxsStore } from '../../stores';

export const SetBloxAuthorizerScreen = () => {
  const navigation = useInitialSetupNavigation();
  const [newPeerId, setNewPeerId] = useState(undefined);
  const [newBloxPeerId, setNewBloxPeerId] = useState(undefined);
  const [callingApi] = useState(false);
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

  const [bloxs = {}, updateBloxsStore, addBlox] = useBloxsStore((state) => [
    state.bloxs,
    state.update,
    state.addBlox,
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
  useEffect(() => {
    if (password && signiture)
      generateAppPeerId();
  }, [password, signiture]);

  //echange config with blox when peerId is ready
  useEffect(() => {
    if (newPeerId) {
      handleExchangeConfig()
    }
  }, [newPeerId])

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
      updateBloxsStore({
        currentBloxPeerId: newBloxPeerId
      })
      addBlox({
        peerId: newBloxPeerId,
        name: newBloxName
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
      <FxKeyboardAwareScrollView enableOnAndroid={true} extraHeight={100}>
        <FxBox flex={3} paddingVertical="40">
          <FxText variant="h300" textAlign="center" marginBottom="40">
            Set Blox Owner
          </FxText>
          <FxText variant="body" textAlign="center" marginBottom="40">
            Adding the Blox App peerId as an owner on the Blox
          </FxText>
          {password && signiture ? (
            <FxBox>
              <FxText variant="h300" textAlign="center" marginBottom="8">
                The Blox App Peer ID
              </FxText>
              <FxPressableOpacity onPress={() => Share.share({
                title: 'The Blox App Peer ID',
                message: newPeerId
              })}>
                <FxText color="warningBase" textAlign="center" marginTop="8">
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
                <FxText color="warningBase" textAlign="center" marginTop="8">
                  {newBloxPeerId}
                </FxText>
              </FxPressableOpacity>

            </FxBox>
          }
          {newBloxPeerId &&
            <FxBox paddingTop='40'>
              <FxTextInput
                caption="Blox name"
                value={newBloxName}
                onChangeText={setNewBloxName}
              />
            </FxBox>

          }
        </FxBox>
      </FxKeyboardAwareScrollView>

      <FxBox flex={1} justifyContent="flex-end">
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
              disabled={loading_exchange || !newBloxName || !newBloxPeerId || !newPeerId}
              width={150} onPress={handleNext}>
              {loading_exchange ? <ActivityIndicator /> : 'Next'}
            </FxButton>
          )}
        </FxBox>
      </FxBox>
    </FxSafeAreaBox>
  );
};
