import '@walletconnect/react-native-compat';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  FxBox,
  FxButton,
  FxPicker,
  FxPickerItem,
  FxProgressBar,
  FxSafeAreaBox,
  FxText,
  useToast,
} from '@functionland/component-library';
import { useInitialSetupNavigation } from '../../hooks/useTypedNavigation';
import { Routes } from '../../navigation/navigationConfig';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { useAccount, useNetwork, useDisconnect } from 'wagmi';
import { useWeb3Modal } from '@web3modal/wagmi-react-native';
import { Helper } from '../../utils';
import { WalletDetails } from '../../components/WalletDetails';
import { shallow } from 'zustand/shallow';
import { useLogger } from '../../hooks';

export const ConnectToWalletScreen = () => {
  const navigation = useInitialSetupNavigation();

  const { queueToast } = useToast();
  const { chain } = useNetwork();
  const { disconnect } = useDisconnect();
  const { open, close } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const [walletId, signiture, password, setWalletId] = useUserProfileStore(
    (state) => [
      state.walletId,
      state.signiture,
      state.password,
      state.setWalletId,
    ],
    shallow
  );

  const logger = useLogger();
  useEffect(() => {
    console.log('isConnected', isConnected);
    if (!isConnected || !address) return;
    if (address !== walletId) {
      setWalletId(address, true);
    }
  }, [isConnected, address]);

  const handleWalletConnect = async () => {
    try {
      open({ view: 'Networks' });
    } catch (err) {
      console.log(err);
      logger.logError('handleWalletConnect', err);
      queueToast({
        title: 'WalletConnect Error',
        message: err.toString(),
        type: 'error',
        autoHideDuration: 3000,
      });
    }
  };
  const disconnectWallet = () => {
    disconnect();
    close();
  };
  const handleLinkPassword = () => {
    navigation.navigate(Routes.LinkPassword);
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
      <FxProgressBar progress={20} />

      <FxBox flex={1} justifyContent="space-between" paddingVertical="80">
        {isConnected ? (
          <>
            <WalletDetails allowChangeWallet={true} />
            {password && signiture ? (
              <FxBox>
                <FxText variant="h300" textAlign="center">
                  Your DID
                </FxText>
                <FxText textAlign="center" marginTop="8">
                  {Helper.getMyDID(password, signiture)}
                </FxText>
              </FxBox>
            ) : null}
          </>
        ) : (
          <FxText variant="h300" textAlign="center">
            Connect To Wallet
          </FxText>
        )}
        <FxBox>
          <FxText variant="h200" marginBottom="8">
            Selected network:
          </FxText>
          {chain ? (
            <FxText
              variant="h200"
              style={{ color: '#00ff00' }}
              marginBottom="8"
            >
              {chain?.name}
            </FxText>
          ) : (
            <FxText
              variant="h200"
              style={{ color: '#ff0000' }}
              marginBottom="8"
            >
              Not selected
            </FxText>
          )}
        </FxBox>
        <FxBox>
          {!isConnected ? (
            <FxButton size="large" onPress={handleWalletConnect}>
              Connect to Wallet
            </FxButton>
          ) : !signiture ? (
            <FxButton size="large" onPress={handleLinkPassword}>
              Link Password
            </FxButton>
          ) : (
            <>
              <FxButton
                size="large"
                marginVertical="16"
                onPress={handleConnectToBlox}
              >
                Connect to new Blox
              </FxButton>
              <FxButton
                size="large"
                variant="inverted"
                onPress={handleConnectToExistingBlox}
              >
                Reconnect to existing Blox
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
                Skip to manula setup
              </FxButton>
            </>
          )}
          {isConnected && (
            <FxButton
              variant="inverted"
              size="large"
              marginTop="8"
              onPress={disconnectWallet}
            >
              Disconnect wallet
            </FxButton>
          )}
        </FxBox>
      </FxBox>
    </FxSafeAreaBox>
  );
};
