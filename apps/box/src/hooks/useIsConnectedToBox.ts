import { useState, useEffect } from 'react';
import { isEmulatorSync } from 'react-native-device-info';
import WifiManager from 'react-native-wifi-reborn';
import { useNetInfo, NetInfoStateType } from '@react-native-community/netinfo'
export const DEFAULT_NETWORK_NAME = 'Box';
const TIMEOUT = 5000;

export function useIsConnectedToBox() {
  const [isConnected, setIsConnected] = useState(false);
  const networkInfo = useNetInfo()
  useEffect(() => {
    if (networkInfo.isConnected && networkInfo.type === NetInfoStateType.wifi)
      setIsConnected(networkInfo?.details?.ssid === DEFAULT_NETWORK_NAME)
    else
      setIsConnected(false)
  }, [networkInfo]);

  return isConnected;
}
