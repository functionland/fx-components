import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Reanimated from 'react-native-reanimated';
import {
  FxBox,
  FxButton,
  FxHeader,
  FxRefreshIcon,
  FxSpacer,
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
  const [retry, setRetry] = useState<boolean>(true);
  const [allowJoin, setAllowJoin] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [
    pools,
    enableInteraction,
    joinPool,
    cancelPoolJoin,
    getPools,
    leavePool,
    dirty,
  ] = usePoolsStore(
    (state) => [
      state.pools,
      state.enableInteraction,
      state.joinPool,
      state.cancelPoolJoin,
      state.getPools,
      state.leavePool,
      state.dirty,
    ],
    shallow
  );


  const onChangeSearch = (query) => setSearch(query ? query : '');
  useEffect(() => {
    if (!dirty && !retry) {
      return;
    }
    if (retry) {
      setRetry(false);
    }
    setIsLoaded(false);
    setIsError(false);
    getPools()
      .then((_) => {
        setIsLoaded(true);
        setAllowJoin(
          pools.filter((pool) => pool.joined || pool.requested).length === 0 &&
            enableInteraction
        );
      })
      .catch((e) => {
        setIsLoaded(false);
        console.log('error getting pools: ', e);
      });
  }, [dirty, retry]);
  console.log('$$$$$$$$$$$$$ allow join: ', allowJoin);

  if (isError) {
    return (
      <FxBox
        flex={3}
        justifyContent="center"
        paddingVertical="20"
        alignItems="center"
      >
        <FxText variant="bodyMediumRegular" textAlign="center" fontSize={24}>
          Error loading pools!
        </FxText>
        <FxSpacer marginTop="16" />
        <FxButton
          onPress={() => setRetry(true)}
          flexWrap="wrap"
          paddingHorizontal="16"
          iconLeft={<FxRefreshIcon />}
        >
          Retry
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
