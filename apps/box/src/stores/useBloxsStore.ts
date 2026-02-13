import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TBlox,
  TBloxFreeSpace,
  TBloxFolderSize,
  TBloxConectionStatus,
  TBloxProperty,
} from '../models';
import { blockchain, fula, fxblox } from '@functionland/react-native-fula';
import { BloxFreeSpaceResponse } from '@functionland/react-native-fula/lib/typescript/types/blockchain';
import { useUserProfileStore } from './useUserProfileStore';

import {
  GetFolderPathResponse,
  GetDatastoreSizeResponse,
} from '@functionland/react-native-fula/lib/typescript/types/fxblox';

let switchGeneration = 0;
let latestSwitchPeerId: string | null = null;

async function waitForBloxStatusSettled(
  peerId: string,
  get: () => BloxsModelSlice,
  timeoutMs = 60000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = get().bloxsConnectionStatus[peerId];
    if (status === 'CONNECTED' || status === 'DISCONNECTED') return;
    await new Promise((r) => setTimeout(r, 1000));
  }
}

interface BloxsActionSlice {
  /**
   * Local actions
   */
  setHasHydrated: (isHydrated: boolean) => void;
  update: (model: Partial<BloxsModel>) => void;
  addBlox: (blox: TBlox) => void;
  updateBlox: (blox: Partial<TBlox> & Pick<TBlox, 'peerId'>) => void;
  removeBlox: (peerId: string) => void;
  updateBloxPropertyInfo: (peerId: string, info: TBloxProperty) => void;
  updateBloxSpaceInfo: (peerId: string, info: TBloxFreeSpace) => void;
  updateFolderSizeInfo: (peerId: string, info: TBloxFolderSize) => void;
  reset: () => void;
  setCurrentBloxPeerId: (peerId: string) => void;
  switchToBlox: (peerId: string) => Promise<void>;

  /**
   * Remote actions
   */
  getBloxSpace: (updateStore?: boolean) => Promise<TBloxFreeSpace>;
  getFolderSize: (updateStore?: boolean) => Promise<TBloxFolderSize>;
  checkBloxConnection: (maxTries?: number, waitBetweenRetries?: number) => Promise<boolean>;
  checkAllBloxStatus: () => Promise<void>;
}
interface BloxsModel {
  _hasHydrated: boolean;
  bloxs: Record<string, TBlox>;
  bloxsSpaceInfo?: Record<string, TBloxFreeSpace>;
  folderSizeInfo?: Record<string, TBloxFolderSize>;
  bloxsPropertyInfo?: Record<string, TBloxProperty>;
  bloxsConnectionStatus: Record<string, TBloxConectionStatus>;
  currentBloxPeerId?: string;
  isChainSynced: boolean;
  syncProgress: number;
  /** Transient flag: set to 'switch' during switchToBlox to prevent double initFula */
  _initFulaSource: 'switch' | null;
  /** Transient flag: true while checkAllBloxStatus is running */
  _isCheckingAllStatus: boolean;
}
export interface BloxsModelSlice extends BloxsModel, BloxsActionSlice {}
const inittalState: BloxsModel = {
  _hasHydrated: false,
  bloxs: {},
  bloxsSpaceInfo: {},
  bloxsPropertyInfo: {},
  bloxsConnectionStatus: {},
  currentBloxPeerId: undefined,
  isChainSynced: false,
  syncProgress: 0,
  _initFulaSource: null,
  _isCheckingAllStatus: false,
};

const createModeSlice: StateCreator<
  BloxsModelSlice,
  [],
  [['zustand/persist', Partial<BloxsModelSlice>]],
  BloxsModelSlice
