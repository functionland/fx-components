import React, { useEffect, useRef } from 'react';
import '../i18n';

import { ThemeProvider } from '@shopify/restyle';
import {
  fxLightTheme,
  fxDarkTheme,
  ToastProvider,
  FxText,
  FxPressableOpacity,
} from '@functionland/component-library';
import { RootNavigator } from '../navigation/Root.navigator';
import { NavContainer } from '../navigation/NavContainer';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  AppState,
  Platform,
  Share,
  StatusBar,
  StyleSheet,
  UIManager,
} from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorMode, useSettingsStore } from '../stores';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import { useLogger } from '../hooks';
import { copyToClipboard } from '../utils/clipboard';
import { fula } from '@functionland/react-native-fula';
import { AppKitProvider, AppKit } from '@reown/appkit-react-native';
import { appKit } from '../config/appKitConfig';

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
  const mode = useColorMode();
  const theme = fullTheme[mode];
  const loadAllCredentials = useUserProfileStore(
    (state) => state.loadAllCredentials
  );

  useEffect(() => {
    loadAllCredentials();
  }, [loadAllCredentials]);
  return (
    <GestureHandlerRootView style={styles.flex1}>
      <SafeAreaProvider>
        <AppKitProvider instance={appKit}>
          <ThemeProvider theme={theme}>
            <ToastProvider>
              <StatusBar
                backgroundColor={theme.colors.backgroundApp}
                barStyle={barStyles[mode]}
              />
              <BottomSheetModalProvider>
                <AppContent />
              </BottomSheetModalProvider>
            </ToastProvider>
          </ThemeProvider>
          <AppKit />
        </AppKitProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};
const AppContent = () => {
  const appState = useRef(AppState.currentState);
  const debugMode = useSettingsStore((state) => state.debugMode);
  const { isDebugModeEnable } = useLogger();

  useEffect(() => {
    if (!__DEV__) {
      console.log = () => null;
      //console.error = () => null
    }
    fula
      .registerLifecycleListener()
      .then(() => console.log('Lifecycle listener registered'))
      .catch((error) =>
        console.error('Failed to register lifecycle listener', error)
      );
  }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log(
        'AppState.addEventListener',
        isDebugModeEnable,
        nextAppState,
        appState.current
      );
      if (!nextAppState.match(/active/)) {
        console.log('App has come to the inactive/background!', debugMode);
      }
      appState.current = nextAppState;
    });

    return () => {
      console.log('subscription.remove();');
      subscription.remove();
    };
  }, [isDebugModeEnable]);
  const shareUniqueId = () => {
    Share.share(
      {
        message: debugMode.uniqueId,
      },
      {
        dialogTitle: 'Share your debug Id',
      }
    );
  };
  const onCopy = (value: string) => {
    copyToClipboard(value);
  };
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to crash reporting service in production
        console.error('App Error Boundary:', error, errorInfo);
      }}
    >
      <NavContainer>
        {isDebugModeEnable && (
          <FxPressableOpacity
            onPress={shareUniqueId}
            alignItems="center"
            backgroundColor="backgroundSecondary"
          >
            <FxText textAlign="center" color="warningBase">
              Debug mode is enable {debugMode.uniqueId}
            </FxText>
          </FxPressableOpacity>
        )}
        <RootNavigator />
      </NavContainer>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
});

export default App;
