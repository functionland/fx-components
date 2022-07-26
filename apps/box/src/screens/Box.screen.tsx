import { FxBox } from '@functionland/component-library';
import React from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { ColorSettingsCard, UsageBar } from '../components';

export const BoxScreen = () => {
  return (
    <ScrollView>
      <FxBox paddingVertical="24" paddingHorizontal="20">
        <UsageBar isEditable />
        <ColorSettingsCard />
      </FxBox>
    </ScrollView>
  );
};
