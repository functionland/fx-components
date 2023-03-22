import { useState, useEffect } from 'react';
import { useNetInfo, NetInfoStateType } from '@react-native-community/netinfo';
export const DEFAULT_NETWORK_NAME = 'Blox';

export function useIsConnectedToBox() {
  const networkInfo = useNetInfo();
  const [isConnected, setIsConnected] = useState(
    networkInfo.type === NetInfoStateType.wifi &&
      networkInfo?.details?.ssid === DEFAULT_NETWORK_NAME
  );
  useEffect(() => {
    if (networkInfo.type === NetInfoStateType.wifi)
      setIsConnected(networkInfo?.details?.ssid === DEFAULT_NETWORK_NAME);
    else setIsConnected(false);
  }, [networkInfo]);

  return isConnected;
}
