import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { InitialSetupNavigator } from './InitialSetup.navigator';
import { MainTabsNavigator } from './MainTabs.navigator';
import { Routes, RootStackParamList } from './navigationConfig';
import { useUserProfileStore } from '../stores/useUserProfileStore';

export const RootNavigator = () => {
  const [_hasHydrated, appPeerId] = useUserProfileStore(state => [state._hasHydrated, state.appPeerId]);
  const [initialRoute, setInitialRoute] = useState(undefined);
  useEffect(() => {
    if (_hasHydrated && !initialRoute) {
      if (appPeerId) {
        setInitialRoute(Routes.MainTabs);
      } else {
        setInitialRoute(Routes.InitialSetup);
      }
    }
  }, [_hasHydrated, appPeerId, initialRoute])

  if (!initialRoute)
    return null;
  return (
    <RootStack.Navigator initialRouteName={initialRoute} screenOptions={{ gestureEnabled: true }}>
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
