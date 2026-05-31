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

/**
 * Map a connection-probe result to the per-blox status to display, MIRRORING the
 * lower-level `useUserProfileStore.checkBloxConnection` classification instead of
 * collapsing every non-connected result to a red 'DISCONNECTED' (audit M2/S3):
 *  - connected        → 'CONNECTED'
 *  - 'DISCONNECTED'   → 'DISCONNECTED'  (a genuine, fully-retried blox outage)
 *  - 'NO INTERNET'    → 'NO INTERNET'   (phone offline — NOT a blox outage)
 *  - 'NO CLIENT'      → 'NO CLIENT'     (fula not ready — NOT a blox outage)
 *  - anything else    → null = leave the prior status untouched. The lower-level
 *    leaves 'CHECKING' in place only when its own generation guard cancelled the
 *    check (a newer check is running), so we must NOT overwrite it with red.
 * A real outage is therefore ALWAYS surfaced; the not-an-outage and cancelled
 * cases no longer flash a false 'DISCONNECTED'. Returns the status to write, or
 * null to leave the prior status as-is.
 */
const resolveConnStatus = (
  connected: boolean,
  lowerStatus: string | undefined
): TBloxConectionStatus | null => {
  if (connected) {
    return 'CONNECTED';
  }
  if (
    lowerStatus === 'DISCONNECTED' ||
    lowerStatus === 'NO INTERNET' ||
    lowerStatus === 'NO CLIENT'
  ) {
    return lowerStatus;
  }
  // Cancelled / unknown (lower-level left 'CHECKING'): don't overwrite.
  return null;
};

