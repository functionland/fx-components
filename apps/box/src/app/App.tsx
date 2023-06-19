import React, { useEffect, useRef } from 'react';
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
import { NavContainer } from '../navigation/NavContainer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppState, Platform, Share, StatusBar, StyleSheet, UIManager } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSettingsStore } from '../stores';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import { firebase } from '@react-native-firebase/crashlytics';
import moment from 'moment';
import { useLogger } from '../hooks';

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
        <ToastProvider>
          <GestureHandlerRootView style={styles.flex1}>
            <StatusBar
              backgroundColor={theme.colors.backgroundApp}
              barStyle={barStyles[mode]}
            />
            <SafeAreaProvider>
              <BottomSheetModalProvider>
                <AppContent />
              </BottomSheetModalProvider>
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </ToastProvider>
    </ThemeProvider>
  );
};
const AppContent = () => {
  const appState = useRef(AppState.currentState);
  const [debugMode] = useSettingsStore((state) => [
    state.debugMode,
  ]);
  const { isDebugModeEnable } = useLogger()
  useEffect(() => {
    if (!__DEV__) {
      console.log = () => null
      //console.error = () => null
    }
  }, [])
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      console.log('AppState.addEventListener', isDebugModeEnable, nextAppState, appState.current)
      if (
        !nextAppState.match(/active/)
      ) {
        console.log('App has come to the inactive/background!', debugMode);
        if (!__DEV__ && isDebugModeEnable) {
          firebase.crashlytics().setUserId(debugMode.uniqueId)
          firebase.crashlytics().recordError(new Error('On App Close Error Log'), "Self Generated Error")
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      console.log('subscription.remove();')
      subscription.remove();
    };
    // return () => {
    //   if (!__DEV__ && isDebugModeEnable) {
    //     firebase.crashlytics().recordError(new Error('On App Close Error Log'))
    //   }
    // }
  }, [isDebugModeEnable])
  const shareUniqueId = () => {
    Share.share({
      message: debugMode.uniqueId
    }, {
      dialogTitle: 'Share your debug Id'
    })
  }
  return (
    <NavContainer>
      {isDebugModeEnable &&
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

