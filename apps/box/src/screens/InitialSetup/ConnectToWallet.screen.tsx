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
  ethereumChainId,
} from '../../utils/walletConnectConifg';

export const ConnectToWalletScreen = () => {
  const navigation = useInitialSetupNavigation();
  const [networkConfirmed, setNetworkConfirmed] = useState<boolean>(false);
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
    //Added a `setNetwork` here as we do not need to select chain here anymoe
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
    /*if (connected && chainId !== undefined && chainId !== selectedChainId && networkConfirmed) {
      setNetworkConfirmed(false);
      let err = 'chainId does not match the selected chain';
      console.log(err);
      logger.logError('chianId check', err);
      queueToast({
        title: 'Metamask chain error',
        message: err,
        type: 'error',
        autoHideDuration: 3000,
      });
      return;
    }*/
    if (connected && chainId) {
      setNetworkConfirmed(true);
    }
  }, [chainId, connected]);

  const handleNetwork = async () => {
    if (chainId !== selectedChainId) {
      try {
        await addChain(selectedChainId);
      } catch (e) {
        console.log('###################### chain could not be added. trying switch: ', e);
        try {
          await switchChain(selectedChainId);
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
          disconnectWallet();
          return;
        }
      }
    }
    setNetworkConfirmed(true);
  };

  const disconnectWallet = () => {
    setNetworkConfirmed(false);
    sdk?.terminate();
  };
  const handleLinkPassword = () => {
    provider?.request({
      method: 'wallet_requestPermissions ',
      params: [],
    }).then((res) => {
      console.log('handlelink wallet request');
      console.log(res);
      navigation.navigate(Routes.LinkPassword);
    }).catch((e) => {
      console.log(e);
      navigation.navigate(Routes.LinkPassword);
    });
    
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
        {provider && chainId && networkConfirmed ? (
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
            { chainId && !networkConfirmed && 
              (
              <FxBox>
                <FxText variant="h200" marginBottom="8">
                  Select network
                </FxText>
                <FxPicker
                  selectedValue={selectedChainId}
                  enabled={connected && !networkConfirmed}
                  onValueChange={(itemValue: string) =>
                    setSelectedChainId(itemValue)
                  }
                >
                  <FxPickerItem
                    key={1}
                    label="Ethereum Mainnet"
                    value={'0x1'}
                    enabled={true}
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
              )
            }
          </>
          
        )}
        <FxBox>
          {!networkConfirmed ? (
            <FxButton size="large" onPress={provider ? ( chainId ? handleNetwork : handleConnect ) : ()=>{} }>
              {provider ? (chainId ? 'Confirm' : 'Connect to Wallet' ) : <ActivityIndicator />}
            </FxButton>
          ) : (!signiture && chainId) ? (
            <FxButton size="large" onPress={provider ? handleLinkPassword: ()=>{}}>
              {provider ? 'Next' : <ActivityIndicator />}
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
