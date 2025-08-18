import React, { useRef, useState } from 'react';
import {
  FxBox,
  FxPressableOpacity,
  FxText,
  FxChevronDownIcon,
  useFxTheme,
  FxBottomSheetModalMethods,
  useToast,
} from '@functionland/component-library';
import OfficeBloxUnitDark from '../../../app/icons/office-blox-unit-dark.svg';
import OfficeBloxUnitLight from '../../../app/icons/office-blox-unit-light.svg';

import { useBloxsStore, useSettingsStore } from '../../../stores';
import { EBloxInteractionType, TBloxInteraction } from '../../../models';
import { CircleFilledIcon } from '../../../components/Icons';
import { BloxSelectionBottomSheet } from '../../../components/BloxSelectionBottomSheet';

type TBloxInteractionImprovedProps = {
  bloxs: TBloxInteraction[];
  selectedMode: EBloxInteractionType;
  onConnectionPress?: () => void;
  onBloxPress?: (peerId: string) => void;
};

export const BloxInteractionImproved = ({
  selectedMode,
  bloxs,
  onConnectionPress,
  onBloxPress,
}: TBloxInteractionImprovedProps) => {
  const bloxSelectionRef = useRef<FxBottomSheetModalMethods>(null);
  const { queueToast } = useToast();
  const [isBloxSwitching, setIsBloxSwitching] = useState(false);
  
  const { colorScheme } = useSettingsStore((store) => ({
    colorScheme: store.colorScheme,
  }));
  const { colors } = useFxTheme();

  const [bloxsConnectionStatus, currentBloxPeerId, switchToBlox] = useBloxsStore((state) => [
    state.bloxsConnectionStatus,
    state.currentBloxPeerId,
    state.switchToBlox,
  ]);

  // Find current Blox
  const currentBlox = bloxs.find(blox => blox.peerId === currentBloxPeerId);
  const currentConnectionStatus = currentBloxPeerId ? bloxsConnectionStatus[currentBloxPeerId] : undefined;

  const handleBloxSelection = async (peerId: string) => {
    if (peerId === currentBloxPeerId) {
      return; // Already selected
    }

    setIsBloxSwitching(true);
    
    try {
      queueToast({
        type: 'info',
        title: 'Switching Blox',
        message: 'Establishing connection to selected Blox...',
      });

      const success = await switchToBlox(peerId);
      
      if (success) {
        queueToast({
          type: 'success',
          title: 'Blox Connected',
          message: 'Successfully connected to the selected Blox device.',
        });
      } else {
        queueToast({
          type: 'error',
          title: 'Connection Failed',
          message: 'Failed to connect to the selected Blox. Please try again.',
        });
      }
    } catch (error) {
      console.error('Error switching Blox:', error);
      queueToast({
        type: 'error',
        title: 'Switch Failed',
        message: 'An error occurred while switching Blox devices.',
      });
    } finally {
      setIsBloxSwitching(false);
    }
  };

  const showBloxSelection = () => {
    if (bloxs.length <= 1) {
      queueToast({
        type: 'info',
        title: 'Single Blox',
        message: 'You only have one Blox device configured.',
      });
      return;
    }
    
    bloxSelectionRef.current?.present();
  };

  const getStatusColor = () => {
    switch (currentConnectionStatus) {
      case 'CONNECTED':
        return 'successBase';
      case 'CHECKING':
        return 'warningBase';
      default:
        return 'errorBase';
    }
  };

  const Icon = colorScheme === 'dark' 
    ? currentBlox?.darkIcon || OfficeBloxUnitDark
    : currentBlox?.lightIcon || OfficeBloxUnitLight;

  return (
    <FxBox position="relative">
      <FxBox
        height={200}
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
      >
        <FxPressableOpacity
          onPress={() => currentBloxPeerId && onBloxPress?.(currentBloxPeerId)}
          alignItems="center"
        >
          <Icon />
          
          {/* Blox Name with Dropdown Arrow */}
          <FxBox flexDirection="row" alignItems="center" marginTop="12">
            <FxText variant="bodyLargeRegular" marginRight="8">
              {currentBlox?.title || 'Unknown Blox'}
            </FxText>
            
            {bloxs.length > 1 && (
              <FxPressableOpacity
                onPress={showBloxSelection}
                disabled={isBloxSwitching}
                opacity={isBloxSwitching ? 0.5 : 1}
              >
                <FxChevronDownIcon
                  width={16}
                  height={16}
                  fill={colors.content1}
                />
              </FxPressableOpacity>
            )}
          </FxBox>
          
          {/* Connection Status */}
          <FxPressableOpacity
            flexDirection="row"
            alignItems="center"
            paddingVertical="4"
            onPress={onConnectionPress}
            marginTop="8"
          >
            <CircleFilledIcon
              color={getStatusColor()}
              width={8}
              height={8}
            />
            <FxText
              paddingStart="4"
              color={getStatusColor()}
              variant="bodySmallRegular"
            >
              {isBloxSwitching ? 'SWITCHING...' : (currentConnectionStatus?.toString() || 'UNKNOWN')}
            </FxText>
            <FxChevronDownIcon
              width={16}
              height={16}
              marginLeft="4"
              fill={colors.content1}
            />
          </FxPressableOpacity>
        </FxPressableOpacity>
      </FxBox>

      {/* Blox Selection Bottom Sheet */}
      <BloxSelectionBottomSheet
        ref={bloxSelectionRef}
        onBloxSelect={handleBloxSelection}
      />
    </FxBox>
  );
};
