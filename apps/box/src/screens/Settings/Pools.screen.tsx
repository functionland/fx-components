import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { FxHeader } from '@functionland/component-library';
import { PoolCard } from '../../components/Cards/PoolCard';
import { mockPoolData } from '../../api/pool';

export const PoolsScreen = () => {
  const [isList, setIsList] = useState<boolean>(false);

  return (
    <Reanimated.FlatList
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <FxHeader
          title="Pools"
          marginBottom="16"
          isList={isList}
          setIsList={setIsList}
        />
      }
      data={mockPoolData}
      keyExtractor={(item) => item.poolId}
      renderItem={({ item }) => <PoolCard pool={item} isDetailed={!isList} />}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 20,
  },
});
