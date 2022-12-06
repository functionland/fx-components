import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { useWalletConnect } from '@walletconnect/react-native-dapp';
import {
  FxBox,
  FxButton,
  FxProgressBar,
  FxSafeAreaBox,
  FxText,
} from '@functionland/component-library';
import { useInitialSetupNavigation } from '../../hooks/useTypedNavigation';
import { Routes } from '../../navigation/navigationConfig';
import { getWalletImage } from '../../utils/media';

export const ConnectToWalletScreen = () => {
  const navigation = useInitialSetupNavigation();
  const walletConnect = useWalletConnect();

  const handleWalletConnect = async () => {
    try {
      await walletConnect.connect();
    } catch (err) {
      console.log(err);
    }
  };

  const handleLinkPassword = () => {
    navigation.navigate(Routes.LinkPassword);
  };

  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxProgressBar progress={20} />

      <FxBox flex={1} justifyContent="space-between" paddingVertical="80">
        {walletConnect.connected ? (
          <WalletDetails />
        ) : (
          <FxText variant="h300" textAlign="center">
            Connect To Wallet
          </FxText>
        )}
        {walletConnect.connected ? (
          <FxButton size="large" onPress={handleLinkPassword}>
            Link Password
          </FxButton>
        ) : (
          <FxButton size="large" onPress={handleWalletConnect}>
            Connect to Wallet
          </FxButton>
        )}
      </FxBox>
    </FxSafeAreaBox>
  );
};

export const WalletDetails = () => {
  const walletConnect = useWalletConnect();

  const handleChangeWallet = async () => {
    try {
      await walletConnect.killSession();
      await walletConnect.connect();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <FxBox paddingVertical="24" alignItems="center">
      <Image
        source={
          walletConnect.peerMeta.name === 'MetaMask'
            ? getWalletImage(walletConnect.peerMeta.name)
            : { uri: walletConnect.peerMeta.icons[0] }
        }
        style={styles.image}
      />
      <FxText variant="body">
        Connected to {walletConnect.peerMeta.name} wallet
      </FxText>
      <FxText variant="bodySmallRegular">{walletConnect.accounts[0]}</FxText>
      <FxButton
        variant="inverted"
        paddingHorizontal="16"
        marginTop="16"
        onPress={handleChangeWallet}
      >
        Change Wallet
      </FxButton>
    </FxBox>
  );
};

const styles = StyleSheet.create({
  image: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    backgroundColor: 'transparent',
  },
});
