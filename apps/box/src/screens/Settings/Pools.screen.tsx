import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Reanimated from 'react-native-reanimated';
import {
  FxBox,
  FxHeader,
  FxText,
  FxTextInput,
} from '@functionland/component-library';
import { PoolCard } from '../../components/Cards/PoolCard';
import { usePoolsStore } from '../../stores/usePoolsStore';
import { shallow } from 'zustand/shallow';
import MyLoader from '../../components/ContentLoader';
import { SearchBar } from 'react-native-screens';
import { range } from 'lodash';

export const PoolsScreen = () => {
  const [isList, setIsList] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [pools, joinPool, cancelPoolJoin, getPools, leavePool] = usePoolsStore(
    (state) => [
      state.pools,
      state.joinPool,
      state.cancelPoolJoin,
      state.getPools,
      state.leavePool,
    ],
    shallow
  );

  const onChangeSearch = (query) => setSearch(query ? query : '');

  useEffect(() => {
    setIsLoaded(false);
    setIsError(false);
    getPools(search)
      .then((_) => {
        setIsLoaded(true);
        setIsError(false);
      })
      .catch((e) => {
        setIsLoaded(false);
        setIsError(true);
        console.log('error getting pools: ', e);
      });
  }, [search]);
  console.log(pools);

  if (isError) {
    return (
      <FxText variant="bodyMediumRegular" textAlign="center" fontSize={24}>
        Error getting list of pools!
      </FxText>
    );
  }
  return (
    <Reanimated.FlatList
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <FxBox>
          <FxHeader
            title="Pools"
            marginBottom="16"
            isList={isList}
            setIsList={setIsList}
          />
          <FxTextInput
            placeholder="Search pools..."
            onChangeText={onChangeSearch}
            value={search}
          />
        </FxBox>
      }
      data={
        isLoaded ? pools : Array.from({ length: 5 }, (_value, index) => index)
      }
      keyExtractor={(item) => item.poolID}
      renderItem={({ item }) =>
        !isLoaded ? (
          <MyLoader />
        ) : (
          <PoolCard
            pool={item}
            isDetailed={!isList}
            isRequested={item.requested}
            isJoined={item.joined}
            numVotes={item.numVotes}
            numVoters={item.numVoters}
            leavePool={leavePool}
            joinPool={joinPool}
            cancelJoinPool={cancelPoolJoin}
          />
        )
      }
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 20,
  },
});
