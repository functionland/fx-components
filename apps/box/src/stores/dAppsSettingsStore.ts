import create, { StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fula } from '@functionland/react-native-fula'

import { TDApp } from '../models';


interface DAppsSlice {
  _hasHydrated: boolean;
  connectedDApps: TDApp[];

  setHasHydrated: (isHydrated: boolean) => void;
  setAuth: ({ peerId, allow }: { peerId: string, allow: boolean }) => Promise<boolean>;
  addOrUpdateDApp: (dApp: Partial<TDApp>) => TDApp
  removeDApp: (peerId: string) => void
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
    connectedDApps: [],
    setAuth: async ({ peerId, allow }) => {
      try {
        console.log('setAuth',{ peerId, allow })
        // if(!await fula.isReady())
        //   throw 'Fula is not ready!'
        return await fula.setAuth(peerId, allow);
      } catch (error) {
        console.log('setAuth: ',error)
        throw error
      }
    },
    addOrUpdateDApp: (dApp) => {
      const dApps = get().connectedDApps;
      let findDApp: TDApp = dApps.find(app => app.peerId === dApp.peerId)?.[0];
      if (findDApp) {
        findDApp = {
          ...findDApp,
          ...dApp
        }
      } else {
        findDApp = {
          ...dApp
        } as TDApp
      }
      set({
        connectedDApps: dApps.map(app => app.peerId === findDApp.peerId ? findDApp : app)
      })
      return findDApp
    },
    removeDApp: (peerId)=>{
      const dApps = get().connectedDApps;
      set({
        connectedDApps: dApps.filter(app => app.peerId === peerId)
      })
    }
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
      connectedDApps: state.connectedDApps,
    }),
  }
);

export const useDAppsStore = create<DAppsSlice>()((...a) => ({
  ...createDAppsSlice(...a),
}));
