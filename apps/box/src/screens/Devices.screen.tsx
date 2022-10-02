import React, { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import {
  FxBox,
  FxHeader,
  FxSafeAreaBox,
  FxSpacer,
  FxText,
} from '@functionland/component-library';
import { DeviceCard } from '../components';
import { mockHub } from '../api/hub';

export const DevicesScreen = () => {
  const [isList, setIsList] = useState<boolean>(false);

  return (
    <FxSafeAreaBox flex={1} edges={['top']}>
      <FxBox paddingHorizontal="20" paddingVertical="12">
        <FxText variant="h300">Connected Devices</FxText>
        <FxSpacer marginTop="24" />
        <FxHeader title="All Cards" isList={isList} setIsList={setIsList} />
      </FxBox>
      <FlatList
        contentContainerStyle={styles.devicesList}
        data={[mockHub[0]]}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => <DeviceCard data={item} marginBottom="16" />}
      />
    </FxSafeAreaBox>
  );
};

const styles = StyleSheet.create({
  devicesList: {
    padding: 20,
  },
});
