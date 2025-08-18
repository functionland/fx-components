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
  switchToBlox: (peerId: string) => Promise<boolean>;

  /**
   * Remote actions
   */
  getBloxSpace: (updateStore?: boolean) => Promise<TBloxFreeSpace>;
  getFolderSize: (updateStore?: boolean) => Promise<TBloxFolderSize>;
  checkBloxConnection: () => Promise<boolean>;
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
    checkBloxConnection: async () => {
      const {
        bloxsConnectionStatus: currentBloxsConnectionStatus,
        currentBloxPeerId,
      } = get();

      try {
        set({
          bloxsConnectionStatus: {
            ...currentBloxsConnectionStatus,
            [currentBloxPeerId]: 'CHECKING',
          },
        });
        console.log('Geting blox connection status');
        const connected = await useUserProfileStore
          .getState()
          .checkBloxConnection();

        set({
          bloxsConnectionStatus: {
            ...currentBloxsConnectionStatus,
            [currentBloxPeerId]: connected ? 'CONNECTED' : 'DISCONNECTED',
          },
        });
        return connected;
      } catch (error) {
        set({
          bloxsConnectionStatus: {
            ...currentBloxsConnectionStatus,
            [currentBloxPeerId]: 'DISCONNECTED',
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
        return true;
      }

      console.log('Switching from Blox:', currentBloxPeerId, 'to:', peerId);
      
      try {
        // Set switching status for new Blox
        set({
          bloxsConnectionStatus: {
            ...bloxsConnectionStatus,
            [peerId]: 'CHECKING',
          },
        });

        // Update current Blox PeerId first
        set({ currentBloxPeerId: peerId });

        // Get user credentials for libp2p reconnection
        const userProfileStore = useUserProfileStore.getState();
        const { password, signiture } = userProfileStore;

        if (password && signiture) {
          // Import Helper dynamically to avoid circular dependency
          const { Helper } = await import('../utils');
          
          // Re-initialize Fula with new Blox PeerId to ensure proper libp2p connection
          console.log('Re-initializing Fula connection for new Blox:', peerId);
          await Helper.initFula({
            password,
            signiture,
            bloxPeerId: peerId,
          });

          // Check connection to new Blox
          const connected = await userProfileStore.checkBloxConnection();
          
          set({
            bloxsConnectionStatus: {
              ...get().bloxsConnectionStatus,
              [peerId]: connected ? 'CONNECTED' : 'DISCONNECTED',
            },
          });

          console.log('Blox switch completed. Connected:', connected);
          return connected;
        } else {
          console.error('Missing credentials for Blox switch');
          set({
            bloxsConnectionStatus: {
              ...get().bloxsConnectionStatus,
              [peerId]: 'DISCONNECTED',
            },
          });
          return false;
        }
      } catch (error) {
        console.error('Failed to switch to Blox:', peerId, error);
        set({
          bloxsConnectionStatus: {
            ...get().bloxsConnectionStatus,
            [peerId]: 'DISCONNECTED',
          },
        });
        return false;
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
