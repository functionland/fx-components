import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { InitialSetupNavigator } from './InitialSetup.navigator';
import { MainTabsNavigator } from './MainTabs.navigator';
import { Routes, RootStackParamList } from './navigationConfig';

export const RootNavigator = () => {
  return (
    <RootStack.Navigator>
      <RootStack.Screen
        name={Routes.InitialSetup}
        options={{ headerShown: false }}
        component={InitialSetupNavigator}
      />
      <RootStack.Screen
        name={Routes.MainTabs}
        component={MainTabsNavigator}
        options={{ headerShown: false }}
      />
    </RootStack.Navigator>
  );
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
