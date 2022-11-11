import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFxTheme } from '@functionland/component-library';
import { Routes, SettingsStackParamList } from './navigationConfig';
import {
  SettingsScreen,
  AboutScreen,
  PoolsScreen,
  ModeScreen,
  ConnectedDAppsScreen,
} from '../screens/Settings';
import { ComponentGalleryNavigator } from './ComponentGallery.navigator';

const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsNavigator = () => {
  const theme = useFxTheme();

  return (
    <SettingsStack.Navigator
      screenOptions={() => ({
        headerBackTitleVisible: false,
        headerBackImageSource: require('../../assets/icons/back.png'),
        headerTintColor: theme.colors.content1,
        headerStyle: {
          backgroundColor: theme.colors.backgroundApp,
        },
        headerTitle: '',
      })}
    >
      <SettingsStack.Screen
        name={Routes.Settings}
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen
        name={Routes.ConnectedDApps}
        component={ConnectedDAppsScreen}
      />
      <SettingsStack.Screen name={Routes.Mode} component={ModeScreen} />
      <SettingsStack.Screen name={Routes.Pools} component={PoolsScreen} />
      <SettingsStack.Screen name={Routes.About} component={AboutScreen} />

      <SettingsStack.Screen
        options={() => ({
          headerShown: false,
        })}
        name={Routes.ComponentGallery}
        component={ComponentGalleryNavigator}
      />
    </SettingsStack.Navigator>
  );
};
