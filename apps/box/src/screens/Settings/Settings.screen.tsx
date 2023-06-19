import {
  FxBox,
  FxButton,
  FxHorizontalRule,
  FxSafeAreaBox,
} from '@functionland/component-library';

import React from 'react';
import { SettingsMenu } from '../../components/SettingsList';
import { HeaderText } from '../../components/Text';
import Version from '../../components/Version';
import { ActivityIndicator, Alert } from 'react-native';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { Routes } from '../../navigation/navigationConfig';
import { useLogger, useRootNavigation } from '../../hooks';
import { useWeb3Modal } from '@web3modal/react-native';

export const SettingsScreen = () => {
  const [reset] = useUserProfileStore((state) => [state.reset]);
  const { isConnected, provider } = useWeb3Modal();
  const rootNavigation = useRootNavigation();
  const { logError } = useLogger();
  const handleLogout = () => {
    Alert.alert(
      'Log Out!',
      'Are you sure want to log out?\r\nThe local app data will remove!',
      [
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              if (provider.close) {
                // If the cached provider is not cleared,
                // WalletConnect will default to the existing session
                // and does not allow to re-scan the QR code with a new wallet.
                // Depending on your use case you may want or want not his behavir.
                await provider.disconnect();
                await provider.close();
                reset();
                rootNavigation.reset({
                  index: 0,
                  routes: [{ name: Routes.InitialSetup }],
                });
              }
            } catch (error) {
              logError('handleLogout', error);
            }
          },
        },
        {
          text: 'No',
          style: 'cancel',
        },
      ]
    );
  };
  return (
    <FxSafeAreaBox flex={1} edges={['top']}>
      <FxBox paddingHorizontal="20" paddingVertical="12">
        <HeaderText>Settings</HeaderText>
        <SettingsMenu />
        <FxHorizontalRule marginVertical="16" />
        <FxButton
          size={'large'}
          onPress={provider && isConnected ? handleLogout : null}
        >
          {provider ? 'Log out' : <ActivityIndicator />}
        </FxButton>
        <Version marginTop="16" />
      </FxBox>
    </FxSafeAreaBox>
  );
};
