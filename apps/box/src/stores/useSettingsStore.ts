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
  isAuto: boolean;
  colorScheme: ColorScheme;
  debugMode?: {
    endDate: Date,
    uniqueId: string
  };
  bloxStatusCheckInterval: number; // 0=disabled, 480=8h, 1440=24h (in minutes)
  toggleIsAuto: () => void;
  setColorScheme: (colorScheme: ColorScheme) => void;
  setDebugMode: (uniqueId: string, endDate: Date) => void;
  setBloxStatusCheckInterval: (interval: number) => void;
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
    bloxStatusCheckInterval: 0,
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
    setDebugMode: (uniqueId, endDate) => {
      set({
        debugMode: {
          endDate,
          uniqueId
        }
      })
    },
    setBloxStatusCheckInterval: (interval: number) => {
      set({ bloxStatusCheckInterval: interval });
    },
  }),
  {
    name: 'modeSlice',
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
    partialize: (state): Partial<ModeSlice> => ({
      isAuto: state.isAuto,
      colorScheme: state.colorScheme,
      debugMode: state.debugMode,
      selectedChain: state.selectedChain,
      baseAuthorized: state.baseAuthorized,
      bloxStatusCheckInterval: state.bloxStatusCheckInterval,
    }),
  }
);

export const useSettingsStore = create<ModeSlice>()((...a) => ({
  ...createModeSlice(...a),
}));

/**
 * Custom hook to get the current color mode.
 * Uses the system color scheme when isAuto is true, otherwise uses the stored colorScheme.
 * @returns 'light' or 'dark'
 */
export const useColorMode = (): ColorScheme => {
  const systemColorScheme = useColorScheme();
  const isAuto = useSettingsStore((state) => state.isAuto);
  const colorScheme = useSettingsStore((state) => state.colorScheme);
  return isAuto ? (systemColorScheme ?? 'dark') : colorScheme;
};
