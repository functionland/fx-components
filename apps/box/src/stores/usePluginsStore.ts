import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fxblox, fula } from '@functionland/react-native-fula';
import { useBloxsStore } from './useBloxsStore';

interface OperationResult {
  success: boolean;
  message: string;
}

/**
 * In-flight `listActivePlugins` call, keyed by `${peerId}:${initFulaGen}`.
 * Collapses concurrent fetches for the same blox so the always-mounted plugins
 * sheet plus the active screen don't fan out redundant native calls onto the
 * serialized fula bridge. Module-level: one shared native client → at most one
 * meaningful in-flight fetch.
 */
let inFlightListActivePlugins: {
  key: string;
  promise: Promise<OperationResult>;
} | null = null;

/**
 * Per-blox fetch status for the active-plugins list, so the UI can tell
 * "we don't know yet / couldn't reach this blox" apart from "this blox has no
 * plugins installed". Rendering an unknown/failed state as an empty list would
 * silently show every plugin as "not installed" right after a blox switch.
 *  - idle    : never fetched for this blox in this session
 *  - loading : a fetch is in flight
 *  - loaded  : list reflects a successful response from THIS blox
 *  - error   : last fetch for this blox failed (unreachable / fula not ready)
 */
export type PluginsFetchStatus = 'idle' | 'loading' | 'loaded' | 'error';

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
  /** Drop a blox's cached plugin state (called when a blox is removed). */
  removePluginsForBlox: (peerId: string) => void;
  reset: () => void;
}

interface PluginsModel {
  _hasHydrated: boolean;
  /**
   * Installed-plugin names keyed by blox peerId. Plugin installation is a
   * per-DEVICE fact, so it MUST be keyed by the blox it belongs to — a single
   * global list bleeds one blox's plugins onto another after a switch (and,
   * when persisted, across app restarts). Mirrors the per-blox keying the
   * bloxs store already uses for free space / folder size / connection status.
   */
  activePluginsByBlox: Record<string, string[]>;
  /** Per-blox fetch status — see {@link PluginsFetchStatus}. */
  activePluginsStatusByBlox: Record<string, PluginsFetchStatus>;
  lastOperation: {
    action: string;
    status: boolean;
    message: string;
  };
}

export interface PluginsModelSlice extends PluginsModel, PluginsActionSlice {}

