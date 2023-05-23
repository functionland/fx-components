import React, { useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import { useWalletConnect, withWalletConnect } from '@walletconnect/react-native-dapp';
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
import { getWalletImage } from '../../utils/media';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { Helper } from '../../utils';
import { WalletDetails } from '../../components/WalletDetails';
import shallow from 'zustand/shallow';
import { useLogger } from '../../hooks';

export const ConnectToWalletScreen = () => {
  const navigation = useInitialSetupNavigation();
  const walletConnect = useWalletConnect();
  const [selectedChainId, setSelectedChainId] = useState(1);// defualt is Etherum
  const { queueToast } = useToast();
  const [networkConfirmed, setNetwordConfirmed] = useState(false)
  const [walletId, signiture, password, setWalletId] = useUserProfileStore(
    (state) => [
      state.walletId,
      state.signiture,
      state.password,
      state.setWalletId,
    ],
    shallow
  );
  const logger = useLogger()

  useEffect(() => {
    if (!walletConnect.connected)
      return;
    switch (walletConnect.chainId) {
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
        walletConnect.killSession()
        queueToast({
          title: 'Invalid network',
          message: 'The network you have chosen is invalid',
          type: 'error',
          autoHideDuration: 6000,
        });
        return;
    }
    if (walletConnect.accounts[0] !== walletId) {
      setWalletId(walletConnect.accounts[0], true);
    }
  }, [walletConnect.connected])
  const handleWalletConnect = async () => {
    try {
      if (walletConnect.connected)
        await walletConnect.killSession()
      const wallet = await walletConnect.connect(
        {
          chainId: selectedChainId
        }
      );
    } catch (err) {
      console.log(err);
      logger.logError('handleWalletConnect', err)
      queueToast({
        title: 'WalletConnect Error',
        message: err.toString(),
        type: 'error',
        autoHideDuration: 3000,
      });
    }
  };

  const handleLinkPassword = () => {
    navigation.navigate(Routes.LinkPassword);
  };

  const handleConnectToBlox = () => {
    navigation.navigate(Routes.ConnectToBlox);
  };
  const handleConnectToExistingBlox = () => {
    navigation.navigate(Routes.ConnectToExistingBlox);
  }
  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxProgressBar progress={20} />

      <FxBox flex={1} justifyContent="space-between" paddingVertical="80">
        {walletConnect.connected && networkConfirmed ? (
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
              <FxText variant="h200" marginBottom='8'>Select nerwork</FxText>
              <FxPicker selectedValue={selectedChainId}
                onValueChange={(itemValue: number) => setSelectedChainId(itemValue)}>
                <FxPickerItem key={1} label='Ethereum Mainnet' value={1} />
                <FxPickerItem key={5} label='Goerli Ethereum Testnet' value={5} />
                <FxPickerItem key={137} label='Polygon Mainnet' value={137} />
                <FxPickerItem key={80001} label='Mumbai Polygon Testnet' value={137} />
              </FxPicker>

            </FxBox>

          </>
        )}

        {!walletConnect.connected ? (
          <FxButton size="large" onPress={handleWalletConnect}>
            Connect to Wallet
          </FxButton>
        ) : !signiture ? (
          <FxButton size="large" onPress={handleLinkPassword}>
            Link Password
          </FxButton>
        ) : (
          <FxBox>
            <FxButton size="large" variant='inverted' onPress={handleConnectToExistingBlox}>
              Reconnect to existing blox
            </FxButton>
            <FxButton size="large" marginTop='16' onPress={handleConnectToBlox}>
              Connect to new blox
            </FxButton>
          </FxBox>
        )}
      </FxBox>
    </FxSafeAreaBox>
  );
};


