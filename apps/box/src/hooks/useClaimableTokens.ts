import { useState, useEffect, useCallback } from 'react';
import { useContractIntegration } from './useContractIntegration';
import { useBloxsStore } from '../stores/useBloxsStore';
import { usePools } from './usePools';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { ethers } from 'ethers';
import { getChainConfigByName } from '../contracts/config';
import { REWARD_ENGINE_ABI } from '../contracts/abis';
import { peerIdToBytes32 } from '../utils/peerIdConversion';

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
  const currentBloxPeerId = useBloxsStore((state) => state.currentBloxPeerId);
  const { userPoolId } = usePools();
  const manualSignatureWalletAddress = useUserProfileStore(
    (state) => state.manualSignatureWalletAddress
  );
  const selectedChain = useSettingsStore((state) => state.selectedChain);

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

  // Determine effective account (MetaMask or manual signature)
  const effectiveAccount = connectedAccount || manualSignatureWalletAddress;
  const useReadOnlyService = !isReady && !!manualSignatureWalletAddress;

  const fetchClaimableTokens = useCallback(async () => {
    console.log('🚀 useClaimableTokens: fetchClaimableTokens called');
    console.log('🔍 useClaimableTokens: Dependencies check:', {
      contractService: !!contractService,
      isReady,
      currentBloxPeerId,
      effectiveAccount,
      userPoolId,
      useReadOnlyService,
    });
    
    if (!currentBloxPeerId || !effectiveAccount || !userPoolId) {
      console.log('⚠️ useClaimableTokens: Missing dependencies, resetting state to zeros');
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

    console.log('✅ useClaimableTokens: All dependencies available, proceeding with contract calls');
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let unclaimedRewards: any;
      let claimedInfo: any;

      if (contractService && isReady) {
        // Use contractService when MetaMask is connected
        console.log('📞 useClaimableTokens: Using contractService (MetaMask connected)');
        
        unclaimedRewards = await contractService.getUnclaimedRewards(
          effectiveAccount,
          currentBloxPeerId,
          userPoolId
        );
        
        claimedInfo = await contractService.getClaimedRewardsInfo(
          effectiveAccount,
          currentBloxPeerId,
          userPoolId
        );
      } else if (useReadOnlyService) {
        // Use RPC provider when MetaMask is not connected
        console.log('📞 useClaimableTokens: Using RPC provider (manual signature fallback)');
        
        const chainConfig = getChainConfigByName(selectedChain);
        const readOnlyProvider = new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl);
        const rewardContract = new ethers.Contract(
          chainConfig.contracts.rewardEngine,
          REWARD_ENGINE_ABI,
          readOnlyProvider
        );

        const peerIdBytes32 = await peerIdToBytes32(currentBloxPeerId);
        
        // Get unclaimed rewards
        const [unclaimedMining, unclaimedStorage] = await rewardContract.getUnclaimedRewards(
          effectiveAccount,
          peerIdBytes32,
          userPoolId
        );
        
        unclaimedRewards = {
          unclaimedMining: ethers.utils.formatEther(unclaimedMining),
          unclaimedStorage: ethers.utils.formatEther(unclaimedStorage),
          totalUnclaimed: ethers.utils.formatEther(unclaimedMining.add(unclaimedStorage)),
        };

        // Get claimed rewards info
        const [lastClaimedTimestamp] = await rewardContract.getClaimedRewardsInfo(
          effectiveAccount,
          peerIdBytes32,
          userPoolId
        );
        
        const now = Math.floor(Date.now() / 1000);
        const timeSinceLastClaim = Math.max(0, now - lastClaimedTimestamp.toNumber());
        
        claimedInfo = {
          lastClaimedTimestamp: lastClaimedTimestamp.toNumber(),
          timeSinceLastClaim,
        };
      } else {
        throw new Error('No service available for fetching rewards');
      }
      
      console.log('📥 useClaimableTokens: getUnclaimedRewards response:', unclaimedRewards);
      console.log('📥 useClaimableTokens: getClaimedRewardsInfo response:', claimedInfo);

      const canClaim = parseFloat(unclaimedRewards.totalUnclaimed) > 0;
      console.log('💰 useClaimableTokens: canClaim calculation:', {
        totalUnclaimed: unclaimedRewards.totalUnclaimed,
        parsedFloat: parseFloat(unclaimedRewards.totalUnclaimed),
        canClaim
      });

      const finalState = {
        unclaimedMining: unclaimedRewards.unclaimedMining,
        unclaimedStorage: unclaimedRewards.unclaimedStorage,
        totalUnclaimed: unclaimedRewards.totalUnclaimed,
        lastClaimedTimestamp: claimedInfo.lastClaimedTimestamp,
        timeSinceLastClaim: claimedInfo.timeSinceLastClaim,
        loading: false,
        error: null,
        canClaim,
      };
      
      console.log('✨ useClaimableTokens: Setting final state:', finalState);
      setState(finalState);
    } catch (error: any) {
      console.error('Error fetching claimable rewards:', error);

      let errorMessage = 'Failed to fetch claimable rewards';

      // Handle specific network errors
      if (error.message?.includes('underlying network changed')) {
        errorMessage = 'Network changed during operation. Please refresh and try again.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message?.includes('connection') || error.message?.includes('fetch')) {
        errorMessage = 'Connection failed. Please check your network and try again.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setState({
        unclaimedMining: '0',
        unclaimedStorage: '0',
        totalUnclaimed: '0',
        lastClaimedTimestamp: 0,
        timeSinceLastClaim: 0,
        loading: false,
        error: errorMessage,
        canClaim: false,
      });
    }
  }, [contractService, isReady, currentBloxPeerId, effectiveAccount, userPoolId, useReadOnlyService, selectedChain]);

  const claimTokens = useCallback(async () => {
    if (!contractService || !isReady || !currentBloxPeerId || !userPoolId || !state.canClaim) {
      throw new Error('Cannot claim rewards: contract not ready or no claimable amount');
    }

    try {
      await contractService.claimRewardsForPeer(currentBloxPeerId, userPoolId);
      // Refresh claimable rewards after successful claim
      await fetchClaimableTokens();
      return true;
    } catch (error) {
      console.error('Error claiming rewards:', error);
      throw error;
    }
  }, [contractService, isReady, currentBloxPeerId, userPoolId, state.canClaim, fetchClaimableTokens]);

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
