import { useAppKit } from '@reown/appkit-react-native';
import { SupportedChain } from '../contracts/types';
import { baseMainnet, skaleEuropaHub } from '../config/appKitConfig';

export interface NetworkSwitchResult {
  success: boolean;
  error?: string;
  action?: 'switched' | 'added_and_switched' | 'already_connected' | 'pending';
}

/**
 * Hook to provide network switching functionality via Reown AppKit
 */
export const useNetworkSwitcher = () => {
  const { switchNetwork } = useAppKit();

  const switchToNetwork = async (targetChain: SupportedChain): Promise<NetworkSwitchResult> => {
    try {
      const targetNetwork = targetChain === 'base' ? baseMainnet : skaleEuropaHub;
      await switchNetwork(targetNetwork);
      return { success: true, action: 'switched' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Network switch failed' };
    }
  };

  return {
    switchToNetwork,
    isProviderAvailable: true,
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
