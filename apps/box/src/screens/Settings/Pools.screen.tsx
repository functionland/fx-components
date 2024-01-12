import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Reanimated from 'react-native-reanimated';
import {
  FxBox,
  FxButton,
  FxHeader,
  FxRefreshIcon,
  FxText,
  FxTextInput,
} from '@functionland/component-library';
import { PoolCard } from '../../components/Cards/PoolCard';
import { usePoolsStore } from '../../stores/usePoolsStore';
import { shallow } from 'zustand/shallow';
import MyLoader from '../../components/ContentLoader';

export const PoolsScreen = () => {
  const [isList, setIsList] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [allowJoin, setAllowJoin] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [
    pools,
    joinPool,
    cancelPoolJoin,
    getPools,
    leavePool,
    dirty,
    setDirty,
  ] = usePoolsStore(
    (state) => [
      state.pools,
      state.joinPool,
      state.cancelPoolJoin,
      state.getPools,
      state.leavePool,
      state.dirty,
      state.setDirty,
    ],
    shallow
  );

  const onChangeSearch = (query) => setSearch(query ? query : '');
  useEffect(() => {
    setIsLoaded(false);
    setIsError(false);
    getPools()
      .then((_) => {
        setIsLoaded(true);
        setIsError(false);
      })
      .catch((e) => {
        setIsLoaded(false);
        setIsError(true);
        console.log('error getting pools: ', e);
      });
    if (pools.filter((pool) => pool.joined || pool.requested).length > 0) {
      setAllowJoin(false);
    } else {
      setAllowJoin(true);
    }
  }, [dirty]);
  console.log(pools);

  if (isError) {
    return (
      <FxBox>
        <FxText variant="bodyMediumRegular" textAlign="center" fontSize={24}>
          Error getting list of pools!
        </FxText>
        <FxButton
          onPress={() => setDirty()}
          flexWrap="wrap"
          paddingHorizontal="16"
          iconLeft={<FxRefreshIcon />}
        >
          Join
        </FxButton>
      </FxBox>
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
        isLoaded
          ? pools.filter((pool) =>
              search !== ''
                ? pool.name.includes(search) || pool.requested
                : true
            )
          : Array.from({ length: 5 }, (_value, index) => index)
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
            joinPool={allowJoin ? joinPool : undefined}
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
