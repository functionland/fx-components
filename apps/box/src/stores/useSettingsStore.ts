import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { Helper } from '../utils';
import moment from 'moment';
import { SupportedChain } from '../contracts/types';
import { DEFAULT_CHAIN, BASE_AUTH_CODE } from '../contracts/config';

export type ColorScheme = 'light' | 'dark';

interface ChainSettings {
  selectedChain: SupportedChain;
  baseAuthorized: boolean;
  setSelectedChain: (chain: SupportedChain) => void;
  authorizeBase: (code: string) => boolean;
  resetBaseAuthorization: () => void;
}

interface ModeSlice extends ChainSettings {
  _hasHydrated: boolean;
  setHasHydrated: (isHydrated: boolean) => void;
  /**
   * Only use in Functional Components, under the hood its using a hooks to get your system
   * @returns 'light' or 'dark'
   */
  getMode: () => ColorScheme;
  isAuto: boolean;
  colorScheme: ColorScheme;
  debugMode?: {
    endDate: Date,
    uniqueId: string
  };
  toggleIsAuto: () => void;
  setColorScheme: (colorScheme: ColorScheme) => void;
  setDebugMode: (uniqueId: string, endDate: Date) => void
}
const createModeSlice: StateCreator<
  ModeSlice,
  [],
  [['zustand/persist', ModeSlice]],
  ModeSlice
> = persist(
  (set, get) => ({
    _hasHydrated: false,
    setHasHydrated: (isHydrated) => {
      set({
        _hasHydrated: isHydrated,
      });
    },
    isAuto: true,
    colorScheme: 'dark',
    debugMode: {
      uniqueId: Helper.generateUniqueId(),
      endDate: moment().add(-2, 'days').toDate()
    },
    // Chain settings
    selectedChain: 'skale', // Default to SKALE
    baseAuthorized: false,
    setSelectedChain: (chain: SupportedChain) => {
      // Only allow Base if authorized
      if (chain === 'base' && !get().baseAuthorized) {
        return;
      }
      set({ selectedChain: chain });
    },
    authorizeBase: (code: string) => {
      if (code === '9870') {
        set({ baseAuthorized: true });
        return true;
      }
      return false;
    },
    resetBaseAuthorization: () => {
      set({
        baseAuthorized: false,
        selectedChain: get().selectedChain === 'base' ? 'skale' : get().selectedChain
      });
    },
    setColorScheme: (colorScheme: ColorScheme) =>
      set(() => ({ colorScheme: colorScheme })),
    toggleIsAuto: () => set((state) => ({ isAuto: !state.isAuto })),
    getMode: () => {
      const { isAuto, colorScheme } = get();
      const systemColorScheme = useColorScheme(); // eslint-disable-line react-hooks/rules-of-hooks
      return isAuto ? systemColorScheme : colorScheme;
    },
    setDebugMode: (uniqueId, endDate) => {
      set({
        debugMode: {
          endDate,
          uniqueId
        }
      })
    },
  }),
  {
    name: 'modeSlice',
    getStorage: () => AsyncStorage,
    serialize: (state) => JSON.stringify(state),
    deserialize: (str) => JSON.parse(str),
    onRehydrateStorage: () => {
      // anything to run before rehydrating, return function is called after rehydrating
      return (state) => {
        state.setHasHydrated(true);
      };
    },
    partialize: (state): Partial<ModeSlice> => ({
      isAuto: state.isAuto,
      colorScheme: state.colorScheme,
      debugMode: state.debugMode,
      selectedChain: state.selectedChain,
      baseAuthorized: state.baseAuthorized,
    }),
  }
);

export const useSettingsStore = create<ModeSlice>()((...a) => ({
  ...createModeSlice(...a),
}));
