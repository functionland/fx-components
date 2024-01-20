import React, { useEffect, useState } from 'react';
import { RefreshControl, StyleSheet } from 'react-native';
import Reanimated from 'react-native-reanimated';
import {
  FxBox,
  FxButton,
  FxHeader,
  FxRefreshIcon,
  FxSearchIcon,
  FxSpacer,
  FxText,
  FxTextInput,
  useToast,
} from '@functionland/component-library';
import { PoolCard } from '../../components/Cards/PoolCard';
import { usePoolsStore } from '../../stores/usePoolsStore';
import { shallow } from 'zustand/shallow';
import MyLoader from '../../components/ContentLoader';
import { useLogger } from '../../hooks';

export const PoolsScreen = () => {
  const [isList, setIsList] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(true);
  const [allowJoin, setAllowJoin] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const logger = useLogger();
  const { queueToast } = useToast();
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
    setIsError(false);
    reloading();
  }, [dirty, refreshing]);

  const handlePoolActionErrors = (title: string, message: string) => {
    console.log(title, message);
    queueToast({
      type: 'error',
      title: title,
      message: message,
    });
    logger.logError('Pools action error: ', message);
  };

  const wrappedJoinPool = async (poolID: number) => {
    try {
      await joinPool(poolID);
    } catch (e) {
      handlePoolActionErrors('Error joining pool', e.toString());
    }
  };

  const wrappedLeavePool = async (poolID: number) => {
    try {
      await leavePool(poolID);
    } catch (e) {
      handlePoolActionErrors('Error leaving', e.toString());
    }
  };

  const wrappedCancelJoinPool = async (poolID: number) => {
    try {
      await cancelPoolJoin(poolID);
    } catch (e) {
      handlePoolActionErrors('Error canceling pool join request', e.toString());
    }
  };

  const reloading = async () => {
    try {
      await getPools();
      console.log('enableInteraction: ', enableInteraction);
      setAllowJoin(
        pools.filter((pool) => pool.joined || pool.requested).length === 0 &&
          enableInteraction
      );
    } catch (e) {
      setIsError(true);
      console.log('Error getting pools: ', e);
      queueToast({
        type: 'error',
        title: 'Error getting pools',
        message: e.toString(),
      });
      logger.logError('Pools::reloading', e);
    } finally {
      setRefreshing(false);
    }
  };
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
          onPress={() => {
            setSearch('');
            setRefreshing(true);
          }}
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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => setRefreshing(true)}
        />
      }
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <FxBox>
          <FxHeader
            title="Pools"
            marginBottom="16"
            isList={isList}
            setIsList={setIsList}
          />
          <FxBox
            flexDirection="row"
            alignItems="center"
            justifyContent="space-evenly"
          >
            <FxBox flex={1}>
              <FxTextInput
                placeholder="Search pools..."
                onChangeText={onChangeSearch}
                clearButtonMode="always"
                alignContent="stretch"
                value={search}
              />
            </FxBox>
            <FxBox flex={0} paddingLeft="16" flexDirection="column">
              <FxButton
                onPress={() => {
                  setSearch('');
                  setRefreshing(true);
                }}
                paddingHorizontal="16"
                flex={1}
                icon={<FxRefreshIcon />}
              >
                Retry
              </FxButton>
            </FxBox>
          </FxBox>
        </FxBox>
      }
      data={
        !refreshing
          ? pools.filter((pool) =>
              search !== ''
                ? pool.name?.toLowerCase().includes(search?.toLowerCase())
                : true
            )
          : Array.from({ length: 5 }, (_value, index) => index)
      }
      keyExtractor={(item) => item.poolID}
      renderItem={({ item }) =>
        refreshing ? (
          <MyLoader />
        ) : (
          <PoolCard
            pool={item}
            isDetailed={!isList}
            isRequested={item.requested}
            isJoined={item.joined}
            numVotes={item.numVotes}
            numVoters={item.numVoters}
            leavePool={wrappedLeavePool}
            joinPool={allowJoin ? wrappedJoinPool : undefined}
            cancelJoinPool={wrappedCancelJoinPool}
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