> = persist(
  (set, get) => ({
    ...inittalState,
    /**
     * Local actions implpementations
     */
    setHasHydrated: (isHydrated) => {
      set({
        _hasHydrated: isHydrated,
      });
    },
    setCurrentBloxPeerId: (peerId: string) => {
      set({
        currentBloxPeerId: peerId,
      });
    },
    update: (model) => {
      set({
        ...model,
      });
    },
    addBlox: (blox) => {
      const { bloxs: currentBloxs } = get();
      set({
        bloxs: {
          ...currentBloxs,
          [blox.peerId]: {
            ...blox,
          },
        },
      });
    },
    updateBlox: (blox) => {
      const { bloxs: currentBloxs } = get();
      set({
        bloxs: {
          ...currentBloxs,
          [blox.peerId]: {
            ...currentBloxs[blox.peerId],
            ...blox,
          },
        },
      });
    },
    removeBlox: (peerId: string) => {
      const { bloxs: currentBloxs, bloxsPropertyInfo, bloxsSpaceInfo } = get();
      delete bloxsPropertyInfo[peerId];
      delete bloxsSpaceInfo[peerId];
      delete currentBloxs[peerId];
      set({
        bloxs: {
          ...currentBloxs,
        },
        bloxsPropertyInfo: {
          ...bloxsPropertyInfo,
        },
        bloxsSpaceInfo: {
          ...bloxsSpaceInfo,
        },
      });
    },
    reset: () => {
      set({
        ...inittalState,
      });
    },
    /**
     * Remote actions implementaions
     */
    getBloxSpace: async (updateStore = true) => {
      try {
        // Wait for any in-progress fula init to complete before calling native APIs
        const { Helper } = await import('../utils');
        await Helper.waitForFulaInit();
        await fula.isReady(false);
        const { bloxsSpaceInfo, currentBloxPeerId } = get();
        let bloxSpace = await blockchain.bloxFreeSpace();
        console.log('bloxSpace', bloxSpace);
        const emptyBloxSpace: BloxFreeSpaceResponse = {
          size: 0,
          avail: 0,
          used: 0,
          used_percentage: 0,
        };
        console.log(bloxSpace);
        if (updateStore) {
          if (!bloxSpace?.size) {
            bloxSpace = emptyBloxSpace;
          }
          set({
            bloxsSpaceInfo: {
              ...bloxsSpaceInfo,
              [currentBloxPeerId]: {
                ...bloxSpace,
              } as TBloxFreeSpace,
            },
          });
        }
        return bloxSpace as TBloxFreeSpace;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    getFolderSize: async (updateStore = true) => {
      try {
        console.log('getFolderSize');
        // Wait for any in-progress fula init to complete before calling native APIs
        const { Helper } = await import('../utils');
        await Helper.waitForFulaInit();
        await fula.isReady(false);
        const { folderSizeInfo, currentBloxPeerId } = get();
        let folderSizeInfo_tmp: TBloxFolderSize = {
          fula: '-1',
          chain: '-1',
          fulaCount: '-1',
        };
        let chainFolderInfo: GetFolderPathResponse = {
          size: '-1',
          folder_path: '/uniondrive/chain',
        };
        const chainFolderSize = await fxblox.getFolderSize('/uniondrive/chain');
        console.log('chainFolderSize', chainFolderSize);
        let fulaFolderInfo: GetDatastoreSizeResponse = {
          size: '-1',
          folder_path: '',
          count: '-1',
          storage_max: '',
          version: '',
        };
        const fulaFolderSize = await fxblox.getDatastoreSize();

        console.log(chainFolderSize);
        console.log(fulaFolderSize);
        if (updateStore) {
          if (chainFolderSize?.size) {
            chainFolderInfo = chainFolderSize;
          }
          if (fulaFolderSize?.size) {
            fulaFolderInfo = fulaFolderSize;
          }
          folderSizeInfo_tmp = {
            fula: fulaFolderInfo.size,
            fulaCount: fulaFolderInfo.count,
            chain: chainFolderInfo.size,
          };
          set({
            folderSizeInfo: {
              ...folderSizeInfo,
              [currentBloxPeerId]: {
                ...folderSizeInfo_tmp,
              } as TBloxFolderSize,
            },
          });
        }
        return folderSizeInfo_tmp;
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    updateBloxPropertyInfo: (peerId, info) => {
      const { bloxsPropertyInfo } = get();
      set({
        bloxsPropertyInfo: {
          ...bloxsPropertyInfo,
          [peerId]: {
            ...info,
          },
        },
      });
    },
    updateFolderSizeInfo: (peerId, info) => {
      const { folderSizeInfo } = get();
      set({
        folderSizeInfo: {
          ...folderSizeInfo,
          [peerId]: {
            ...info,
          },
        },
      });
    },
    updateBloxSpaceInfo: (peerId, info) => {
      const { bloxsSpaceInfo } = get();
      set({
        bloxsSpaceInfo: {
          ...bloxsSpaceInfo,
          [peerId]: {
            ...info,
          },
        },
      });
    },
    checkBloxConnection: async (maxTries?: number, waitBetweenRetries?: number) => {
      // Capture peerId once so we always update the correct blox,
      // even if currentBloxPeerId changes during the async check.
      const peerId = get().currentBloxPeerId;

      try {
        set({
          bloxsConnectionStatus: {
            ...get().bloxsConnectionStatus,
            [peerId]: 'CHECKING',
          },
        });
        console.log('Geting blox connection status');
        const connected = await useUserProfileStore
          .getState()
          .checkBloxConnection(maxTries, waitBetweenRetries);

        set({
          bloxsConnectionStatus: {
            ...get().bloxsConnectionStatus,
            [peerId]: connected ? 'CONNECTED' : 'DISCONNECTED',
          },
        });
        return connected;
      } catch (error) {
        set({
          bloxsConnectionStatus: {
            ...get().bloxsConnectionStatus,
            [peerId]: 'DISCONNECTED',
          },
        });
        return false;
      }
    },
    switchToBlox: async (peerId: string) => {
      const { currentBloxPeerId, bloxsConnectionStatus } = get();

      // If already on this Blox, no need to switch
      if (currentBloxPeerId === peerId) {
        console.log('Already connected to this Blox:', peerId);
        return;
      }

      console.log('Switching from Blox:', currentBloxPeerId, 'to:', peerId);

      // Increment generation so any in-flight switch is cancelled
      const myGeneration = ++switchGeneration;

      const setFulaIsReady = useUserProfileStore.getState().setFulaIsReady;

      // === Fast phase (synchronous — returns immediately) ===
      setFulaIsReady(false);
      latestSwitchPeerId = peerId;
      set({
        _initFulaSource: 'switch',
        currentBloxPeerId: peerId,
        bloxsConnectionStatus: {
          ...bloxsConnectionStatus,
          [peerId]: 'SWITCHING',
        },
      });

      // Helper: mark this specific peerId as DISCONNECTED, but only if a
      // newer generation hasn't already claimed this same peerId (A→B→A case).
      const setDisconnected = () => {
        if (switchGeneration !== myGeneration && latestSwitchPeerId === peerId) {
          return;
        }
        set({
          bloxsConnectionStatus: {
            ...get().bloxsConnectionStatus,
            [peerId]: 'DISCONNECTED',
          },
        });
      };

      // === Background phase (fire-and-forget) ===
      (async () => {
        try {
          // Debounce: wait a short time so rapid switches (A→B→C) only
          // dispatch native calls for the final target. Without this,
          // intermediate switches queue fula.logout/shutdown/newClient on
          // the native bridge, and the Go bridge serializes them — blocking
          // the final switch's native calls for tens of seconds.
          await new Promise(resolve => setTimeout(resolve, 300));
          if (switchGeneration !== myGeneration) {
            console.log('Switch to', peerId, 'debounced (newer switch pending)');
            setDisconnected();
            return;
          }

          // Import Helper dynamically to avoid circular dependency
          const { Helper } = await import('../utils');

          // Reset any in-progress initFula so we can start immediately.
          // The old switch's native call will be cleaned up by our
          // logout+shutdown inside initFula.
          Helper.resetInitFula();
          if (switchGeneration !== myGeneration) {
            console.log('Switch to', peerId, 'superseded after resetInitFula');
            setDisconnected();
            return;
          }

          // Get user credentials
          const { password, signiture } = useUserProfileStore.getState();
          if (!password || !signiture) {
            console.error('Missing credentials for Blox switch');
            setFulaIsReady(false);
            setDisconnected();
            return;
          }

          // Re-initialize Fula with new Blox PeerId
          console.log('Re-initializing Fula connection for new Blox:', peerId);
          await Helper.initFula({
            password,
            signiture,
            bloxPeerId: peerId,
            shouldCancel: () => switchGeneration !== myGeneration,
          });

          if (switchGeneration !== myGeneration) {
            console.log('Switch to', peerId, 'superseded after initFula');
            // Don't touch fulaIsReady — the newer switch owns it
            setDisconnected();
            return;
          }

          // Mark fula as ready — no 5s relay wait (library handles it)
          setFulaIsReady(true);

          // Transition to CHECKING phase
          set({
            bloxsConnectionStatus: {
              ...get().bloxsConnectionStatus,
              [peerId]: 'CHECKING',
            },
          });

          // Call useUserProfileStore.checkBloxConnection directly (not via
          // the store wrapper) so we manage status for this specific peerId
          // rather than whatever currentBloxPeerId happens to be.
          // Use 1 try with short retry — fula.checkConnection() is a native
          // call that blocks the Go bridge for 30+s on unreachable bloxes.
          // With 3 tries / 15s waits the bridge is blocked for 2+ minutes,
          // preventing ALL subsequent fula calls (logout/shutdown/newClient)
          // from any new switch.
          const connected = await useUserProfileStore
            .getState()
            .checkBloxConnection(1, 5);

          if (switchGeneration !== myGeneration) {
            console.log('Switch to', peerId, 'superseded after checkBloxConnection');
            setDisconnected();
            return;
          }

          set({
            bloxsConnectionStatus: {
              ...get().bloxsConnectionStatus,
              [peerId]: connected ? 'CONNECTED' : 'DISCONNECTED',
            },
          });

          console.log('Blox switch completed. Connected:', connected);
        } catch (error) {
          console.error('Failed to switch to Blox:', peerId, error);
          // Always mark failed blox as DISCONNECTED regardless of generation
          setDisconnected();
          // Only touch fulaIsReady if we're still the active switch
          if (switchGeneration === myGeneration) {
            useUserProfileStore.getState().setFulaIsReady(false);
          }
        }
      })();
    },
    checkAllBloxStatus: async () => {
      const { bloxs, currentBloxPeerId } = get();
      const bloxList = Object.keys(bloxs);
      if (bloxList.length === 0) return;

      set({ _isCheckingAllStatus: true });

      try {
        // 1. Check current blox first (no switching needed)
        if (currentBloxPeerId && bloxs[currentBloxPeerId]) {
          await get().checkBloxConnection(1, 5);
        }

        // 2. For each non-current blox, switch + check
        const originalBloxPeerId = currentBloxPeerId;
        for (const peerId of bloxList) {
          if (peerId === originalBloxPeerId) continue;

          // switchToBlox handles: initFula + checkBloxConnection + status updates
          await get().switchToBlox(peerId);

          // Wait for the switch background to complete (poll status)
          await waitForBloxStatusSettled(peerId, get);
        }

        // 3. Switch back to original blox
        if (
          originalBloxPeerId &&
          get().currentBloxPeerId !== originalBloxPeerId
        ) {
          await get().switchToBlox(originalBloxPeerId);
          await waitForBloxStatusSettled(originalBloxPeerId, get);
        }
      } finally {
        set({ _isCheckingAllStatus: false });
      }
    },
  }),
  {
    name: 'bloxsModelSlice',
    version: 2,
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
    partialize: (state): Partial<BloxsModelSlice> => ({
      bloxs: state.bloxs,
      bloxsSpaceInfo: state.bloxsSpaceInfo,
      bloxsPropertyInfo: state.bloxsPropertyInfo,
      currentBloxPeerId: state.currentBloxPeerId,
    }),
    migrate: async (persistedState, version) => {
      const bloxsModel = persistedState as Partial<BloxsModelSlice>;
      try {
        if (version === 1) {
          if (persistedState) {
            const bloxs = Object.values(bloxsModel?.bloxs || {});
            const bloxsSapceInfo = bloxs.reduce((obj, blox) => {
              //@ts-ignore
              obj[blox?.peerId] = { ...blox?.freeSpace };
              return obj;
            }, {});
            const bloxsPropertyInfo = bloxs.reduce((obj, blox) => {
              //@ts-ignore
              obj[blox?.peerId] = { ...blox?.propertyInfo };
              return obj;
            }, {});
            return {
              ...bloxsModel,
              bloxsPropertyInfo: {
                ...bloxsPropertyInfo,
              },
              bloxsSpaceInfo: {
                ...bloxsSapceInfo,
              },
            };
          }
        }
      } catch (error) {
        console.log(error);
      }
      return bloxsModel;
    },
  }
);

export const useBloxsStore = create<BloxsModelSlice>()((...a) => ({
  ...createModeSlice(...a),
}));
