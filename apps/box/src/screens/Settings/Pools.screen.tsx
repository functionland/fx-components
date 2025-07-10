import React, { useEffect, useState } from 'react';
import { RefreshControl, StyleSheet, Alert } from 'react-native';
import Reanimated from 'react-native-reanimated';
import {
  FxBox,
  FxButton,
  FxHeader,
  FxRefreshIcon,
  FxSpacer,
  FxText,
  FxTextInput,
  useToast,
  FxProgressBar,
} from '@functionland/component-library';
import { PoolCard } from '../../components/Cards/PoolCard';
import { usePools } from '../../hooks/usePools';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useBloxsStore } from '../../stores/useBloxsStore';
import MyLoader from '../../components/ContentLoader';
import { useLogger } from '../../hooks';
import { CHAIN_DISPLAY_NAMES } from '../../contracts/config';

// --- Add this union type for FlatList items ---
type PoolListItem =
  | { type: 'pool'; pool: import('../../hooks/usePools').PoolData & import('../../models/pool').TPool }
  | { type: 'skeleton'; id: number };

export const PoolsScreen = () => {
  const [isList, setIsList] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(true);
  const [allowJoin, setAllowJoin] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const logger = useLogger();
  const { queueToast } = useToast();
  // Use new contract-based pools hook
  const {
    pools,
    loading: poolsLoading,
    error: poolsError,
    enableInteraction,
    joinPool,
    leavePool,
    cancelJoinRequest,
    loadPools,
    isReady: contractReady,
    connectedAccount,
  } = usePools();

  const selectedChain = useSettingsStore((state) => state.selectedChain);

  const [
    checkChainSyncStatus,
    isChainSynced,
    syncProgress,
  ] = useBloxsStore((state) => [
    state.checkChainSyncStatus,
    state.isChainSynced,
    state.syncProgress,
  ]);

  const onChangeSearch = (query) => setSearch(query ? query : '');

  useEffect(() => {
    checkChainSyncStatus(); // Start the synchronization check
  }, []);
  

  useEffect(() => {
    setIsError(false);
    if (refreshing) {
      reloading();
    }
  }, [refreshing, contractReady]);

  // Update allowJoin when pools or enableInteraction changes
  useEffect(() => {
    setAllowJoin(
      pools.filter((pool) => pool.joined || pool.requested).length === 0 &&
        enableInteraction
    );
  }, [pools, enableInteraction]);

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
      if (!contractReady) {
        queueToast({
          type: 'error',
          title: 'Contract Not Ready',
          message: 'Please connect your wallet and wait for contract initialization',
        });
        return;
      }

      setRefreshing(true);
      const result = await joinPool(poolID.toString());
      if (result !== null) {
        queueToast({
          type: 'success',
          title: 'Pool Join Requested',
          message: 'Your join request has been submitted successfully',
        });
      }
    } catch (e) {
      handlePoolActionErrors('Error joining pool', e.toString());
    } finally {
      setRefreshing(false);
    }
  };

  const wrappedLeavePool = async (poolID: number) => {
    try {
      if (!contractReady) {
        queueToast({
          type: 'error',
          title: 'Contract Not Ready',
          message: 'Please connect your wallet and wait for contract initialization',
        });
        return;
      }

      setRefreshing(true);
      const result = await leavePool(poolID.toString());
      if (result !== null) {
        queueToast({
          type: 'success',
          title: 'Left Pool',
          message: 'You have successfully left the pool',
        });
      }
    } catch (e) {
      handlePoolActionErrors('Error leaving', e.toString());
    } finally {
      setRefreshing(false);
    }
  };

  const wrappedCancelJoinPool = async (poolID: number) => {
    try {
      if (!contractReady) {
        queueToast({
          type: 'error',
          title: 'Contract Not Ready',
          message: 'Please connect your wallet and wait for contract initialization',
        });
        return;
      }

      setRefreshing(true);
      const result = await cancelJoinRequest(poolID.toString());
      if (result !== null) {
        queueToast({
          type: 'success',
          title: 'Join Request Cancelled',
          message: 'Your join request has been cancelled',
        });
      }
    } catch (e) {
      handlePoolActionErrors('Error canceling pool join request', e.toString());
    } finally {
      setRefreshing(false);
    }
  };

  const reloading = async () => {
    try {
      if (contractReady) {
        await loadPools();
        console.log('enableInteraction: ', enableInteraction);
        setAllowJoin(
          pools.filter((pool) => pool.joined || pool.requested).length === 0 &&
            enableInteraction
        );
      }
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
          refreshing={false}
          onRefresh={() => setRefreshing(true)}
        />
      }
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <FxBox>
          {/* Chain and Contract Status */}
          <FxBox marginBottom="16" padding="12" backgroundColor="backgroundSecondary" borderRadius="m">
            <FxText variant="bodyMediumRegular" marginBottom="8">
              Network Status
            </FxText>
            <FxBox flexDirection="row" alignItems="center" justifyContent="space-between">
              <FxBox flexDirection="row" alignItems="center">
                <FxBox
                  width="8"
                  height="8"
                  borderRadius="s"
                  backgroundColor={contractReady ? 'greenBase' : 'errorBase'}
                  marginRight="8"
                />
                <FxText variant="bodySmallRegular">
                  {CHAIN_DISPLAY_NAMES[selectedChain]}
                </FxText>
              </FxBox>
              <FxText variant="bodyXSRegular" color={contractReady ? 'greenBase' : 'errorBase'}>
                {contractReady ? 'Connected' : 'Disconnected'}
              </FxText>
            </FxBox>
            {connectedAccount && (
              <FxText variant="bodyXSRegular" color="content2" marginTop="4">
                Account: {connectedAccount.slice(0, 6)}...{connectedAccount.slice(-4)}
              </FxText>
            )}
          </FxBox>

          <FxBox flex={1}>
            { syncProgress > 0 && syncProgress < 2  &&
              <FxBox
                flexDirection="row"
                alignItems='center'
              >
                <FxText>Chain is Syncing: {Math.floor(syncProgress)}%</FxText>
                <FxProgressBar
                  height={5}
                  progress={syncProgress > 0 ? syncProgress : 0}
                  flex={1}
                  total={100}
                ></FxProgressBar>
              </FxBox>
            }
            <FxHeader
              title="Pools"
              marginBottom="16"
              isList={isList}
              setIsList={setIsList}
            />
          </FxBox>
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
          ? (pools.filter((pool) =>
              search !== ''
                ? pool.name?.toLowerCase().includes(search?.toLowerCase())
                : true
            ).map(pool => ({ type: 'pool', pool })) as PoolListItem[])
          : (Array.from({ length: 5 }, (_value, index) => ({ type: 'skeleton', id: index })) as PoolListItem[])
      }
      keyExtractor={(item: PoolListItem) =>
        item.type === 'pool' ? item.pool.poolID : `skeleton-${item.id}`
      }
      renderItem={({ item }: { item: PoolListItem }) => {
        if (item.type === 'skeleton') {
          return <MyLoader key={`skeleton-${item.id}`} />;
        }
        const pool = item.pool;
        return (
          <PoolCard
            key={pool.poolID}
            pool={pool}
            isDetailed={!isList}
            isRequested={pool.requested}
            isJoined={pool.joined}
            numVotes={pool.numVotes}
            numVoters={pool.numVoters}
            leavePool={wrappedLeavePool}
            joinPool={allowJoin ? wrappedJoinPool : undefined}
            cancelJoinPool={wrappedCancelJoinPool}
          />
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 20,
  },
});
