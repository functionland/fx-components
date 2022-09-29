import {
  FxBox,
  FxButton,
  FxSafeAreaBox,
  FxSpacer,
} from '@functionland/component-library';
import React from 'react';
import { ScrollView } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { BloxHeader } from '../components/BloxHeader';
import {
  ColorSettingsCard,
  ConnectedDevicesCard,
  UsageBar,
} from '../components';
import { UsersCardCarousel } from '../components/Cards/UsersCard';
import { EarningCard } from '../components/Cards/EarningCard';
import { PoolCard } from '../components/Cards/PoolCard';
import { CardHeader } from '../components/Cards/fields/CardHeader';
import { mockFriendData } from '../api/users';
import { mockPoolData } from '../api/pool';

export const BloxScreen = () => {
  const divisionSplit = useSharedValue(70);
  return (
    <FxSafeAreaBox flex={1}>
      <BloxHeader />
      <ScrollView>
        <FxBox paddingVertical="20" paddingHorizontal="20">
          <UsageBar
            isEditable
            divisionPercent={divisionSplit}
            totalCapacity={1000}
          />
          <FxSpacer height={24} />
          <ColorSettingsCard />
          <FxSpacer height={16} />
          <EarningCard totalFula={4.2931} />
          <FxSpacer height={16} />
          <ConnectedDevicesCard />
          <FxSpacer height={16} />
          <>
            <CardHeader>Friends</CardHeader>
            <UsersCardCarousel data={mockFriendData} />
          </>
          <FxSpacer height={16} />
          <PoolCard pool={mockPoolData} />
          <FxSpacer height={36} />
          <FxButton size="large">Restart</FxButton>
        </FxBox>
      </ScrollView>
    </FxSafeAreaBox>
  );
};
