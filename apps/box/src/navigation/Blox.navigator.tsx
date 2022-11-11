import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Routes, BloxStackParamList } from './navigationConfig';
import { BloxScreen } from '../screens/Blox/Blox.screen';
import { UsageToolScreen } from '../screens/UsageTool/UsageTool.screen';

const BloxStack = createNativeStackNavigator<BloxStackParamList>();

export const BloxNavigator = () => {
  return (
    <BloxStack.Navigator screenOptions={{ headerShown: false }}>
      <BloxStack.Screen name={Routes.Blox} component={BloxScreen} />
      <BloxStack.Screen name={Routes.UsageTool} component={UsageToolScreen} />
    </BloxStack.Navigator>
  );
};
