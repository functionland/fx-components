import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Platform, SafeAreaView, UIManager, StyleSheet, View, useColorScheme } from 'react-native';
import { ThemeProvider } from '@shopify/restyle';
import { FxButton, fxLightTheme } from '@functionland/component-library';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <ThemeProvider theme={fxLightTheme}>
      <NavigationContainer>
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <FxButton testID="app-name">File Manager App</FxButton>
          </View>
        </SafeAreaView>
      </NavigationContainer>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default App;
