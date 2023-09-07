import { IProviderMetadata } from '@walletconnect/modal-react-native';

export const WaletConnect_Project_Id = '94a4ca39db88ee0be8f6df95fdfb560a';
export const providerMetadata: IProviderMetadata = {
  name: 'Blox dApp',
  description: 'Blox hardware dApp',
  url: 'https://fx.land/',
  icons: ['https://fx.land/favicon-32x32.png'],
  redirect: {
    native: 'fxblox://',
  },
};

export const sessionParams = {
  namespaces: {
    eip155: {
      methods: [
        //'eth_sendTransaction',
        //'eth_signTransaction',
        'eth_sign',
        'personal_sign',
        //'eth_signTypedData',
      ],
      //chains: ['eip155:1','eip155:137','eip155:5','eip155:80001'], //['Ethereum Mainnet','polygon','Goerli Testnet','Mumbai Testnet']
      //chains: [`eip155:${chainId || 1}`],
      chains: ['eip155:1'],
      events: ['chainChanged', 'accountsChanged'],
      rpcMap: {},
    },
  },
};
