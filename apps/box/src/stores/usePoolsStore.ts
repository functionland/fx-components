import create, { StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blockchain, chainApi } from '@functionland/react-native-fula';

import { TPool } from '../models';

interface PoolsActionSlice {
  setHasHydrated: (isHydrated: boolean) => void;
  getPools: (accountId: string) => Promise<PoolData[]>;
  addPool?: ({
    seed,
    poolName,
  }: {
    seed: string;
    poolName: string;
  }) => Promise<PoolData>;
  joinPool?: ({ poolID }: { poolID: number }) => Promise<void>;
  leavePool?: ({ poolID }: { poolID: number }) => Promise<void>;
  cancelPoolJoin?: ({ poolID }: { poolID: number }) => Promise<void>;
  reset: () => void;
}

interface PoolsModel {
  _hasHydrated: boolean;
  pools: Record<string, PoolData>;
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
  pools: {},
};

const createPoolsModelSlice: StateCreator<
PoolsModelSlice,
  [],
  [['zustand/persist', Partial<PoolsModelSlice>]],
  PoolsModelSlice
> = persist(
  (set, get) => ({
    ...initialState,
    _hasHydrated: false,
    setHasHydrated: (isHydrated) => {
      set({
        _hasHydrated: isHydrated,
      });
    },
    getPools: async (accountId: string) => {
      try {
        // if(!await fula.isReady())
        //   throw 'Fula is not ready!'
        const currentPools = get().pools;
        const api = await chainApi.init();
        const poolList = await chainApi.listPools(api);
        console.log(poolList);

        const userPool = await chainApi.getUserPool(api, accountId);
        let requested = false;
        let joined = false;
        let poolIdOfInterest = 0;
        if (userPool !== null) {
          if (
            userPool?.requestPoolId !== null &&
            userPool?.requestPoolId !== ''
          ) {
            poolIdOfInterest = parseInt(userPool?.requestPoolId, 10);
          } else if (userPool?.poolID > 0) {
            requested = true;
            joined = true;
            poolIdOfInterest = parseInt(userPool?.requestPoolId, 10);
          }
        }

        const newPools = (poolList?.pools || []) as TPool[];
        set({
          pools: {
            ...currentPools,
            ...newPools.reduce(async (obj, pool) => {
              let joinInfo;
              if (requested && pool.poolID === poolIdOfInterest) {
                joinInfo = {
                  requested: true,
                  joined: true,
                  numVotes: 0,
                  numVoters: 0,
                };
                if (!joined) {
                  const joinRequestInfo = await chainApi.checkJoinRequest(
                    api,
                    pool.poolID,
                    accountId
                  );
                  joinInfo = {
                    requested: joinRequestInfo ? true : false,
                    joined: false,
                    numVotes: joinRequestInfo
                      ? joinRequestInfo.voted.length
                      : 0,
                    numVoters: newPools.length,
                  };
                }
              }
              obj[pool.poolID] = {
                ...pool,
                ...joinInfo,
              } as PoolData;
              return obj;
            }, {}),
          },
        });
        return newPools;
      } catch (error) {
        console.log('getPools: ', error);
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
