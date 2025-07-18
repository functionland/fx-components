import { useState, useEffect, useCallback } from 'react';
import { useContractIntegration } from './useContractIntegration';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import { usePools } from './usePools';

export interface ClaimableRewardsState {
  unclaimedMining: string;
  unclaimedStorage: string;
  totalUnclaimed: string;
  lastClaimedTimestamp: number;
  timeSinceLastClaim: number;
  loading: boolean;
  error: string | null;
  canClaim: boolean;
}

export const useClaimableTokens = () => {
  const { contractService, isReady, connectedAccount } = useContractIntegration();
  const appPeerId = useUserProfileStore((state) => state.appPeerId);
  const { userPoolId } = usePools();

  const [state, setState] = useState<ClaimableRewardsState>({
    unclaimedMining: '0',
    unclaimedStorage: '0',
    totalUnclaimed: '0',
    lastClaimedTimestamp: 0,
    timeSinceLastClaim: 0,
    loading: false,
    error: null,
    canClaim: false,
  });

  const fetchClaimableTokens = useCallback(async () => {
    if (!contractService || !isReady || !appPeerId || !connectedAccount || !userPoolId) {
      setState(prev => ({
        ...prev,
        unclaimedMining: '0',
        unclaimedStorage: '0',
        totalUnclaimed: '0',
        lastClaimedTimestamp: 0,
        timeSinceLastClaim: 0,
        canClaim: false,
        loading: false,
        error: null,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Get unclaimed rewards
      const unclaimedRewards = await contractService.getUnclaimedRewards(
        connectedAccount,
        appPeerId,
        userPoolId
      );

      // Get claimed rewards info
      const claimedInfo = await contractService.getClaimedRewardsInfo(
        connectedAccount,
        appPeerId,
        userPoolId
      );

      const canClaim = parseFloat(unclaimedRewards.totalUnclaimed) > 0;

      setState({
        unclaimedMining: unclaimedRewards.unclaimedMining,
        unclaimedStorage: unclaimedRewards.unclaimedStorage,
        totalUnclaimed: unclaimedRewards.totalUnclaimed,
        lastClaimedTimestamp: claimedInfo.lastClaimedTimestamp,
        timeSinceLastClaim: claimedInfo.timeSinceLastClaim,
        loading: false,
        error: null,
        canClaim,
      });
    } catch (error) {
      console.error('Error fetching claimable rewards:', error);
      setState({
        unclaimedMining: '0',
        unclaimedStorage: '0',
        totalUnclaimed: '0',
        lastClaimedTimestamp: 0,
        timeSinceLastClaim: 0,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch claimable rewards',
        canClaim: false,
      });
    }
  }, [contractService, isReady, appPeerId, connectedAccount, userPoolId]);

  const claimTokens = useCallback(async () => {
    if (!contractService || !isReady || !appPeerId || !userPoolId || !state.canClaim) {
      throw new Error('Cannot claim rewards: contract not ready or no claimable amount');
    }

    try {
      await contractService.claimRewardsForPeer(appPeerId, userPoolId);
      // Refresh claimable rewards after successful claim
      await fetchClaimableTokens();
      return true;
    } catch (error) {
      console.error('Error claiming rewards:', error);
      throw error;
    }
  }, [contractService, isReady, appPeerId, userPoolId, state.canClaim, fetchClaimableTokens]);

  // Auto-fetch when dependencies change
  useEffect(() => {
    fetchClaimableTokens();
  }, [fetchClaimableTokens]);

  return {
    ...state,
    fetchClaimableTokens,
    claimTokens,
    formattedTotalUnclaimed: parseFloat(state.totalUnclaimed).toFixed(4),
    formattedUnclaimedMining: parseFloat(state.unclaimedMining).toFixed(4),
    formattedUnclaimedStorage: parseFloat(state.unclaimedStorage).toFixed(4),
    // Helper to format time since last claim
    formattedTimeSinceLastClaim: state.timeSinceLastClaim > 0
      ? `${Math.floor(state.timeSinceLastClaim / 86400)} days ago`
      : 'Never claimed',
  };
};
