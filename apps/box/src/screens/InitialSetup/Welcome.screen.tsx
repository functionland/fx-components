import React, { useEffect } from 'react';
import { FxBox, FxButton, FxPressableOpacity, FxText } from '@functionland/component-library';
import { Image, ImageBackground, StyleSheet, Linking } from 'react-native';
import { useInitialSetupNavigation } from '../../hooks/useTypedNavigation';
import { useSettingsStore } from '../../stores';
import { Routes } from '../../navigation/navigationConfig';
import { useLogger } from '../../hooks';
import Version from '../../components/Version';
import { useTranslation } from 'react-i18next'; 
import LanguageSelector from '../../components/LanguageSelector';

export const WelcomeScreen = () => {
  const navigation = useInitialSetupNavigation();
  const { t } = useTranslation();

  const { toggleDebugMode } = useLogger()
  const { colorScheme } = useSettingsStore((store) => ({
    colorScheme: store.colorScheme,
  }));


  const handleToggleDebugMode = () => {
    toggleDebugMode()
  }

  const onConnectToBox = () => {
    navigation.navigate(Routes.ConnectToWallet);
  };

  const renderContent = () => {
    return (
      <FxBox paddingHorizontal="20" paddingVertical="40" alignItems="center">
        <FxText
          letterSpacing={2}
          variant="bodyXXSRegular"
          marginBottom="16"
          color={colorScheme === 'light' ? 'backgroundPrimary' : 'content1'}
        >
          {t('welcome.title')}
        </FxText>

        <FxText
          fontFamily="Montserrat-Semibold"
          fontSize={36}
          lineHeight={48}
          textAlign="center"
          marginBottom="4"
          color={colorScheme === 'light' ? 'backgroundPrimary' : 'content1'}
        >
          {t('welcome.appTitle')}
        </FxText>
        <Version marginBottom='16'/>

        <FxText
          variant="bodySmallRegular"
          textAlign="center"
          marginBottom="16"
          color={colorScheme === 'light' ? 'backgroundPrimary' : 'content1'}
        >
          {t('welcome.disclaimer')}
        </FxText>
        <FxButton
          marginBottom="8"
          testID="app-name"
          size="large"
          width="100%"
          onPress={() => Linking.openURL('https://fx.land/terms')}
        >
          {t('welcome.termsButton')}
        </FxButton>
        <FxButton
          marginBottom="8"
          testID="app-name"
          size="large"
          width="100%"
          onPress={onConnectToBox}
        >
          {t('welcome.setupButton')}
        </FxButton>
      </FxBox>
    );
  };

  return (
    <FxBox flex={1} justifyContent="flex-end" >
      {/* Custom Language Selector in top right corner */}
      <LanguageSelector 
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          zIndex: 10, 
          width: 100, 
          borderRadius: 8, 
          padding: 4,
        }}
      />
      <FxPressableOpacity
        delayLongPress={3000}
        onLongPress={handleToggleDebugMode}
        flex={1}
        style={{
          opacity: 1
        }}
      >
        {colorScheme === 'light' ? (
          <ImageBackground
            source={require('../../../assets/images/welcome_bg_light.png')}
            style={{
              width: '100%',
              height: '100%',
              justifyContent: 'flex-end',
            }}

          >
            {renderContent()}
          </ImageBackground>
        ) : (
          <>
            <FxBox flex={1} justifyContent="center" paddingTop="20">
              <Image
                source={require('../../../assets/images/blox_dark.png')}
                style={{
                  width: '100%',
                }}
                resizeMode="contain"
              />
            </FxBox>
            {renderContent()}
          </>
        )}
      </FxPressableOpacity>
    </FxBox>
  );
};
