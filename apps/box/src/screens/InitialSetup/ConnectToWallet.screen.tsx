import React from 'react';
import {
  FxBox,
  FxButton,
  FxProgressBar,
  FxSafeAreaBox,
  FxText,
} from '@functionland/component-library';
import { useInitialSetupNavigation } from '../../hooks/useTypedNavigation';
import { Routes } from '../../navigation/navigationConfig';
import notifee from '@notifee/react-native';

export const ConnectToWalletScreen = () => {
  const navigation = useInitialSetupNavigation();

  const allowNotifications = async () => {
    await notifee.requestPermission();
    notifee.registerForegroundService(async () => {});
    await notifee.createChannel({
      id: 'sticky',
      name: 'Sticky Channel'
    })
    await notifee.displayNotification({
    id: 'wallet',
      title: 'warmup',
      body: 'warmup',
      android: {
        progress: {
          indeterminate: true
        },
        pressAction: {
          id: 'default'
        },
        ongoing: true,
        asForegroundService: true,
        channelId: 'sticky'
      }
    })
    notifee.stopForegroundService();
    navigation.navigate(Routes.LinkPassword);
  }

  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxProgressBar progress={20} />
        <FxBox flex={1} justifyContent="space-between" paddingVertical="80">
          <FxText variant="h300" textAlign="center">
            Connect To Wallet
          </FxText>          
          <FxText>App needs notification permission to connect your wallet and perform data sync. Tap allow in the next prompt.</FxText>
          <FxButton
            size="large"
            onPress={allowNotifications}
          >
            Allow Notifications            
          </FxButton>
        </FxBox>
    </FxSafeAreaBox>
  );
};
