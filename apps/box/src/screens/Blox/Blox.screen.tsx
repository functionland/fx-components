import React, { useRef, useState } from 'react';
import {
  FxBox,
  FxButton,
  FxSafeAreaBox,
  FxSpacer,
  FxBottomSheetModalMethods,
} from '@functionland/component-library';
import { ScrollView } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { BloxHeader } from '../../components/BloxHeader';
import {
  ColorSettingsCard,
  ConnectedDevicesCard,
  UsageBar,
  BloxInteraction,
} from '../../components';
import { UsersCardCarousel } from '../../components/Cards/UsersCard';
import { EarningCard } from '../../components/Cards/EarningCard';
import { PoolCard } from '../../components/Cards/PoolCard';
import { CardHeader } from '../../components/Cards/fields/CardHeader';
import { BloxInteractionModal } from './modals/BloxInteractionModal';
import { mockFriendData } from '../../api/users';
import { mockPoolData } from '../../api/pool';
import { EBloxInteractionType } from '../../models';

export const BloxScreen = () => {
  const bloxInteractionModalRef = useRef<FxBottomSheetModalMethods>(null);
  const divisionSplit = useSharedValue(70);
  const [selectedMode, setSelectedMode] = useState<EBloxInteractionType>(
    EBloxInteractionType.HomeBloxSetup
  );

  const showInteractionModal = () => {
    bloxInteractionModalRef.current.present();
  };

  return (
    <FxSafeAreaBox flex={1} edges={['top']}>
      <BloxHeader
        selectedMode={selectedMode}
        onChangeMode={showInteractionModal}
      />
      <ScrollView>
        <FxBox paddingVertical="20" paddingHorizontal="20">
          <BloxInteraction
            selectedMode={selectedMode}
            setSelectedMode={setSelectedMode}
          />
          <FxSpacer height={24} />
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
          <>
            <CardHeader>Pool</CardHeader>
            <PoolCard pool={mockPoolData[0]} marginTop="0" isDetailed />
          </>
          <FxSpacer height={36} />
          <FxButton size="large">Restart</FxButton>
        </FxBox>
      </ScrollView>
      <BloxInteractionModal
        ref={bloxInteractionModalRef}
        selectedMode={selectedMode}
        setSelectedMode={setSelectedMode}
      />
    </FxSafeAreaBox>
  );
};
