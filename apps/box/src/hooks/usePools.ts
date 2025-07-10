import { useState, useEffect, useCallback } from 'react';
import { usePoolOperations } from './useContractIntegration';
import { PoolInfo, UserPoolInfo, JoinRequest } from '../contracts/types';

export interface PoolData extends PoolInfo {
  requested: boolean;
  joined: boolean;
  numVotes: number;
  numVoters: number;
}

export interface PoolsState {
  pools: PoolData[];
  userPool: UserPoolInfo | null;
  loading: boolean;
  error: string | null;
  enableInteraction: boolean;
}

export const usePools = () => {
  const poolOperations = usePoolOperations();
  const { contractService, connectedAccount, isReady } = poolOperations;
  
  const [state, setState] = useState<PoolsState>({
    pools: [],
    userPool: null,
    loading: false,
    error: null,
    enableInteraction: false,
  });

  const loadPools = useCallback(async () => {
    if (!isReady || !contractService || !connectedAccount) {
      setState(prev => ({ ...prev, enableInteraction: false }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Get pools from contract
      const poolList = await contractService.listPools(0, 25);
      console.log('Contract pools:', poolList);
      
      let requested = false;
      let joined = false;
      let numVotes = 0;
      let poolIdOfInterest = '';
      let userPool: UserPoolInfo | null = null;
      
      try {
        // Get user pool info from contract
        userPool = await contractService.getUserPool(connectedAccount);
        console.log('User pool:', userPool);

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
          numVotes = joinRequestInfo.positive_votes + joinRequestInfo.negative_votes;
          requested = true;
          joined = false;
        }
        
        setState(prev => ({ ...prev, enableInteraction: true }));
      } catch (error) {
        console.log('Error getting user pool info:', error);
        setState(prev => ({ ...prev, enableInteraction: false }));
      }
      
      // Transform contract pools to app format
      const transformedPools = poolList.map((pool) => {
        const isUserPool = pool.poolId === poolIdOfInterest;
        const joinInfo = {
          requested: isUserPool ? requested : false,
          joined: isUserPool ? joined : false,
          numVotes: isUserPool ? numVotes : 0,
          numVoters: pool.participants.length,
        };
        
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
      
      setState(prev => ({
        ...prev,
        pools: transformedPools,
        userPool,
        loading: false,
        error: null,
      }));
    } catch (error: any) {
      console.error('Error getting pools:', error);
      setState(prev => ({
        ...prev,
        pools: [],
        userPool: null,
        loading: false,
        error: error.message || 'Failed to load pools',
      }));
    }
  }, [isReady, contractService, connectedAccount]);

  const joinPool = useCallback(async (poolId: string) => {
    const result = await poolOperations.joinPool(poolId);
    if (result !== null) {
      // Refresh pools after successful join
      await loadPools();
    }
    return result;
  }, [poolOperations, loadPools]);

  const leavePool = useCallback(async (poolId: string) => {
    const result = await poolOperations.leavePool(poolId);
    if (result !== null) {
      // Refresh pools after successful leave
      await loadPools();
    }
    return result;
  }, [poolOperations, loadPools]);

  const cancelJoinRequest = useCallback(async (poolId: string) => {
    const result = await poolOperations.cancelJoinRequest(poolId);
    if (result !== null) {
      // Refresh pools after successful cancel
      await loadPools();
    }
    return result;
  }, [poolOperations, loadPools]);

  const voteJoinRequest = useCallback(async (poolId: string, account: string, vote: boolean) => {
    const result = await poolOperations.voteJoinRequest(poolId, account, vote);
    if (result !== null) {
      // Refresh pools after successful vote
      await loadPools();
    }
    return result;
  }, [poolOperations, loadPools]);

  // Load pools when contract is ready
  useEffect(() => {
    if (isReady) {
      loadPools();
    }
  }, [isReady, loadPools]);

  // Refresh pools when account changes
  useEffect(() => {
    if (connectedAccount && isReady) {
      loadPools();
    }
  }, [connectedAccount, isReady, loadPools]);

  return {
    ...state,
    ...poolOperations,
    loadPools,
    joinPool,
    leavePool,
    cancelJoinRequest,
    voteJoinRequest,
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
