import React, { useEffect, useState } from 'react';
// @ts-ignore-next-line
import {
  FxBox,
  FxButton,
  FxKeyboardAwareScrollView,
  FxProgressBar,
  FxSafeAreaBox,
  FxText,
  useToast,
} from '@functionland/component-library';

import { useFetch, useInitialSetupNavigation } from '../../hooks';
import { Routes } from '../../navigation/navigationConfig';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { ActivityIndicator, Alert } from 'react-native';
import { Helper } from '../../utils';
import { exchangeConfig } from '../../api/bloxHardware';

export const SetBloxAuthorizerScreen = () => {
  const navigation = useInitialSetupNavigation();
  const [newPeerId, setNewPeerId] = useState(undefined);
  const [callingApi] = useState(false);
  const { queueToast } = useToast()

  const [setAppPeerId, signiture, password, appPeerId, bloxPeerIds, setBloxPeerIds] = useUserProfileStore(
    (state) => [
      state.setAppPeerId,
      state.signiture,
      state.password,
      state.appPeerId,
      state.bloxPeerIds,
      state.setBloxPeerIds
    ]
  );
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
    generateAppPeerId();
  }, []);

  //echange config with blox when peerId is ready
  useEffect(() => {
    if (newPeerId) {
      const { secretKey } = Helper.getMyDIDKeyPair(password, signiture)
      refetch_exchangeConfig({
        params: {
          peer_id: newPeerId,
          seed: secretKey.toString()
        }
      })
    }
  }, [newPeerId])

  useEffect(() => {
    if (data_exchange?.data?.peer_id) {
      setAppPeerId(newPeerId);
      setBloxPeerIds([data_exchange?.data?.peer_id])
    } else if (error_exchange) {
      queueToast({
        type: 'error',
        title: 'Set authotizer',
        message: error_exchange?.message
      })
    }
  }, [data_exchange, error_exchange])

  const generateAppPeerId = async () => {
    const peerId = await Helper.initFula({
      password,
      signiture,
    });
    if (peerId) setNewPeerId(peerId);
  };
  const goBack = () => navigation.goBack();

  const handleNext = () => {
    navigation.navigate(Routes.ConnectToWifi);
  };

  const handleSetOwnerPeerId = async () => {
    try {
      setNewPeerId(newPeerId);
      // if (newPeerId) {
      //   //TO DO : call Bolx hardware api to set owner's peerId
      //   const { secretKey } = Helper.getMyDIDKeyPair(password, signiture)
      //   const data = await exchangeConfig({
      //     peer_id: newPeerId,
      //     seed: secretKey.toString()
      //   })
      //   setAppPeerId(newPeerId);
      //   setBloxPeerIds([data?.peer_id])
      // }
    } catch (error) {
      Alert.alert('Error', 'Unable to set the authorizer!, make sure you are connected to FxBlox hotspot.')
    }

  };

  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxProgressBar progress={80} />
      <FxKeyboardAwareScrollView enableOnAndroid={true} extraHeight={100}>
        <FxBox flex={3} paddingVertical="80">
          <FxText variant="h300" textAlign="center" marginBottom="80">
            Set Blox Owner
          </FxText>
          <FxText variant="body" textAlign="center" marginBottom="80">
            Now you can set the Blox App peerId as an owner on the Blox
          </FxText>
          {password && signiture ? (
            <FxBox>
              <FxText variant="h300" textAlign="center" marginBottom="24">
                The Blox App Peer ID
              </FxText>
              <FxText color="warningBase" textAlign="center" marginTop="8">
                {newPeerId ?? 'Is undefined!'}
              </FxText>
            </FxBox>
          ) : null}
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
          {(!bloxPeerIds || bloxPeerIds?.length == 0) ? (
            <FxButton disabled={loading_exchange} width={150}
              onPress={handleSetOwnerPeerId}>
              {!loading_exchange ? 'Set authorizer' : <ActivityIndicator />}
            </FxButton>
          ) : (
            <FxButton
              disabled={!bloxPeerIds || bloxPeerIds?.length == 0}
              width={150} onPress={handleNext}>
              {loading_exchange ? <ActivityIndicator /> : 'Next'}

            </FxButton>
          )}
        </FxBox>
      </FxBox>
    </FxSafeAreaBox>
  );
};
