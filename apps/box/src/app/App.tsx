import React, { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MetaMaskProvider,
  SDKConfigProvider,
  useSDKConfig,
} from '@metamask/sdk-react';
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
import { useSettingsStore } from '../stores';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import { useLogger } from '../hooks';
import { COMM_SERVER_URL, INFURA_API_KEY } from '../utils/walletConnectConifg';
import { copyToClipboard } from '../utils/clipboard';
import { fula } from '@functionland/react-native-fula';
import { Linking } from 'react-native';
import BackgroundTimer from 'react-native-background-timer';

// TODO how to properly make sure we only try to open link when the app is active?
// current problem is that sdk declaration is outside of the react scope so I cannot directly verify the state
// hence usage of a global variable.
const canOpenLink = true;

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

const openDeeplink = async (link: string, _target?: string) => {
  console.debug(`App::openDeepLink() ${link}`);
  if (canOpenLink) {
    try {
      if (Platform.OS === 'android') {
        // On Android, canOpenURL may return false even when app is installed
        // due to security restrictions, so try opening directly first
        console.debug(`App::openDeepLink() Android: Attempting to open directly`);
        await Linking.openURL(link);
        console.debug(`App::openDeepLink() Android: Successfully opened: ${link}`);
      } else {
        // iOS: Check if the URL can be opened (app is installed)
        const canOpen = await Linking.canOpenURL(link);
        console.debug(`App::openDeepLink() iOS canOpen: ${canOpen}`);
        
        if (canOpen) {
          await Linking.openURL(link);
          console.debug(`App::openDeepLink() iOS: Successfully opened: ${link}`);
        } else {
          console.warn(`App::openDeepLink() iOS: Cannot open URL: ${link}`);
          
          // If it's a MetaMask deep link and can't be opened, try the universal link or App Store
          if (link.startsWith('metamask://')) {
            const universalLink = link.replace('metamask://', 'https://metamask.app.link/');
            console.debug(`App::openDeepLink() iOS: Trying universal link: ${universalLink}`);
            
            const canOpenUniversal = await Linking.canOpenURL(universalLink);
            if (canOpenUniversal) {
              await Linking.openURL(universalLink);
            } else {
              // Fallback to App Store
              console.debug(`App::openDeepLink() iOS: Opening App Store for MetaMask`);
              await Linking.openURL('https://apps.apple.com/app/metamask/id1438144202');
            }
          }
        }
      }
    } catch (error) {
      console.error(`App::openDeepLink() Error opening URL: ${link}`, error);
      
      // Only on Android, if direct opening fails, try fallback to Play Store
      if (Platform.OS === 'android' && link.startsWith('metamask://')) {
        console.debug(`App::openDeepLink() Android: Opening Play Store for MetaMask`);
        try {
          await Linking.openURL('https://play.google.com/store/apps/details?id=io.metamask');
        } catch (fallbackError) {
          console.error(`App::openDeepLink() Android: Fallback also failed`, fallbackError);
        }
      }
    }
  } else {
    console.debug(
      'useBlockchainProiver::openDeepLink app is not active - skip link',
      link
    );
  }
};

const WithSDKConfig = ({ children }: { children: React.ReactNode }) => {
  const {
    socketServer,
    infuraAPIKey,
    useDeeplink,
    debug,
    checkInstallationImmediately,
  } = useSDKConfig();

  return (
    <MetaMaskProvider
      // debug={debug}
      sdkOptions={{
        // communicationServerUrl: socketServer,
        // TODO: change to enableAnalytics when updating the SDK version
        // enableDebug: true,
        infuraAPIKey,
        readonlyRPCMap: {
          '0x539': process.env.NEXT_PUBLIC_PROVIDER_RPCURL ?? '',
        },
        logging: {
          developerMode: true,
          plaintext: true,
        },
        openDeeplink: openDeeplink,
        timer: BackgroundTimer,
        useDeeplink,
        extensionOnly: false, // Enable mobile app integration
        checkInstallationImmediately: false, // Prevent auto-opening MetaMask
        autoConnect: false, // Prevent automatic connection
        storage: {
          enabled: true,
        },
        dappMetadata: {
          name: 'fxblox',
          url: 'https://fx.land',
          scheme: 'fxblox',
          iconUrl:
            'https://ipfs.cloud.fx.land/gateway/bafkreigl4s3qehoblwqglo5zjjjwtzkomxg4i6gygfeqk5s5h33m5iuyra',
        },
        i18nOptions: {
          enabled: true,
        },
      }}
    >
      {children}
    </MetaMaskProvider>
  );
};

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
    <GestureHandlerRootView style={styles.flex1}>
      <SDKConfigProvider
        initialSocketServer={COMM_SERVER_URL}
        initialInfuraKey={INFURA_API_KEY}
      >
        <WithSDKConfig>
          <ThemeProvider theme={theme}>
            <ToastProvider>
              <StatusBar
                backgroundColor={theme.colors.backgroundApp}
                barStyle={barStyles[mode]}
              />
              <SafeAreaProvider>
                <BottomSheetModalProvider>
                  <AppContent />
                </BottomSheetModalProvider>
              </SafeAreaProvider>
            </ToastProvider>
          </ThemeProvider>
        </WithSDKConfig>
      </SDKConfigProvider>
    </GestureHandlerRootView>
  );
};
const AppContent = () => {
  const appState = useRef(AppState.currentState);
  const [debugMode] = useSettingsStore((state) => [state.debugMode]);
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
    // return () => {
    //   if (!__DEV__ && isDebugModeEnable) {
    //   }
    // }
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
