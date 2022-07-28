import { FxBox, FxSpacer } from '@functionland/component-library';
import React from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import {
  ColorSettingsCard,
  ConnectedDevicesCard,
  UsageBar,
} from '../components';

export const BoxScreen = () => {
  return (
    <ScrollView>
      <FxBox paddingVertical="24" paddingHorizontal="20">
        <UsageBar isEditable />
        <FxSpacer height={24} />
        <ColorSettingsCard />
        <FxSpacer height={16} />
        <ConnectedDevicesCard />
      </FxBox>
    </ScrollView>
  );
};
