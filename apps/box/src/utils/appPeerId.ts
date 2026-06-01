/**
 * Resolve the app's own peerId for the InitialSetup authorizer screen WITHOUT
 * tearing down the shared native fula client.
 *
 * `SetBloxAuthorizer.generateAppPeerId` historically called `initFula()` purely
 * to obtain the app peerId — but `initFula` does logout + Shutdown + newClient,
 * which races the still-mounted Blox.screen reads (BloxFreeSpace / GetFolderSize
 * / ListActivePlugins) over the single shared client and SIGSEGVs the Go side
 * (nil-deref, addr=0xb8) when re-setting-up the already-current blox.
 *
 * The app peerId is deterministic from the DID keypair, so when a stored
 * `appPeerId` already exists we reuse it and skip the destructive re-init.
 * Only when there is no stored id (genuine first-time identity creation) do we
 * fall back to `initFn` (which wraps `initFula`).
 *
 * Kept dependency-free (no react-native-fula import) so it is unit-testable in
 * isolation. See functionland/fx-components#433 and functionland/go-fula#242.
 */
export const resolveAppPeerId = async (
  storedAppPeerId: string | undefined,
  initFn: () => Promise<string>
): Promise<string> => {
  if (storedAppPeerId) {
    return storedAppPeerId;
  }
  return initFn();
};
