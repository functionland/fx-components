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

export const mumbaiChainId: string = '0x13881';
export const goerliChainId: string = '0x5';
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

export const chainNames: Record<string, string> = {
  '0x13881': 'Polygon Mumbai',
  '0x5': 'Goerli Ethereum testnet',
};

export const chains: Record<string, any> = {
  '0x13881': mumbaiChainParams,
  '0x5': goerliChainParams,
};
