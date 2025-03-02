import React from 'react';
import {
  FxBox,
  FxButton,
  FxProgressBar,
  FxSafeAreaBox,
  FxText,
  FxDropdown, // Add this for language selector
} from '@functionland/component-library';
import { useInitialSetupNavigation } from '../../hooks/useTypedNavigation';
import { Routes } from '../../navigation/navigationConfig';
import notifee from '@notifee/react-native';
import { useTranslation } from 'react-i18next'; // Import this
import { StyleSheet, View } from 'react-native'; // Import for styling

export const ConnectToWalletScreen = () => {
  const navigation = useInitialSetupNavigation();
  const { t, i18n } = useTranslation(); // Add this hook

  // Language options for dropdown
  const languageOptions = [
    { label: 'English', value: 'en' },
    { label: '中文', value: 'zh' }
  ];

  // Handle language change
  const handleLanguageChange = (language: 'en' | 'zh') => {
    i18n.changeLanguage(language);
  };

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
            {t('connectToWallet.title')}
          </FxText>          
          <FxText>
            {t('connectToWallet.description')}
          </FxText>
          <FxButton
            size="large"
            onPress={allowNotifications}
          >
            {t('connectToWallet.allowButton')}
          </FxButton>
        </FxBox>
    </FxSafeAreaBox>
  );
};