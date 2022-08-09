import create, { StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

type Modes = ['light', 'dark', 'auto'];
export type ColorScheme = 'light' | 'dark';
type Mode = Modes[number];
interface ModeSlice {
  _hasHydrated: boolean;
  setHasHydrated: (isHydrated: boolean) => void;
  modes: Modes;
  currentMode: Mode;
  getMode: () => ColorScheme;
  isAuto: boolean;
  colorScheme: ColorScheme;
  toggleIsAuto: () => void;
  setColorScheme: (colorScheme: ColorScheme) => void;
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
    modes: ['light', 'dark', 'auto'],
    currentMode: 'auto',
    isAuto: true,
    colorScheme: 'light',
    setColorScheme: (colorScheme: ColorScheme) =>
      set(() => ({ colorScheme: colorScheme })),
    toggleIsAuto: () => set((state) => ({ isAuto: !state.isAuto })),
    getMode: () => {
      const { isAuto, colorScheme } = get();
      const systemColorScheme = useColorScheme(); // eslint-disable-line react-hooks/rules-of-hooks
      return isAuto ? systemColorScheme : colorScheme;
    },
  }),
  {
    name: 'mode',
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
