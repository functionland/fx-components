import { useSDK } from '@metamask/sdk-react';
import { SupportedChain } from '../contracts/types';
import { baseChainParams, skaleChainParams, baseChainId, skaleChainId } from './walletConnectConifg';

export interface NetworkSwitchResult {
  success: boolean;
  error?: string;
  action?: 'switched' | 'added_and_switched' | 'already_connected';
}

/**
 * Automatically ensures MetaMask is connected to the specified network.
 * If the network doesn't exist in MetaMask, it will be added.
 * If it exists but isn't active, it will be switched to.
 */
export const ensureCorrectNetwork = async (
  provider: any,
  targetChain: SupportedChain
): Promise<NetworkSwitchResult> => {
  if (!provider) {
    return { success: false, error: 'No provider available' };
  }

  try {
    const web3Provider = (provider as any).provider || provider;
    
    // Get target chain configuration
    const targetChainConfig = getChainConfig(targetChain);
    if (!targetChainConfig) {
      return { success: false, error: `Unsupported chain: ${targetChain}` };
    }

    // Check current network
    const currentChainId = await web3Provider.request({
      method: 'eth_chainId'
    });

    console.log(`Current chain: ${currentChainId}, Target chain: ${targetChainConfig.chainId}`);

    // If already on correct network, no action needed
    if (currentChainId === targetChainConfig.chainId) {
      return { success: true, action: 'already_connected' };
    }

    // For SKALE (custom network), directly try to add it first
    // This reduces the double-popup issue
    if (targetChain === 'skale') {
      console.log('SKALE network detected - attempting to add directly to avoid double popup');
      try {
        await web3Provider.request({
          method: 'wallet_addEthereumChain',
          params: [targetChainConfig],
        });
        
        console.log(`Successfully added and switched to ${targetChain}`);
        return { success: true, action: 'added_and_switched' };
      } catch (addError: any) {
        // If add failed because network already exists, try to switch
        if (addError.code === -32602 || addError.message?.includes('already exists')) {
          console.log('SKALE network already exists, trying to switch...');
          try {
            await web3Provider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: targetChainConfig.chainId }],
            });
            
            console.log(`Successfully switched to ${targetChain}`);
            return { success: true, action: 'switched' };
          } catch (switchError: any) {
            console.error('Failed to switch to existing SKALE network:', switchError);
            return { 
              success: false, 
              error: `Failed to switch to ${targetChain}: ${switchError.message}` 
            };
          }
        } else {
          console.error('Failed to add SKALE network:', addError);
          return { 
            success: false, 
            error: `Failed to add ${targetChain} network: ${addError.message}` 
          };
        }
      }
    }

    // For other networks (like Base), try switch first, then add if needed
    try {
      await web3Provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainConfig.chainId }],
      });
      
      console.log(`Successfully switched to ${targetChain}`);
      return { success: true, action: 'switched' };
    } catch (switchError: any) {
      console.log('Switch failed, checking if network needs to be added:', switchError);
      
      // If switch failed because network doesn't exist (error code 4902), add it
      if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain ID')) {
        try {
          await web3Provider.request({
            method: 'wallet_addEthereumChain',
            params: [targetChainConfig],
          });
          
          console.log(`Successfully added and switched to ${targetChain}`);
          return { success: true, action: 'added_and_switched' };
        } catch (addError: any) {
          console.error('Failed to add network:', addError);
          return { 
            success: false, 
            error: `Failed to add ${targetChain} network: ${addError.message}` 
          };
        }
      } else {
        // Other switch errors (user rejected, etc.)
        console.error('Failed to switch network:', switchError);
        return { 
          success: false, 
          error: `Failed to switch to ${targetChain}: ${switchError.message}` 
        };
      }
    }
  } catch (error: any) {
    console.error('Network switch error:', error);
    return { 
      success: false, 
      error: `Network operation failed: ${error.message}` 
    };
  }
};

/**
 * Get chain configuration for MetaMask network operations
 */
const getChainConfig = (chain: SupportedChain) => {
  switch (chain) {
    case 'base':
      return baseChainParams;
    case 'skale':
      return skaleChainParams;
    default:
      return null;
  }
};

/**
 * Hook to provide network switching functionality
 */
export const useNetworkSwitcher = () => {
  const { provider } = useSDK();

  const switchToNetwork = async (targetChain: SupportedChain): Promise<NetworkSwitchResult> => {
    return ensureCorrectNetwork(provider, targetChain);
  };

  const isOnCorrectNetwork = async (targetChain: SupportedChain): Promise<boolean> => {
    if (!provider) return false;

    try {
      const web3Provider = provider.provider || provider;
      const currentChainId = await web3Provider.request({
        method: 'eth_chainId'
      });

      const targetChainConfig = getChainConfig(targetChain);
      return currentChainId === targetChainConfig?.chainId;
    } catch (error) {
      console.error('Failed to check network:', error);
      return false;
    }
  };

  return {
    switchToNetwork,
    isOnCorrectNetwork,
    isProviderAvailable: !!provider,
  };
};

/**
 * Get user-friendly network name
 */
export const getNetworkDisplayName = (chain: SupportedChain): string => {
  switch (chain) {
    case 'base':
      return 'Base Network';
    case 'skale':
      return 'SKALE Europa Hub';
    default:
      return chain;
  }
};
