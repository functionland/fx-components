import React from 'react';
import { FxBox, FxButton, FxText } from '@functionland/component-library';
import { Image, ImageBackground, StyleSheet } from 'react-native';
// import { isEmulatorSync } from 'react-native-device-info';
import { useInitialSetupNavigation } from '../../hooks/useTypedNavigation';
import { useSettingsStore } from '../../stores';
import { Routes } from '../../navigation/navigationConfig';

export const WelcomeScreen = () => {
  const navigation = useInitialSetupNavigation();

  // const isConnectedToBox = useIsConnectedToBox();
  const { colorScheme } = useSettingsStore((store) => ({
    colorScheme: store.colorScheme,
  }));

  const onConnectToBox = () => {
    // if (isEmulatorSync()) {
    //   alert('Emulators cannot connect to the Box');
    //   return;
    // }
    // if (isConnectedToBox) {
    //   navigation.navigate(Routes.ConnectToWifi);
    // } else {
    //   navigation.navigate(Routes.ConnectToBlox);
    // }
    // if (walletConnect.connected) {
    //   navigation.navigate(Routes.FulaPassword);
    // } else {
    //   navigation.navigate(Routes.ConnectToWallet);
    // }
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
          Hello Functionlander!
        </FxText>
        <FxText
          fontFamily="Montserrat-Semibold"
          fontSize={36}
          lineHeight={48}
          textAlign="center"
          marginBottom="16"
          color={colorScheme === 'light' ? 'backgroundPrimary' : 'content1'}
        >
          Blox App
        </FxText>
        <FxText
          variant="bodySmallRegular"
          textAlign="center"
          marginBottom="16"
          color={colorScheme === 'light' ? 'backgroundPrimary' : 'content1'}
        >
          Start setting up your Blox in a few clicks by clicking on the button
          below
        </FxText>
        <FxButton
          marginBottom="8"
          testID="app-name"
          size="large"
          width="100%"
          onPress={onConnectToBox}
        >
          Setup my Blox
        </FxButton>
      </FxBox>
    );
  };

  return (
    <FxBox flex={1} justifyContent="flex-end">
      {colorScheme === 'light' ? (
        <ImageBackground
          source={require('../../../assets/images/welcome_bg_light.png')}
          style={styles.backgroundBlox}
        >
          {renderContent()}
        </ImageBackground>
      ) : (
        <>
          <FxBox flex={1} justifyContent="center" paddingTop="20">
            <Image
              source={require('../../../assets/images/blox_dark.png')}
              style={styles.blox}
              resizeMode="contain"
            />
          </FxBox>
          {renderContent()}
        </>
      )}
    </FxBox>
  );
};

const styles = StyleSheet.create({
  blox: {
    width: '100%',
  },
  backgroundBlox: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
});
