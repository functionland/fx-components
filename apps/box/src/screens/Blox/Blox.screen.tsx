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
import { UsersCard } from '../../components/Cards/UsersCard';
import { EarningCard } from '../../components/Cards/EarningCard';
import { BloxInteractionModal } from './modals/BloxInteractionModal';
import { Pool } from './components/Pool';
import { mockHub } from '../../api/hub';
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

  const handleSelectMode = (mode: EBloxInteractionType) => {
    setSelectedMode(mode);
    bloxInteractionModalRef.current.close();
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
            // usages={[
            //   [
            //     { color: 'red', usage: 10 },
            //     { color: 'blue', usage: 30 },
            //   ],
            //   [
            //     { color: 'green', usage: 20 },
            //     { color: 'black', usage: 50 },
            //   ],
            // ]}
          />
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
    </FxSafeAreaBox>
  );
};
