import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '@shopify/restyle';
import { FxTheme } from '@functionland/component-library';
import { BoxScreen } from '../screens/Box.screen';
import { MainTabsParamList } from './navigatonConfig';
import { SettingsScreen } from '../screens/Settings.screen';
import { PoolScreen } from '../screens/Pool.screen';
import { UsersScreen } from '../screens/Users/Users.screen';
import { BoxIcon, PoolIcon, SettingsIcon, UserIcon } from '../components';

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
        name="Settings"
        component={SettingsScreen}
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
