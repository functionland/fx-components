import create, { StateCreator } from 'zustand';

type Modes = ['light', 'dark', 'auto'];
type Mode = Modes[number];
interface ModeSlice {
  modes: Modes;
  currentMode: Mode;
  setMode: (mode: Mode) => void;
}
const createModeSlice: StateCreator<ModeSlice, [], [], ModeSlice> = (set) => ({
  modes: ['light', 'dark', 'auto'],
  currentMode: 'auto',
  setMode: (mode: Mode) =>
    set((state) => ({ currentMode: (state.currentMode = mode) })),
});

export const useSettingsStore = create<ModeSlice>()((...a) => ({
  ...createModeSlice(...a),
}));
