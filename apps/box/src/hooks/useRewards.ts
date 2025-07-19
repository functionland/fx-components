import { useState, useEffect, useCallback } from 'react';
import { useRewardOperations } from './useContractIntegration';
import { RewardInfo } from '../contracts/types';

export interface RewardsState {
  totalRewards: string | null;
  claimableRewards: string | null;
  poolRewards: Record<string, RewardInfo>;
  loading: boolean;
  error: string | null;
}

export const useRewards = (account?: string) => {
  const rewardOperations = useRewardOperations();
  const { contractService, connectedAccount, isReady, executeContractCall } = rewardOperations;
  
  const targetAccount = account || connectedAccount;
  
  const [state, setState] = useState<RewardsState>({
    totalRewards: null,
    claimableRewards: null,
    poolRewards: {},
    loading: false,
    error: null,
  });

  const loadTotalRewards = useCallback(async () => {
    if (!isReady || !contractService || !targetAccount) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const total = await rewardOperations.getTotalRewards(targetAccount);
      setState(prev => ({
        ...prev,
        totalRewards: total,
        loading: false,
        error: null,
      }));
    } catch (error: any) {
      console.error('Error loading total rewards:', error);
      setState(prev => ({
        ...prev,
        totalRewards: null,
        loading: false,
        error: error.message || 'Failed to load rewards',
      }));
    }
  }, [isReady, contractService, targetAccount, rewardOperations]);

  const loadClaimableRewards = useCallback(async (poolId: string) => {
    if (!isReady || !contractService || !targetAccount) return;

    try {
      const claimable = await rewardOperations.getClaimableRewards(targetAccount, poolId);
      setState(prev => ({
        ...prev,
        claimableRewards: claimable,
      }));
      return claimable;
    } catch (error: any) {
      console.error('Error loading claimable rewards:', error);
      return null;
    }
  }, [isReady, contractService, targetAccount, rewardOperations]);

  const loadPoolRewards = useCallback(async (poolId: string) => {
    if (!isReady || !contractService || !targetAccount) return;

    try {
      const poolReward = await contractService.getRewards(targetAccount, poolId);
      setState(prev => ({
        ...prev,
        poolRewards: {
          ...prev.poolRewards,
          [poolId]: poolReward,
        },
      }));
      return poolReward;
    } catch (error: any) {
      console.error('Error loading pool rewards:', error);
      return null;
    }
  }, [isReady, contractService, targetAccount]);

  const claimRewards = useCallback(async (poolId: string) => {
    if (!isReady || !contractService) return null;

    const result = await executeContractCall(
      () => contractService.claimRewards(poolId),
      'Claim Rewards'
    );

    if (result !== null) {
      // Refresh rewards after successful claim
      await loadTotalRewards();
      await loadClaimableRewards(poolId);
      await loadPoolRewards(poolId);
    }

    return result;
  }, [isReady, contractService, executeContractCall, loadTotalRewards, loadClaimableRewards, loadPoolRewards]);

  const refreshRewards = useCallback(async (poolId?: string) => {
    await loadTotalRewards();
    if (poolId) {
      await loadClaimableRewards(poolId);
      await loadPoolRewards(poolId);
    }
  }, [loadTotalRewards, loadClaimableRewards, loadPoolRewards]);

  // Load total rewards when ready
  useEffect(() => {
    if (isReady && targetAccount) {
      loadTotalRewards();
    }
  }, [isReady, targetAccount, loadTotalRewards]);

  return {
    ...state,
    ...rewardOperations,
    loadTotalRewards,
    loadClaimableRewards,
    loadPoolRewards,
    claimRewards,
    refreshRewards,
    // Convenience getters
    hasRewards: state.totalRewards !== null && parseFloat(state.totalRewards) > 0,
    hasClaimableRewards: state.claimableRewards !== null && parseFloat(state.claimableRewards) > 0,
    formattedTotalRewards: state.totalRewards ? parseFloat(state.totalRewards).toFixed(4) : '0.0000',
    formattedClaimableRewards: state.claimableRewards ? parseFloat(state.claimableRewards).toFixed(4) : '0.0000',
  };
};

// Hook for specific pool rewards
export const usePoolRewards = (poolId: string, account?: string) => {
  const { contractService, connectedAccount, isReady } = useRewardOperations();
  const targetAccount = account || connectedAccount;
  
  const [rewards, setRewards] = useState<RewardInfo | null>(null);
  const [claimable, setClaimable] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRewards = useCallback(async () => {
    if (!isReady || !contractService || !targetAccount || !poolId) return;

    setLoading(true);
    setError(null);

    try {
      const [poolRewards, claimableAmount] = await Promise.all([
        contractService.getRewards(targetAccount, poolId),
        contractService.getClaimableRewards(targetAccount, poolId),
      ]);

      setRewards(poolRewards);
      setClaimable(claimableAmount);
    } catch (error: any) {
      console.error('Error loading pool rewards:', error);
      setError(error.message || 'Failed to load pool rewards');
      setRewards(null);
      setClaimable(null);
    } finally {
      setLoading(false);
    }
  }, [isReady, contractService, targetAccount, poolId]);

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  return {
    rewards,
    claimable,
    loading,
    error,
    loadRewards,
    // Convenience getters
    hasClaimable: claimable !== null && parseFloat(claimable) > 0,
    formattedClaimable: claimable ? parseFloat(claimable).toFixed(4) : '0.0000',
    formattedTotal: rewards ? parseFloat(rewards.amount).toFixed(4) : '0.0000',
  };
};

// Hook for rewards across multiple pools
export const useMultiPoolRewards = (poolIds: string[], account?: string) => {
  const { contractService, connectedAccount, isReady } = useRewardOperations();
  const targetAccount = account || connectedAccount;
  
  const [poolRewards, setPoolRewards] = useState<Record<string, RewardInfo>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAllRewards = useCallback(async () => {
    if (!isReady || !contractService || !targetAccount || poolIds.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const rewardsPromises = poolIds.map(async (poolId) => {
        try {
          const reward = await contractService.getRewards(targetAccount, poolId);
          return { poolId, reward };
        } catch (error) {
          console.error(`Error loading rewards for pool ${poolId}:`, error);
          return { poolId, reward: null };
        }
      });

      const results = await Promise.all(rewardsPromises);
      const rewardsMap: Record<string, RewardInfo> = {};
      
      results.forEach(({ poolId, reward }) => {
        if (reward) {
          rewardsMap[poolId] = reward;
        }
      });

      setPoolRewards(rewardsMap);
    } catch (error: any) {
      console.error('Error loading multi-pool rewards:', error);
      setError(error.message || 'Failed to load rewards');
    } finally {
      setLoading(false);
    }
  }, [isReady, contractService, targetAccount, poolIds]);

  useEffect(() => {
    loadAllRewards();
  }, [loadAllRewards]);

  const totalRewards = Object.values(poolRewards).reduce((total, reward) => {
    return total + parseFloat(reward.amount);
  }, 0);

  return {
    poolRewards,
    loading,
    error,
    loadAllRewards,
    totalRewards: totalRewards.toFixed(4),
    poolCount: Object.keys(poolRewards).length,
  };
};
