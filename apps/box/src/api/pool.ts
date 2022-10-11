export type TPool = {
  poolId: string;
  connectionDate: string | number; // UTC : date user connected as friend
  location: string;
};

export const mockPoolData: TPool[] = [
  {
    poolId: 'Pool_0982345454',
    connectionDate: new Date().valueOf(),
    location: '15 miles',
  },
  {
    poolId: 'Pool_0982345455',
    connectionDate: new Date().valueOf(),
    location: '51 miles',
  },
];
