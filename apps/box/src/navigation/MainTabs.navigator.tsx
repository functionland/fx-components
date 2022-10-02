import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFxTheme } from '@functionland/component-library';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BloxScreen } from '../screens/Blox.screen';
import { HubScreen } from '../screens/Hub.screen';
import { DevicesScreen } from '../screens/Devices.screen';
import { UsersScreen } from '../screens/Users/Users.screen';
import {
  BloxIcon,
  UserIcon,
  HubIcon,
  DevicesIcon,
  SettingsIcon,
} from '../components';
import {
  Routes,
  MainTabsParamList,
  SettingsStackParamList,
} from './navigationConfig';
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
        tabBarLabelStyle: theme.textVariants.bodyXSRegular,
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
        name={Routes.BloxTab}
        component={BloxScreen}
        options={{
          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({ color }) => <BloxIcon fill={color} />,
          tabBarLabel: 'Blox',
        }}
      />
      <MainTabs.Screen
        name={Routes.UsersTab}
        component={UsersScreen}
        options={{
          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({ color }) => <UserIcon fill={color} />,
          tabBarLabel: 'Users',
        }}
      />
      <MainTabs.Screen
        name={Routes.HubTab}
        component={HubScreen}
        options={{
          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({ color }) => <HubIcon fill={color} />,
          tabBarLabel: 'Hub',
        }}
      />
      <MainTabs.Screen
        name={Routes.DevicesTab}
        component={DevicesScreen}
        options={{
          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({ color }) => <DevicesIcon fill={color} />,
          tabBarLabel: 'Devices',
        }}
      />
      <MainTabs.Screen
        name={Routes.SettingsTab}
        component={SettingsNavigator}
        options={{
          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({ color }) => <SettingsIcon fill={color} />,
          tabBarLabel: 'Settings',
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
