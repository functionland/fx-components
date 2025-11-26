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
import { getPoolReadService } from '../services/poolReadService';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useBloxsStore } from '../stores/useBloxsStore';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import { useSDK } from '@metamask/sdk-react';

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

export const usePoolsWithFallback = () => {
  const poolOperations = usePoolOperations();
  const { contractService, connectedAccount, isReady } = poolOperations;
  const { isOnCorrectNetwork } = useWalletNetwork();
  const selectedChain = useSettingsStore((state) => state.selectedChain);
  const currentBloxPeerId = useBloxsStore((state) => state.currentBloxPeerId);
  const manualSignatureWalletAddress = useUserProfileStore(
    (state) => state.manualSignatureWalletAddress
  );
  const hasHydrated = useUserProfileStore((state) => state._hasHydrated);
  const { account: metamaskAccount, connected } = useSDK();

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

  // Determine which account to use and which service to use
  const effectiveAccount = metamaskAccount || manualSignatureWalletAddress;
  const useReadOnlyService = !connected && !!manualSignatureWalletAddress;

  console.log('usePoolsWithFallback state:', {
    hasHydrated,
    metamaskAccount,
    manualSignatureWalletAddress,
    connected,
    effectiveAccount,
    useReadOnlyService,
  });

  /**
   * Check user membership using either contractService or poolReadService
   */
  const checkUserMembership = useCallback(async () => {
    console.log('checkUserMembership', {
      useReadOnlyService,
      effectiveAccount,
      contractService: !!contractService,
    });

    if (!effectiveAccount) {
      return {
        isMemberOfAnyPool: false,
        memberPools: [],
        activeRequests: [],
      };
    }

    try {
      if (useReadOnlyService) {
        // Use read-only service when MetaMask is not connected
        const poolReadService = getPoolReadService(selectedChain);
        const userPoolInfo = await poolReadService.getUserPoolInfo(
          effectiveAccount,
          currentBloxPeerId
        );

        return {
          isMemberOfAnyPool: userPoolInfo.poolId !== '0' && userPoolInfo.poolId !== '',
          memberPools: userPoolInfo.poolId !== '0' && userPoolInfo.poolId !== '' ? [userPoolInfo.poolId] : [],
          activeRequests: userPoolInfo.requestPoolId !== '0' && userPoolInfo.requestPoolId !== '' ? [userPoolInfo.requestPoolId] : [],
        };
      } else if (isReady && contractService && connected) {
        // Use contract service when MetaMask is connected
        const { poolId, requestPoolId } = await contractService.getUserPool(
          effectiveAccount,
          currentBloxPeerId
        );

        return {
          isMemberOfAnyPool: poolId !== '0' && poolId !== '',
          memberPools: poolId !== '0' && poolId !== '' ? [poolId] : [],
          activeRequests: requestPoolId !== '0' && requestPoolId !== '' ? [requestPoolId] : [],
        };
      }

      return {
        isMemberOfAnyPool: false,
        memberPools: [],
        activeRequests: [],
      };
    } catch (error) {
      console.error('Error checking user membership:', error);
      return {
        isMemberOfAnyPool: false,
        memberPools: [],
        activeRequests: [],
      };
    }
  }, [useReadOnlyService, effectiveAccount, contractService, isReady, connected, selectedChain, currentBloxPeerId]);

  /**
   * Load pools using either contractService or poolReadService
   */
  const loadPools = useCallback(async () => {
    console.log('loadPools called', {
      useReadOnlyService,
      effectiveAccount,
      isReady,
      contractService: !!contractService,
      isOnCorrectNetwork,
    });

    // If using read-only service, we don't need to check network or contract readiness
    if (!useReadOnlyService) {
      // For MetaMask-connected flow, require all prerequisites
      if (!isReady || !contractService || !effectiveAccount || !isOnCorrectNetwork) {
        console.log('loadPools: Prerequisites not met for contract service');
        setState((prev) => ({
          ...prev,
          enableInteraction: false,
          loading: false,
        }));
        return;
      }
    } else {
      // For read-only service, only need effective account
      if (!effectiveAccount) {
        console.log('loadPools: No effective account available');
        setState((prev) => ({
          ...prev,
          enableInteraction: false,
          loading: false,
        }));
        return;
      }
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      console.log('🔍 loadPools: Starting...');
      console.log('🔍 effectiveAccount:', effectiveAccount);
      console.log('🔍 currentBloxPeerId:', currentBloxPeerId);
      console.log('🔍 useReadOnlyService:', useReadOnlyService);

      let poolList: PoolInfo[];

      if (useReadOnlyService) {
        // Use read-only service
        const poolReadService = getPoolReadService(selectedChain);
        poolList = await poolReadService.listPools(0, 25);
      } else {
        // Use contract service
        poolList = await contractService!.listPools(0, 25);
      }

      console.log('🔍 Pools received:', poolList?.length);

      // Check user membership
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
        if (useReadOnlyService) {
          const poolReadService = getPoolReadService(selectedChain);
          userPool = await poolReadService.getUserPoolInfo(
            effectiveAccount,
            currentBloxPeerId
          );
        } else {
          userPool = await contractService!.getUserPool(
            effectiveAccount,
            currentBloxPeerId
          );
        }

        console.log('🔍 User pool result:', userPool);

        if (userPool && userPool.poolId !== '0') {
          requested = true;
          joined = true;
          poolIdOfInterest = userPool.poolId;
        } else if (userPool && userPool.requestPoolId !== '0') {
          poolIdOfInterest = userPool.requestPoolId;
          try {
            let joinRequestInfo;
            if (useReadOnlyService) {
              const poolReadService = getPoolReadService(selectedChain);
              joinRequestInfo = await poolReadService.getJoinRequest(
                userPool.requestPoolId,
                effectiveAccount
              );
            } else {
              joinRequestInfo = await contractService!.getJoinRequest(
                userPool.requestPoolId,
                effectiveAccount
              );
            }
            console.log('Join request info:', joinRequestInfo);
            numVotes = joinRequestInfo.positive_votes + joinRequestInfo.negative_votes;
            requested = true;
            joined = false;
          } catch (error) {
            console.error('Error getting join request:', error);
          }
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

      // Transform pools
      console.log('🔍 Transforming pools...');
      const transformedPools = poolList.map((pool) => {
        const isUserPool = pool.poolId === poolIdOfInterest;
        const joinInfo = {
          requested: isUserPool ? requested : false,
          joined: isUserPool ? joined : false,
          numVotes: isUserPool ? numVotes : 0,
          numVoters: pool.participants?.length || 0,
        };

        return {
          poolId: pool.poolId,
          poolID: pool.poolId, // Include both for compatibility
          name: pool.name,
          region: pool.region,
          parent: pool.parent,
          participants: pool.participants,
          replicationFactor: pool.replicationFactor,
          ...joinInfo,
        } as any;
      });

      console.log('🔍 Final transformed pools:', transformedPools);

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
  }, [useReadOnlyService, effectiveAccount, isReady, contractService, isOnCorrectNetwork, selectedChain, currentBloxPeerId, checkUserMembership]);

  /**
   * Join pool via API - works with both MetaMask and manual signature
   */
  const joinPoolViaAPI = useCallback(
    async (
      poolId: string,
      poolName: string
    ): Promise<{ success: boolean; message: string }> => {
      if (!effectiveAccount || !currentBloxPeerId) {
        return {
          success: false,
          message: 'Wallet not connected or Blox peer ID not available',
        };
      }

      try {
        const request: JoinPoolRequest = {
          peerId: currentBloxPeerId,
          account: effectiveAccount,
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
    [effectiveAccount, currentBloxPeerId, selectedChain, loadPools]
  );

  /**
   * Leave pool via API - works with both MetaMask and manual signature
   */
  const leavePoolViaAPI = useCallback(
    async (poolId: string): Promise<{ success: boolean; message: string }> => {
      if (!effectiveAccount || !currentBloxPeerId) {
        return {
          success: false,
          message: 'Wallet not connected or Blox peer ID not available',
        };
      }

      try {
        const request: JoinPoolRequest = {
          peerId: currentBloxPeerId,
          account: effectiveAccount,
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
    [effectiveAccount, currentBloxPeerId, selectedChain, loadPools]
  );

  /**
   * Cancel join request via API - works with both MetaMask and manual signature
   */
  const cancelJoinRequestViaAPI = useCallback(
    async (poolId: string): Promise<{ success: boolean; message: string }> => {
      if (!effectiveAccount || !currentBloxPeerId) {
        return {
          success: false,
          message: 'Wallet not connected or Blox peer ID not available',
        };
      }

      try {
        const request: JoinPoolRequest = {
          peerId: currentBloxPeerId,
          account: effectiveAccount,
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
    [effectiveAccount, currentBloxPeerId, selectedChain, loadPools]
  );

  // Load pools when conditions are met
  useEffect(() => {
    if (useReadOnlyService) {
      // For read-only service, load when we have effective account
      if (effectiveAccount) {
        loadPools();
      }
    } else {
      // For contract service, load when contract is ready and on correct network
      if (isReady && isOnCorrectNetwork) {
        loadPools();
      }
    }
  }, [useReadOnlyService, effectiveAccount, isReady, isOnCorrectNetwork, loadPools]);

  // Refresh pools when account changes
  useEffect(() => {
    if (effectiveAccount) {
      if (useReadOnlyService || (isReady && isOnCorrectNetwork)) {
        loadPools();
      }
    }
  }, [effectiveAccount, useReadOnlyService, isReady, isOnCorrectNetwork, loadPools]);

  return {
    ...state,
    ...poolOperations,
    // Override connectedAccount to include fallback account
    connectedAccount: effectiveAccount || poolOperations.connectedAccount,
    loadPools,
    checkUserMembership,
    // API-based functions that work with both MetaMask and manual signature
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
