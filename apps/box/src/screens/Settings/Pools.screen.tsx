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
import { usePoolsStore } from '../../stores/usePoolsStore';
import MyLoader from '../../components/ContentLoader';
import { useLogger } from '../../hooks';
import { CHAIN_DISPLAY_NAMES } from '../../contracts/config';
import { useUserProfileStore } from '../../stores/useUserProfileStore';
import { useNavigation } from '@react-navigation/native';
import { Routes } from '../../navigation/navigationConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';
import { useTranslation } from 'react-i18next';
import { useSDK } from '@metamask/sdk-react';
import { useWalletNetwork } from '../../hooks/useWalletNetwork';
import { WalletNotification } from '../../components/WalletNotification';
import { CurrentBloxIndicator } from '../../components';

// --- Add this union type for FlatList items ---
type PoolListItem =
  | { type: 'pool'; pool: import('../../hooks/usePools').PoolData & import('../../models/pool').TPool }
  | { type: 'skeleton'; id: number };

export const PoolsScreen = () => {
  const { t } = useTranslation();
  const { sdk } = useSDK(); // Add MetaMask SDK access for provider cleanup
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

  // Get Blox join pool method from store
  const joinPoolBlox = usePoolsStore((state) => state.joinPool);
  const currentBloxPeerId = useBloxsStore((state) => state.currentBloxPeerId);

  const selectedChain = useSettingsStore((state) => state.selectedChain);

  // Network switching functionality
  const { 
    isOnCorrectNetwork, 
    isSwitchingNetwork, 
    withCorrectNetwork, 
    ensureCorrectNetworkConnection,
    targetNetworkName 
  } = useWalletNetwork();

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

  // Enhanced join pool with two-step process
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

      if (!currentBloxPeerId) {
        queueToast({
          type: 'error',
          title: 'Blox Peer ID Missing',
          message: 'Blox peer ID is not available.',
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
              await performEnhancedJoinPool(poolID, poolName);
            },
          },
        ]
      );
    } catch (e) {
      handlePoolActionErrors('Error joining pool', e.toString());
    }
  };

  const performEnhancedJoinPool = async (poolID: string, poolName: string) => {
    setRefreshing(true);
    const poolIdNum = parseInt(poolID, 10);

    // Load existing join state
    const key = `joinState_${poolID}_${currentBloxPeerId}`;
    let joinState = { step1Complete: false, step2Complete: false, step1Error: '', step2Error: '' };

    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        joinState = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading join state:', error);
    }

    try {
      // Step 1: Call Blox join pool method (if not already completed)
      if (!joinState.step1Complete) {
        try {
          console.log('Step 1: Calling Blox joinPool method...');
          const response = await joinPoolBlox(poolIdNum);
          console.log('Step 1: Blox joinPool response:', response);

          joinState.step1Complete = true;
          joinState.step1Error = '';
          console.log('Step 1: Blox joinPool succeeded');
        } catch (error) {
          console.error('Step 1: Blox joinPool failed:', error);
          joinState.step1Error = error instanceof Error ? error.message : String(error);
          // Continue to step 2 even if step 1 fails
        }
      }

      // Step 2: Call API to join the pool (always execute if not completed)
      if (!joinState.step2Complete) {
        try {
          console.log('Step 2: Calling API joinPool....');
          const result = await joinPoolViaAPI(poolID, poolName);

          if (result.success) {
            joinState.step2Complete = true;
            joinState.step2Error = '';
            console.log('Step 2: API joinPool succeeded');
          } else {
            throw new Error(result.message || 'Join request failed');
          }
        } catch (error) {
          console.error('Step 2: API joinPool failed:', error);
          joinState.step2Error = error instanceof Error ? error.message : String(error);
        }
      }

      // Save state
      await AsyncStorage.setItem(key, JSON.stringify(joinState));

      // Show appropriate message based on results
      if (joinState.step1Complete && joinState.step2Complete) {
        // Both steps succeeded
        queueToast({
          type: 'success',
          title: 'Pool Joined Successfully',
          message: 'You are now a member of the pool!',
        });
        // Clear the stored state since join is complete
        await AsyncStorage.removeItem(key);
      } else if (!joinState.step1Complete && joinState.step2Complete) {
        // Step 1 failed but step 2 succeeded
        queueToast({
          type: 'warning',
          title: 'Join Request Submitted',
          message: 'Your join request has been submitted. It may take up to 1 hour to get processed.',
        });
      } else if (joinState.step1Complete && !joinState.step2Complete) {
        // Step 1 succeeded but step 2 failed
        queueToast({
          type: 'warning',
          title: 'Partial Join Complete',
          message: 'Blox configuration updated. Please try again to complete the process.',
        });
      } else {
        // Both steps failed
        const errorMessage = joinState.step2Error || joinState.step1Error || 'Join failed';

        if (errorMessage.includes('401') || errorMessage.includes('not registered')) {
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
            message: errorMessage,
          });
        }
      }
    } finally {
      setRefreshing(false);
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

      // Don't set refreshing=true here! It triggers immediate pool reload
      console.log('wrappedJoinPool: Starting join pool transaction...');
      
      // Ensure MetaMask is on the correct network before transaction
      const result = await withCorrectNetwork(async () => {
        return await joinPool(poolID.toString());
      });

      if (result !== null) {
        console.log('wrappedJoinPool: Transaction successful, now refreshing pools...');
        queueToast({
          type: 'success',
          title: 'Pool Join Requested',
          message: 'Your join request has been submitted successfully',
        });
        // Only refresh pools AFTER successful transaction
        setRefreshing(true);
      }
    } catch (e: any) {
      console.error('wrappedJoinPool: Error occurred:', e);
      
      // Handle network switch required error specifically
      if (e.message?.includes('NETWORK_SWITCH_REQUIRED')) {
        queueToast({
          type: 'warning',
          title: 'Network Switch Required',
          message: 'Please use the network notification above to switch to the correct network, then try again.',
          autoHideDuration: 5000,
        });
      } else {
        handlePoolActionErrors('Error joining pool', e.toString());
      }
    }
    // Don't set refreshing=false in finally block since we only set it to true on success
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
    let notificationShown = false;
    let transactionCompleted = false;
    let resolveTransaction = () => {};
    
    // Create a promise that resolves when transaction completes (similar to LinkPassword pattern)
    const transactionPromise = new Promise<void>((resolve) => {
      resolveTransaction = resolve;
    });
    
    try {
      if (!contractReady) {
        queueToast({
          type: 'error',
          title: t('pools.contractNotReady'),
          message: t('pools.connectWalletMessage'),
          autoHideDuration: 4000,
        });
        return;
      }

      // Show foreground service notification similar to LinkPassword
      try {
        // Register foreground service first (required for foreground notifications)
        notifee.registerForegroundService(() => transactionPromise);
        
        await notifee.displayNotification({
          id: 'leavePool',
          title: t('pools.leavingPool'),
          body: t('pools.leavePoolInProgress'),
          android: {
            progress: {
              indeterminate: true,
            },
            pressAction: {
              id: 'default',
            },
            ongoing: true,
            asForegroundService: true,
            channelId: 'sticky',
          },
        });
        notificationShown = true;
      } catch (notificationError) {
        console.warn('Failed to show notification:', notificationError);
        // Continue with transaction even if notification fails
      }

      console.log('wrappedLeavePool: Starting leave pool transaction...', { poolID });
      
      // Clean up any existing MetaMask listeners/requests before transaction (prevents stale popups)
      try {
        const provider = await sdk?.getProvider();
        if (provider && typeof provider.removeAllListeners === 'function') {
          console.log('wrappedLeavePool: Cleaning up existing MetaMask listeners');
          provider.removeAllListeners();
        }
      } catch (cleanupError) {
        console.warn('wrappedLeavePool: Failed to cleanup MetaMask listeners:', cleanupError);
      }
      
      // Show initial feedback toast
      queueToast({
        type: 'info',
        title: t('pools.leavingPool'),
        message: t('pools.confirmTransactionInWallet'),
        autoHideDuration: 3000,
      });

      // Ensure MetaMask is on the correct network before transaction
      const result = await withCorrectNetwork(async () => {
        return await leavePool(poolID.toString());
      });

      if (result !== null) {
        console.log('wrappedLeavePool: Transaction successful, now refreshing pools...');
        
        // Resolve transaction promise for foreground service
        resolveTransaction();
        
        // Show success notification
        queueToast({
          type: 'success',
          title: t('pools.leftPoolSuccess'),
          message: t('pools.leftPoolSuccessMessage'),
          autoHideDuration: 4000,
        });
        
        // Only refresh pools AFTER successful transaction
        setRefreshing(true);
      } else {
        // Handle case where result is null (transaction failed or was cancelled)
        console.warn('wrappedLeavePool: Leave pool returned null');
        
        // Resolve transaction promise for foreground service
        resolveTransaction();
        
        queueToast({
          type: 'warning',
          title: t('pools.transactionCancelled'),
          message: t('pools.leavePoolCancelledMessage'),
          autoHideDuration: 4000,
        });
      }
    } catch (error: any) {
      console.error('wrappedLeavePool: Error occurred:', error);
      
      // Enhanced error handling with specific error messages
      let errorTitle = t('pools.leavePoolError');
      let errorMessage = t('pools.leavePoolErrorMessage');
      
      if (error?.message) {
        if (error.message.includes('User denied') || error.message.includes('rejected')) {
          errorTitle = t('pools.transactionRejected');
          errorMessage = t('pools.transactionRejectedMessage');
        } else if (error.message.includes('insufficient funds')) {
          errorTitle = t('pools.insufficientFunds');
          errorMessage = t('pools.insufficientFundsMessage');
        } else if (error.message.includes('network')) {
          errorTitle = t('pools.networkError');
          errorMessage = t('pools.networkErrorMessage');
        } else {
          errorMessage = error.message;
        }
      }
      
      queueToast({
        type: 'error',
        title: errorTitle,
        message: errorMessage,
        autoHideDuration: 5000,
      });
      
      // Resolve transaction promise for foreground service (even on error)
      resolveTransaction();
      
      // Log error for debugging
      logger.logError('wrappedLeavePool', error);
    } finally {
      // Always stop the foreground service notification
      if (notificationShown) {
        try {
          await notifee.stopForegroundService();
          await notifee.cancelNotification('leavePool');
        } catch (cleanupError) {
          console.warn('Failed to cleanup notification:', cleanupError);
        }
      }
      
      // Always clean up MetaMask listeners after transaction (prevents stale requests)
      try {
        const provider = await sdk?.getProvider();
        if (provider && typeof provider.removeAllListeners === 'function') {
          console.log('wrappedLeavePool: Final cleanup of MetaMask listeners');
          provider.removeAllListeners();
        }
      } catch (finalCleanupError) {
        console.warn('wrappedLeavePool: Failed to perform final MetaMask cleanup:', finalCleanupError);
      }
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

          {/* Current Blox Indicator */}
          <FxBox marginBottom="16">
            <CurrentBloxIndicator compact={true} showConnectionStatus={true} />
          </FxBox>

          {/* Wallet Connection and Network Notification - Disabled to prevent flicker */}
          {/* <WalletNotification compact={false} hideOnLoading={poolsLoading || refreshing} /> */}

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
