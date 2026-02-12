import { useAccount, useAppKit, useProvider, useAppKitState } from '@reown/appkit-react-native';

export const useWallet = () => {
  const { address, isConnected, chainId } = useAccount();
  const { open, close, disconnect, switchNetwork } = useAppKit();
  const { provider } = useProvider();
  const { isLoading } = useAppKitState();

  return {
    // Backwards-compatible with useSDK() shape
    account: address ?? undefined,
    connected: isConnected,
    connecting: isLoading,
    chainId: chainId != null ? `0x${Number(chainId).toString(16)}` : undefined,
    provider,
    // SDK-like object for files that use sdk.connect() / sdk.disconnect()
    sdk: {
      connect: () => open({ view: 'Connect' }),
      disconnect,
      getProvider: () => provider,
    },
    // New AppKit-native helpers
    open,
    close,
    disconnect,
    switchNetwork,
  };
};
