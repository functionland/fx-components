import '@walletconnect/react-native-compat'; // MUST be first import

import { createAppKit, type AppKitNetwork } from '@reown/appkit-react-native';
import { EthersAdapter } from '@reown/appkit-ethers-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import { WaletConnect_Project_Id } from '../utils/walletConnectConifg';

// Custom chain definitions
export const baseMainnet: AppKitNetwork = {
  id: 8453,
  name: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://base-rpc.publicnode.com'] } },
  blockExplorers: { default: { name: 'BaseScan', url: 'https://basescan.org' } },
  chainNamespace: 'eip155',
  caipNetworkId: 'eip155:8453',
};

export const skaleEuropaHub: AppKitNetwork = {
  id: 2046399126, // 0x79f99296
  name: 'SKALE Europa Hub',
  nativeCurrency: { name: 'sFUEL', symbol: 'sFUEL', decimals: 18 },
  rpcUrls: { default: { http: ['https://mainnet.skalenodes.com/v1/elated-tan-skat'] } },
  blockExplorers: { default: { name: 'SKALE Explorer', url: 'https://elated-tan-skat.explorer.mainnet.skalenodes.com' } },
  chainNamespace: 'eip155',
  caipNetworkId: 'eip155:2046399126',
};

// Namespaced AsyncStorage adapter so AppKit/WalletConnect keys don't collide
// with Zustand stores and other app data.
const STORAGE_PREFIX = '@appkit/';

const storage = {
  getKeys: async () => {
    const allKeys = await AsyncStorage.getAllKeys();
    // Only return keys that belong to AppKit
    return allKeys
      .filter((k) => k.startsWith(STORAGE_PREFIX))
      .map((k) => k.slice(STORAGE_PREFIX.length));
  },
  getEntries: async <T = any>(): Promise<[string, T][]> => {
    const allKeys = await AsyncStorage.getAllKeys();
    const appKitKeys = allKeys.filter((k) => k.startsWith(STORAGE_PREFIX));
    return Promise.all(
      appKitKeys.map(async (prefixedKey) => {
        const raw = await AsyncStorage.getItem(prefixedKey);
        const key = prefixedKey.slice(STORAGE_PREFIX.length);
        let parsed: T;
        try {
          parsed = JSON.parse(raw ?? '') as T;
        } catch {
          parsed = raw as unknown as T;
        }
        return [key, parsed] as [string, T];
      })
    );
  },
  setItem: async <T = any>(key: string, value: T) => {
    await AsyncStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  },
  getItem: async <T = any>(key: string): Promise<T | undefined> => {
    const item = await AsyncStorage.getItem(STORAGE_PREFIX + key);
    if (item == null) return undefined;
    try {
      return JSON.parse(item) as T;
    } catch {
      return item as unknown as T;
    }
  },
  removeItem: async (key: string) => {
    await AsyncStorage.removeItem(STORAGE_PREFIX + key);
  },
};

const ethersAdapter = new EthersAdapter();

export const appKit = createAppKit({
  projectId: WaletConnect_Project_Id,
  networks: [baseMainnet, skaleEuropaHub],
  defaultNetwork: skaleEuropaHub,
  adapters: [ethersAdapter],
  storage,
  clipboardClient: {
    setString: async (value: string) => {
      Clipboard.setString(value);
    },
  },
  metadata: {
    name: 'fxblox',
    description: 'Blox hardware dApp',
    url: 'https://fx.land',
    icons: ['https://ipfs.cloud.fx.land/gateway/bafkreigl4s3qehoblwqglo5zjjjwtzkomxg4i6gygfeqk5s5h33m5iuyra'],
    redirect: {
      native: 'fxblox://',
      universal: 'https://fx.land',
    },
  },
  features: {
    swaps: false,
    onramp: false,
    socials: false,
  },
});
