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
import { useAccount, useNetwork, useSwitchNetwork } from 'wagmi';
import { mainnet, polygon, goerli, polygonMumbai } from 'viem/chains';
import { useWeb3Modal } from '@web3modal/wagmi-react-native';
import { Helper } from '../../utils';
import { WalletDetails } from '../../components/WalletDetails';
import shallow from 'zustand/shallow';
import { useLogger } from '../../hooks';

export const ConnectToWalletScreen = () => {
  const navigation = useInitialSetupNavigation();

  const { queueToast } = useToast();
  const [ networkConfirmed, setNetwordConfirmed ] = useState(false)
  //FIXME: =>
  const [ provider, setProvider ] = useState(true)
  const [selectedChainId, setSelectedChainId] = useState(80001); // Mumbai Polygon Testnet
  const { chain } = useNetwork()
  const { chains, error, isLoading, pendingChainId, switchNetwork } =
    useSwitchNetwork()
  const { open, close } = useWeb3Modal()
  const { address, isConnecting, isConnected, isDisconnected } = useAccount()
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
    if (!isConnected || !address) return;

    //TODO: is this a desired behaviour?
    if (chain === undefined) return;
    setSelectedChainId(chain.id);
    console.log('Connected chainId:', chain.id);
  
    switch (chain) {
      case mainnet:
        // Ethereum Mainnet
        break;
      case polygon:
        // polygon
        break;
      case goerli:
        // Goerli Testnet
        break;
      case polygonMumbai:
        // Mumbai Testnet
        break;
      default:
        // Unknown network
        close()
        queueToast({
          title: 'Invalid network',
          message: 'The network you have chosen is invalid',
          type: 'error',
          autoHideDuration: 6000,
        });
        return;
    }
    if (address !== walletId) {
      setWalletId(address, true);
    }
  };
  const handleWalletConnect = async () => {
    try {
      open();
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
    close();
    open();
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
                Select network {isLoading && ' (switching)'}
              </FxText>
              <FxPicker
                selectedValue={selectedChainId}
                enabled={!isLoading}
                onValueChange={(itemValue: number) =>
                  switchNetwork?.(itemValue)
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
