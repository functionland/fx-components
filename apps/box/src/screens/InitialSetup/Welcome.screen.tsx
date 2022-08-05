import { FxBox, FxButton, FxText } from '@functionland/component-library';
import React, { useState, useEffect } from 'react';
import {
  Platform,
  PermissionsAndroid,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { isEmulatorSync } from 'react-native-device-info';
import { useIsConnectedToBox } from '../../hooks/useIsConnectedToBox';
import {
  useInitialSetupNavigation,
  useRootNavigation,
} from '../../hooks/useTypedNavigation';
import { Blox } from '../../components';

export const WelcomeScreen = () => {
  const navigation = useInitialSetupNavigation();
  const rootNavigation = useRootNavigation();
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
        navigation.navigate('Setup Wifi');
      } else {
        navigation.navigate('Connect To Box');
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
    <SafeAreaView style={styles.flex1}>
      <FxText padding="16" textAlign="center" variant="body">
        Box Setup Up
      </FxText>
      <Blox />
      <FxBox padding="20">
        <FxButton
          marginBottom="8"
          size="large"
          testID="app-name"
          onPress={() => navigation.navigate('Wallet Connect')}
        >
          Setup Wallet
        </FxButton>
        <FxButton
          marginBottom="8"
          testID="app-name"
          size="large"
          onPress={onConnectToBox}
          disabled={!hasCheckedLocationPermission}
        >
          Connect To Box
        </FxButton>
        <FxButton
          size="large"
          onPress={() =>
            rootNavigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })
          }
        >
          Setup Complete
        </FxButton>
      </FxBox>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
});
