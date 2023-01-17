import React, { useState } from 'react';
// @ts-ignore-next-line
import { HDKEY } from '@functionland/fula-sec';
import {
  FxBox,
  FxButton,
  FxKeyboardAwareScrollView,
  FxProgressBar,
  FxSafeAreaBox,
  FxText,
  FxTextInput,
  useToast,
} from '@functionland/component-library';
import { useWalletConnect } from '@walletconnect/react-native-dapp';
import { useInitialSetupNavigation } from '../../hooks';
import { Routes } from '../../navigation/navigationConfig';
import * as helper from '../../utils/helper';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { KeyChain } from '../../utils';
import { ActivityIndicator } from 'react-native';

export const SetBloxAuthorizerScreen = () => {
  const navigation = useInitialSetupNavigation();
  const { queueToast } = useToast();
  const [callingApi, setCallingApi] = useState(false);
  const [bloxPeerIdInput, setBloxPeerIdInput] = useState('');
  const [setKeyChainValue, signiture, password] = useUserProfileStore(
    (state) => [state.setKeyChainValue, state.signiture, state.password]
  );
  const goBack = () => navigation.goBack();

  const handleNext = () => {
    navigation.navigate(Routes.SetBloxAuthorizer);
  };

  const handleSetBloxAuthorizer = async () => {

  }
  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
        <FxProgressBar progress={40} />
      <FxKeyboardAwareScrollView enableOnAndroid={true} extraHeight={100} >
        <FxBox flex={3} paddingVertical="80">
          <FxText variant="h300" textAlign="center" marginBottom='80'>
            Set Blox authorizer
          </FxText>
          <FxText variant="body" textAlign="center" marginBottom='80'>
            Please enter your Blox PeerId to set the BloxApp as an authorizer on the Blox!
          </FxText>
          <FxTextInput
            caption="Blox PeerId"
            value={bloxPeerIdInput}
            onChangeText={setBloxPeerIdInput}
          />
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
            {true ? (
              <FxButton
                width={150}
              >
                {!callingApi ? (
                  'Set authorizer'
                ) : (
                  <ActivityIndicator />
                )}
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
