import { useSDK } from '@metamask/sdk-react';
import { SupportedChain } from '../contracts/types';
import { baseChainParams, skaleChainParams, baseChainId, skaleChainId } from './walletConnectConifg';

export interface NetworkSwitchResult {
  success: boolean;
  error?: string;
  action?: 'switched' | 'added_and_switched' | 'already_connected' | 'pending';
}

/**
 * Race an RPC request against a timeout.
 * MetaMask Mobile SDK often hangs forever when the app goes to background,
 * so we cap how long we wait.
 */
const rpcWithTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT:${label}`)), ms)
    ),
  ]);

const RPC_TIMEOUT = 15000; // 15 seconds – enough for in-app approval, short enough to not block

/**
 * Automatically ensures MetaMask is connected to the specified network.
 *
 * Because MetaMask Mobile SDK promises can hang indefinitely when the
 * user is sent to the MetaMask app, every RPC call is wrapped with a
 * timeout. On timeout we return action:'pending' and let the caller's
 * AppState / chainChanged listeners detect the actual outcome.
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

    const targetChainConfig = getChainConfig(targetChain);
    if (!targetChainConfig) {
      return { success: false, error: `Unsupported chain: ${targetChain}` };
    }

    // Check current network
    let currentChainId: string;
    try {
      currentChainId = await rpcWithTimeout(
        web3Provider.request({ method: 'eth_chainId' }),
        5000,
        'eth_chainId'
      );
    } catch {
      // Can't even read current chain – return pending so UI retries later
      return { success: false, action: 'pending' };
    }

    console.log(`Current chain: ${currentChainId}, Target chain: ${targetChainConfig.chainId}`);

    if (currentChainId === targetChainConfig.chainId) {
      return { success: true, action: 'already_connected' };
    }

    // --- Step 1: Try wallet_switchEthereumChain ---
    try {
      console.log(`Attempting wallet_switchEthereumChain to ${targetChain} (${targetChainConfig.chainId})`);
      await rpcWithTimeout(
        web3Provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainConfig.chainId }],
        }),
        RPC_TIMEOUT,
        'wallet_switchEthereumChain'
      );
      console.log(`wallet_switchEthereumChain resolved for ${targetChain}`);
      return { success: true, action: 'switched' };
    } catch (switchError: any) {
      if (switchError.message?.startsWith('TIMEOUT:')) {
        // MetaMask opened but promise hung – let AppState listener detect the outcome
        console.log('wallet_switchEthereumChain timed out – returning pending');
        return { success: false, action: 'pending' };
      }

      console.log('wallet_switchEthereumChain failed:', switchError?.code, switchError?.message);

      const needsAdd =
        switchError.code === 4902 ||
        switchError.code === -32603 ||
        switchError.message?.includes('Unrecognized chain ID') ||
        switchError.message?.includes('wallet_addEthereumChain');

      if (!needsAdd) {
        return {
          success: false,
          error: `Failed to switch to ${targetChain}: ${switchError.message}`,
        };
      }
    }

    // --- Step 2: Chain unknown – add it ---
    try {
      console.log(`Attempting wallet_addEthereumChain for ${targetChain}`);
      await rpcWithTimeout(
        web3Provider.request({
          method: 'wallet_addEthereumChain',
          params: [targetChainConfig],
        }),
        RPC_TIMEOUT,
        'wallet_addEthereumChain'
      );
      console.log(`wallet_addEthereumChain resolved for ${targetChain}`);
    } catch (addError: any) {
      if (addError.message?.startsWith('TIMEOUT:')) {
        console.log('wallet_addEthereumChain timed out – returning pending');
        return { success: false, action: 'pending' };
      }
      console.error('Failed to add network:', addError);
      return {
        success: false,
        error: `Failed to add ${targetChain} network: ${addError.message}`,
      };
    }

    // --- Step 3: Verify chain after add ---
    try {
      const newChainId = await rpcWithTimeout(
        web3Provider.request({ method: 'eth_chainId' }),
        5000,
        'eth_chainId (post-add)'
      );
      console.log(`After add, current chain: ${newChainId}, target: ${targetChainConfig.chainId}`);

      if (newChainId === targetChainConfig.chainId) {
        return { success: true, action: 'added_and_switched' };
      }

      // Added but not switched – try explicit switch
      console.log('Chain added but not switched, calling wallet_switchEthereumChain');
      await rpcWithTimeout(
        web3Provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainConfig.chainId }],
        }),
        RPC_TIMEOUT,
        'wallet_switchEthereumChain (post-add)'
      );
      return { success: true, action: 'added_and_switched' };
    } catch (err: any) {
      if (err.message?.startsWith('TIMEOUT:')) {
        console.log('Post-add switch timed out – returning pending');
        return { success: false, action: 'pending' };
      }
      console.error('Failed to switch after adding network:', err);
      return {
        success: false,
        error: `Network added but failed to switch to ${targetChain}: ${err.message}`,
      };
    }
  } catch (error: any) {
    console.error('Network switch error:', error);
    return {
      success: false,
      error: `Network operation failed: ${error.message}`,
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
