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
import { Alert } from 'react-native';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { Routes } from '../../navigation/navigationConfig';
import { useLogger, useRootNavigation } from '../../hooks';
import { useWalletConnect } from '@walletconnect/react-native-dapp';

export const SettingsScreen = () => {
  const [reset] = useUserProfileStore((state) => [
    state.reset
  ]);
  const rootNavigation = useRootNavigation();
  const walletConnect = useWalletConnect();
  const { logError } = useLogger()
  const handleLogout = () => {
    Alert.alert('Log Out!', 'Are you sure want to log out?\r\nThe local app data will be removed!',
      [{
        text: 'Yes',
        style: 'destructive',
        onPress: () => {
          try {
            reset()
            walletConnect.killSession()
            rootNavigation.reset({
              index: 0,
              routes: [{ name: Routes.InitialSetup }],
            });
          } catch (error) {
            logError('handleLogout',error)
          }
        }
      }, {
        text: 'No',
        style: 'cancel'
      }
      ])
  }
  return (
    <FxSafeAreaBox flex={1} edges={['top']}>
      <FxBox paddingHorizontal="20" paddingVertical="12">
        <HeaderText>Settings</HeaderText>
        <SettingsMenu />
        <FxHorizontalRule marginVertical="16" />
        <FxButton size={'large'} onPress={handleLogout}>{'Log out'}</FxButton>
        <Version marginTop="16" />
      </FxBox>
    </FxSafeAreaBox>
  );
};
