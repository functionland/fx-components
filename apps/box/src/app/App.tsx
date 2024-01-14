import '@walletconnect/react-native-compat';
import React, { useEffect, useRef } from 'react';
import '@walletconnect/react-native-compat';
import { WagmiConfig } from 'wagmi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mainnet, polygon, arbitrum, goerli, polygonMumbai } from 'viem/chains';
import {
  createWeb3Modal,
  defaultWagmiConfig,
  Web3Modal,
} from '@web3modal/wagmi-react-native';
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
import { WalletConnectConfigs } from '../utils';
import { copyToClipboard } from '../utils/clipboard';
import { fula } from '@functionland/react-native-fula';

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
  // 1. Get projectId at https://cloud.walletconnect.com
  const projectId = WalletConnectConfigs.WaletConnect_Project_Id;

  // 2. Create config
  const metadata = WalletConnectConfigs.providerMetadata;

  // const [selectedChainId, setSelectedChainId] = useState(1);// defualt is Etherum

  const chains = [polygonMumbai, polygon, mainnet, arbitrum, goerli];

  const wagmiConfig = defaultWagmiConfig({ chains, projectId, metadata });

  // 3. Create modal
  createWeb3Modal({
    defaultChain: polygonMumbai,
    projectId,
    chains,
    wagmiConfig,
  });
  useEffect(() => {
    loadAllCredentials();
  }, [loadAllCredentials]);
  return (
    <GestureHandlerRootView style={styles.flex1}>
      <WagmiConfig config={wagmiConfig}>
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
        <Web3Modal />
      </WagmiConfig>
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
