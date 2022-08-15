import React from 'react';
import { ThemeProvider } from '@shopify/restyle';
import { fxLightTheme, fxDarkTheme } from '@functionland/component-library';
import { RootNavigator } from '../navigation/Root.navigator';
import { WalletConnectProvider } from '@walletconnect/react-native-dapp/dist/providers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavContainer } from '../navigation/NavContainer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, StatusBar, StyleSheet, UIManager } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSettingsStore } from '../stores';

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

  return (
    <ThemeProvider theme={theme}>
      <WalletConnectProvider
        redirectUrl={'yourappscheme://'}
        storageOptions={{
          // @ts-ignore
          asyncStorage: AsyncStorage,
        }}
      >
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
      </WalletConnectProvider>
    </ThemeProvider>
  );
};

const AppContent = () => {
  return (
    <NavContainer>
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
