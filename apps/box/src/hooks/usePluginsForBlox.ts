import React from 'react';
import { usePluginsStore, PluginsFetchStatus } from '../stores/usePluginsStore';
import { useBloxsStore } from '../stores/useBloxsStore';

// Module-level stable empty array so the "no data yet for this blox" case keeps
// a constant reference — prevents needless re-renders / effect churn in
// consumers that depend on the returned list.
const EMPTY_PLUGINS: string[] = [];

/**
 * The installed-plugin list + fetch status for the CURRENTLY selected blox.
 *
 * Reads the blox-keyed plugin state (`activePluginsByBlox[currentBloxPeerId]`)
 * so switching the active blox immediately reflects the right device and never
 * shows the previous blox's list. `status` lets the UI distinguish
 * "checking / couldn't reach this blox" from "this blox has no plugins".
 */
export const useActivePluginsForCurrentBlox = (): {
  plugins: string[];
  status: PluginsFetchStatus;
} => {
  const currentBloxPeerId = useBloxsStore((s) => s.currentBloxPeerId);
  const plugins = usePluginsStore((s) =>
    currentBloxPeerId
      ? s.activePluginsByBlox[currentBloxPeerId] ?? EMPTY_PLUGINS
      : EMPTY_PLUGINS
  );
  const status = usePluginsStore((s) =>
    currentBloxPeerId
      ? s.activePluginsStatusByBlox[currentBloxPeerId] ?? 'idle'
      : 'idle'
  );
  return { plugins, status };
};

/**
 * Refetch the active-plugins list whenever the current blox is CONNECTED.
 *
 * Tying the refetch to per-blox CONNECTED status (rather than the global
 * `fulaIsReady` flag) means:
 *   - it fires for the NEW blox after a switch settles — not while the shared
 *     native client is still ready-for-the-previous blox, and
 *   - a fetch that failed because the blox wasn't yet reachable auto-recovers
 *     when the connection later reports CONNECTED.
 * The store's `listActivePlugins` captures the target blox + native-client
 * generation before its native call, so a result that lands after a subsequent
 * switch is dropped rather than mis-attributed.
 */
export const useRefetchActivePluginsOnConnect = (): void => {
  const listActivePlugins = usePluginsStore((s) => s.listActivePlugins);
  const currentBloxPeerId = useBloxsStore((s) => s.currentBloxPeerId);
  const isConnected = useBloxsStore(
    (s) =>
      !!s.currentBloxPeerId &&
      s.bloxsConnectionStatus[s.currentBloxPeerId] === 'CONNECTED'
  );
  React.useEffect(() => {
    if (currentBloxPeerId && isConnected) {
      listActivePlugins().catch(() => {
        // Per-blox error state is recorded inside the store.
      });
    }
  }, [currentBloxPeerId, isConnected, listActivePlugins]);
};
