export const WaletConnect_Project_Id = '94a4ca39db88ee0be8f6df95fdfb560a';
export const INFURA_API_KEY = '7bf8350fe481410d91430dfcce0ce32e';
export const COMM_SERVER_URL = '';
export const providerMetadata = {
  name: 'Blox dApp',
  description: 'Blox hardware dApp',
  url: 'https://fx.land/',
  icons: ['https://fx.land/favicon-32x32.png'],
  redirect: {
    native: 'fxblox://',
  },
};

// Chain IDs
export const mumbaiChainId: string = '0x13881';
export const goerliChainId: string = '0x5';
export const ethereumChainId: string = '0x1';
export const polygonChainId: string = '0x89';
export const baseChainId: string = '0x2105'; // Base mainnet
export const skaleChainId: string = '0x585eb4b1'; // SKALE Europa Hub

// Chain configurations
export const mumbaiChainParams = {
  chainId: mumbaiChainId,
  chainName: 'Mumbai',
  blockExplorerUrls: ['https://mumbai.polygonscan.com'],
  nativeCurrency: { symbol: 'MATIC', decimals: 18 },
  rpcUrls: ['https://polygon-mumbai-bor.publicnode.com'],
};

export const goerliChainParams = {
  chainId: goerliChainId,
  chainName: 'Goerli',
  blockExplorerUrls: ['https://goerli.etherscan.io'],
  nativeCurrency: { symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://ethereum-goerli.publicnode.com'],
};

export const ethereumChainParams = {
  chainId: ethereumChainId,
  chainName: 'Ethereum Mainnet',
  blockExplorerUrls: ['https://goerli.etherscan.io'],
  nativeCurrency: { symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://ethereum-goerli.publicnode.com'],
};

export const baseChainParams = {
  chainId: baseChainId,
  chainName: 'Base',
  blockExplorerUrls: ['https://basescan.org'],
  nativeCurrency: { symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://mainnet.base.org'],
};

export const skaleChainParams = {
  chainId: skaleChainId,
  chainName: 'SKALE Europa Hub',
  blockExplorerUrls: ['https://elated-tan-skat.explorer.mainnet.skalenodes.com'],
  nativeCurrency: { symbol: 'sFUEL', decimals: 18 },
  rpcUrls: ['https://mainnet.skalenodes.com/v1/elated-tan-skat'],
};

export const chainNames: Record<string, string> = {
  '0x13881': 'Polygon Mumbai',
  '0x5': 'Goerli Ethereum testnet',
  '0x1': 'Ethereum Mainnet',
  '0x89': 'Polygon',
  '0x2105': 'Base',
  '0x585eb4b1': 'SKALE Europa Hub',
};

export const chains: Record<string, any> = {
  '0x13881': mumbaiChainParams,
  '0x5': goerliChainParams,
  '0x1': ethereumChainParams,
  '0x2105': baseChainParams,
  '0x585eb4b1': skaleChainParams,
};

// Supported chains for pool operations
export const SUPPORTED_POOL_CHAINS = [baseChainId, skaleChainId];
export const DEFAULT_POOL_CHAIN = skaleChainId;
export const BASE_AUTHORIZATION_CODE = '9870';
