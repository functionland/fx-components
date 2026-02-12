import { useWallet } from './useWallet';
import { useUserProfileStore } from '../stores/useUserProfileStore';

/**
 * Hook that provides account with fallback logic:
 * 1. If wallet is connected, use the wallet account
 * 2. If wallet is not connected but user signed manually, use the stored wallet address
 * 3. Otherwise, return null
 */
export const useAccountWithFallback = () => {
  const { account: walletAccount, connected } = useWallet();
  const manualSignatureWalletAddress = useUserProfileStore(
    (state) => state.manualSignatureWalletAddress
  );

  // Return wallet account if connected
  if (connected && walletAccount) {
    return walletAccount;
  }

  // Fallback to manually signed wallet address if available
  if (manualSignatureWalletAddress) {
    return manualSignatureWalletAddress;
  }

  // No account available
  return null;
};
