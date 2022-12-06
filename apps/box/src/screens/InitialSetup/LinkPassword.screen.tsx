import React, { useState } from 'react';
import * as ReactNativeKeychain from 'react-native-keychain';
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
import { useInitialSetupNavigation } from '../../hooks';
import * as Keychain from '../../utils/keychain';
import { Routes } from '../../navigation/navigationConfig';
import * as helper from '../../utils/helper';

export const LinkPasswordScreen = () => {
  const navigation = useInitialSetupNavigation();
  const walletConnector = useWalletConnect();
  const { queueToast } = useToast();
  const [password, setPassword] = useState<string>('');
  const [dIDCredentialsState, setDIDCredentialsState] =
    useState<null | ReactNativeKeychain.UserCredentials>(null);

  const handleLinkPassword = async () => {
    try {
      const ed = new HDKEY(password);
      const chainCode = ed.chainCode;
      if (!walletConnector.session?.connected)
        await walletConnector.createSession();
      const walletSignature = await walletConnector.signPersonalMessage([
        chainCode,
        walletConnector?.accounts[0],
      ]);
      const passwordCredentials = await Keychain.save(
        password,
        walletSignature,
        Keychain.Service.DIDCredentials
      );
      if (passwordCredentials) {
        setDIDCredentialsState(passwordCredentials);
      } else {
        queueToast({
          title: 'Error',
          message: 'Something went wrong, please try again!',
          type: 'error',
          autoHideDuration: 3000,
        });
      }
    } catch (err) {
      console.log(err);
      queueToast({
        title: 'Error',
        message: 'Unable to sign the wallet address!',
        type: 'error',
        autoHideDuration: 3000,
      });
    }
  };

  const handleConnectToBlox = () => {
    navigation.navigate(Routes.ConnectToBlox);
  };

  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxProgressBar progress={40} />
      <FxBox flex={1} justifyContent="space-between" paddingVertical="80">
        {dIDCredentialsState ? (
          <FxBox>
            <FxText variant="h300" textAlign="center">
              Your DID
            </FxText>
            <FxText textAlign="center" marginTop="8">
              {helper.getMyDID(
                dIDCredentialsState.username,
                dIDCredentialsState.password
              )}
            </FxText>
          </FxBox>
        ) : (
          <>
            <FxText variant="h300" textAlign="center">
              Link DID
            </FxText>
            <FxTextInput
              caption="Password"
              autoFocus
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </>
        )}

        {dIDCredentialsState ? (
          <FxButton size="large" onPress={handleConnectToBlox}>
            Connect to Blox
          </FxButton>
        ) : (
          <FxButton
            size="large"
            disabled={!password}
            onPress={handleLinkPassword}
          >
            Link Password
          </FxButton>
        )}
      </FxBox>
    </FxSafeAreaBox>
  );
};
