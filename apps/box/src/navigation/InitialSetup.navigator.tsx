import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import {
  WelcomeScreen,
  WalletConnectScreen,
  ConnectToBloxScreen,
  SetupWifiScreen,
  SetupCompleteScreen,
  CheckConnectionScreen,
} from '../screens/InitialSetup';
import { Routes, InitialSetupStackParamList } from './navigationConfig';

export const InitialSetupNavigator = () => {
  return (
    <InitialSetupStack.Navigator>
      <InitialSetupStack.Screen
        name={Routes.Welcome}
        component={WelcomeScreen}
      />
      <InitialSetupStack.Screen
        name={Routes.WalletConnect}
        component={WalletConnectScreen}
      />
      <InitialSetupStack.Screen
        name={Routes.ConnectToBlox}
        component={ConnectToBloxScreen}
      />
      <InitialSetupStack.Screen
        name={Routes.SetupWifi}
        component={SetupWifiScreen}
      />
      <InitialSetupStack.Screen
        name={Routes.CheckConnection}
        component={CheckConnectionScreen}
      />
      <InitialSetupStack.Screen
        name={Routes.SetupComplete}
        component={SetupCompleteScreen}
      />
    </InitialSetupStack.Navigator>
  );
};

const InitialSetupStack =
  createNativeStackNavigator<InitialSetupStackParamList>();
