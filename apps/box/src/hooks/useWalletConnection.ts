import { useCallback } from 'react';
import { useSDK } from '@metamask/sdk-react';
import { useToast } from '@functionland/component-library';

export const useWalletConnection = () => {
  const { queueToast } = useToast();
  const { sdk, connected, account, connecting, error } = useSDK();

  const connectWallet = useCallback(async () => {
    try {
      await sdk?.connect();
      queueToast({
        type: 'success',
        title: 'Wallet Connected',
        message: 'MetaMask wallet connected successfully',
      });
    } catch (e: any) {
      queueToast({
        type: 'error',
        title: 'Connection Failed',
        message: typeof e === 'object' && 'message' in e ? e.message : 'Failed to connect wallet',
      });
    }
  }, [sdk, queueToast]);

  const disconnectWallet = useCallback(async () => {
    try {
      await sdk?.disconnect();
      queueToast({
        type: 'info',
        title: 'Wallet Disconnected',
        message: 'MetaMask wallet disconnected',
      });
    } catch (e: any) {
      queueToast({
        type: 'error',
        title: 'Disconnect Failed',
        message: typeof e === 'object' && 'message' in e ? e.message : 'Failed to disconnect wallet',
      });
    }
  }, [sdk, queueToast]);

  return {
    connected,
    account,
    connecting,
    error,
    connectWallet,
    disconnectWallet,
  };
};
