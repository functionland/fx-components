import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { useWalletConnect } from '@walletconnect/react-native-dapp';
import {
  FxBox,
  FxButton,
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

export const ConnectToWalletScreen = () => {
  const navigation = useInitialSetupNavigation();
  const walletConnect = useWalletConnect();
  const { queueToast } = useToast();
  const [walletId, signiture, password, setWalletId] = useUserProfileStore(
    (state) => [
      state.walletId,
      state.signiture,
      state.password,
      state.setWalletId,
    ]
  );
  const handleWalletConnect = async () => {
    try {
      const wallet = await walletConnect.connect();
      if (wallet.accounts[0] !== walletId) {
        setWalletId(wallet.accounts[0], true);
      }
    } catch (err) {
      console.log(err);
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

  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxProgressBar progress={20} />

      <FxBox flex={1} justifyContent="space-between" paddingVertical="80">
        {walletConnect.connected ? (
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
        {!walletConnect.connected ? (
          <FxButton size="large" onPress={handleWalletConnect}>
            Connect to Wallet
          </FxButton>
        ) : !signiture ? (
          <FxButton size="large" onPress={handleLinkPassword}>
            Link Password
          </FxButton>
        ) : (
          <FxButton size="large" onPress={handleConnectToBlox}>
            Connect to blox
          </FxButton>
        )}
      </FxBox>
    </FxSafeAreaBox>
  );
};


