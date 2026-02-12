import React from 'react';
import {
  FxBottomSheetModal,
  FxBottomSheetModalMethods,
  FxBox,
  FxCard,
  FxText,
} from '@functionland/component-library';
import { FlatList } from 'react-native';
import { DiscoveredDevice } from '../utils/ble';
import { useTranslation } from 'react-i18next';

type Props = {
  devices: DiscoveredDevice[];
  onSelect: (peripheralId: string) => void;
  onDismiss?: () => void;
};

const BleDeviceSelectionBottomSheet = React.forwardRef<
  FxBottomSheetModalMethods,
  Props
>(({ devices, onSelect, onDismiss }, ref) => {
  const { t } = useTranslation();

  const renderItem = ({ item }: { item: DiscoveredDevice }) => (
    <FxCard
      flexDirection="row"
      justifyContent="space-between"
      marginBottom="8"
      paddingHorizontal="16"
      paddingVertical="8"
      onPress={() => onSelect(item.peripheral.id)}
    >
      <FxBox flex={1}>
        <FxText variant="bodyMediumRegular">{item.peripheral.name}</FxText>
        <FxText variant="bodyXXSRegular" color="content3">
          {item.peripheral.id}
        </FxText>
      </FxBox>
      <FxBox justifyContent="center">
        <FxText variant="bodySmallRegular" color="content2">
          {t('bleDeviceSelection.signal')}: {item.rssi} dBm
        </FxText>
      </FxBox>
    </FxCard>
  );

  return (
    <FxBottomSheetModal
      ref={ref}
      title={t('bleDeviceSelection.title')}
      onDismiss={onDismiss}
    >
      <FxText variant="bodySmallRegular" color="content2" marginBottom="16">
        {t('bleDeviceSelection.subtitle')}
      </FxText>
      <FlatList
        data={devices}
        renderItem={renderItem}
        keyExtractor={(item) => item.peripheral.id}
      />
    </FxBottomSheetModal>
  );
});

BleDeviceSelectionBottomSheet.displayName = 'BleDeviceSelectionBottomSheet';

export { BleDeviceSelectionBottomSheet };
