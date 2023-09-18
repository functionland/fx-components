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
import { Helper } from '../../utils';
import { WalletDetails } from '../../components/WalletDetails';
import shallow from 'zustand/shallow';
import { useLogger } from '../../hooks';
import { useWalletConnectModal } from '@walletconnect/modal-react-native';
import { ethers } from 'ethers';

export const ConnectToWalletScreen = () => {
  const navigation = useInitialSetupNavigation();
  const { isConnected, provider, open, address } = useWalletConnectModal();
  const [selectedChainId, setSelectedChainId] = useState(80001); // Mumbai Polygon Testnet
  const { queueToast } = useToast();
  const [networkConfirmed, setNetwordConfirmed] = useState(false);
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
    if (isConnected) checkChainId();
  }, [isConnected, provider, address]);
  const checkChainId = async () => {
    if (!isConnected || !provider || !address) return;
    const ethersProvider = new ethers.providers.Web3Provider(provider);
    const network = await ethersProvider.getNetwork();
    const chainId = network.chainId;
    setSelectedChainId(chainId);
    console.log('Connected chainId:', chainId);
    switch (chainId) {
      case 1:
        // Ethereum Mainnet
        break;
      case 137:
        // polygon
        break;
      case 5:
        // Goerli Testnet
        break;
      case 80001:
        // Mumbai Testnet
        break;
      default:
        // Unknown network
        //walletConnect.killSession();
        queueToast({
          title: 'Invalid network',
          message: 'The network you have chosen is invalid',
          type: 'error',
          autoHideDuration: 6000,
        });
        return;
    }
    //setNetwordConfirmed(true);
    if (address !== walletId) {
      setWalletId(address, true);
    }
  };
  const handleWalletConnect = async () => {
    try {
      if (provider) {
        // provider.setDefaultChain(`eip155:${selectedChainId}`);
        //provider.abortPairingAttempt();
        //await provider.client.disconnect;
        //await provider.cleanupPendingPairings();
      }
      open({ route: 'ConnectWallet' });
      // if (walletConnect.connected) await walletConnect.killSession();
      // const wallet = await walletConnect.connect({
      //   chainId: selectedChainId,
      // });
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
  const disconnectWallet = async () => {
    await provider?.disconnect();
    await open({ route: 'ConnectWallet' });
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
        {isConnected && networkConfirmed ? (
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
          <>
            <FxText variant="h300" textAlign="center">
              Connect To Wallet
            </FxText>
            <FxBox>
              <FxText variant="h200" marginBottom="8">
                Select network
              </FxText>
              <FxPicker
                selectedValue={selectedChainId}
                onValueChange={(itemValue: number) =>
                  setSelectedChainId(itemValue)
                }
              >
                <FxPickerItem
                  key={1}
                  label="Ethereum Mainnet"
                  value={1}
                  enabled={false}
                />
                <FxPickerItem
                  key={5}
                  label="Goerli Ethereum Testnet"
                  value={5}
                />
                <FxPickerItem
                  key={137}
                  label="Polygon Mainnet"
                  value={137}
                  enabled={false}
                />
                <FxPickerItem
                  key={80001}
                  label="Mumbai Polygon Testnet"
                  value={80001}
                />
              </FxPicker>
            </FxBox>
          </>
        )}
        <FxBox>
          {!isConnected ? (
            <FxButton
              size="large"
              onPress={provider ? handleWalletConnect : null}
            >
              {provider ? 'Connect to Wallet' : <ActivityIndicator />}
            </FxButton>
          ) : !signiture ? (
            <FxButton size="large" onPress={handleLinkPassword}>
              {provider ? 'Link Password' : <ActivityIndicator />}
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
                Skip to manual setup
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
