import React, { useRef } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import {
  FxBottomSheetModalMethods,
  FxArrowUpIcon,
  useFxTheme,
} from '@functionland/component-library';
import { BloxNavigator } from './Blox.navigator';
import { HubScreen } from '../screens/Hub.screen';
import { DevicesScreen } from '../screens/Devices.screen';
import { UsersScreen } from '../screens/Users/Users.screen';
import { SettingsNavigator } from './Settings.navigator';
import {
  BloxIcon,
  UserIcon,
  // HubIcon,
  DevicesIcon,
  SettingsIcon,
} from '../components';
import { Routes, MainTabsParamList } from './navigationConfig';
import { GlobalBottomSheet } from '../components/GlobalBottomSheet';

const MainTabs = createMaterialTopTabNavigator<MainTabsParamList>();

export const MainTabsNavigator = () => {
  const theme = useFxTheme();
  const globalBottomSheetRef = useRef<FxBottomSheetModalMethods>(null);

  const openGlobalBottomSheet = () => {
    globalBottomSheetRef.current.present();
  };

  const closeGlobalBottomSheet = () => {
    globalBottomSheetRef.current.close();
  };

  return (
    <>
      <MainTabs.Navigator
        tabBarPosition="bottom"
        screenOptions={() => ({
          tabBarIndicatorStyle: {
            height: 0,
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.content3,
          tabBarStyle: {
            backgroundColor: theme.colors.backgroundApp,
            borderTopWidth: 1,
            borderTopColor: theme.colors.backgroundSecondary,
            paddingBottom: 4,
          },
          tabBarLabelStyle: {
            ...theme.textVariants.bodyXSRegular,
            textTransform: 'none',
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
          name={Routes.BloxTab}
          component={BloxNavigator}
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
            tabBarIcon: ({ color }) => <FxArrowUpIcon fill={color} />,
            tabBarLabel: '',
          }}
          listeners={() => ({
            tabPress: (e) => {
              e.preventDefault();
              openGlobalBottomSheet();
            },
          })}
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
      <GlobalBottomSheet
        ref={globalBottomSheetRef}
        closeBottomSheet={closeGlobalBottomSheet}
      />
    </>
  );
};
