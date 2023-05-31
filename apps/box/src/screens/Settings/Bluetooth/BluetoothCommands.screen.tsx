import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import Reanimated from 'react-native-reanimated';
import {
  FxBottomSheetModalMethods,
  FxBox,
  FxHeader,
  FxPlugIcon,
  FxProgressBar,
  FxRefreshIcon,
  FxSafeAreaBox,
} from '@functionland/component-library';
import { PoolCard } from '../../../components/Cards/PoolCard';
import { mockPoolData } from '../../../api/pool';
import { blockchain } from '@functionland/react-native-fula';
import { SmallHeaderText } from '../../../components/Text';
import ScanBluetoothModal from './modals/ScanBluetoothModal';
export const BluetoothCommandsScreen = () => {
  const scanBluetoothModalRef = useRef<FxBottomSheetModalMethods>(null);

  return (
    <FxSafeAreaBox flex={1} paddingHorizontal="20" paddingVertical="16">
      <FxBox
        marginTop="16"
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <SmallHeaderText>Bluetooth commands</SmallHeaderText>
        <FxPlugIcon
          color="white"
          onPress={() => scanBluetoothModalRef.current.present()}
        />
      </FxBox>
      <ScanBluetoothModal ref={scanBluetoothModalRef} />
    </FxSafeAreaBox>
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 20,
  },
});
