import React, { useEffect, useState } from 'react';
// @ts-ignore-next-line
import {
  FxBox,
  FxButton,
  FxKeyboardAwareScrollView,
  FxProgressBar,
  FxSafeAreaBox,
  FxText,
} from '@functionland/component-library';

import { useInitialSetupNavigation } from '../../hooks';
import { Routes } from '../../navigation/navigationConfig';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { ActivityIndicator } from 'react-native';
import { Helper } from '../../utils';
import { exchangeConfig } from '../../api/bloxHardware';

export const SetBloxAuthorizerScreen = () => {
  const navigation = useInitialSetupNavigation();
  const [newPeerId, setNewPeerId] = useState(undefined);
  const [callingApi] = useState(false);
  const [setAppPeerId, signiture, password, appPeerId, setBloxPeerIds] = useUserProfileStore(
    (state) => [
      state.setAppPeerId,
      state.signiture,
      state.password,
      state.appPeerId,
      state.setBloxPeerIds
    ]
  );

  useEffect(() => {
    generateAppPeerId();
  }, []);
  const generateAppPeerId = async () => {
    const peerId = await Helper.initFula({
      password,
      signiture,
    });
    if (peerId) setNewPeerId(peerId);
  };
  const goBack = () => navigation.goBack();

  const handleNext = () => {
    navigation.navigate(Routes.SetupComplete);
  };

  const handleSetOwnerPeerId = async () => {
    try {
      if (newPeerId) {
        //TO DO : call Bolx hardware api to set owner's peerId
        const { secretKey } = Helper.getMyDIDKeyPair(password, signiture)
        const { peer_id } = await exchangeConfig({
          peer_id: newPeerId,
          seed: secretKey.toString()
        })
        setAppPeerId(newPeerId);
        setBloxPeerIds([peer_id])
      }
    } catch (error) {
      console.log(error)
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
          {!appPeerId ? (
            <FxButton width={150} onPress={handleSetOwnerPeerId}>
              {!callingApi ? 'Set authorizer' : <ActivityIndicator />}
            </FxButton>
          ) : (
            <FxButton width={150} onPress={handleNext}>
              Next
            </FxButton>
          )}
        </FxBox>
      </FxBox>
    </FxSafeAreaBox>
  );
};
