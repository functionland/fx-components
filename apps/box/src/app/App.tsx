import React, { useEffect } from 'react';
import { ThemeProvider } from '@shopify/restyle';
import {
  fxLightTheme,
  fxDarkTheme,
  ToastProvider,
  FxBox,
  FxText,
  FxPressableOpacity,
} from '@functionland/component-library';
import { RootNavigator } from '../navigation/Root.navigator';
import { WalletConnectProvider } from '@walletconnect/react-native-dapp/dist/providers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavContainer } from '../navigation/NavContainer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, Share, StatusBar, StyleSheet, UIManager } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSettingsStore } from '../stores';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import { firebase } from '@react-native-firebase/crashlytics';
import moment from 'moment';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const fullTheme = {
  light: fxLightTheme,
  dark: fxDarkTheme,
};

const barStyles = {
  light: 'dark-content',
  dark: 'light-content',
} as const;

export const App = () => {
  const mode = useSettingsStore().getMode();
  const theme = fullTheme[mode];
  const [loadAllCredentials] = useUserProfileStore((state) => [
    state.loadAllCredentials,
  ]);
  useEffect(() => {
    loadAllCredentials();
  }, [loadAllCredentials]);
  return (
    <ThemeProvider theme={theme}>
      <WalletConnectProvider
        redirectUrl={'yourappscheme://'}
        storageOptions={{
          // @ts-ignore
          asyncStorage: AsyncStorage,
        }}
      >
        <ToastProvider>
          <GestureHandlerRootView style={styles.flex1}>
            <StatusBar
              backgroundColor={theme.colors.backgroundApp}
              barStyle={barStyles[mode]}
            />
            <BottomSheetModalProvider>
              <SafeAreaProvider>
                <AppContent />
              </SafeAreaProvider>
            </BottomSheetModalProvider>
          </GestureHandlerRootView>
        </ToastProvider>
      </WalletConnectProvider>
    </ThemeProvider>
  );
};
const originalLog = console.log
const AppContent = () => {
  const [debugMode] = useUserProfileStore((state) => [
    state.debugMode
  ]);
  useEffect(() => {
    if (__DEV__) {
      if (debugMode || new Date(debugMode.endDate) >= new Date()) {
        firebase.crashlytics().setUserId(debugMode.uniqueId)
        console.log = (...data: any[]) => {
          // Send the log message to the Firebase Crashlytics service.
          firebase.crashlytics().log(JSON.stringify(data, null, 4));
        }
      } else {
        console.log = originalLog
      }
      console.error = (...data: any[]) => {
        // Send the error message to the Firebase Crashlytics service.
        //firebase.crashlytics().log(JSON.stringify(data, null, 4));
        // Record the error in the Firebase Crashlytics service.
        firebase.crashlytics().recordError(new Error(JSON.stringify(data, null, 4)));
      }
    }
  }, [debugMode])
  const shareUniqueId = () => {
    Share.share({
      message: debugMode.uniqueId
    }, {
      dialogTitle: 'Share your debug Id'
    })
  }
  return (
    <NavContainer>
      {debugMode && new Date(debugMode.endDate.toString()) > new Date() &&
        <FxPressableOpacity onPress={shareUniqueId} alignItems='center' backgroundColor='backgroundSecondary'>
          <FxText textAlign='center' color='warningBase'>Debug mode is enable {debugMode.uniqueId}</FxText>
        </FxPressableOpacity>}
      <RootNavigator />
    </NavContainer >
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
});

export default App;

