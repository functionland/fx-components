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
import {
  ColorSettingsCard,
  ConnectedDevicesCard,
  UsageBar,
} from '../../components';
import { UsersCard } from '../../components/Cards/UsersCard';
import { EarningCard } from '../../components/Cards/EarningCard';
import { BloxHeader } from './components/BloxHeader';
import { BloxInteraction } from './components/BloxInteraction';
import { BloxInteractionModal } from './modals/BloxInteractionModal';
import { Pool } from './components/Pool';
import { QuoteStat } from './components/QuoteStat';
import { mockHub } from '../../api/hub';
import { mockFriendData } from '../../api/users';
import { mockPoolData } from '../../api/pool';
import { EBloxInteractionType } from '../../models';
import { ProfileBottomSheet } from '../../components/ProfileBottomSheet';

const DEFAULT_DIVISION = 70;

export const BloxScreen = () => {
  const bloxInteractionModalRef = useRef<FxBottomSheetModalMethods>(null);
  const profileBottomSheetRef = useRef<FxBottomSheetModalMethods>(null)
  const divisionSplit = useSharedValue(DEFAULT_DIVISION);
  const [divisionPercentage, setDivisionPercentage] =
    useState<number>(DEFAULT_DIVISION);
  const [selectedMode, setSelectedMode] = useState<EBloxInteractionType>(
    EBloxInteractionType.HomeBloxSetup
  );

  const showInteractionModal = () => {
    bloxInteractionModalRef.current.present();
  };

  const handleSelectMode = (mode: EBloxInteractionType) => {
    setSelectedMode(mode);
    bloxInteractionModalRef.current.close();
  };

  const handleUpdateDivisionPercentage = (percentage: number) => {
    setDivisionPercentage(percentage);
  };

  const showProfileModal = () => {
    profileBottomSheetRef.current.present()
  }
  
  return (
    <FxSafeAreaBox flex={1} edges={['top']}>
      <BloxHeader
        selectedMode={selectedMode}
        onChangeMode={showInteractionModal}
        onAvatarPress={showProfileModal}
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
            onEditEnd={handleUpdateDivisionPercentage}
            totalCapacity={1000}
          />
          <FxSpacer height={8} />
          <QuoteStat divisionPercentage={divisionPercentage} />
          <FxSpacer height={24} />
          <ColorSettingsCard />
          <FxSpacer height={16} />
          <EarningCard totalFula={4.2931} />
          <FxSpacer height={16} />
          <ConnectedDevicesCard data={mockHub} />
          <FxSpacer height={16} />
          <UsersCard data={mockFriendData} />
          <FxSpacer height={16} />
          <Pool pool={mockPoolData[0]} />
          <FxSpacer height={36} />
          <FxButton size="large">Restart</FxButton>
        </FxBox>
      </ScrollView>
      <BloxInteractionModal
        ref={bloxInteractionModalRef}
        selectedMode={selectedMode}
        onSelectMode={handleSelectMode}
      />
      <ProfileBottomSheet ref={profileBottomSheetRef} />
    </FxSafeAreaBox>
  );
};
