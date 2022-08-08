export interface User {
  connectionDate: string | number; // UTC
  decentralizedId: string; // or number?
  imageUrl?: string;
  username: string;
  peerId: string[]; // identifiers for separate hardware setups
  securityPassphrase: string;
  walletId: string; // or number?
  walletName: string;
}

export interface Friend {
  status: 'invited' | 'accepted'; // other status needed?
  connectionDate: string | number; // UTC : date user connected as friend
  decentralizedId: string; // or number?
  imageUrl?: string;
  username: string;
  peerId: string[]; // identifiers for which blox hardware friend is invited to use
}

export const mockUserData: User = {
  connectionDate: new Date().valueOf(),
  decentralizedId: 'key:abc12345xyz',
  username: 'testUser',
  peerId: ['1'],
  imageUrl: require('./mockAssets/sample.png'),
  securityPassphrase: 'bluebird',
  walletId: 'wallet12345',
  walletName: 'TrustWallet',
};

export const mockFriendData: Friend[] = [
  {
    status: 'accepted',
    connectionDate: new Date().valueOf(),
    decentralizedId: 'ghoim234tnas09',
    username: 'friend1',
    peerId: ['1'],
    imageUrl: require('./mockAssets/sample.png'),
  },
  {
    status: 'invited',
    connectionDate: new Date().valueOf(),
    decentralizedId: '1plk09aslkm',
    username: 'friend2',
    peerId: ['1'],
    imageUrl: require('./mockAssets/sample.png'),
  },
  {
    status: 'accepted',
    connectionDate: new Date().valueOf(),
    decentralizedId: 'lkj013980ma',
    username: 'friend3',
    peerId: ['1'],
    imageUrl: require('./mockAssets/sample.png'),
  },
];
