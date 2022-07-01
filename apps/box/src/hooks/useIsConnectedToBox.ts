import { useState, useEffect } from 'react';
import { getCurrentWifiSSID } from 'react-native-wifi-reborn';

export const DEFAULT_NETWORK_NAME = 'Box';
const TIMEOUT = 5000;

export function useIsConnectedToBox() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let timeout = null;
    const checkNetwork = () => {
      getCurrentWifiSSID()
        .then((actualSsid) => {
          if (actualSsid === DEFAULT_NETWORK_NAME) setIsConnected(true);
          else setIsConnected(false);

          timeout = setTimeout(checkNetwork, TIMEOUT);
        })
        .catch(() => {
          setIsConnected(false);
          timeout = setTimeout(checkNetwork, TIMEOUT);
        });
    };
    checkNetwork();

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [setIsConnected]);

  return isConnected;
}