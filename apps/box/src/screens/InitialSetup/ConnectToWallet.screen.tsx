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
import { Helper } from '../../utils';
import { WalletDetails } from '../../components/WalletDetails';
import { useSDK } from '@metamask/sdk-react';
import { shallow } from 'zustand/shallow';
import { useLogger } from '../../hooks';
import {
  chains,
  goerliChainId,
  mumbaiChainId,
} from '../../utils/walletConnectConifg';

export const ConnectToWalletScreen = () => {
  const navigation = useInitialSetupNavigation();
  const [networkConfirmed, setNetwordConfirmed] = useState<boolean>(false);
  const [selectedChainId, setSelectedChainId] = useState<string>(mumbaiChainId); // Mumbai Polygon Testnet
  const { queueToast } = useToast();
  const { account, chainId, provider, sdk, connected } = useSDK();

  const [walletId, signiture, password, setWalletId] = useUserProfileStore(
    (state) => [
      state.walletId,
      state.signiture,
      state.password,
      state.setWalletId,
    ],
    shallow
  );

  const switchChain = async (_chainId: string) => {
    return await provider?.request({
      method: 'wallet_switchEthereumChain',
      params: [
        {
          chainId: _chainId,
        },
      ],
    });
  };

  const addChain = async (_chainId: string) => {
    return await provider?.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          ...chains[_chainId],
        },
      ],
    });
  };

  const logger = useLogger();
  useEffect(() => {
    console.log('provider', provider);
    if (!provider || !account) return;
    if (account !== walletId) {
      setWalletId(account, true);
    }
  }, [provider, account]);

  const handleConnect = async () => {
    try {
      await sdk?.connect();
    } catch (err) {
      console.log(err);
      logger.logError('handleConnect', err);
      queueToast({
        title: 'Metamask linking error',
        message: err.toString(),
        type: 'error',
        autoHideDuration: 3000,
      });
      disconnectWallet();
    }
  };

  useEffect(() => {
    if (chainId === undefined || networkConfirmed) {
      return;
    }
    if (!connected || chainId === undefined) {
      setNetwordConfirmed(false);
      return;
    }
    handleNetwork();
  }, [chainId]);

  const handleNetwork = async () => {
    if (chainId !== selectedChainId) {
      try {
        await switchChain(selectedChainId);
      } catch (e) {
        console.log('###################### chain not found, try adding: ', e);

        try {
          await addChain(selectedChainId);
          // eslint-disable-next-line no-catch-shadow
        } catch (e) {
          console.log(e);
          logger.logError('handleNetwork, add chain', e);
          queueToast({
            title: 'Error adding chain to MetaMask',
            message: JSON.stringify(e.toString()),
            type: 'error',
            autoHideDuration: 3000,
          });
          return;
        }
        try {
          await switchChain(selectedChainId);
          // eslint-disable-next-line no-catch-shadow
        } catch (e) {
          console.log(e);
          logger.logError('handleNetwork, switch chain', e);
          queueToast({
            title: 'Error switching chain to MetaMask',
            message: e.toString(),
            type: 'error',
            autoHideDuration: 3000,
          });
        }
      }
      return;
    }

    setNetwordConfirmed(true);
  };

  const disconnectWallet = () => {
    setNetwordConfirmed(false);
    sdk?.terminate();
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
        {provider && connected ? (
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
                enabled={!connected}
                onValueChange={(itemValue: string) =>
                  setSelectedChainId(itemValue)
                }
              >
                <FxPickerItem
                  key={1}
                  label="Ethereum Mainnet"
                  value={'0x1'}
                  enabled={false}
                />
                <FxPickerItem
                  key={5}
                  label="Goerli Ethereum Testnet"
                  value={goerliChainId}
                />
                <FxPickerItem
                  key={137}
                  label="Polygon Mainnet"
                  value={'0x89'}
                  enabled={false}
                />
                <FxPickerItem
                  key={80001}
                  label="Mumbai Polygon Testnet (Preferred)"
                  value={mumbaiChainId}
                />
              </FxPicker>
            </FxBox>
          </>
        )}
        <FxBox>
          {!connected ? (
            <FxButton size="large" onPress={handleConnect}>
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
          {provider && connected && (
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
