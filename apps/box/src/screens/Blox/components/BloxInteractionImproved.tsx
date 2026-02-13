import React from 'react';
import {
  FxBox,
  FxPressableOpacity,
  FxText,
  FxChevronDownIcon,
  FxGridIcon,
  useFxTheme,
} from '@functionland/component-library';
import { useNavigation } from '@react-navigation/native';
import OfficeBloxUnitDark from '../../../app/icons/office-blox-unit-dark.svg';
import OfficeBloxUnitLight from '../../../app/icons/office-blox-unit-light.svg';

import { useBloxsStore, useSettingsStore } from '../../../stores';
import { EBloxInteractionType, TBloxInteraction } from '../../../models';
import { CircleFilledIcon } from '../../../components/Icons';
import { Routes } from '../../../navigation/navigationConfig';

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
  const navigation = useNavigation();

  const colorScheme = useSettingsStore((store) => store.colorScheme);
  const { colors } = useFxTheme();

  const bloxsConnectionStatus = useBloxsStore((state) => state.bloxsConnectionStatus);
  const currentBloxPeerId = useBloxsStore((state) => state.currentBloxPeerId);

  // Find current Blox
  const currentBlox = bloxs.find(blox => blox.peerId === currentBloxPeerId);
  const currentConnectionStatus = currentBloxPeerId ? bloxsConnectionStatus[currentBloxPeerId] : undefined;

  const getStatusColor = () => {
    switch (currentConnectionStatus) {
      case 'CONNECTED':
        return 'successBase';
      case 'SWITCHING':
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
        {/* Tower Icon - Separate touch target */}
        <FxPressableOpacity
          onPress={() => currentBloxPeerId && onBloxPress?.(currentBloxPeerId)}
          alignItems="center"
          paddingVertical="8"
        >
          <Icon />
        </FxPressableOpacity>
        
        {/* Blox Name with Dropdown Arrow - Larger touch target with more spacing */}
        <FxBox alignItems="center" marginTop="16">
          <FxBox flexDirection="row" alignItems="center">
            <FxText variant="bodyLargeRegular" marginRight="8">
              {currentBlox?.title || 'Unknown Blox'}
            </FxText>
            
            {bloxs.length > 1 && (
              <FxPressableOpacity
                onPress={() => navigation.navigate(Routes.BloxManager as never)}
                padding="8"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <FxGridIcon
                  width={16}
                  height={16}
                  fill={colors.content1}
                />
              </FxPressableOpacity>
            )}
          </FxBox>
        </FxBox>
        
        {/* Connection Status - Larger touch target with more spacing */}
        <FxBox alignItems="center" marginTop="20">
          <FxPressableOpacity
            flexDirection="row"
            alignItems="center"
            paddingVertical="8"
            paddingHorizontal="12"
            onPress={onConnectionPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
              {currentConnectionStatus === 'SWITCHING' ? 'SWITCHING...' : currentConnectionStatus === 'CHECKING' ? 'CHECKING...' : (currentConnectionStatus?.toString() || 'UNKNOWN')}
            </FxText>
            <FxChevronDownIcon
              width={16}
              height={16}
              marginLeft="4"
              fill={colors.content1}
            />
          </FxPressableOpacity>
        </FxBox>
      </FxBox>

    </FxBox>
  );
};
