import React, { useMemo, useState } from 'react';
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
import { useWalletConnectModal } from '@walletconnect/modal-react-native';
import shallow from 'zustand/shallow';
import { ethers } from 'ethers';
export const LinkPasswordScreen = () => {
  const navigation = useInitialSetupNavigation();
  const { isConnected, provider } = useWalletConnectModal();
  const [iKnow, setIKnow] = useState(false);
  const { queueToast } = useToast();
  const [linking, setLinking] = useState(false);
  const [passwordInput, setInputPasswordInput] = useState('');
  const [setKeyChainValue, signiture, password] = useUserProfileStore(
    (state) => [state.setKeyChainValue, state.signiture, state.password],
    shallow
  );
  const web3Provider = useMemo(
    () => (provider ? new ethers.providers.Web3Provider(provider) : undefined),
    [provider]
  );
  const logger = useLogger();
  const handleLinkPassword = async () => {
    try {
      if (linking) {
        setLinking(false);
        return;
      }
      setLinking(true);
      const ed = new HDKEY(passwordInput);
      const chainCode = ed.chainCode;
      provider.abortPairingAttempt();
      await provider.cleanupPendingPairings();
      const walletSignature = await helper.signMessage({
        message: chainCode,
        web3Provider,
      });
      console.log('walletSignature', walletSignature);
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
                onChangeText={setInputPasswordInput}
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
            onPress={provider ? handleLinkPassword : null}
          >
            {provider && isConnected ? (
              linking ? (
                'Cancel'
              ) : (
                'Link Password'
              )
            ) : (
              <ActivityIndicator />
            )}
          </FxButton>
        )}
      </FxBox>
    </FxSafeAreaBox>
  );
};
