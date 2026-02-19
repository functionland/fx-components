import { useState, useEffect, useCallback } from 'react';
import { usePoolOperations } from './useContractIntegration';
import { useWalletNetwork } from './useWalletNetwork';
import {
  PoolInfo,
  UserPoolInfo,
  JoinRequest,
  SupportedChain,
} from '../contracts/types';
import { PoolApiService, JoinPoolRequest } from '../services/poolApiService';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useBloxsStore } from '../stores/useBloxsStore';

export interface PoolData extends PoolInfo {
  requested: boolean;
  joined: boolean;
  numVotes: number;
  numVoters: number;
  hasActiveJoinRequest?: boolean;
  userIsMember?: boolean;
}

export interface PoolsState {
  pools: PoolData[];
  userPool: UserPoolInfo | null;
  loading: boolean;
  error: string | null;
  enableInteraction: boolean;
  userIsMemberOfAnyPool: boolean;
  userMemberPools: string[];
  userActiveRequests: string[];
}

export const usePools = () => {
  const poolOperations = usePoolOperations();
  const { contractService, connectedAccount, isReady } = poolOperations;
  const { isOnCorrectNetwork } = useWalletNetwork();
  const selectedChain = useSettingsStore((state) => state.selectedChain);
  const currentBloxPeerId = useBloxsStore((state) => state.currentBloxPeerId);
  const bloxs = useBloxsStore((state) => state.bloxs);
  // Use ipfs-cluster peerID for all pool/reward operations
  const currentClusterPeerId = currentBloxPeerId
    ? (bloxs[currentBloxPeerId]?.clusterPeerId || currentBloxPeerId)
    : undefined;

  const [state, setState] = useState<PoolsState>({
    pools: [],
    userPool: null,
    loading: false,
    error: null,
    enableInteraction: false,
    userIsMemberOfAnyPool: false,
    userMemberPools: [],
    userActiveRequests: [],
  });

  // Optimized membership check using new contract methods
  // Process: 1. Check if connected account is a member of any pool
  //          2. If yes, check if blox peerId is a member of that pool
  const checkUserMembership = useCallback(async () => {
    console.log('checkUserMembership', {
      readiness: isReady && contractService && connectedAccount,
    });
    if (!isReady || !contractService || !connectedAccount) {
      return {
        isMemberOfAnyPool: false,
        memberPools: [],
        activeRequests: [],
      };
    }

    try {
      // Step 1: Check if connected account is a member of any pool
      const { poolId, requestPoolId } = await contractService.getUserPool(
        connectedAccount,
        currentClusterPeerId
      );

      return {
        isMemberOfAnyPool: poolId !== '0' && poolId !== '', // Only true if user is actually a member (not just has a request)
        memberPools: poolId !== '0' && poolId !== '' ? [poolId] : [],
        activeRequests: requestPoolId !== '0' && requestPoolId !== '' ? [requestPoolId] : [],
      };
    } catch (error) {
      console.error('Error checking user membership:', error);
      return {
        isMemberOfAnyPool: false,
        memberPools: [],
        activeRequests: [],
      };
    }
  }, [isReady, contractService, connectedAccount, currentClusterPeerId]);

  const loadPools = useCallback(async () => {
    console.log(
      'loadPools called - isReady:',
      isReady,
      'contractService:',
      !!contractService,
      'connectedAccount:',
      connectedAccount
    );

    if (!isReady || !contractService || !connectedAccount || !isOnCorrectNetwork) {
      console.log('loadPools: Prerequisites not met - isReady:', isReady, 'contractService:', !!contractService, 'connectedAccount:', !!connectedAccount, 'isOnCorrectNetwork:', isOnCorrectNetwork);
      setState((prev) => ({
        ...prev,
        enableInteraction: false,
        loading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      console.log('🔍 loadPools: Starting...');
      console.log('🔍 connectedAccount:', connectedAccount);
      console.log('🔍 currentClusterPeerId:', currentClusterPeerId);
      console.log('🔍 Calling contractService.listPools...');
      // Get pools from contract
      const poolList = await contractService.listPools(0, 25);
      console.log(
        '🔍 Contract pools received:',
        poolList,
        'count:',
        poolList?.length
      );

      // Check user membership optimally
      console.log('🔍 Starting membership check...');
      let membershipInfo;
      try {
        membershipInfo = await checkUserMembership();
        console.log('🔍 Membership check result:', membershipInfo);
      } catch (error) {
        console.error('🔍 Error in membership check:', error);
        membershipInfo = {
          isMemberOfAnyPool: false,
          memberPools: [],
          activeRequests: [],
        };
      }

      let requested = false;
      let joined = false;
      let numVotes = 0;
      let poolIdOfInterest = '';
      let userPool: UserPoolInfo | null = null;

      try {
        console.log('🔍 Getting user pool info...');
        // Get user pool info from contract - pass both account and cluster peerId
        userPool = await contractService.getUserPool(
          connectedAccount,
          currentClusterPeerId
        );
        console.log('🔍 User pool result:', userPool);

        if (userPool && userPool.poolId !== '0') {
          // User is in a pool
          requested = true;
          joined = true;
          poolIdOfInterest = userPool.poolId;
        } else if (userPool && userPool.requestPoolId !== '0') {
          // User has a pending join request
          poolIdOfInterest = userPool.requestPoolId;
          const joinRequestInfo = await contractService.getJoinRequest(
            userPool.requestPoolId,
            connectedAccount
          );
          console.log('Join request info:', joinRequestInfo);
          numVotes =
            joinRequestInfo.positive_votes + joinRequestInfo.negative_votes;
          requested = true;
          joined = false;
        }

        setState((prev) => ({
          ...prev,
          enableInteraction: true,
          userIsMemberOfAnyPool: membershipInfo.isMemberOfAnyPool,
          userMemberPools: membershipInfo.memberPools,
          userActiveRequests: membershipInfo.activeRequests,
        }));
      } catch (error) {
        console.log('🔍 Error getting user pool info:', error);
        setState((prev) => ({ ...prev, enableInteraction: false }));
      }

      // Transform contract pools to app format
      console.log('🔍 Transforming pools...');
      const transformedPools = poolList.map((pool) => {
        const isUserPool = pool.poolId === poolIdOfInterest;
        const joinInfo = {
          requested: isUserPool ? requested : false,
          joined: isUserPool ? joined : false,
          numVotes: isUserPool ? numVotes : 0,
          numVoters: pool.participants?.length || 0,
        };

        console.log('🔍 Transforming pool:', pool.poolId, pool.name);

        return {
          poolID: pool.poolId,
          name: pool.name,
          region: pool.region,
          parent: pool.parent,
          participants: pool.participants,
          replicationFactor: pool.replicationFactor,
          ...joinInfo,
        } as PoolData;
      });

      console.log('🔍 Final transformed pools:', transformedPools);
      console.log('🔍 Setting loading to false and updating state...');

      setState((prev) => ({
        ...prev,
        pools: transformedPools,
        userPool,
        loading: false,
        error: null,
      }));

      console.log('🔍 State update completed!');
    } catch (error: any) {
      console.error('Error loading pools:', error);
      setState((prev) => ({
        ...prev,
        pools: [],
        userPool: null,
        error: error.message || 'Failed to load pools',
        loading: false,
        enableInteraction: false,
      }));
    }
  }, [isReady, contractService, connectedAccount]);

  // New API-based join pool function
  const joinPoolViaAPI = useCallback(
    async (
      poolId: string,
      poolName: string
    ): Promise<{ success: boolean; message: string }> => {
      if (!connectedAccount || !currentClusterPeerId) {
        return {
          success: false,
          message: 'Wallet not connected or Blox peer ID not available',
        };
      }

      try {
        const request: JoinPoolRequest = {
          peerId: currentClusterPeerId,
          account: connectedAccount,
          chain: selectedChain,
          poolId: parseInt(poolId, 10),
        };

        const response = await PoolApiService.joinPool(request);

        if (response.status === 'ok') {
          // Refresh pools after successful join
          await loadPools();
          return {
            success: true,
            message: response.msg,
          };
        } else {
          return {
            success: false,
            message: response.msg,
          };
        }
      } catch (error) {
        console.error('Error joining pool via API:', error);
        return {
          success: false,
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
    [connectedAccount, currentClusterPeerId, selectedChain, loadPools]
  );

  const joinPool = useCallback(
    async (poolId: string) => {
      if (!currentClusterPeerId) {
        throw new Error('Current Blox peer ID is not available');
      }
      const result = await poolOperations.joinPool(poolId, currentClusterPeerId);
      if (result !== null) {
        // Refresh pools after successful join
        await loadPools();
      }
      return result;
    },
    [poolOperations, loadPools, currentClusterPeerId]
  );

  // API-based leave pool function
  const leavePoolViaAPI = useCallback(
    async (poolId: string): Promise<{ success: boolean; message: string }> => {
      if (!connectedAccount || !currentClusterPeerId) {
        return {
          success: false,
          message: 'Wallet not connected or Blox peer ID not available',
        };
      }

      try {
        const request: JoinPoolRequest = {
          peerId: currentClusterPeerId,
          account: connectedAccount,
          chain: selectedChain,
          poolId: parseInt(poolId, 10),
        };

        const response = await PoolApiService.leavePool(request);

        if (response.status === 'ok') {
          // Refresh pools after successful leave
          await loadPools();
          return {
            success: true,
            message: response.msg,
          };
        } else {
          return {
            success: false,
            message: response.msg,
          };
        }
      } catch (error) {
        console.error('Error leaving pool via API:', error);
        return {
          success: false,
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
    [connectedAccount, currentClusterPeerId, selectedChain, loadPools]
  );

  // API-based cancel join request function
  const cancelJoinRequestViaAPI = useCallback(
    async (poolId: string): Promise<{ success: boolean; message: string }> => {
      if (!connectedAccount || !currentClusterPeerId) {
        return {
          success: false,
          message: 'Wallet not connected or Blox peer ID not available',
        };
      }

      try {
        const request: JoinPoolRequest = {
          peerId: currentClusterPeerId,
          account: connectedAccount,
          chain: selectedChain,
          poolId: parseInt(poolId, 10),
        };

        const response = await PoolApiService.cancelJoinRequest(request);

        if (response.status === 'ok') {
          // Refresh pools after successful cancel
          await loadPools();
          return {
            success: true,
            message: response.msg,
          };
        } else {
          return {
            success: false,
            message: response.msg,
          };
        }
      } catch (error) {
        console.error('Error canceling join request via API:', error);
        return {
          success: false,
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
    [connectedAccount, currentClusterPeerId, selectedChain, loadPools]
  );

  const leavePool = useCallback(
    async (poolId: string) => {
      console.log('usePools.leavePool: Starting leave pool', { poolId, currentClusterPeerId });

      if (!currentClusterPeerId) {
        console.error('usePools.leavePool: Current Blox peer ID is not available');
        throw new Error('Current Blox peer ID is not available');
      }

      console.log('usePools.leavePool: Calling poolOperations.leavePool');
      const result = await poolOperations.leavePool(poolId, currentClusterPeerId);
      console.log('usePools.leavePool: poolOperations.leavePool result', { result });

      // Only refresh pools if the transaction was successful
      if (result !== null) {
        console.log('usePools.leavePool: Leave successful, refreshing pools');
        // Add a small delay to ensure transaction is fully processed
        setTimeout(async () => {
          await loadPools();
        }, 1000);
      } else {
        console.log('usePools.leavePool: Leave returned null, not refreshing pools');
      }
      return result;
    },
    [poolOperations, loadPools, currentClusterPeerId]
  );

  const cancelJoinRequest = useCallback(
    async (poolId: string) => {
      if (!currentClusterPeerId) {
        throw new Error('Current Blox peer ID is not available');
      }
      const result = await poolOperations.cancelJoinRequest(poolId, currentClusterPeerId);
      if (result !== null) {
        // Refresh pools after successful cancel
        await loadPools();
      }
      return result;
    },
    [poolOperations, loadPools, currentClusterPeerId]
  );

  const voteJoinRequest = useCallback(
    async (poolId: string, account: string, vote: boolean) => {
      const result = await poolOperations.voteJoinRequest(
        poolId,
        account,
        vote
      );
      if (result !== null) {
        // Refresh pools after successful vote
        await loadPools();
      }
      return result;
    },
    [poolOperations, loadPools]
  );

  // Load pools when contract is ready AND on correct network
  useEffect(() => {
    if (isReady && isOnCorrectNetwork) {
      loadPools();
    }
  }, [isReady, isOnCorrectNetwork, loadPools]);

  // Refresh pools when account changes AND on correct network
  useEffect(() => {
    if (connectedAccount && isReady && isOnCorrectNetwork) {
      loadPools();
    }
  }, [connectedAccount, isReady, isOnCorrectNetwork, loadPools]);

  return {
    ...state,
    ...poolOperations,
    loadPools,
    checkUserMembership,
    // Original contract-based functions
    joinPool,
    leavePool,
    cancelJoinRequest,
    voteJoinRequest,
    // New API-based functions
    joinPoolViaAPI,
    leavePoolViaAPI,
    cancelJoinRequestViaAPI,
    // Convenience getters
    userPoolId: state.userPool?.poolId || null,
    userRequestPoolId: state.userPool?.requestPoolId || null,
    isInPool: state.userPool?.poolId !== '0',
    hasPendingRequest: state.userPool?.requestPoolId !== '0',
  };
};

// Hook for individual pool operations
export const usePool = (poolId: string) => {
  const { contractService, isReady } = usePoolOperations();
  const [pool, setPool] = useState<PoolInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPool = useCallback(async () => {
    if (!isReady || !contractService || !poolId) return;

    setLoading(true);
    setError(null);

    try {
      const poolData = await contractService.getPool(poolId);
      setPool(poolData);
    } catch (error: any) {
      console.error('Error loading pool:', error);
      setError(error.message || 'Failed to load pool');
      setPool(null);
    } finally {
      setLoading(false);
    }
  }, [isReady, contractService, poolId]);

  useEffect(() => {
    loadPool();
  }, [loadPool]);

  return {
    pool,
    loading,
    error,
    loadPool,
  };
};

// Hook for join request operations
export const useJoinRequest = (poolId: string, account: string) => {
  const { contractService, isReady } = usePoolOperations();
  const [joinRequest, setJoinRequest] = useState<JoinRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJoinRequest = useCallback(async () => {
    if (!isReady || !contractService || !poolId || !account) return;

    setLoading(true);
    setError(null);

    try {
      const requestData = await contractService.getJoinRequest(poolId, account);
      setJoinRequest(requestData);
    } catch (error: any) {
      console.error('Error loading join request:', error);
      setError(error.message || 'Failed to load join request');
      setJoinRequest(null);
    } finally {
      setLoading(false);
    }
  }, [isReady, contractService, poolId, account]);

  useEffect(() => {
    loadJoinRequest();
  }, [loadJoinRequest]);

  return {
    joinRequest,
    loading,
    error,
    loadJoinRequest,
  };
};
