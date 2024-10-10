import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fxblox } from '@functionland/react-native-fula';

interface PluginInfo {
  name: string;
  description: string;
  version: string;
  // Add other fields as necessary
}

interface OperationResult {
  success: boolean;
  message: string;
}

interface PluginsActionSlice {
  setHasHydrated: (isHydrated: boolean) => void;
  listActivePlugins: () => Promise<OperationResult>;
  installPlugin: (
    pluginName: string,
    params: string
  ) => Promise<OperationResult>;
  uninstallPlugin: (pluginName: string) => Promise<OperationResult>;
  getInstallStatus: (pluginName: string) => Promise<OperationResult>;
  getInstallOutput: (
    pluginName: string,
    params: string
  ) => Promise<OperationResult>;
  updatePlugin: (pluginName: string) => Promise<OperationResult>;
  reset: () => void;
}

interface PluginsModel {
  _hasHydrated: boolean;
  availablePlugins: PluginInfo[];
  activePlugins: string[];
  currentPluginStatus: string[];
  lastOperation: {
    action: string;
    status: boolean;
    message: string;
  };
}

export interface PluginsModelSlice extends PluginsModel, PluginsActionSlice {}

const initialState: PluginsModel = {
  _hasHydrated: false,
  availablePlugins: [],
  activePlugins: [],
  currentPluginStatus: [],
  lastOperation: {
    action: '',
    status: false,
    message: '',
  },
};

const createPluginsModelSlice: StateCreator<
  PluginsModelSlice,
  [],
  [['zustand/persist', Partial<PluginsModelSlice>]],
  PluginsModelSlice
> = persist(
  (set, get) => ({
    ...initialState,
    setHasHydrated: (isHydrated) => {
      set({ _hasHydrated: isHydrated });
    },
    listActivePlugins: async (): Promise<OperationResult> => {
      try {
        const result = await fxblox.listActivePlugins();
        if (result.status) {
          if (result.msg && Array.isArray(result.msg)) {
            set({ activePlugins: result.msg });
            return {
              success: true,
              message: 'Active plugins listed successfully',
            };
          } else {
            set({ activePlugins: [] });
            return { success: true, message: 'No active plugins found' };
          }
        } else {
          return {
            success: false,
            message: `Failed to list active plugins: ${result.msg}`,
          };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          success: false,
          message: `Error listing active plugins: ${errorMessage}`,
        };
      }
    },
    installPlugin: async (
      pluginName: string,
      params: string
    ): Promise<OperationResult> => {
      try {
        const result = await fxblox.installPlugin(pluginName, params);
        set({
          lastOperation: {
            action: 'install',
            status: result.status,
            message: result.msg,
          },
        });
        if (result.status) {
          await get().listActivePlugins();
          return { success: true, message: result.msg };
        } else {
          return { success: false, message: result.msg };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          success: false,
          message: `Error installing plugin: ${errorMessage}`,
        };
      }
    },
    uninstallPlugin: async (pluginName: string): Promise<OperationResult> => {
      try {
        const result = await fxblox.uninstallPlugin(pluginName);
        set({
          lastOperation: {
            action: 'uninstall',
            status: result.status,
            message: result.msg,
          },
        });
        if (result.status) {
          await get().listActivePlugins();
          return { success: true, message: result.msg };
        } else {
          return { success: false, message: result.msg };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          success: false,
          message: `Error uninstalling plugin: ${errorMessage}`,
        };
      }
    },
    getInstallStatus: async (pluginName: string): Promise<OperationResult> => {
      try {
        const result = await fxblox.getInstallStatus(pluginName);
        if (result.status) {
          return { success: true, message: result.msg };
        } else {
          return { success: false, message: result.msg };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          success: false,
          message: `Error getting install status: ${errorMessage}`,
        };
      }
    },

    getInstallOutput: async (
      pluginName: string,
      params: string
    ): Promise<OperationResult> => {
      try {
        const result = await fxblox.getInstallOutput(pluginName, params);
        if (result.status) {
          return { success: true, message: JSON.stringify(result.msg) };
        } else {
          return { success: false, message: JSON.stringify(result.msg) };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          success: false,
          message: `Error getting install output: ${errorMessage}`,
        };
      }
    },
    updatePlugin: async (pluginName: string): Promise<OperationResult> => {
      try {
        const result = await fxblox.updatePlugin(pluginName);
        if (result.status) {
          // Optionally, you can update the store's state here if needed
          // For example, you might want to refresh the list of active plugins
          await get().listActivePlugins();
          return { success: true, message: result.msg };
        } else {
          return { success: false, message: result.msg };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          success: false,
          message: `Error updating plugin: ${errorMessage}`,
        };
      }
    },
    reset: () => {
      set(initialState);
    },
  }),
  {
    name: 'PluginsModelSlice',
    getStorage: () => AsyncStorage,
    serialize: (state) => JSON.stringify(state),
    deserialize: (str) => JSON.parse(str),
    onRehydrateStorage: () => (state) => {
      state?.setHasHydrated(true);
    },
    partialize: (state): Partial<PluginsModelSlice> => ({
      activePlugins: state.activePlugins,
    }),
  }
);

export const usePluginsStore = create<PluginsModelSlice>()((...a) => ({
  ...createPluginsModelSlice(...a),
}));
