import { useCallback } from 'react';
import { useWallet } from './useWallet';
import { useToast } from '@functionland/component-library';

export const useWalletConnection = () => {
  const { queueToast } = useToast();
  const { connected, account, connecting, open, disconnect } = useWallet();

  const connectWallet = useCallback(async () => {
    try {
      await open({ view: 'Connect' });
      queueToast({
        type: 'success',
        title: 'Wallet Connected',
        message: 'Wallet connected successfully',
      });
    } catch (e: any) {
      queueToast({
        type: 'error',
        title: 'Connection Failed',
        message: typeof e === 'object' && 'message' in e ? e.message : 'Failed to connect wallet',
      });
    }
  }, [open, queueToast]);

  const disconnectWallet = useCallback(async () => {
    try {
      await disconnect();
      queueToast({
        type: 'info',
        title: 'Wallet Disconnected',
        message: 'Wallet disconnected',
      });
    } catch (e: any) {
      queueToast({
        type: 'error',
        title: 'Disconnect Failed',
        message: typeof e === 'object' && 'message' in e ? e.message : 'Failed to disconnect wallet',
      });
    }
  }, [disconnect, queueToast]);

  return {
    connected,
    account,
    connecting,
    error: null,
    connectWallet,
    disconnectWallet,
  };
};
