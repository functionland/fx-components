import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { Helper } from '../utils';
import moment from 'moment';

export type ColorScheme = 'light' | 'dark';
interface ModeSlice {
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
  }
);

export const useSettingsStore = create<ModeSlice>()((...a) => ({
  ...createModeSlice(...a),
}));
