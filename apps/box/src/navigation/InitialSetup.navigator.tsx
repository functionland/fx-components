import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import {
  WelcomeScreen,
  LinkPasswordScreen,
  ConnectToWalletScreen,
  ConnectToBloxScreen,
  ConnectToWifiScreen,
  SetupCompleteScreen,
  CheckConnectionScreen,
  SetBloxAuthorizerScreen,
} from '../screens/InitialSetup';
import { Routes, InitialSetupStackParamList } from './navigationConfig';

export const InitialSetupNavigator = () => {
  return (
    <InitialSetupStack.Navigator screenOptions={{ headerShown: false }}>
      <InitialSetupStack.Screen
        name={Routes.Welcome}
        component={WelcomeScreen}
      />
      <InitialSetupStack.Screen
        name={Routes.LinkPassword}
        component={LinkPasswordScreen}
      />
      <InitialSetupStack.Screen
        name={Routes.ConnectToWallet}
        component={ConnectToWalletScreen}
      />
      <InitialSetupStack.Screen
        name={Routes.ConnectToBlox}
        component={ConnectToBloxScreen}
      />
      <InitialSetupStack.Screen
        name={Routes.ConnectToWifi}
        component={ConnectToWifiScreen}
      />
      <InitialSetupStack.Screen
        name={Routes.CheckConnection}
        component={CheckConnectionScreen}
      />
      <InitialSetupStack.Screen
        name={Routes.SetupComplete}
        component={SetupCompleteScreen}
      />
      <InitialSetupStack.Screen
        name={Routes.SetBloxAuthorizer}
        component={SetBloxAuthorizerScreen}
      />
    </InitialSetupStack.Navigator>
  );
};

const InitialSetupStack =
  createNativeStackNavigator<InitialSetupStackParamList>();
