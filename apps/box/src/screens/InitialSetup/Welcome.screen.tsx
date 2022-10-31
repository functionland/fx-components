import React, { useState, useEffect } from 'react';
import { FxBox, FxButton, FxText } from '@functionland/component-library';
import {
  Image,
  ImageBackground,
  Platform,
  PermissionsAndroid,
  StyleSheet,
} from 'react-native';
// import { isEmulatorSync } from 'react-native-device-info';
import { useIsConnectedToBox } from '../../hooks/useIsConnectedToBox';
import { useInitialSetupNavigation } from '../../hooks/useTypedNavigation';
import { useSettingsStore } from '../../stores';
import { Routes } from '../../navigation/navigationConfig';

export const WelcomeScreen = () => {
  const navigation = useInitialSetupNavigation();
  const isAndroid = Platform.OS === 'android';
  const [hasLocationPermission, setHasLocationPermission] = useState(
    !isAndroid
  );
  const [hasCheckedLocationPermission, setHasCheckedLocationPermission] =
    useState(!isAndroid);
  const isConnectedToBox = useIsConnectedToBox();
  const { colorScheme } = useSettingsStore((store) => ({
    colorScheme: store.colorScheme,
  }));

  const onConnectToBox = () => {
    // if (isEmulatorSync()) {
    //   alert('Emulators cannot connect to the Box');
    //   return;
    // }
    if (hasLocationPermission) {
      if (isConnectedToBox) {
        navigation.navigate(Routes.ConnectToWifi);
      } else {
        navigation.navigate(Routes.ConnectToBlox);
      }
    } else {
      /**
       * @todo: Add Location Permission screen or dialogue for android
       */
      // navigation.navigate('Location Permission');
    }
  };

  useEffect(() => {
    if (isAndroid && !hasLocationPermission) {
      (async () => {
        const isGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        setHasLocationPermission(isGranted);
        setHasCheckedLocationPermission(true);
      })();
    }
  }, [isAndroid, hasLocationPermission]);

  const renderContent = () => {
    return (
      <FxBox paddingHorizontal="20" paddingVertical="40" alignItems="center">
        <FxText
          letterSpacing={2}
          variant="bodyXXSRegular"
          marginBottom="16"
          color={colorScheme === 'light' ? 'backgroundPrimary' : 'content1'}
        >
          WELCOME
        </FxText>
        <FxText
          fontFamily="Montserrat-Semibold"
          fontSize={36}
          lineHeight={48}
          textAlign="center"
          marginBottom="16"
          color={colorScheme === 'light' ? 'backgroundPrimary' : 'content1'}
        >
          Blox app setup
        </FxText>
        <FxText
          variant="bodySmallRegular"
          textAlign="center"
          marginBottom="16"
          color={colorScheme === 'light' ? 'backgroundPrimary' : 'content1'}
        >
          Et ex nam hic qui minima neque dolore sunt repellendus. Commodi
          explicabo qui.
        </FxText>
        <FxButton
          marginBottom="8"
          testID="app-name"
          size="large"
          width="100%"
          onPress={onConnectToBox}
          disabled={!hasCheckedLocationPermission}
        >
          Connect To Wallet
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
          <Image
            source={require('../../../assets/images/blox_dark.png')}
            style={styles.blox}
            resizeMode="contain"
          />
          {renderContent()}
        </>
      )}
    </FxBox>
  );
};

const styles = StyleSheet.create({
  blox: {
    width: '100%',
    marginBottom: 56,
  },
  backgroundBlox: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
});
