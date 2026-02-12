import { useCallback } from 'react';
import { useAccount, useAppKit } from '@reown/appkit-react-native';
import { useSettingsStore } from '../stores/useSettingsStore';
import { NetworkSwitchResult, getNetworkDisplayName } from '../utils/networkSwitcher';
import { baseMainnet, skaleEuropaHub } from '../config/appKitConfig';

export interface WalletNetworkState {
  isOnCorrectNetwork: boolean;
  isCheckingNetwork: boolean;
  isSwitchingNetwork: boolean;
  lastNetworkCheck: number | null;
  networkError: string | null;
}

/**
 * Hook to manage wallet network state and automatic switching.
 * With Reown AppKit, chainId is reactive — no polling or event listeners needed.
 */
export const useWalletNetwork = () => {
  const { chainId, isConnected } = useAccount();
  const { switchNetwork } = useAppKit();
  const selectedChain = useSettingsStore((state) => state.selectedChain);

  const targetChainId = selectedChain === 'base' ? 8453 : 2046399126;
  const isOnCorrectNetwork = isConnected && chainId === targetChainId;

  const checkNetwork = useCallback(async (): Promise<boolean> => {
    return isOnCorrectNetwork;
  }, [isOnCorrectNetwork]);

  const ensureCorrectNetworkConnection = useCallback(async (): Promise<NetworkSwitchResult> => {
    if (!isConnected) {
      return { success: false, error: 'Wallet not connected' };
    }
    if (isOnCorrectNetwork) {
      return { success: true, action: 'already_connected' };
    }

    try {
      const targetNetwork = selectedChain === 'base' ? baseMainnet : skaleEuropaHub;
      await switchNetwork(targetNetwork);
      return { success: true, action: 'switched' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Network switch failed' };
    }
  }, [isConnected, isOnCorrectNetwork, selectedChain, switchNetwork]);

  const withCorrectNetwork = useCallback(async <T>(
    operation: () => Promise<T>,
    options?: { skipNetworkCheck?: boolean }
  ): Promise<T> => {
    const { skipNetworkCheck = false } = options || {};

    if (skipNetworkCheck || !isConnected) {
      return operation();
    }

    if (!isOnCorrectNetwork) {
      throw new Error(`NETWORK_SWITCH_REQUIRED: Please switch to ${getNetworkDisplayName(selectedChain)}`);
    }

    return operation();
  }, [isConnected, isOnCorrectNetwork, selectedChain]);

  return {
    isOnCorrectNetwork,
    isCheckingNetwork: false,
    isSwitchingNetwork: false,
    lastNetworkCheck: null,
    networkError: null,
    checkNetwork,
    ensureCorrectNetworkConnection,
    withCorrectNetwork,
    selectedChain,
    targetNetworkName: getNetworkDisplayName(selectedChain),
  };
};
