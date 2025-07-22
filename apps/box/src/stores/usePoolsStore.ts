import { create, StateCreator } from 'zustand';
import { blockchain, fula } from '@functionland/react-native-fula';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TPool } from '../models';
import { useUserProfileStore } from './useUserProfileStore';
import { useSettingsStore } from './useSettingsStore';
import { getContractService } from '../contracts/contractService';

// Type definitions for the new blockchain method responses
export interface PoolJoinResponse {
  account: string;
  poolID: number;
}

export interface PoolLeaveResponse {
  account: string;
  poolID: number;
}

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
  joinPool: (poolID: number) => Promise<PoolJoinResponse>;
  leavePool: (poolID: number) => Promise<PoolLeaveResponse>;
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
        const selectedChain = useSettingsStore.getState().selectedChain;
        const contractService = getContractService(selectedChain);
        const accountId = useUserProfileStore.getState().address;

        let enableInteraction = false;
        if (accountId) {
          enableInteraction = true;
        }
        set({ enableInteraction });

        // Fetch all pool IDs
        const poolIds = await contractService.getAllPoolIds();
        const pools: PoolData[] = [];

        for (const poolId of poolIds) {
          // Fetch pool details
          const pool = await contractService.getPool(poolId);
          // Fetch members
          const participants = await contractService.getPoolMembers(poolId);

          let joined = false;
          let requested = false;
          let numVotes = 0;
          let numVoters = participants.length;

          // Check if user is a member
          if (accountId) {
            const memberIndex = await contractService.getMemberIndex(poolId, accountId);
            if (memberIndex !== '0') {
              joined = true;
            } else {
              // If not a member, check for join request
              // You may need a way to get peerId for this user, for now assume peerId = accountId
              try {
                const joinRequest = await contractService.getJoinRequest(poolId, accountId);
                if (joinRequest && joinRequest.status === 1) {
                  requested = true;
                  numVotes = (joinRequest.approvals || 0) + (joinRequest.rejections || 0);
                }
              } catch (e) {
                // No join request
              }
            }
          }

          pools.push({
            poolID: pool.id,
            name: pool.name,
            region: pool.region,
            parent: '', // Not available in contract
            participants,
            replicationFactor: 1, // Not available in contract
            requested,
            joined,
            numVotes,
            numVoters,
          });
        }

        set({
          pools,
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
      let blockchainResponse: PoolJoinResponse | null = null;
      let blockchainError: Error | null = null;

      try {
        await fula.isReady(false);
        const selectedChain = useSettingsStore.getState().selectedChain;

        // Step 1: Call blockchain.joinPoolWithChain (regardless of success/failure, continue to step 2)
        try {
          blockchainResponse = await blockchain.joinPoolWithChain(poolID, selectedChain);
          console.log('joinPoolWithChain response:', blockchainResponse);
        } catch (error) {
          blockchainError = error instanceof Error ? error : new Error(String(error));
          console.log('joinPoolWithChain error:', blockchainError);
        }

        // Step 2: Always call contractService.joinPool regardless of step 1 result
        try {
          const contractService = getContractService(selectedChain);
          await contractService.joinPool(poolID.toString());
          console.log('contractService.joinPool completed');
        } catch (contractError) {
          console.log('contractService.joinPool error:', contractError);
          // Don't throw here, we want to return the blockchain response if available
        }

        set({ dirty: true });

        // If blockchain call succeeded, return its response
        if (blockchainResponse) {
          return blockchainResponse;
        }

        // If blockchain call failed, throw the error
        if (blockchainError) {
          throw blockchainError;
        }

        // This shouldn't happen, but just in case
        throw new Error('Unknown error in joinPool');
      } catch (error) {
        console.log('joinPool: ', error);
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
      let blockchainResponse: PoolLeaveResponse | null = null;
      let blockchainError: Error | null = null;

      try {
        await fula.isReady(false);
        const selectedChain = useSettingsStore.getState().selectedChain;

        // Step 1: Call blockchain.leavePoolWithChain (regardless of success/failure, continue to step 2)
        try {
          blockchainResponse = await blockchain.leavePoolWithChain(poolID, selectedChain);
          console.log('leavePoolWithChain response:', blockchainResponse);
        } catch (error) {
          blockchainError = error instanceof Error ? error : new Error(String(error));
          console.log('leavePoolWithChain error:', blockchainError);
        }

        // Step 2: Always call contractService.leavePool regardless of step 1 result
        try {
          const contractService = getContractService(selectedChain);
          await contractService.leavePool(poolID.toString());
          console.log('contractService.leavePool completed');
        } catch (contractError) {
          console.log('contractService.leavePool error:', contractError);
          // Don't throw here, we want to return the blockchain response if available
        }

        set({ dirty: true });

        // If blockchain call succeeded, return its response
        if (blockchainResponse) {
          return blockchainResponse;
        }

        // If blockchain call failed, throw the error
        if (blockchainError) {
          throw blockchainError;
        }

        // This shouldn't happen, but just in case
        throw new Error('Unknown error in leavePool');
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
    storage: {
      getItem: async (name: string) => {
        try {
          const value = await AsyncStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        } catch (error) {
          console.error('Error getting item from AsyncStorage:', error);
          return null;
        }
      },
      setItem: async (name: string, value: unknown) => {
        try {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        } catch (error) {
          console.error('Error setting item in AsyncStorage:', error);
        }
      },
      removeItem: async (name: string) => {
        try {
          await AsyncStorage.removeItem(name);
        } catch (error) {
          console.error('Error removing item from AsyncStorage:', error);
        }
      },
    },
    onRehydrateStorage: () => {
      // anything to run before rehydrating, return function is called after rehydrating
      return (state) => {
        state?.setHasHydrated(true);
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
