import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TPool } from '../models';
import { useUserProfileStore } from './useUserProfileStore';

interface PoolsActionSlice {
  setHasHydrated: (isHydrated: boolean) => void;
  getPools: () => Promise<void>;
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
  setDirty: () => void;
}

interface PoolsModel {
  _hasHydrated: boolean;
  pools: PoolData[];
  dirty: boolean;
  enableInteraction: boolean;
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
  dirty: false,
  enableInteraction: true,
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
    getPools: async () => {
      try {
        // Get the selected chain from settings
        const selectedChain = useSettingsStore.getState().selectedChain;
        const contractService = getContractService(selectedChain);

        // Get pools from contract
        const poolList = await contractService.listPools(0, 25);
        console.log('Contract pools:', poolList);

        let requested = false;
        let joined = false;
        let numVotes = 0;
        let poolIdOfInterest = '';

        // Attempt to use stored wallet address to fetch user pool info without triggering MetaMask
        const accountId = useUserProfileStore.getState().address;

        if (accountId) {
          try {
            console.log('Using stored wallet address to get user pool info:', accountId);

            // Get user pool info from contract
            const userPool = await contractService.getUserPool(accountId);
            console.log('User pool:', userPool);

            if (userPool && userPool.poolId !== '0') {
              // User is in a pool
              requested = true;
              joined = true;
              poolIdOfInterest = userPool.poolId;
            } else if (userPool && userPool.requestPoolId !== '0') {
              // User has a pending join request
              poolIdOfInterest = userPool.requestPoolId;
              const joinRequestInfo = await contractService.getJoinRequest(
                userPool.requestPoolId,
                accountId
              );
              console.log('Join request info:', joinRequestInfo);
              numVotes = joinRequestInfo.positive_votes + joinRequestInfo.negative_votes;
              requested = true;
              joined = false;
            }

            set({ enableInteraction: true });
          } catch (error) {
            console.log('Error getting user pool info:', error);
            set({ enableInteraction: false });
          }
        } else {
          // Wallet address not available, disable pool interaction to avoid unwanted wallet prompts
          set({ enableInteraction: false });
        }

        // Transform contract pools to app format
        const transformedPools = poolList.map((pool) => {
          const isUserPool = pool.poolId === poolIdOfInterest;
          const joinInfo = {
            requested: isUserPool ? requested : false,
            joined: isUserPool ? joined : false,
            numVotes: isUserPool ? numVotes : 0,
            numVoters: pool.participants.length,
          };

          return {
            poolID: pool.poolId,
            name: pool.name,
            region: pool.region,
            parent: pool.parent,
            participants: pool.participants,
            replicationFactor: pool.replicationFactor,
            ...joinInfo,
          } as PoolData;
        });

        set({
          pools: transformedPools,
          dirty: false,
        });
      } catch (error) {
        console.error('Error getting pools:', error);
        set({
          pools: [] as PoolData[],
          dirty: false,
        });
        throw error;
      }
    },
    joinPool: async (poolID: number) => {
      try {
        const selectedChain = useSettingsStore.getState().selectedChain;
        const contractService = getContractService(selectedChain);

        await contractService.joinPool(poolID.toString());
        set({ dirty: true });
      } catch (error) {
        console.log('joinPool error:', error);
        throw error;
      }
    },
    cancelPoolJoin: async (poolID: number) => {
      try {
        const selectedChain = useSettingsStore.getState().selectedChain;
        const contractService = getContractService(selectedChain);

        await contractService.cancelJoinRequest(poolID.toString());
        set({ dirty: true });
      } catch (error) {
        console.log('cancelPoolJoin error:', error);
        throw error;
      }
    },
    leavePool: async (poolID: number) => {
      try {
        const selectedChain = useSettingsStore.getState().selectedChain;
        const contractService = getContractService(selectedChain);

        await contractService.leavePool(poolID.toString());
        set({ dirty: true });
      } catch (error) {
        console.log('leavePool error:', error);
        throw error;
      }
    },
    setDirty: () => {
      set({ dirty: true });
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
