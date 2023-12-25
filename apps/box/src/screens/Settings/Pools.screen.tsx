import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { FxHeader } from '@functionland/component-library';
import { PoolCard } from '../../components/Cards/PoolCard';
import { blockchain } from '@functionland/react-native-fula'
import { usePoolsStore } from '../../stores/usePoolsStore';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { shallow } from 'zustand/shallow';
import { useBloxsStore } from '../../stores';
export const PoolsScreen = () => {
  const [isList, setIsList] = useState<boolean>(false);
  const { joinPool, cancelPoolJoin, getPools, leavePool } = usePoolsStore();
  // getPools(accounts[0].a);
  // console.log(pools);
  const pools = {};

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
      data={Object.values(pools)}
      keyExtractor={(item) => item.poolId}
      renderItem={({ item }) => (
        <PoolCard
          pool={item}
          isDetailed={!isList}
          isRequested={item.requested}
          isJoined={item.joined}
          leavePool={leavePool}
          joinPool={joinPool}
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 20,
  },
});
