import create, { StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blockchain, chainApi } from '@functionland/react-native-fula';

import { TPool } from '../models';

interface PoolsActionSlice {
  setHasHydrated: (isHydrated: boolean) => void;
  getPools: (search: string) => Promise<void>;
  addPool?: ({
    seed,
    poolName,
  }: {
    seed: string;
    poolName: string;
  }) => Promise<PoolData>;
  joinPool: (poolID: number) => Promise<void>;
  leavePool: (poolID: number) => Promise<void>;
  cancelPoolJoin: (poolID: number) => Promise<void>;
  reset: () => void;
}

interface PoolsModel {
  _hasHydrated: boolean;
  pools: PoolData[];
}

export interface PoolData extends TPool {
  requested: boolean;
  joined: boolean;
  numVotes: number;
  numVoters: number;
}

export interface PoolsModelSlice extends PoolsModel, PoolsActionSlice {}
const initialState: PoolsModel = {
  _hasHydrated: false,
  pools: [],
};

const createPoolsModelSlice: StateCreator<
  PoolsModelSlice,
  [],
  [['zustand/persist', Partial<PoolsModelSlice>]],
  PoolsModelSlice
> = persist(
  (set, _get) => ({
    ...initialState,
    _hasHydrated: false,
    setHasHydrated: (isHydrated) => {
      set({
        _hasHydrated: isHydrated,
      });
    },
    getPools: async (search: string) => {
      try {
        const api = await chainApi.init();
        const poolList = await chainApi.listPools(api);
        console.log(poolList);

        const account = await blockchain.getAccount();
        const accountId = account.account;
        const userPool = await chainApi.getUserPool(api, accountId);
        console.log('userPool:', userPool);
        let requested = false;
        let joined = false;
        let numVotes = 0;
        let poolIdOfInterest = -1;
        if (userPool !== null) {
          if (
            userPool?.requestPoolId !== null &&
            userPool?.requestPoolId !== ''
          ) {
            poolIdOfInterest = parseInt(userPool?.requestPoolId, 10);
            const joinRequestInfo = await chainApi.checkJoinRequest(
              api,
              parseInt(userPool.requestPoolId, 10),
              accountId
            );
            console.log('joinRequestInfo:', joinRequestInfo);
            numVotes = joinRequestInfo ? joinRequestInfo.voted.length : 0;
            requested = true;
            joined = false;
          } else if (
            userPool.poolId !== undefined &&
            userPool.poolId.length > 0 &&
            parseInt(userPool.poolId, 10) >= 0
          ) {
            requested = true;
            joined = true;
            poolIdOfInterest = parseInt(userPool.poolId, 10);
          }
        }
        const newPools = (poolList?.pools || []) as TPool[];
        const userPoolData = newPools
          .filter((pool) => parseInt(pool.poolID, 10) === poolIdOfInterest)
          .map((pool) => {
            const joinInfo = {
              requested: requested,
              joined: joined,
              numVotes: numVotes,
              numVoters: pool.participants.length,
            };
            return {
              ...pool,
              ...joinInfo,
            } as PoolData;
          }) as PoolData[];
        const poolDatas = newPools
          .filter(
            (pool) =>
              parseInt(pool.poolID, 10) !== poolIdOfInterest &&
              (search !== '' ? pool.name.includes(search) : true)
          )
          .map((pool) => {
            const joinInfo = {
              requested: false,
              joined: false,
              numVotes: 0,
              numVoters: 0,
            };
            return {
              ...pool,
              ...joinInfo,
            } as PoolData;
          }) as PoolData[];
        set({
          pools: [...userPoolData, ...poolDatas],
        });
      } catch (error) {
        set({
          pools: [] as PoolData[],
        });
        throw error;
      }
    },
    joinPool: async (poolID: number) => {
      try {
        await blockchain.joinPool(poolID);
      } catch (error) {
        console.log('joinPool: ', error);
        throw error;
      }
    },
    cancelPoolJoin: async (poolID: number) => {
      try {
        await blockchain.cancelPoolJoin(poolID);
      } catch (error) {
        console.log('cancelPoolJoin: ', error);
        throw error;
      }
    },
    leavePool: async (poolID: number) => {
      try {
        await blockchain.leavePool(poolID);
      } catch (error) {
        console.log('leavePool: ', error);
        throw error;
      }
    },
    reset: () => {
      set(initialState);
    },
  }),
  {
    name: 'PoolsModelSlice',
    getStorage: () => AsyncStorage,
    serialize: (state) => JSON.stringify(state),
    deserialize: (str) => JSON.parse(str),
    onRehydrateStorage: () => {
      // anything to run before rehydrating, return function is called after rehydrating
      return (state) => {
        state.setHasHydrated(true);
      };
    },
    partialize: (state): Partial<PoolsModelSlice> => ({
      pools: state.pools,
    }),
  }
);

export const usePoolsStore = create<PoolsModelSlice>()((...a) => ({
  ...createPoolsModelSlice(...a),
}));