const initialState: PluginsModel = {
  _hasHydrated: false,
  activePluginsByBlox: {},
  activePluginsStatusByBlox: {},
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
      // Resolve WHICH blox this fetch is for, and the native-client epoch,
      // BEFORE the native call — so a switch / re-init landing mid-call can
      // never write one blox's plugin list under another's key. This mirrors
      // getBloxSpace/getFolderSize's M2/M3 generation guard (the single shared
      // fula client is re-pointed per blox; getInitFulaGen() bumps on every
      // re-point, which also closes the A→B→A ABA hole that a peerId-only
      // check would leave open).
      const { Helper } = await import('../utils');
      const capturedPeerId = useBloxsStore.getState().currentBloxPeerId;
      const startGen = Helper.getInitFulaGen();

      // No blox selected (none paired / just removed the last one): nothing to
      // key the result under.
      if (!capturedPeerId) {
        return { success: false, message: 'No blox selected' };
      }

      // Collapse concurrent fetches for the same blox+generation. The
      // connection-driven refetch can fire from several mounted consumers on
      // the same CHECKING→CONNECTED edge; returning the in-flight promise keeps
      // that to a single native call on the serialized fula bridge. The
      // assignment of `inFlightListActivePlugins` below is synchronous after
      // this check (no await in between), so a second caller observes it.
      const key = `${capturedPeerId}:${startGen}`;
      const existing = inFlightListActivePlugins;
      if (existing && existing.key === key) {
        return existing.promise;
      }

      // The result is attributable to capturedPeerId only if it is STILL the
      // selected blox AND the native client wasn't reset/recreated since we
      // started. Used to gate every write below.
      const stillValid = () =>
        useBloxsStore.getState().currentBloxPeerId === capturedPeerId &&
        Helper.getInitFulaGen() === startGen;

      const statusOf = () => get().activePluginsStatusByBlox[capturedPeerId];
      const setStatus = (status: PluginsFetchStatus) => {
        set({
          activePluginsStatusByBlox: {
            ...get().activePluginsStatusByBlox,
            [capturedPeerId]: status,
          },
        });
      };

      // Surface 'error' only when there is no good list yet for this blox: a
      // transient refetch failure on an already-loaded blox keeps the
      // last-known list (and its 'loaded' status) rather than blanking it.
      const markError = () => {
        if (stillValid() && statusOf() !== 'loaded') setStatus('error');
      };

      const run = async (): Promise<OperationResult> => {
        // Show 'loading' only when we don't already have a confirmed list for
        // this blox. Re-fetching an already-loaded blox must NOT flip it back
        // to 'checking' — the connection-driven trigger fires on every
        // CHECKING→CONNECTED cycle, and downgrading would flicker the UI.
        if (stillValid() && statusOf() !== 'loaded') setStatus('loading');

        try {
          const ready = await fula.isReady(false);
          if (!ready) {
            markError();
            return {
              success: false,
              message: 'Failed to list active plugins: Fula is not ready yet',
            };
          }

          const result = await fxblox.listActivePlugins();

          // Drop superseded / late responses — by now the shared client may
          // point at a different blox, so this result is NOT attributable here.
          if (!stillValid()) {
            return {
              success: true,
              message:
                'Active plugins response dropped (blox switched mid-call)',
            };
          }

          if (result.status) {
            const next: string[] =
              result.msg && Array.isArray(result.msg)
                ? (result.msg as string[])
                : [];
            const prevMap = get().activePluginsByBlox;
            const prev = prevMap[capturedPeerId];
            // Reference-stable update: keep the SAME array instance when
            // contents are unchanged so consumers (and effects depending on the
            // list) do not churn. This stability is what kept the Diagnostics-
            // screen listActivePlugins effect from looping forever on empties.
            const same =
              Array.isArray(prev) &&
              prev.length === next.length &&
              prev.every((p, i) => p === next[i]);
            set({
              activePluginsByBlox: same
                ? prevMap
                : { ...prevMap, [capturedPeerId]: next },
              activePluginsStatusByBlox: {
                ...get().activePluginsStatusByBlox,
                [capturedPeerId]: 'loaded',
              },
            });
            return {
              success: true,
              message: next.length
                ? 'Active plugins listed successfully'
                : 'No active plugins found',
            };
          } else {
            markError();
            return {
              success: false,
              message: `Failed to list active plugins: ${result.msg}`,
            };
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          markError();
          return {
            success: false,
            message: `Error listing active plugins: ${errorMessage}`,
          };
        }
      };

      const promise = run();
      inFlightListActivePlugins = { key, promise };
      try {
        return await promise;
      } finally {
        if (
          inFlightListActivePlugins &&
          inFlightListActivePlugins.key === key
        ) {
          inFlightListActivePlugins = null;
        }
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
          // listActivePlugins captures the current blox + generation itself, so
          // the refresh lands under the right blox key.
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
          if (result.msg == 'No Status' || result.msg == null) {
            return { success: true, message: '' };
          }
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
    removePluginsForBlox: (peerId: string) => {
      const nextByBlox = { ...get().activePluginsByBlox };
      delete nextByBlox[peerId];
      const nextStatus = { ...get().activePluginsStatusByBlox };
      delete nextStatus[peerId];
      set({
        activePluginsByBlox: nextByBlox,
        activePluginsStatusByBlox: nextStatus,
      });
    },
    reset: () => {
      set(initialState);
    },
  }),
  {
    name: 'PluginsModelSlice',
    // v0→v1: plugin install state is per-blox LIVE truth, not user preference.
    // The old shape persisted a single global `activePlugins: string[]`, which
    // showed the previous blox's plugins on cold start. We now key by blox AND
    // stop persisting entirely (re-fetched live per blox). migrate drops the
    // stale v0 blob so it can't be merged back in.
    version: 1,
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
    onRehydrateStorage: () => (state) => {
      state?.setHasHydrated(true);
    },
    // Persist NOTHING: active-plugin state is per-blox live truth that must be
    // confirmed from the device on each session, never cached globally.
    partialize: (): Partial<PluginsModelSlice> => ({}),
    migrate: () => ({}),
  }
);

export const usePluginsStore = create<PluginsModelSlice>()((...a) => ({
  ...createPluginsModelSlice(...a),
}));
