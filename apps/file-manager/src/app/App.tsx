import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { FileList } from './components';

export const App = () => {
  return (
    <NavigationContainer>
      <SafeAreaView>
        <FileList />
      </SafeAreaView>
    </NavigationContainer>
  );
};

export default App;
