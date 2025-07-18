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
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { useNavigation } from '@react-navigation/native';
import { Routes } from '../../navigation/navigationConfig';

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
  const [hasInitialLoadCompleted, setHasInitialLoadCompleted] = useState<boolean>(false);
  const logger = useLogger();
  const { queueToast } = useToast();
  const navigation = useNavigation();
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
    // New API-based functions
    joinPoolViaAPI,
    leavePoolViaAPI,
    cancelJoinRequestViaAPI,
    checkUserMembership,
    userIsMemberOfAnyPool,
    userMemberPools,
    userActiveRequests,
  } = usePools();

  const selectedChain = useSettingsStore((state) => state.selectedChain);

  const onChangeSearch = (query) => setSearch(query ? query : '');

  // Set a timeout to mark initial load as completed after a reasonable delay
  // This ensures that warnings can be shown even if contract initialization fails
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hasInitialLoadCompleted) {
        console.log('⏰ Timeout reached, marking initial load as completed');
        setHasInitialLoadCompleted(true);
      }
    }, 5000); // 5 seconds timeout

    return () => clearTimeout(timeout);
  }, [hasInitialLoadCompleted]);

  useEffect(() => {
    setIsError(false);
    if (refreshing) {
      reloading();
    }
  }, [refreshing, contractReady]);

  // Load pools when component mounts and contract is ready
  useEffect(() => {
    console.log('useEffect triggered - contractReady:', contractReady, 'refreshing:', refreshing, 'connectedAccount:', connectedAccount);
    if (contractReady && !refreshing && connectedAccount) {
      console.log('Contract ready, loading pools...');
      setRefreshing(true);
    }
  }, [contractReady, connectedAccount]);

  // Debug effect to log pools state changes
  useEffect(() => {
    console.log('Pools screen state changed:', {
      poolsCount: pools.length,
      loading: poolsLoading,
      error: poolsError,
      enableInteraction,
      contractReady,
      connectedAccount: connectedAccount ? `${connectedAccount.slice(0, 6)}...${connectedAccount.slice(-4)}` : 'none'
    });

    // Log the specific issue
    if (connectedAccount && !contractReady) {
      console.log('🚨 ISSUE: Wallet connected but contract not ready!');
      console.log('connectedAccount:', connectedAccount);
      console.log('contractReady:', contractReady);
      console.log('enableInteraction:', enableInteraction);
    }
  }, [pools, poolsLoading, poolsError, enableInteraction, contractReady, connectedAccount]);

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

  // New API-based join pool with user confirmation
  const wrappedJoinPoolViaAPI = async (poolID: string, poolName: string) => {
    try {
      if (!contractReady) {
        queueToast({
          type: 'error',
          title: 'Contract Not Ready',
          message: 'Please connect your wallet and wait for contract initialization',
        });
        return;
      }

      // Ask user for confirmation
      Alert.alert(
        'Join Pool Confirmation',
        `Are you sure you want to join pool "${poolName}" on ${CHAIN_DISPLAY_NAMES[selectedChain]} for your Blox?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Join',
            onPress: async () => {
              setRefreshing(true);
              try {
                const result = await joinPoolViaAPI(poolID, poolName);
                if (result.success) {
                  queueToast({
                    type: 'success',
                    title: 'Pool Join Requested',
                    message: result.message,
                  });
                } else {
                  if (result.message.includes('not registered')) {
                    Alert.alert(
                      'Blox Not Registered',
                      'Your Blox is not registered. Please contact sales@fx.land or register your Blox.',
                      [
                        {
                          text: 'Contact Sales',
                          onPress: () => {
                            // Could open email client or navigate to contact
                          },
                        },
                        {
                          text: 'Register Blox',
                          onPress: () => {
                            // Navigate to Users tab
                          },
                        },
                        {
                          text: 'OK',
                          style: 'cancel',
                        },
                      ]
                    );
                  } else {
                    queueToast({
                      type: 'error',
                      title: 'Join Pool Failed',
                      message: result.message,
                    });
                  }
                }
              } catch (e) {
                handlePoolActionErrors('Error joining pool', e.toString());
              } finally {
                setRefreshing(false);
              }
            },
          },
        ]
      );
    } catch (e) {
      handlePoolActionErrors('Error joining pool', e.toString());
    }
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

  // New API-based leave pool
  const wrappedLeavePoolViaAPI = async (poolID: string) => {
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
      const result = await leavePoolViaAPI(poolID);
      if (result.success) {
        queueToast({
          type: 'success',
          title: 'Left Pool',
          message: result.message,
        });
      } else {
        queueToast({
          type: 'error',
          title: 'Leave Pool Failed',
          message: result.message,
        });
      }
    } catch (e) {
      handlePoolActionErrors('Error leaving pool', e.toString());
    } finally {
      setRefreshing(false);
    }
  };

  // New API-based cancel join request
  const wrappedCancelJoinRequestViaAPI = async (poolID: string) => {
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
      const result = await cancelJoinRequestViaAPI(poolID);
      if (result.success) {
        queueToast({
          type: 'success',
          title: 'Join Request Cancelled',
          message: result.message,
        });
      } else {
        queueToast({
          type: 'error',
          title: 'Cancel Request Failed',
          message: result.message,
        });
      }
    } catch (e) {
      handlePoolActionErrors('Error cancelling join request', e.toString());
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

  // Action handlers for new functionality
  const handleViewDetails = (poolID: number) => {
    navigation.navigate(Routes.PoolDetails, { poolId: poolID.toString() });
  };

  const handleViewJoinRequests = (poolID: number) => {
    navigation.navigate(Routes.JoinRequests, { poolId: poolID.toString() });
  };

  const handleVoteOnRequests = (poolID: number) => {
    navigation.navigate(Routes.JoinRequests, { poolId: poolID.toString() });
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
      console.log('🔄 Reloading pools...');
      console.log('  - contractReady:', contractReady);
      console.log('  - connectedAccount:', connectedAccount);
      console.log('  - enableInteraction:', enableInteraction);
      console.log('  - hasInitialLoadCompleted:', hasInitialLoadCompleted);

      if (contractReady && connectedAccount) {
        console.log('✅ Prerequisites met, calling loadPools...');
        await loadPools();
        console.log('✅ Pools loaded, count:', pools.length);
        console.log('enableInteraction: ', enableInteraction);
        setAllowJoin(
          pools.filter((pool) => pool.joined || pool.requested).length === 0 &&
            enableInteraction
        );
        // Mark initial load as completed after successful load
        if (!hasInitialLoadCompleted) {
          setHasInitialLoadCompleted(true);
        }
      } else {
        console.log('❌ Cannot load pools - prerequisites not met:');
        console.log('  - contractReady:', contractReady);
        console.log('  - connectedAccount:', connectedAccount);

        // Only show warning if initial load has completed and we're still not ready
        // This prevents showing the warning during the initial loading phase
        if (hasInitialLoadCompleted) {
          queueToast({
            type: 'warning',
            title: 'Not Ready',
            message: 'Please connect your wallet and wait for contract initialization',
          });
        }
      }
    } catch (e) {
      setIsError(true);
      console.error('Error getting pools: ', e);
      queueToast({
        type: 'error',
        title: 'Error getting pools',
        message: e.toString(),
      });
      logger.logError('Pools::reloading', e);
      // Mark initial load as completed even on error
      if (!hasInitialLoadCompleted) {
        setHasInitialLoadCompleted(true);
      }
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
          onRefresh={() => {
            console.log('Pull to refresh triggered');
            setRefreshing(true);
          }}
        />
      }
      contentContainerStyle={styles.list}
      ListHeaderComponent={() => (
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
                  console.log('Retry button pressed');
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
      )}
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
        // Determine user status for this pool
        const userIsMember = userMemberPools.includes(pool.poolID);
        const hasActiveJoinRequest = userActiveRequests.includes(pool.poolID);
        const canVoteOnRequests = userIsMember; // Members can vote on join requests

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
