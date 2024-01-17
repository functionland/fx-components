import create, { StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TBlox,
  TBloxFreeSpace,
  TBloxConectionStatus,
  TBloxProperty,
} from '../models';
import { blockchain, fula } from '@functionland/react-native-fula';
import { firebase } from '@react-native-firebase/crashlytics';
import { BloxFreeSpaceResponse } from '@functionland/react-native-fula/lib/typescript/types/blockchain';

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
  reset: () => void;

  /**
   * Remote actions
   */
  getBloxSpace: (updateStore?: boolean) => Promise<TBloxFreeSpace>;
  checkBloxConnection: () => Promise<boolean>;
}
interface BloxsModel {
  _hasHydrated: boolean;
  bloxs: Record<string, TBlox>;
  bloxsSpaceInfo?: Record<string, TBloxFreeSpace>;
  bloxsPropertyInfo?: Record<string, TBloxProperty>;
  bloxsConnectionStatus: Record<string, TBloxConectionStatus>;
  currentBloxPeerId?: string;
}
export interface BloxsModelSlice extends BloxsModel, BloxsActionSlice {}
const inittalState: BloxsModel = {
  _hasHydrated: false,
  bloxs: {},
  bloxsSpaceInfo: {},
  bloxsPropertyInfo: {},
  bloxsConnectionStatus: {},
  currentBloxPeerId: undefined,
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
        const { bloxsSpaceInfo, currentBloxPeerId } = get();
        // const bloxSpace = await blockchain.bloxFreeSpace();
        const bloxSpace: BloxFreeSpaceResponse = {
          size: 1000000000000,
          avail: 1000000000,
          used: 70,
          used_percentage: 70,
        };
        console.log(bloxSpace);
        if (updateStore && bloxSpace?.size) {
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
            [currentBloxPeerId]: 'PENDING',
          },
        });
        const connected = await fula.checkConnection();
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
        throw error;
      }
    },
  }),
  {
    name: 'bloxsModelSlice',
    version: 2,
    getStorage: () => AsyncStorage,
    serialize: (state) => JSON.stringify(state),
    deserialize: (str) => JSON.parse(str),
    onRehydrateStorage: () => {
      // anything to run before rehydrating, return function is called after rehydrating
      return (state) => {
        state.setHasHydrated(true);
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
        firebase
          .crashlytics()
          .recordError(error, `BloxsModelSlice migrate:version(${version})`);
      }
      return bloxsModel;
    },
  }
);

export const useBloxsStore = create<BloxsModelSlice>()((...a) => ({
  ...createModeSlice(...a),
}));
