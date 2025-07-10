import { useState, useEffect, useCallback } from 'react';
import { useSDK } from '@metamask/sdk-react';
import { useToast } from '@functionland/component-library';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getContractService, ContractService } from '../contracts/contractService';
import { SupportedChain } from '../contracts/types';
import { CHAIN_DISPLAY_NAMES } from '../contracts/config';

export interface ContractIntegrationState {
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  contractService: ContractService | null;
  connectedAccount: string | null;
}

export const useContractIntegration = () => {
  const { provider, account, chainId } = useSDK();
  const { queueToast } = useToast();
  const selectedChain = useSettingsStore((state) => state.selectedChain);
  
  const [state, setState] = useState<ContractIntegrationState>({
    isInitialized: false,
    isInitializing: false,
    error: null,
    contractService: null,
    connectedAccount: null,
  });

  const initializeContracts = useCallback(async (chain: SupportedChain) => {
    if (!provider || !account) {
      setState(prev => ({
        ...prev,
        isInitialized: false,
        error: 'Wallet not connected',
        contractService: null,
        connectedAccount: null,
      }));
      return;
    }

    setState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      const service = getContractService(chain);
      await service.initialize(provider);
      
      const connectedAccount = await service.getConnectedAccount();
      
      setState({
        isInitialized: true,
        isInitializing: false,
        error: null,
        contractService: service,
        connectedAccount,
      });

      queueToast({
        type: 'success',
        title: 'Contracts Connected',
        message: `Connected to ${CHAIN_DISPLAY_NAMES[chain]} contracts`,
      });
    } catch (error: any) {
      console.error('Contract initialization failed:', error);
      
      setState({
        isInitialized: false,
        isInitializing: false,
        error: error.message || 'Failed to connect to contracts',
        contractService: null,
        connectedAccount: null,
      });

      queueToast({
        type: 'error',
        title: 'Contract Connection Failed',
        message: error.message || 'Failed to connect to contracts',
      });
    }
  }, [provider, account, queueToast]);

  const switchChain = useCallback(async (newChain: SupportedChain) => {
    if (state.contractService) {
      try {
        await state.contractService.switchChain(newChain);
        await initializeContracts(newChain);
      } catch (error: any) {
        console.error('Chain switch failed:', error);
        queueToast({
          type: 'error',
          title: 'Chain Switch Failed',
          message: error.message || 'Failed to switch chains',
        });
      }
    }
  }, [state.contractService, initializeContracts, queueToast]);

  const executeContractCall = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T | null> => {
    if (!state.isInitialized || !state.contractService) {
      queueToast({
        type: 'error',
        title: 'Contract Not Ready',
        message: 'Please connect your wallet and initialize contracts first',
      });
      return null;
    }

    try {
      const result = await operation();
      queueToast({
        type: 'success',
        title: 'Transaction Successful',
        message: `${operationName} completed successfully`,
      });
      return result;
    } catch (error: any) {
      console.error(`${operationName} failed:`, error);
      
      let errorMessage = error.message || `${operationName} failed`;
      
      // Handle common error cases
      if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds for transaction';
      } else if (error.code === 'USER_REJECTED') {
        errorMessage = 'Transaction was rejected by user';
      } else if (error.reason) {
        errorMessage = error.reason;
      }

      queueToast({
        type: 'error',
        title: 'Transaction Failed',
        message: errorMessage,
      });
      
      return null;
    }
  }, [state.isInitialized, state.contractService, queueToast]);

  // Initialize contracts when dependencies change - DISABLED to prevent auto MetaMask calls
  // useEffect(() => {
  //   if (account && provider && selectedChain) {
  //     initializeContracts(selectedChain);
  //   } else {
  //     setState({
  //       isInitialized: false,
  //       isInitializing: false,
  //       error: null,
  //       contractService: null,
  //       connectedAccount: null,
  //     });
  //   }
  // }, [account, provider, selectedChain, initializeContracts]);

  // Handle chain changes - DISABLED to prevent auto MetaMask calls
  // useEffect(() => {
  //   if (state.isInitialized && selectedChain) {
  //     switchChain(selectedChain);
  //   }
  // }, [selectedChain, state.isInitialized, switchChain]);

  return {
    ...state,
    initializeContracts,
    switchChain,
    executeContractCall,
    // Convenience methods
    isReady: state.isInitialized && !!state.contractService,
    canExecute: state.isInitialized && !!state.contractService && !!state.connectedAccount,
  };
};

// Pool-specific operations hook
export const usePoolOperations = () => {
  const contractIntegration = useContractIntegration();
  const { executeContractCall, contractService } = contractIntegration;

  const joinPool = useCallback(async (poolId: string) => {
    return executeContractCall(
      () => contractService!.joinPool(poolId),
      'Join Pool'
    );
  }, [executeContractCall, contractService]);

  const leavePool = useCallback(async (poolId: string) => {
    return executeContractCall(
      () => contractService!.leavePool(poolId),
      'Leave Pool'
    );
  }, [executeContractCall, contractService]);

  const cancelJoinRequest = useCallback(async (poolId: string) => {
    return executeContractCall(
      () => contractService!.cancelJoinRequest(poolId),
      'Cancel Join Request'
    );
  }, [executeContractCall, contractService]);

  const voteJoinRequest = useCallback(async (poolId: string, account: string, vote: boolean) => {
    return executeContractCall(
      () => contractService!.voteJoinRequest(poolId, account, vote),
      'Vote on Join Request'
    );
  }, [executeContractCall, contractService]);

  const claimRewards = useCallback(async (poolId: string) => {
    return executeContractCall(
      () => contractService!.claimRewards(poolId),
      'Claim Rewards'
    );
  }, [executeContractCall, contractService]);

  return {
    ...contractIntegration,
    joinPool,
    leavePool,
    cancelJoinRequest,
    voteJoinRequest,
    claimRewards,
  };
};

// Reward-specific operations hook
export const useRewardOperations = () => {
  const contractIntegration = useContractIntegration();
  const { executeContractCall, contractService } = contractIntegration;

  const getTotalRewards = useCallback(async (account: string) => {
    if (!contractService) return null;
    try {
      return await contractService.getTotalRewards(account);
    } catch (error) {
      console.error('Error getting total rewards:', error);
      return null;
    }
  }, [contractService]);

  const getClaimableRewards = useCallback(async (account: string, poolId: string) => {
    if (!contractService) return null;
    try {
      return await contractService.getClaimableRewards(account, poolId);
    } catch (error) {
      console.error('Error getting claimable rewards:', error);
      return null;
    }
  }, [contractService]);

  return {
    ...contractIntegration,
    getTotalRewards,
    getClaimableRewards,
  };
};
