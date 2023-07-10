import { IProviderMetadata } from '@walletconnect/modal-react-native';

export const providerMetadata: IProviderMetadata = {
  name: 'Blox dApp',
  description: 'Blox hardware dApp',
  url: 'https://fx.land/',
  icons: ['https://fx.land/favicon-32x32.png'],
  redirect: {
    native: 'fxblox://',
  },
};

export const sessionParams = (chainId: number) => ({
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
      chains: [`eip155:${chainId}`],
      events: ['chainChanged', 'accountsChanged'],
      rpcMap: {},
    },
  },
});
