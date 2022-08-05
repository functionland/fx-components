import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '@shopify/restyle';
import { FxTheme } from '@functionland/component-library';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BoxScreen } from '../screens/Box.screen';
import { PoolScreen } from '../screens/Pool.screen';
import { UsersScreen } from '../screens/Users/Users.screen';
import { BoxIcon, PoolIcon, SettingsIcon, UserIcon } from '../components';
import { MainTabsParamList, SettingsStackParamList } from './navigationConfig';
import {
  SettingsScreen,
  AboutScreen,
  PoolsScreen,
  ModeScreen,
  ConnectedDAppsScreen,
} from '../screens/Settings';

export const MainTabsNavigator = () => {
  const theme = useTheme<FxTheme>();
  return (
    <MainTabs.Navigator
      screenOptions={() => ({
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.content3,
        tabBarStyle: {
          backgroundColor: theme.colors.backgroundApp,
        },
        headerShown: false,
        headerStyle: {
          backgroundColor: theme.colors.backgroundApp,
        },
        headerTitleStyle: {
          color: theme.colors.content1,
        },
      })}
    >
      <MainTabs.Screen
        name="Box"
        component={BoxScreen}
        options={{
          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({ color }) => <BoxIcon fill={color} />,
        }}
      />
      <MainTabs.Screen
        name="SettingsStack"
        component={SettingsNavigator}
        options={{
          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({ color }) => <SettingsIcon fill={color} />,
        }}
      />
      <MainTabs.Screen
        name="Pool"
        component={PoolScreen}
        options={{
          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({ color }) => <PoolIcon fill={color} />,
        }}
      />
      <MainTabs.Screen
        name="Users"
        component={UsersScreen}
        options={{
          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({ color }) => <UserIcon fill={color} />,
        }}
      />
    </MainTabs.Navigator>
  );
};

const MainTabs = createBottomTabNavigator<MainTabsParamList>();

const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const SettingsNavigator = () => {
  const theme = useTheme<FxTheme>();

  return (
    <SettingsStack.Navigator
      screenOptions={() => ({
        headerBackTitleVisible: false,
        headerBackImageSource: require('../../assets/icons/back.png'),
        headerTintColor: theme.colors.white,
        headerStyle: {
          backgroundColor: theme.colors.backgroundApp,
        },
        headerTitle: '',
      })}
    >
      <SettingsStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen
        name="ConnectedDApps"
        component={ConnectedDAppsScreen}
      />
      <SettingsStack.Screen
        name="Mode"
        component={ModeScreen}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen
        name="Pools"
        component={PoolsScreen}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen
        name="About"
        component={AboutScreen}
        options={{ headerShown: false }}
      />
    </SettingsStack.Navigator>
  );
};
