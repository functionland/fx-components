import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { InitialSetupNavigator } from './InitialSetup.navigator';
import { MainTabsNavigator } from './MainTabs.navigator';
import { Routes, RootStackParamList } from './navigationConfig';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import { useBloxsStore } from '../stores';
import { FxBox } from '@functionland/component-library';
import { ActivityIndicator } from 'react-native';

export const RootNavigator = () => {
  const _hasHydrated = useUserProfileStore((state) => state._hasHydrated);
  const appPeerId = useUserProfileStore((state) => state.appPeerId);
  const _hasHydrated_bloxs = useBloxsStore((state) => state._hasHydrated);
  const bloxs = useBloxsStore((state) => state.bloxs) ?? {};
  const [initialRoute, setInitialRoute] = useState(undefined);
  useEffect(() => {
    if (_hasHydrated && _hasHydrated_bloxs && !initialRoute) {
      if (
        appPeerId &&
        //walletConnect.connected &&
        appPeerId &&
        Object.keys(bloxs).length > 0
      ) {
        setInitialRoute(Routes.MainTabs);
      } else {
        setInitialRoute(Routes.InitialSetup);
      }
    }
  }, [_hasHydrated, appPeerId, initialRoute, _hasHydrated_bloxs, bloxs]);

  if (!initialRoute)
    return (
      <FxBox flex={1} justifyContent="center" alignItems="center">
        <ActivityIndicator size="large" />
      </FxBox>
    );
  return (
    <RootStack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ gestureEnabled: true }}
    >
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

const RootStack = createStackNavigator<RootStackParamList>();
