import { useState, useEffect, useCallback, useRef } from 'react';
import { useSDK } from '@metamask/sdk-react';
import { useToast } from '@functionland/component-library';
import { ethers } from 'ethers';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getContractService, ContractService, resetContractService } from '../contracts/contractService';
import { SupportedChain } from '../contracts/types';
import { CHAIN_DISPLAY_NAMES, getChainConfig, getChainConfigByName, CONTRACT_ADDRESSES } from '../contracts/config';

// Global flag to track if the "Contracts Connected" notification has been shown
let contractsConnectedNotificationShown = false;

// Function to reset the notification flag (useful for development or when wallet disconnects)
export const resetContractsConnectedNotification = () => {
  contractsConnectedNotificationShown = false;
};

export interface ContractIntegrationState {
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  contractService: ContractService | null;
  connectedAccount: string | null;
  retryCount: number;
  canRetry: boolean;
}

// Helper function to detect current chain from MetaMask
const detectCurrentChain = async (provider: any): Promise<SupportedChain | null> => {
  try {
    const web3Provider = provider.provider || provider;
    
    // Force a fresh chain ID request instead of relying on cached network info
    console.log('Requesting fresh chainId from MetaMask...');
    const currentChainId = await web3Provider.request({
      method: 'eth_chainId'
    });
    
    console.log('Fresh chainId from MetaMask:', currentChainId);
    
    // Find matching supported chain
    const currentChainName = Object.keys(CONTRACT_ADDRESSES).find(
      key => CONTRACT_ADDRESSES[key as SupportedChain].chainId === currentChainId
    ) as SupportedChain;

    console.log('Detected current chain:', currentChainName, 'for chainId:', currentChainId);
    return currentChainName || null;
  } catch (error) {
    console.error('Failed to detect current chain:', error);
    return null;
  }
};

