import {
  FxBox,
  FxSafeAreaBox,
  FxSpacer,
} from '@functionland/component-library';
import React from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import {
  ColorSettingsCard,
  ConnectedDevicesCard,
  UsageBar,
} from '../components';

export const BloxScreen = () => {
  const divisionSplit = useSharedValue(70);
  return (
    <FxSafeAreaBox>
      <ScrollView>
        <FxBox paddingVertical="24" paddingHorizontal="20">
          <UsageBar
            isEditable
            divisionPercent={divisionSplit}
            totalCapacity={1000}
          />
          <FxSpacer height={24} />
          <ColorSettingsCard />
          <FxSpacer height={16} />
          <ConnectedDevicesCard />
        </FxBox>
      </ScrollView>
    </FxSafeAreaBox>
  );
};
