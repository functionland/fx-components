import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFxTheme } from '@functionland/component-library';
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
import { ComponentGalleryNavigator } from './ComponentGallery.navigator';

export const MainTabsNavigator = () => {
  const theme = useFxTheme();
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
      <SettingsStack.Screen name="Settings" component={SettingsScreen} />
      <SettingsStack.Screen
        name="ConnectedDApps"
        component={ConnectedDAppsScreen}
      />
      <SettingsStack.Screen name="Mode" component={ModeScreen} />
      <SettingsStack.Screen name="Pools" component={PoolsScreen} />
      <SettingsStack.Screen name="About" component={AboutScreen} />

      <SettingsStack.Screen
        options={() => ({
          headerShown: false,
        })}
        name="Component Gallery Navigator"
        component={ComponentGalleryNavigator}
      />
    </SettingsStack.Navigator>
  );
};
