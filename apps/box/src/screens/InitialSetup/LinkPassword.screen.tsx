import '@walletconnect/react-native-compat';
import React, { useEffect, useMemo, useState } from 'react';
// @ts-ignore-next-line
import { HDKEY } from '@functionland/fula-sec';
import {
  FxBox,
  FxButton,
  FxProgressBar,
  FxRadioButton,
  FxRadioButtonWithLabel,
  FxSafeAreaBox,
  FxText,
  FxTextInput,
  useToast,
} from '@functionland/component-library';
import { useInitialSetupNavigation, useLogger } from '../../hooks';
import { Routes } from '../../navigation/navigationConfig';
import * as helper from '../../utils/helper';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { KeyChain } from '../../utils';
import { ActivityIndicator } from 'react-native';
import { useSDK } from '@metamask/sdk-react';
import notifee from '@notifee/react-native';

export const LinkPasswordScreen = () => {
  const navigation = useInitialSetupNavigation();
  const { account, sdk, provider, connected, error, status, rpcHistory } =
    useSDK();

  const [iKnow, setIKnow] = useState(false);
  const { queueToast } = useToast();
  const [linking, setLinking] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState('');
  const [setKeyChainValue, signiture, password] = useUserProfileStore(
    (state) => [state.setKeyChainValue, state.signiture, state.password]
  );

  useEffect(() => {
    console.log('in test useEffect');
    console.log(
      JSON.stringify({ error: error, status: status, rpcHistory: rpcHistory })
    );
  }, [error, status, rpcHistory]);
  useEffect(() => {
    console.log('signiture is: ' + signiture + '; password:' + password);
  }, [signiture, password]);

  const personalSign = async (msg: string) => {
    let signature = '';
    let resolveSigned = () => {};
    const signed = new Promise<void>(resolve => {
      resolveSigned = resolve;
    })

    notifee.registerForegroundService(() => signed);
    await notifee.displayNotification({
    id: 'wallet',
      title: 'Connecting Wallet...',
      body: 'Wallet connection in progress, click to move back to the app',
      android: {
        progress: {
          indeterminate: true
        },
        pressAction: {
          id: 'default'
        },
        ongoing: true,
        asForegroundService: true,
        channelId: 'sticky'
      }
    });
    signature = await sdk?.connectAndSign({ msg }) as string;
    resolveSigned();
    notifee.stopForegroundService();

    return signature;
  };

  const disconnectWallet = () => {
    setLinking(false);
    sdk?.terminate();
  };

  const logger = useLogger();
  useEffect(() => {
    const setKeys = async (walletSignature: string) => {
      try {
        await setKeyChainValue(KeyChain.Service.DIDPassword, passwordInput);
        await setKeyChainValue(KeyChain.Service.Signiture, walletSignature);
      } catch (err) {
        console.log(err);
        logger.logError('handleLinkPassword', err);
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
    if (signatureData) {
      const walletSignature = signatureData.toString();
      console.log('walletSignature', walletSignature);
      setKeys(walletSignature);
    }
  }, [signatureData]);

  const handleLinkPassword = async () => {
    try {
      if (linking) {
        setLinking(false);
        return;
      }
      setLinking(true);
      const ed = new HDKEY(passwordInput);
      const chainCode = ed.chainCode;
      console.log(chainCode);
      console.log('before signing...');
      const sig = await personalSign(chainCode);
      if (!sig || sig === undefined || sig === null) {
        throw 'Sign failed';
      }
      console.log('Signature: ', sig);
      setSignatureData(sig);
      console.log('after signing...');
    } catch (err) {
      console.log(err);
      logger.logError('handleLinkPassword', err);
      queueToast({
        title: 'Error',
        message: 'Unable to sign the wallet address!',
        type: 'error',
        autoHideDuration: 3000,
      });
      setLinking(false);
    } finally {
      setLinking(false);
    }
  };

  const handleConnectToBlox = () => {
    navigation.navigate(Routes.ConnectToBlox);
  };
  const handleConnectToExistingBlox = () => {
    navigation.navigate(Routes.ConnectToExistingBlox);
  };
  const handleOnBluetoothCommand = () => {
    navigation.navigate(Routes.BluetoothCommands);
  };
  const handleSkipToManulaSetup = () => {
    navigation.navigate(Routes.SetBloxAuthorizer, { isManualSetup: true });
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
                onChangeText={setPasswordInput}
              />
            ) : (
              <ActivityIndicator />
            )}
            <FxBox>
              <FxText
                variant="bodyMediumRegular"
                color="warningBase"
                textAlign="center"
                paddingBottom="20"
              >
                Make sure to safeguard this password and the chain you used,
                it's the key to decrypt your data from new devices
              </FxText>
              <FxRadioButton.Group
                value={iKnow ? [1] : []}
                onValueChange={(val) =>
                  setIKnow(val && val[0] === 1 ? true : false)
                }
              >
                <FxRadioButtonWithLabel
                  paddingVertical="8"
                  label="I understand the risk of losing my password"
                  value={1}
                />
              </FxRadioButton.Group>
            </FxBox>
          </>
        )}

        {signiture ? (
          <FxBox>
            <FxButton
              size="large"
              marginBottom="16"
              onPress={handleConnectToBlox}
            >
              Connect to Blox
            </FxButton>
            <FxButton
              size="large"
              variant="inverted"
              onPress={handleConnectToExistingBlox}
            >
              Reconnect to existing blox
            </FxButton>
            {logger.isDebugModeEnable && (
              <FxButton
                size="large"
                variant="inverted"
                marginTop="16"
                onPress={handleOnBluetoothCommand}
              >
                Bluetooth commands
              </FxButton>
            )}
            <FxButton
              variant="inverted"
              marginTop="16"
              onPress={handleSkipToManulaSetup}
            >
              Skip to manual setup
            </FxButton>
          </FxBox>
        ) : (
          <FxButton
            size="large"
            disabled={!passwordInput || !iKnow}
            onPress={
              provider
                ? linking
                  ? disconnectWallet
                  : handleLinkPassword
                : () => {}
            }
          >
            {provider ? linking ? 'Cancel' : 'Sign' : <ActivityIndicator />}
          </FxButton>
        )}
      </FxBox>
    </FxSafeAreaBox>
  );
};
