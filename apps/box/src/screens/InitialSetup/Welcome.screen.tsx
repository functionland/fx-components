import React, { useState, useEffect } from 'react';
import {
  FxSafeAreaBox,
  FxBox,
  FxButton,
  FxText,
} from '@functionland/component-library';
import { Platform, PermissionsAndroid } from 'react-native';
import { isEmulatorSync } from 'react-native-device-info';
import { useIsConnectedToBox } from '../../hooks/useIsConnectedToBox';
import { useInitialSetupNavigation } from '../../hooks/useTypedNavigation';
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

  const onConnectToBox = () => {
    if (isEmulatorSync()) {
      alert('Emulators cannot connect to the Box');
      return;
    }
    if (hasLocationPermission) {
      if (isConnectedToBox) {
        navigation.navigate(Routes.SetupWifi);
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

  return (
    <FxSafeAreaBox flex={1} justifyContent="flex-end">
      <FxBox paddingHorizontal="20" paddingVertical="16" alignItems="center">
        <FxText
          letterSpacing={2}
          variant="bodyXXSRegular"
          marginBottom="16"
          color="content1"
        >
          WELCOME
        </FxText>
        <FxText
          fontFamily="Montserrat-Semibold"
          fontSize={36}
          lineHeight={48}
          textAlign="center"
          marginBottom="16"
        >
          Blox app setup
        </FxText>
        <FxText
          variant="bodySmallRegular"
          textAlign="center"
          marginBottom="16"
          color="content1"
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
    </FxSafeAreaBox>
  );
};
