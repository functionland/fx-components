import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { InitialSetupNavigator } from './InitialSetup.navigator';
import { MainTabsNavigator } from './MainTabs.navigator';
import { HubScreen } from '../screens/Hub.screen';
import { Routes, RootStackParamList } from './navigationConfig';

export const RootNavigator = () => {
  return (
    <RootStack.Navigator screenOptions={{ gestureEnabled: true }}>
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
      <RootStack.Screen
        name={Routes.Hub}
        component={HubScreen}
        options={{ headerShown: false }}
      />
    </RootStack.Navigator>
  );
};

const RootStack = createStackNavigator<RootStackParamList>();
