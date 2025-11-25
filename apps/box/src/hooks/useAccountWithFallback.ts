import { useSDK } from '@metamask/sdk-react';
import { useUserProfileStore } from '../stores/useUserProfileStore';

/**
 * Hook that provides account with fallback logic:
 * 1. If MetaMask is connected, use the MetaMask account
 * 2. If MetaMask is not connected but user signed manually, use the stored wallet address
 * 3. Otherwise, return null
 */
export const useAccountWithFallback = () => {
  const { account: metamaskAccount, connected } = useSDK();
  const manualSignatureWalletAddress = useUserProfileStore(
    (state) => state.manualSignatureWalletAddress
  );

  // Return MetaMask account if connected
  if (connected && metamaskAccount) {
    return metamaskAccount;
  }

  // Fallback to manually signed wallet address if available
  if (manualSignatureWalletAddress) {
    return manualSignatureWalletAddress;
  }

  // No account available
  return null;
};
