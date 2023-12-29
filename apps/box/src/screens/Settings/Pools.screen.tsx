import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Reanimated from 'react-native-reanimated';
import { FxHeader } from '@functionland/component-library';
import { PoolCard } from '../../components/Cards/PoolCard';
import { usePoolsStore } from '../../stores/usePoolsStore';
import { shallow } from 'zustand/shallow';
export const PoolsScreen = () => {
  const [isList, setIsList] = useState<boolean>(false);
  const [pools, joinPool, getPools, leavePool] = usePoolsStore(
    (state) => [state.pools, state.joinPool, state.getPools, state.leavePool],
    shallow
  );
  useEffect(() => {
    getPools();
  }, [getPools]);
  console.log(pools);

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
      data={pools}
      keyExtractor={(item) => item.requestNumber}
      renderItem={({ item }) => (
        <PoolCard
          pool={item}
          isDetailed={!isList}
          isRequested={item.requested}
          isJoined={item.joined}
          numVotes={item.numVotes}
          numVoters={item.numVoters}
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
