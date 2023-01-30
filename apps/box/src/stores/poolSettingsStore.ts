import create, { StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blockchain } from '@functionland/react-native-fula';

import { TPool } from '../models';

interface DAppsSlice {
  _hasHydrated: boolean;
  pools: Record<string, TPool>;

  setHasHydrated: (isHydrated: boolean) => void;
  getPools: () => Promise<TPool[]>;
  addPool?: ({
    seed,
    poolName,
  }: {
    seed: string;
    poolName: string;
  }) => Promise<TPool>;
  joinPool?: ({
    seed,
    poolID,
  }: {
    seed: string;
    poolID: number;
  }) => Promise<void>;
  leavePool?: ({
    seed,
    poolID,
  }: {
    seed: string;
    poolID: number;
  }) => Promise<void>;
  cancelPoolJoin?: ({
    seed,
    poolID,
  }: {
    seed: string;
    poolID: number;
  }) => Promise<void>;
}
const createDAppsSlice: StateCreator<
  DAppsSlice,
  [],
  [['zustand/persist', Partial<DAppsSlice>]],
  DAppsSlice
> = persist(
  (set, get) => ({
    _hasHydrated: false,
    setHasHydrated: (isHydrated) => {
      set({
        _hasHydrated: isHydrated,
      });
    },
    pools: {},
    getPools: async () => {
      try {
        // if(!await fula.isReady())
        //   throw 'Fula is not ready!'
        const currentPools = get().pools;
        const newPools = ((await blockchain.listPools())?.pools ||
          []) as TPool[];
        set({
          pools: {
            ...currentPools,
            ...newPools.reduce((obj, pool) => {
              obj[pool.poolID] = pool;
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
  }),
  {
    name: 'dAppsSlice',
    getStorage: () => AsyncStorage,
    serialize: (state) => JSON.stringify(state),
    deserialize: (str) => JSON.parse(str),
    onRehydrateStorage: () => {
      // anything to run before rehydrating, return function is called after rehydrating
      return (state) => {
        state.setHasHydrated(true);
      };
    },
    partialize: (state): Partial<DAppsSlice> => ({
      pools: state.pools,
    }),
  }
);

export const useDAppsStore = create<DAppsSlice>()((...a) => ({
  ...createDAppsSlice(...a),
}));
