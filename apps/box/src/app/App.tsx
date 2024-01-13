import React, { useEffect, useRef } from 'react';
<<<<<<< HEAD
import AsyncStorage from '@react-native-async-storage/async-storage';
=======
import '@walletconnect/react-native-compat';
import { WagmiConfig } from 'wagmi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mainnet, polygon, arbitrum, goerli, polygonMumbai } from 'viem/chains';
>>>>>>> f72296b (improve wallet connect)
import {
  MetaMaskProvider,
  SDKConfigProvider,
  useSDKConfig,
} from '@metamask/sdk-react';

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
import { firebase } from '@react-native-firebase/crashlytics';
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
        openDeeplink: (link: string, _target?: string) => {
          console.debug(`App::openDeepLink() ${link}`);
          if (canOpenLink) {
            Linking.openURL(link);
          } else {
            console.debug(
              'useBlockchainProiver::openDeepLink app is not active - skip link',
              link
            );
          }
        },
        timer: BackgroundTimer,
        useDeeplink,
        checkInstallationImmediately,
        storage: {
          enabled: true,
        },
        dappMetadata: {
          name: 'devreactnative',
        },
        i18nOptions: {
          enabled: true,
        },
      }}>
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
        if (!__DEV__ && isDebugModeEnable) {
          firebase.crashlytics().setUserId(debugMode.uniqueId);
          firebase
            .crashlytics()
            .recordError(
              new Error('On App Close Error Log'),
              'Self Generated Error'
            );
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      console.log('subscription.remove();');
      subscription.remove();
    };
    // return () => {
    //   if (!__DEV__ && isDebugModeEnable) {
    //     firebase.crashlytics().recordError(new Error('On App Close Error Log'))
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
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
});

export default App;
