import { useState, useEffect, useCallback } from 'react';
import { useSDK } from '@metamask/sdk-react';
import { useToast } from '@functionland/component-library';
import { useSettingsStore } from '../stores/useSettingsStore';
import { SupportedChain } from '../contracts/types';
import { ensureCorrectNetwork, NetworkSwitchResult, getNetworkDisplayName } from '../utils/networkSwitcher';

export interface WalletNetworkState {
  isOnCorrectNetwork: boolean;
  isCheckingNetwork: boolean;
  isSwitchingNetwork: boolean;
  lastNetworkCheck: number | null;
  networkError: string | null;
}

/**
 * Hook to manage wallet network state and automatic switching
 */
export const useWalletNetwork = () => {
  const { provider, connected, account } = useSDK();
  const { queueToast } = useToast();
  const selectedChain = useSettingsStore((state) => state.selectedChain);

  const [state, setState] = useState<WalletNetworkState>({
    isOnCorrectNetwork: false,
    isCheckingNetwork: false,
    isSwitchingNetwork: false,
    lastNetworkCheck: null,
    networkError: null,
  });

  /**
   * Check if MetaMask is on the correct network
   */
  const checkNetwork = useCallback(async (): Promise<boolean> => {
    if (!provider || !connected) {
      return false;
    }

    setState(prev => ({ ...prev, isCheckingNetwork: true, networkError: null }));

    try {
      const web3Provider = (provider as any).provider || provider;
      const currentChainId = await web3Provider.request({
        method: 'eth_chainId'
      });

      const targetChainId = selectedChain === 'base' ? '0x2105' : '0x79f99296';
      const isCorrect = currentChainId === targetChainId;

      setState(prev => ({
        ...prev,
        isOnCorrectNetwork: isCorrect,
        isCheckingNetwork: false,
        lastNetworkCheck: Date.now(),
      }));

      return isCorrect;
    } catch (error: any) {
      console.error('Network check failed:', error);
      setState(prev => ({
        ...prev,
        isCheckingNetwork: false,
        networkError: error.message,
        lastNetworkCheck: Date.now(),
      }));
      return false;
    }
  }, [provider, connected, selectedChain]);

  /**
   * Ensure MetaMask is on the correct network, switching/adding if necessary
   */
  const ensureCorrectNetworkConnection = useCallback(async (): Promise<NetworkSwitchResult> => {
    if (!provider || !connected) {
      return { success: false, error: 'Wallet not connected' };
    }

    setState(prev => ({ ...prev, isSwitchingNetwork: true, networkError: null }));

    try {
      const result = await ensureCorrectNetwork(provider, selectedChain);

      if (result.success) {
        setState(prev => ({
          ...prev,
          isOnCorrectNetwork: true,
          isSwitchingNetwork: false,
          lastNetworkCheck: Date.now(),
        }));

        // Show appropriate success message
        if (result.action === 'added_and_switched') {
          queueToast({
            type: 'success',
            title: 'Network Ready',
            message: `${getNetworkDisplayName(selectedChain)} has been set up in MetaMask. You can now proceed with your transaction.`,
            autoHideDuration: 5000,
          });
        } else if (result.action === 'switched') {
          queueToast({
            type: 'success',
            title: 'Network Ready',
            message: `MetaMask is now on ${getNetworkDisplayName(selectedChain)}. You can proceed with your transaction.`,
            autoHideDuration: 4000,
          });
        }
      } else {
        setState(prev => ({
          ...prev,
          isSwitchingNetwork: false,
          networkError: result.error || 'Network switch failed',
        }));

        queueToast({
          type: 'error',
          title: 'Network Switch Failed',
          message: result.error || 'Failed to switch network',
        });
      }

      return result;
    } catch (error: any) {
      console.error('Network switch error:', error);
      setState(prev => ({
        ...prev,
        isSwitchingNetwork: false,
        networkError: error.message,
      }));

      queueToast({
        type: 'error',
        title: 'Network Error',
        message: error.message || 'An unexpected error occurred',
      });

      return { success: false, error: error.message };
    }
  }, [provider, connected, selectedChain, queueToast]);

  /**
   * Wrapper for wallet operations that checks network but does NOT automatically switch
   * Instead, it throws an error that can be caught to show user-initiated network switching UI
   */
  const withCorrectNetwork = useCallback(async <T>(
    operation: () => Promise<T>,
    options?: { skipNetworkCheck?: boolean; showToasts?: boolean }
  ): Promise<T> => {
    const { skipNetworkCheck = false, showToasts = true } = options || {};

    // Skip network check if requested or if wallet not connected
    if (skipNetworkCheck || !connected || !provider) {
      return operation();
    }

    // Check if we're on the correct network
    const isCorrect = await checkNetwork();
    
    if (!isCorrect) {
      // Don't automatically switch - throw error to let UI handle it
      throw new Error(`NETWORK_SWITCH_REQUIRED: Please switch to ${getNetworkDisplayName(selectedChain)} in MetaMask`);
    }

    // Execute the operation
    return operation();
  }, [checkNetwork, connected, provider, selectedChain]);

  // Auto-check network when wallet connects or selected chain changes
  useEffect(() => {
    if (connected && provider) {
      checkNetwork();
    }
  }, [connected, provider, selectedChain, checkNetwork]);

  // Listen for network changes in MetaMask
  useEffect(() => {
    if (!provider) return;

    const web3Provider = provider.provider || provider;
    
    const handleChainChanged = (chainId: string) => {
      console.log('MetaMask chain changed to:', chainId);
      // Recheck network after a short delay to allow MetaMask to settle
      setTimeout(() => {
        checkNetwork();
      }, 500);
    };

    const handleAccountsChanged = (accounts: string[]) => {
      console.log('MetaMask accounts changed:', accounts);
      if (accounts.length > 0) {
        // Recheck network when account changes
        setTimeout(() => {
          checkNetwork();
        }, 500);
      }
    };

    // Add event listeners
    if (web3Provider.on) {
      web3Provider.on('chainChanged', handleChainChanged);
      web3Provider.on('accountsChanged', handleAccountsChanged);
    }

    return () => {
      // Clean up event listeners
      if (web3Provider.removeListener) {
        web3Provider.removeListener('chainChanged', handleChainChanged);
        web3Provider.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [provider, checkNetwork]);

  return {
    ...state,
    checkNetwork,
    ensureCorrectNetworkConnection,
    withCorrectNetwork,
    selectedChain,
    targetNetworkName: getNetworkDisplayName(selectedChain),
  };
};
