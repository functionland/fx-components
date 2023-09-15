import React, { useState } from 'react';
// @ts-ignore-next-line
import { HDKEY } from '@functionland/fula-sec';
import {
  FxBox,
  FxButton,
  FxProgressBar,
  FxSafeAreaBox,
  FxText,
  FxTextInput,
  useToast,
} from '@functionland/component-library';
import { useWalletConnect } from '@walletconnect/react-native-dapp';
import { useInitialSetupNavigation, useLogger } from '../../hooks';
import { Routes } from '../../navigation/navigationConfig';
import * as helper from '../../utils/helper';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { KeyChain } from '../../utils';
import { ActivityIndicator } from 'react-native';
import shallow from 'zustand/shallow';

export const LinkPasswordScreen = () => {
  const navigation = useInitialSetupNavigation();
  const walletConnector = useWalletConnect();
  const { queueToast } = useToast();
  const [linking, setLinking] = useState(false);
  const [passwordInput, setInputPasswordInput] = useState('');
  const [setKeyChainValue, signiture, password] = useUserProfileStore(
    (state) => [state.setKeyChainValue, state.signiture, state.password]
    , shallow);
  const logger = useLogger()

  const handleLinkPassword = async () => {
    try {
      if (linking) {
        setLinking(false);
        return;
      }
      setLinking(true);
      const ed = new HDKEY(passwordInput);
      const chainCode = ed.chainCode;
      if (!walletConnector.session?.connected)
        await walletConnector.createSession();
      const walletSignature = await walletConnector.signPersonalMessage([
        chainCode,
        walletConnector?.accounts[0],
      ]);
      await setKeyChainValue(KeyChain.Service.DIDPassword, passwordInput);
      await setKeyChainValue(KeyChain.Service.Signiture, walletSignature);
    } catch (err) {
      console.log(err);
      logger.logError('handleLinkPassword',err)
      queueToast({
        title: 'Error',
        message: 'Unable to sign the wallet address!',
        type: 'error',
        autoHideDuration: 3000,
      });
    } finally {
      setLinking(false);
    }
  };

  const handleConnectToBlox = () => {
    navigation.navigate(Routes.ConnectToBlox);
  };

  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxProgressBar progress={40} />
      <FxBox flex={1} justifyContent="space-between" paddingVertical="80">
        {password && signiture ? (
          <FxBox>
            <FxText variant="h300" textAlign="center">
              Your DID
            </FxText>
            <FxText textAlign="center" marginTop="8">
              {helper.getMyDID(password, signiture)}
            </FxText>
          </FxBox>
        ) : (
          <>
            <FxText variant="h300" textAlign="center">
              Link DID
            </FxText>
            {!linking ? (
              <FxTextInput
                caption="Password"
                autoFocus
                secureTextEntry
                value={passwordInput}
                onChangeText={setInputPasswordInput}
              />
            ) : (
              <ActivityIndicator />
            )}
          </>
        )}

        {signiture ? (
          <FxButton size="large" onPress={handleConnectToBlox}>
            Connect to Blox
          </FxButton>
        ) : (
          <FxButton
            size="large"
            disabled={!passwordInput}
            onPress={handleLinkPassword}
          >
            {linking ? 'Cancel' : 'Link Password'}
          </FxButton>
        )}
      </FxBox>
    </FxSafeAreaBox>
  );
};
