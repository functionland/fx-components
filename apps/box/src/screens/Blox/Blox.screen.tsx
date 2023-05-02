import React, { useEffect, useRef, useState } from 'react';
import {
  FxBox,
  FxButton,
  FxSafeAreaBox,
  FxSpacer,
  FxBottomSheetModalMethods,
} from '@functionland/component-library';
import { Alert, ScrollView } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import {
  ColorSettingsCard,
  ConnectedDevicesCard,
  DeviceCard,
  UsageBar,
} from '../../components';
import { UsersCard } from '../../components/Cards/UsersCard';
import { EarningCard } from '../../components/Cards/EarningCard';
import { BloxHeader } from './components/BloxHeader';
import { BloxInteraction } from './components/BloxInteraction';
import { BloxInteractionModal } from './modals/BloxInteractionModal';
import { Pool } from './components/Pool';
import { QuoteStat } from './components/QuoteStat';
import { EDeviceStatus, mockHub } from '../../api/hub';
import { mockFriendData } from '../../api/users';
import { mockPoolData } from '../../api/pool';
import { EBloxInteractionType } from '../../models';
import { ProfileBottomSheet } from '../../components/ProfileBottomSheet';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { ConnectionOptionsSheet, ConnectionOptionsType } from '../../components/ConnectionOptionsSheet';
import { useInitialSetupNavigation, useLogger, useMainTabsNavigation, useRootNavigation } from '../../hooks';
import { Routes } from '../../navigation/navigationConfig';
import { CommonActions, StackActions, useNavigation } from '@react-navigation/native';

const DEFAULT_DIVISION = 30;

export const BloxScreen = () => {
  const bloxInteractionModalRef = useRef<FxBottomSheetModalMethods>(null);
  const profileBottomSheetRef = useRef<FxBottomSheetModalMethods>(null)
  const connectionOptionsSheetRef = useRef<FxBottomSheetModalMethods>(null)
  const divisionSplit = useSharedValue(DEFAULT_DIVISION);
  const [divisionPercentage, setDivisionPercentage] =
    useState<number>(DEFAULT_DIVISION);
  const [selectedMode, setSelectedMode] = useState<EBloxInteractionType>(
    EBloxInteractionType.OfficeBloxUnit
  );
  const navigation = useNavigation();
  const logger = useLogger()
  const [bloxSpace, getBloxSpace, fulaIsReady, checkBloxConnection] = useUserProfileStore((state) => [
    state.bloxSpace,
    state.getBloxSpace,
    state.fulaIsReady,
    state.checkBloxConnection
  ]);
  divisionSplit.value = bloxSpace?.used_percentage || 0

  useEffect(() => {
    if (fulaIsReady)
      updateBloxSpace();
  }, [fulaIsReady])

  const updateBloxSpace = async () => {
    try {
      const space = await getBloxSpace()
      logger.log('updateBloxSpace', space)
    } catch (error) {
      console.log('GetBloxSpace', error)
      logger.logError('GetBloxSpace Error', error)
    }
  }
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

  const handleOnConnectionOptionSelect = (type: ConnectionOptionsType) => {
    connectionOptionsSheetRef.current.close()
    switch (type) {
      case 'RETRY':
        if (fulaIsReady) {
          try {
            checkBloxConnection()
          } catch (error) {
            logger.logError('handleOnConnectionOptionSelect:checkBloxConnection', error)
          }
        }
        break;
      case 'CONNECT-TO-WIFI':
        navigation.navigate(Routes.InitialSetup, { screen: Routes.ConnectToBlox });
        break;
      default:
        break;
    }
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
            onConnectionPress={() => connectionOptionsSheetRef.current.present()}
          />
          <FxSpacer height={24} />
          <UsageBar
            //isEditable
            divisionPercent={divisionSplit}
            //onEditEnd={handleUpdateDivisionPercentage}
            totalCapacity={bloxSpace?.size || 1000}
          />
          <DeviceCard
            data={{
              capacity: bloxSpace?.size || 0,
              name: 'Hard Disk',
              status: EDeviceStatus.InUse,
              associatedDevices: ['Home Blox Set Up']
            }}
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
      <ConnectionOptionsSheet ref={connectionOptionsSheetRef} onSelected={handleOnConnectionOptionSelect} />
    </FxSafeAreaBox>
  );
};
