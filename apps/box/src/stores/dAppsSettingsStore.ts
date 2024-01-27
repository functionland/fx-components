import create, { StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fula, blockchain } from '@functionland/react-native-fula';

import { TDApp } from '../models';
interface DAppsSliceActions {
  setHasHydrated: (isHydrated: boolean) => void;
  setAuth: ({
    peerId,
    allow,
    accountId,
  }: {
    peerId: string;
    allow: boolean;
    accountId?: string;
  }) => Promise<boolean>;
  addOrUpdateDApp: (dApp: Partial<TDApp>) => TDApp;
  removeDApp: (bloxPeerId: string, peerId: string) => void;
}
interface DAppsSliceModel {
  _hasHydrated: boolean;
  // Store the DApp based on bloxPeerid
  connectedDApps: Record<string, TDApp[]>; // key is blox peerId
}
interface DAppsSlice extends DAppsSliceModel, DAppsSliceActions {}

const initialState: DAppsSliceModel = {
  _hasHydrated: false,
  connectedDApps: {}
}
const createDAppsSlice: StateCreator<
  DAppsSlice,
  [],
  [['zustand/persist', Partial<DAppsSlice>]],
  DAppsSlice
> = persist(
  (set, get) => ({
    ...initialState,
    setHasHydrated: (isHydrated) => {
      set({
        _hasHydrated: isHydrated,
      });
    },
    setAuth: async ({ peerId, allow, accountId = '' }) => {
      try {
        // if (!await fula.isReady())
        //   throw 'Fula is not ready!'
        if (accountId && accountId != '') {
          await blockchain.accountFund(accountId);
        }
        return await fula.setAuth(peerId, allow);
      } catch (error) {
        console.log('setAuth: ', error);
        throw error;
      }
    },
    addOrUpdateDApp: (dApp) => {
      const dApps = get().connectedDApps;
      const findDApp = dApps[dApp.bloxPeerId]?.find(app => app.peerId === dApp.peerId && app.bloxPeerId === dApp.bloxPeerId);
      let newDApp = {} as TDApp
      if (findDApp) {
        newDApp = {
          ...findDApp,
          ...dApp,
        } as TDApp;
      } else {
        newDApp = {
          ...dApp,
        } as TDApp;
      }
      set({
        connectedDApps: {
          ...dApps,
          [newDApp.bloxPeerId]: [newDApp, ...(dApps[newDApp.bloxPeerId]||[])]
        },
      });
      return newDApp;
    },
    removeDApp: (bloxPeerId, peerId) => {
      const dApps = get().connectedDApps;
      const bloxDApps = dApps[bloxPeerId];
      if (bloxDApps) {
        set({
          connectedDApps: {
            ...dApps,
            [bloxPeerId]: bloxDApps.filter(dApp => dApp.peerId === peerId)
          },
        });
      }
    },
  }),
  {
    name: 'dAppsSlice',
    version: 1,
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
      connectedDApps: state.connectedDApps,
    }),
  }
);

export const useDAppsStore = create<DAppsSlice>()((...a) => ({
  ...createDAppsSlice(...a),
}));