async function waitForBloxStatusSettled(
  peerId: string,
  get: () => BloxsModelSlice,
  timeoutMs = 60000
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = get().bloxsConnectionStatus[peerId];
    // Settled = any terminal verdict, not just CONNECTED/DISCONNECTED. Since the
    // status writers now mirror the full classification, NO INTERNET / NO CLIENT
    // are also terminal — treating them as "still settling" would spin this loop
    // for the full timeout (×N bloxes in checkAllBloxStatus) whenever the phone is
    // offline or the client isn't ready. Only CHECKING / SWITCHING (and an unset
    // status) are genuinely in-progress.
    if (status && status !== 'CHECKING' && status !== 'SWITCHING') return;
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

  getClusterPeerIdForBlox: (peerId: string) => string;
  getCurrentClusterPeerId: () => string | undefined;

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
    getClusterPeerIdForBlox: (peerId: string) => {
      const blox = get().bloxs[peerId];
      const stored = blox?.clusterPeerId;
      // If clusterPeerId equals kubo peerId, it's a stale migration default — not real
      return (stored && stored !== peerId) ? stored : undefined;
    },
    getCurrentClusterPeerId: () => {
      const { currentBloxPeerId, bloxs } = get();
      if (!currentBloxPeerId) return undefined;
      const stored = bloxs[currentBloxPeerId]?.clusterPeerId;
      // If clusterPeerId equals kubo peerId, it's a stale migration default — not real
      return (stored && stored !== currentBloxPeerId) ? stored : undefined;
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
      const {
        bloxs,
        bloxsPropertyInfo,
        bloxsSpaceInfo,
        folderSizeInfo,
        bloxsConnectionStatus,
        currentBloxPeerId,
      } = get();

      // Build NEW objects rather than mutating the refs returned by get()
      // (in-place delete on persisted state can drop renders / corrupt the
      // shared reference). Also clear EVERY per-blox map keyed by this peerId
      // so a removed blox can't keep showing stale status/size (audit H2).
      const nextBloxs = { ...bloxs };
      delete nextBloxs[peerId];
      const nextPropertyInfo = { ...(bloxsPropertyInfo ?? {}) };
      delete nextPropertyInfo[peerId];
      const nextSpaceInfo = { ...(bloxsSpaceInfo ?? {}) };
      delete nextSpaceInfo[peerId];
      const nextFolderSizeInfo = { ...(folderSizeInfo ?? {}) };
      delete nextFolderSizeInfo[peerId];
      const nextConnectionStatus = { ...bloxsConnectionStatus };
      delete nextConnectionStatus[peerId];

      // If we removed the currently-selected blox, repoint to the first
      // remaining one (or undefined when none left). Setting currentBloxPeerId
      // here lets the MainTabs init effect (which depends on currentBloxPeerId)
      // re-initialize the native client for the new selection — the same path
      // as its existing "auto-select first blox" net. Without this the app is
      // stranded on a deleted id.
      let nextCurrentBloxPeerId = currentBloxPeerId;
      if (currentBloxPeerId === peerId) {
        const remaining = Object.keys(nextBloxs);
        nextCurrentBloxPeerId = remaining.length > 0 ? remaining[0] : undefined;
      }

      set({
        bloxs: nextBloxs,
        bloxsPropertyInfo: nextPropertyInfo,
        bloxsSpaceInfo: nextSpaceInfo,
        folderSizeInfo: nextFolderSizeInfo,
        bloxsConnectionStatus: nextConnectionStatus,
        currentBloxPeerId: nextCurrentBloxPeerId,
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
        // Capture the target blox + native-client epoch BEFORE the native call,
        // so we never write one blox's free-space under another's key when a
        // switch / re-init lands mid-call (audit M3).
        const capturedPeerId = get().currentBloxPeerId;
        const startGen = Helper.getInitFulaGen();
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
          // Only attribute the result if the selection AND the native client are
          // still the ones we queried; otherwise the value belongs to a
          // torn-down/other client — skip the write but still return it.
          const stillValid =
            get().currentBloxPeerId === capturedPeerId &&
            Helper.getInitFulaGen() === startGen;
          if (stillValid && capturedPeerId) {
            set({
              bloxsSpaceInfo: {
                ...get().bloxsSpaceInfo,
                [capturedPeerId]: {
                  ...bloxSpace,
                } as TBloxFreeSpace,
              },
            });
          }
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
        // Capture target blox + native-client epoch before the native calls so
        // a mid-call switch / re-init can't cross-write folder sizes under the
        // wrong blox key (audit M3).
        const capturedPeerId = get().currentBloxPeerId;
        const startGen = Helper.getInitFulaGen();
        let folderSizeInfo_tmp: TBloxFolderSize = {
          fula: '-1',
          chain: '-1',
          fulaCount: '-1',
          userOwnData: '-1',
        };
        let chainFolderInfo: GetFolderPathResponse = {
          size: '-1',
          folder_path: '/uniondrive/chain',
        };
        const chainFolderSize = await fxblox.getFolderSize('/uniondrive/chain');
        let userOwnDataFolderInfo: GetFolderPathResponse = {
          size: '-1',
          folder_path: '/uniondrive/ipfs_datastore_local',
        };
        const userOwnDataFolderSize = await fxblox.getFolderSize('/uniondrive/ipfs_datastore_local');
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
          if (userOwnDataFolderSize?.size) {
            userOwnDataFolderInfo = userOwnDataFolderSize;
          }
          folderSizeInfo_tmp = {
            fula: fulaFolderInfo.size,
            fulaCount: fulaFolderInfo.count,
            chain: chainFolderInfo.size,
            userOwnData: userOwnDataFolderInfo.size,
          };
          const stillValid =
            get().currentBloxPeerId === capturedPeerId &&
            Helper.getInitFulaGen() === startGen;
          if (stillValid && capturedPeerId) {
            set({
              folderSizeInfo: {
                ...get().folderSizeInfo,
                [capturedPeerId]: {
                  ...folderSizeInfo_tmp,
                } as TBloxFolderSize,
              },
            });
          }
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
      // Capture the target blox + native-client epoch once so a switch / re-init
      // during the async check can't write status under the wrong blox (audit M2).
      const peerId = get().currentBloxPeerId;
      // No blox selected (none paired / just removed the last one): nothing to
      // check and no key to write under. Bail before touching the status map.
      if (!peerId) {
        return false;
      }
      const { Helper } = await import('../utils');
      const startGen = Helper.getInitFulaGen();
      // Remember the status before we flip it to CHECKING so a superseded check
      // can restore it instead of orphaning a phantom 'CHECKING' spinner (see
      // restorePriorIfSuperseded below).
      const priorStatus = get().bloxsConnectionStatus[peerId];

      // The result is attributable to `peerId` only if it's still the selected
      // blox AND the native client wasn't reset/recreated since we started.
      const stillValid = () =>
        get().currentBloxPeerId === peerId &&
        Helper.getInitFulaGen() === startGen;

      // When a switch / re-init superseded this check, we must NOT write its
      // (now mis-attributed) result — but we also wrote 'CHECKING' at the top, so
      // simply skipping would strand `peerId` on a permanent CHECKING spinner
      // (the superseding path writes status for ITS peer, not necessarily this
      // one). Restore the pre-check status: if it was unset, it returns to
      // not-checked so the Blox.screen effect re-fires; otherwise it keeps its
      // last known state rather than a phantom spinner.
      const restorePriorIfSuperseded = () => {
        if (!stillValid() && get().bloxsConnectionStatus[peerId] === 'CHECKING') {
          set({
            bloxsConnectionStatus: {
              ...get().bloxsConnectionStatus,
              [peerId]: priorStatus as TBloxConectionStatus,
            },
          });
        }
      };

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

        // Only attribute the result if no switch / re-init interfered (audit M2).
        // resolveConnStatus mirrors the lower-level classification — NO INTERNET /
        // NO CLIENT pass through (not red), a cancelled check leaves the prior
        // status, and only a genuine outage writes DISCONNECTED (audit S3).
        if (stillValid()) {
          const lowerStatus = useUserProfileStore.getState().bloxConnectionStatus;
          const resolved = resolveConnStatus(connected, lowerStatus);
          if (resolved) {
            set({
              bloxsConnectionStatus: {
                ...get().bloxsConnectionStatus,
                [peerId]: resolved,
              },
            });
          }
          // resolved === null means the lower-level was cancelled by a NEWER
          // same-peer check (it left 'CHECKING'); that newer check owns the final
          // write, so leaving 'CHECKING' here is correct.
        } else {
          restorePriorIfSuperseded();
        }
        return connected;
      } catch (error) {
        // A thrown error is a genuine failure path (not a not-ready / cancelled
        // window), so surface DISCONNECTED — but only for the still-current
        // target; if superseded, restore the prior status (audit M2).
        if (stillValid()) {
          set({
            bloxsConnectionStatus: {
              ...get().bloxsConnectionStatus,
              [peerId]: 'DISCONNECTED',
            },
          });
        } else {
          restorePriorIfSuperseded();
        }
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

          // Mark fula as ready FOR this specific blox — no 5s relay wait
          // (library handles it). Tagging the peerId lets consumers tell which
          // blox the shared client is ready for (audit M4/S2).
          setFulaIsReady(true, peerId);

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

          // Mirror the lower-level classification rather than collapsing any
          // non-connected result to red: a NO INTERNET / NO CLIENT during the
          // post-switch probe should show that, not a false DISCONNECTED (audit
          // S3). Unlike the checkBloxConnection wrapper, this write MUST be
          // terminal: `waitForBloxStatusSettled` (used by checkAllBloxStatus)
          // blocks on it, so a `null` (which would leave the prior 'CHECKING')
          // could both hang that poll for its full timeout AND swallow a genuine
          // failure if a concurrent same-peer check raced the global to 'CHECKING'
          // (the switchGeneration guard only catches a newer SWITCH, not a newer
          // CHECK). Fall back to DISCONNECTED so the result is always terminal and
          // a real outage is never hidden.
          const lowerStatus = useUserProfileStore.getState().bloxConnectionStatus;
          set({
            bloxsConnectionStatus: {
              ...get().bloxsConnectionStatus,
              [peerId]: resolveConnStatus(connected, lowerStatus) ?? 'DISCONNECTED',
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
      // Re-entry guard: never run two sweeps at once. The BloxManager button is
      // disabled while `_isCheckingAllStatus`, but that UI gate doesn't cover
      // other callers or a StrictMode double-invoke — set/read the flag here so
      // the action itself is idempotent (audit M1). Set synchronously before the
      // first await so a same-tick second call sees it.
      if (get()._isCheckingAllStatus) {
        console.log('checkAllBloxStatus: already running, skipping re-entry');
        return;
      }
      if (Object.keys(get().bloxs).length === 0) return;

      set({ _isCheckingAllStatus: true });

      try {
        const { Helper } = await import('../utils');
        // Serialize against the headless background sweep (performBloxStatusCheck)
        // over the single shared native client (audit M1). switchToBlox /
        // checkBloxConnection are invoked INSIDE and do NOT take this lock, so
        // there is no self-deadlock.
        await Helper.withFulaSweepLock(async () => {
          // Re-read selection + list fresh now that we hold the lock (they may
          // have changed while we waited for a background sweep to finish).
          const originalBloxPeerId = get().currentBloxPeerId;
          const bloxList = Object.keys(get().bloxs);

          // 1. Check current blox first (no switching needed)
          if (originalBloxPeerId && get().bloxs[originalBloxPeerId]) {
            await get().checkBloxConnection(1, 5);
          }

          // 2. For each non-current blox, switch + check
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
        });
      } finally {
        set({ _isCheckingAllStatus: false });
      }
    },
  }),
  {
    name: 'bloxsModelSlice',
    version: 3,
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
      let bloxsModel = persistedState as Partial<BloxsModelSlice>;
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
            bloxsModel = {
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
        if (version <= 2) {
          // v2→v3: set clusterPeerId = peerId for existing bloxes
          // The old shared peerID is the cluster peerID
          const migratedBloxs: Record<string, TBlox> = {};
          for (const [key, blox] of Object.entries(bloxsModel?.bloxs || {})) {
            migratedBloxs[key] = {
              ...blox,
              clusterPeerId: blox.clusterPeerId || blox.peerId,
            };
          }
          bloxsModel = {
            ...bloxsModel,
            bloxs: migratedBloxs,
          };
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
