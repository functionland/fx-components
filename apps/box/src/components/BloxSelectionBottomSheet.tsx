import React, { forwardRef, useCallback } from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxText,
  FxPressableOpacity,
  FxSpacer,
  useFxTheme,
} from '@functionland/component-library';
import { FlatList } from 'react-native';
import { useBloxsStore } from '../stores';
import { TBlox } from '../models';
import { CircleFilledIcon } from './Icons';

interface BloxSelectionBottomSheetProps {
  onBloxSelect: (peerId: string) => void;
}

interface BloxListItemProps {
  blox: TBlox;
  isSelected: boolean;
  connectionStatus: string;
  onSelect: (peerId: string) => void;
}

const BloxListItem = ({ blox, isSelected, connectionStatus, onSelect }: BloxListItemProps) => {
  const { colors } = useFxTheme();
  
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'CONNECTED':
        return 'successBase';
      case 'CHECKING':
        return 'warningBase';
      default:
        return 'errorBase';
    }
  };

  return (
    <FxPressableOpacity
      paddingVertical="16"
      paddingHorizontal="20"
      backgroundColor={isSelected ? 'backgroundSecondary' : 'transparent'}
      onPress={() => onSelect(blox.peerId)}
    >
      <FxBox flexDirection="row" alignItems="center" justifyContent="space-between">
        <FxBox flex={1}>
          <FxText variant="bodyLargeRegular" color="content1">
            {blox.name}
          </FxText>
          <FxSpacer height={4} />
          <FxText variant="bodySmallRegular" color="content2" numberOfLines={1}>
            {blox.peerId}
          </FxText>
        </FxBox>
        
        <FxBox flexDirection="row" alignItems="center" marginLeft="12">
          <CircleFilledIcon
            color={getStatusColor()}
            width={8}
            height={8}
          />
          <FxText
            variant="bodySmallRegular"
            color={getStatusColor()}
            marginLeft="4"
          >
            {connectionStatus || 'UNKNOWN'}
          </FxText>
        </FxBox>
      </FxBox>
    </FxPressableOpacity>
  );
};

export const BloxSelectionBottomSheet = forwardRef<
  FxBottomSheetModalMethods,
  BloxSelectionBottomSheetProps
>(({ onBloxSelect }, ref) => {
  const { colors } = useFxTheme();
  
  const bloxs = useBloxsStore((state) => state.bloxs);
  const currentBloxPeerId = useBloxsStore((state) => state.currentBloxPeerId);
  const bloxsConnectionStatus = useBloxsStore((state) => state.bloxsConnectionStatus);

  const bloxList = Object.values(bloxs || {});

  const handleBloxSelect = useCallback((peerId: string) => {
    onBloxSelect(peerId);
    // Close the bottom sheet
    if (ref && 'current' in ref && ref.current) {
      ref.current.close();
    }
  }, [onBloxSelect, ref]);

  const renderBloxItem = ({ item }: { item: TBlox }) => (
    <BloxListItem
      blox={item}
      isSelected={item.peerId === currentBloxPeerId}
      connectionStatus={bloxsConnectionStatus[item.peerId]}
      onSelect={handleBloxSelect}
    />
  );

  const renderSeparator = () => (
    <FxBox height={1} backgroundColor="border" marginHorizontal="20" />
  );

  return (
    <FxBottomSheetModal ref={ref}>
      <FxBox flex={1}>
        <FxBox paddingHorizontal="20" paddingVertical="16" borderBottomWidth={1} borderBottomColor="border">
          <FxText variant="bodyLargeRegular" color="content1" textAlign="center">
            Select Blox Device
          </FxText>
        </FxBox>
        
        <FlatList
          data={bloxList}
          keyExtractor={(item) => item.peerId}
          renderItem={renderBloxItem}
          ItemSeparatorComponent={renderSeparator}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      </FxBox>
    </FxBottomSheetModal>
  );
});

BloxSelectionBottomSheet.displayName = 'BloxSelectionBottomSheet';