export const useContractIntegration = (options?: { showConnectedNotification?: boolean }) => {
  const { provider, account, chainId } = useSDK();
  const { queueToast } = useToast();
  const selectedChain = useSettingsStore((state) => state.selectedChain);
  const setSelectedChain = useSettingsStore((state) => state.setSelectedChain);
  const initializedChainRef = useRef<SupportedChain | null>(null);
  const showConnectedNotification = options?.showConnectedNotification ?? false;

  const [state, setState] = useState<ContractIntegrationState>({
    isInitialized: false,
    isInitializing: false,
    error: null,
    contractService: null,
    connectedAccount: null,
    retryCount: 0,
    canRetry: true,
  });

  // Add debouncing to prevent rapid re-initialization attempts
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastInitAttemptRef = useRef<number>(0);

  const initializeContracts = useCallback(async (chain: SupportedChain) => {
    console.log('initializeContracts called for chain:', chain, 'provider:', !!provider, 'account:', account);

    if (!provider || !account) {
      console.log('Missing provider or account, cannot initialize contracts');
      setState(prev => ({
        ...prev,
        isInitialized: false,
        error: 'Wallet not connected',
        contractService: null,
        connectedAccount: null,
      }));
      return;
    }

    // Prevent re-initialization if already initializing or initialized for the same chain
    if (state.isInitializing) {
      console.log('Already initializing, skipping...');
      return;
    }

    if (state.isInitialized && initializedChainRef.current === chain) {
      console.log('Already initialized for chain:', chain, 'skipping...');
      return;
    }

    setState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      console.log('Getting contract service for chain:', chain);
      // Reset singleton to ensure we get a fresh instance with all methods
      resetContractService();
      const service = getContractService(chain);
      console.log('Initializing contract service...');
      await service.initialize(provider);

      console.log('Getting connected account...');
      const connectedAccount = await service.getConnectedAccount();
      console.log('Connected account:', connectedAccount);
      
      setState({
        isInitialized: true,
        isInitializing: false,
        error: null,
        contractService: service,
        connectedAccount,
        retryCount: 0,
        canRetry: true,
      });

      // Track the initialized chain (should match requested chain after fix)
      initializedChainRef.current = service.chain;
      
      // Verify the contract service is using the correct chain
      if (service.chain !== chain) {
        console.warn(`Chain mismatch after initialization: requested ${chain}, got ${service.chain}`);
      }

      // Only show notification if allowed and not already shown
      if (showConnectedNotification && !contractsConnectedNotificationShown) {
        contractsConnectedNotificationShown = true;
        queueToast({
          type: 'success',
          title: 'Contracts Connected',
          message: `Connected to ${CHAIN_DISPLAY_NAMES[service.chain]} contracts`,
        });
      }
    } catch (error: any) {
      console.error('Contract initialization failed:', error);

      let errorMessage = error.message || 'Failed to connect to contracts';
      let toastTitle = 'Contract Connection Failed';
      const currentRetryCount = state.retryCount + 1;
      const maxRetries = 3;
      const canRetry = currentRetryCount < maxRetries;

      // Handle specific network errors
      if (error.message?.includes('underlying network changed')) {
        errorMessage = 'Network changed during initialization. Please try again.';
        toastTitle = 'Network Changed';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Connection timed out. Please try again.';
        toastTitle = 'Connection Timeout';
      } else if (error.message?.includes('connection') || error.message?.includes('fetch')) {
        errorMessage = 'Connection failed. Please check your network and try again.';
        toastTitle = 'Connection Failed';
      }

      setState({
        isInitialized: false,
        isInitializing: false,
        error: errorMessage,
        contractService: null,
        connectedAccount: null,
        retryCount: currentRetryCount,
        canRetry,
      });

      // Clear the initialized chain ref on error
      initializedChainRef.current = null;

      // Auto-retry for certain errors if retries are available
      if (canRetry && (error.message?.includes('timeout') || error.message?.includes('network'))) {
        const retryDelay = Math.min(1000 * Math.pow(2, currentRetryCount), 10000); // Exponential backoff, max 10s

        queueToast({
          type: 'warning',
          title: toastTitle,
          message: `${errorMessage} Retrying in ${retryDelay / 1000}s... (${currentRetryCount}/${maxRetries})`,
        });

        setTimeout(() => {
          initializeContracts(chain);
        }, retryDelay);
      } else {
        queueToast({
          type: 'error',
          title: toastTitle,
          message: canRetry ? `${errorMessage} You can try again manually.` : `${errorMessage} Maximum retries reached.`,
        });
      }
    }
  }, [provider, account, queueToast, state.retryCount]);

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

  // Manual retry function
  const retryInitialization = useCallback(() => {
    if (state.canRetry) {
      setState(prev => ({
        ...prev,
        error: null,
        retryCount: 0,
        canRetry: true,
      }));
      initializeContracts(selectedChain);
    }
  }, [state.canRetry, initializeContracts, selectedChain]);

  const executeContractCall = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T | null> => {
    console.log(`executeContractCall: Starting ${operationName}`, {
      isInitialized: state.isInitialized,
      hasContractService: !!state.contractService,
      selectedChain
    });

    if (!state.isInitialized || !state.contractService) {
      console.log(`executeContractCall: Contract not ready for ${operationName}`);
      queueToast({
        type: 'error',
        title: 'Contract Not Ready',
        message: 'Please connect your wallet and initialize contracts first',
      });
      return null;
    }

    // Verify we're on the correct chain before executing operation
    try {
      console.log(`executeContractCall: Verifying chain for ${operationName}...`);
      const provider = state.contractService.getProvider();
      const rawProvider = provider?.provider || provider;
      
      if (rawProvider && 'request' in rawProvider && typeof rawProvider.request === 'function') {
        const currentChainIdHex = await rawProvider.request({ method: 'eth_chainId' });
        const currentChainId = parseInt(currentChainIdHex, 16);
        
        // Get expected chain ID from selected chain
        const chainConfig = getChainConfigByName(selectedChain);
        if (!chainConfig) {
          console.error(`executeContractCall: Invalid chain config for ${selectedChain}`);
          throw new Error(`Invalid chain configuration for ${selectedChain}`);
        }
        
        const expectedChainId = parseInt(chainConfig.chainId, 16);
        
        console.log(`executeContractCall: Chain verification for ${operationName}:`, {
          current: currentChainId,
          expected: expectedChainId,
          currentHex: currentChainIdHex,
          expectedHex: chainConfig.chainId,
          selectedChain
        });
        
        if (currentChainId !== expectedChainId) {
          console.log(`executeContractCall: Chain mismatch detected for ${operationName}, forcing re-initialization`);
          
          // Force contract re-initialization on correct chain
          await initializeContracts(selectedChain);
          
          // Wait a moment for initialization to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verify the contract service is now ready
          if (!state.contractService) {
            throw new Error('Contract re-initialization failed');
          }
        }
      }
    } catch (chainError) {
      console.error(`executeContractCall: Chain verification failed for ${operationName}:`, chainError);
      // Continue with operation - the contract service will handle chain switching internally
    }

    try {
      console.log(`executeContractCall: Executing ${operationName} operation`);
      const result = await operation();
      console.log(`executeContractCall: ${operationName} completed successfully`);
      queueToast({
        type: 'success',
        title: 'Transaction Successful',
        message: `${operationName} completed successfully`,
      });
      return result;
    } catch (error: any) {
      console.error(`executeContractCall: ${operationName} failed:`, error);
      console.error(`executeContractCall: ${operationName} error details:`, {
        message: error?.message,
        code: error?.code,
        reason: error?.reason,
        data: error?.data,
        stack: error?.stack
      });

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

  // Initialize contracts when dependencies change
  useEffect(() => {
    console.log('Contract integration useEffect triggered:', {
      account: !!account,
      provider: !!provider,
      selectedChain,
      isInitialized: state.isInitialized,
      isInitializing: state.isInitializing
    });

    // Check if we need to re-initialize due to chain change
    const needsReinitialization = account && provider && selectedChain && !state.isInitializing && (
      !state.isInitialized || // Not initialized yet
      (state.isInitialized && initializedChainRef.current !== selectedChain) // Chain changed
    );
    
    if (needsReinitialization) {
      // If chain changed, reset the initialized state first
      if (state.isInitialized && initializedChainRef.current !== selectedChain) {
        console.log(`Chain changed from ${initializedChainRef.current} to ${selectedChain}, resetting contract state`);
        setState({
          isInitialized: false,
          isInitializing: false,
          error: null,
          contractService: null,
          connectedAccount: null,
          retryCount: 0,
          canRetry: true,
        });
        // Reset the initialized chain ref
        initializedChainRef.current = null;
        // Reset notification flag for new chain
        resetContractsConnectedNotification();
      }
      // Prevent rapid re-initialization attempts (debounce)
      const now = Date.now();
      const timeSinceLastAttempt = now - lastInitAttemptRef.current;
      const MIN_RETRY_INTERVAL = 5000; // 5 seconds minimum between attempts
      
      if (timeSinceLastAttempt < MIN_RETRY_INTERVAL) {
        console.log(`Debouncing contract initialization. Last attempt was ${timeSinceLastAttempt}ms ago, waiting ${MIN_RETRY_INTERVAL - timeSinceLastAttempt}ms more.`);
        
        // Clear any existing timeout
        if (initializationTimeoutRef.current) {
          clearTimeout(initializationTimeoutRef.current);
        }
        
        // Schedule initialization after debounce period
        initializationTimeoutRef.current = setTimeout(() => {
          console.log('Debounced contract initialization starting...');
          lastInitAttemptRef.current = Date.now();
          initializeContracts(selectedChain);
        }, MIN_RETRY_INTERVAL - timeSinceLastAttempt);
        
        return;
      }
      
      console.log('Initializing contracts...');
      lastInitAttemptRef.current = now;

      // Always use the user's selected chain - let the contract service handle chain switching
      console.log(`Initializing contracts with user-selected chain: ${selectedChain}`);
      
      // Detect current chain for logging purposes only
      detectCurrentChain(provider).then(detectedChain => {
        if (detectedChain && detectedChain !== selectedChain) {
          console.log(`MetaMask is on ${detectedChain} but app requires ${selectedChain}. Contract service will handle the switch.`);
        } else {
          console.log(`MetaMask chain matches selected chain: ${selectedChain}`);
        }
      }).catch(error => {
        console.log('Could not detect current chain:', error);
      });
      
      // Always initialize with the user's selected chain
      initializeContracts(selectedChain);
    } else if (!account || !provider) {
      console.log('Clearing contract state - no account or provider');
      setState({
        isInitialized: false,
        isInitializing: false,
        error: null,
        contractService: null,
        connectedAccount: null,
        retryCount: 0,
        canRetry: true,
      });
      // Clear the initialized chain ref when disconnecting
      initializedChainRef.current = null;
      // Reset notification flag when wallet disconnects
      resetContractsConnectedNotification();
    }
  }, [account, provider, selectedChain, state.isInitializing, state.isInitialized, initializeContracts, setSelectedChain]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, []);

  // Handle chain changes - disabled to prevent loops, chain switching handled in initializeContracts
  // useEffect(() => {
  //   console.log('Chain change useEffect triggered:', {
  //     isInitialized: state.isInitialized,
  //     selectedChain,
  //     contractService: !!state.contractService
  //   });
  //
  //   if (state.isInitialized && selectedChain && state.contractService) {
  //     console.log('Switching to chain:', selectedChain);
  //     switchChain(selectedChain);
  //   }
  // }, [selectedChain, state.isInitialized, state.contractService]);

  return {
    ...state,
    initializeContracts,
    switchChain,
    retryInitialization,
    executeContractCall,
    // Convenience methods
    isReady: state.isInitialized && !!state.contractService,
    canExecute: state.isInitialized && !!state.contractService && !!state.connectedAccount,
  };
};

// Pool-specific operations hook
export const usePoolOperations = () => {
  const contractIntegration = useContractIntegration({ showConnectedNotification: false });
  const { executeContractCall, contractService } = contractIntegration;

  const joinPool = useCallback(async (poolId: string, peerId?: string) => {
    return executeContractCall(
      () => contractService!.joinPool(poolId, peerId),
      'Join Pool'
    );
  }, [executeContractCall, contractService]);

  const leavePool = useCallback(async (poolId: string, peerId?: string) => {
    return executeContractCall(
      () => contractService!.leavePool(poolId, peerId),
      'Leave Pool'
    );
  }, [executeContractCall, contractService]);

  const cancelJoinRequest = useCallback(async (poolId: string, peerId?: string) => {
    return executeContractCall(
      () => contractService!.cancelJoinRequest(poolId, peerId),
      'Cancel Join Request'
    );
  }, [executeContractCall, contractService]);

  const voteJoinRequest = useCallback(async (poolId: string, peerId: string, voterPeerId: string, vote: boolean) => {
    return executeContractCall(
      () => contractService!.voteJoinRequest(poolId, peerId, voterPeerId, vote),
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
