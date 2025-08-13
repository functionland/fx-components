import { ChainConfig, SupportedChain } from './types';
import { baseChainId, skaleChainId } from '../utils/walletConnectConifg';

// Contract addresses for each supported chain
export const CONTRACT_ADDRESSES: Record<SupportedChain, ChainConfig> = {
  base: {
    chainId: baseChainId,
    name: 'Base',
    rpcUrl: 'https://base-rpc.publicnode.com',
    blockExplorer: 'https://basescan.org',
    requiresAuth: true,
    contracts: {
      // Updated proxy contract addresses
      poolStorage: '0xb093fF4B3B3B87a712107B26566e0cCE5E752b4D',
      rewardEngine: '0x31029f90405fd3D9cB0835c6d21b9DFF058Df45A',
      fulaToken: '0x9e12735d77c72c5C3670636D428f2F3815d8A4cB',
    },
  },
  skale: {
    chainId: skaleChainId,
    name: 'SKALE Europa Hub',
    rpcUrl: 'https://mainnet.skalenodes.com/v1/elated-tan-skat',
    blockExplorer: 'https://elated-tan-skat.explorer.mainnet.skalenodes.com',
    requiresAuth: false,
    contracts: {
      // Updated proxy contract addresses
      poolStorage: '0xf9176Ffde541bF0aa7884298Ce538c471Ad0F015',
      rewardEngine: '0xF7c64248294C45Eb3AcdD282b58675F1831fb047',
      fulaToken: '0x9e12735d77c72c5C3670636D428f2F3815d8A4cB',
    },
  },
};

// Local development configuration (Hardhat)
export const LOCAL_DEV_CONFIG: ChainConfig = {
  chainId: '0x7a69', // Hardhat default chain ID (31337)
  name: 'Hardhat Local',
  rpcUrl: 'http://127.0.0.1:8545',
  blockExplorer: 'http://localhost:8545',
  requiresAuth: false,
  contracts: {
    // From your hardhat deployment
    poolStorage: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    rewardEngine: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9', // Using same contract for now
    fulaToken: '0x9e12735d77c72c5C3670636D428f2F3815d8A4cB', // FULA token address
  },
};

// Default chain for pool operations
export const DEFAULT_CHAIN: SupportedChain = 'skale';

// Authorization code for Base chain access
export const BASE_AUTH_CODE = '9870';

// Helper function to get contract config by chain ID
export const getChainConfig = (chainId: string): ChainConfig | null => {
  // Check for local development first
  if (chainId === LOCAL_DEV_CONFIG.chainId) {
    return LOCAL_DEV_CONFIG;
  }

  const chain = Object.values(CONTRACT_ADDRESSES).find(
    config => config.chainId === chainId
  );
  return chain || null;
};

// Helper function to get contract config by chain name
export const getChainConfigByName = (chainName: SupportedChain | 'local'): ChainConfig => {
  if (chainName === 'local') {
    return LOCAL_DEV_CONFIG;
  }
  return CONTRACT_ADDRESSES[chainName as SupportedChain];
};

// Helper to determine if we're in development mode
export const isLocalDevelopment = (): boolean => {
  return __DEV__ || process.env.NODE_ENV === 'development';
};

// Validate if a chain is supported for pool operations
export const isSupportedChain = (chainId: string): boolean => {
  return Object.values(CONTRACT_ADDRESSES).some(
    config => config.chainId === chainId
  );
};

// Get all supported chain IDs
export const getSupportedChainIds = (): string[] => {
  return Object.values(CONTRACT_ADDRESSES).map(config => config.chainId);
};

// Chain display names for UI
export const CHAIN_DISPLAY_NAMES: Record<SupportedChain, string> = {
  base: 'Base Network',
  skale: 'SKALE Europa Hub',
};

// RPC endpoints with fallbacks
export const RPC_ENDPOINTS: Record<SupportedChain, string[]> = {
  base: [
    'https://base-rpc.publicnode.com',
    'https://1rpc.io/base',
    'https://mainnet.base.org',
  ],
  skale: [
    'https://mainnet.skalenodes.com/v1/elated-tan-skat',
    // Add more SKALE RPC endpoints if available
  ],
};

// Block explorer URLs for transactions
export const BLOCK_EXPLORERS: Record<SupportedChain, string> = {
  base: 'https://basescan.org',
  skale: 'https://elated-tan-skat.explorer.mainnet.skalenodes.com',
};

// Gas settings for each chain
export const GAS_SETTINGS: Record<SupportedChain, {
  gasLimit: number;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}> = {
  base: {
    gasLimit: 500000,
    maxFeePerGas: '1000000000', // 1 gwei
    maxPriorityFeePerGas: '1000000000', // 1 gwei
  },
  skale: {
    gasLimit: 500000,
    // SKALE has zero gas fees
  },
};

// Contract method gas limits
export const METHOD_GAS_LIMITS = {
  joinPool: 200000,
  leavePool: 550000,
  cancelJoinRequest: 100000,
  voteJoinRequest: 120000,
  claimRewards: 850000, // Increased from 500000 to provide buffer for token transfers (was using 490,622)
  createPool: 250000,
} as const;

export type ContractMethod = keyof typeof METHOD_GAS_LIMITS;
