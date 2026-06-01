/**
 * Tests for resolveAppPeerId — regression guard for the re-setup-current-blox
 * crash (functionland/fx-components#433). When the app already has a
 * (deterministic, stored) app peerId, SetBloxAuthorizer must NOT call initFula:
 * initFula tears down + rebuilds the shared native client, racing the still-
 * mounted Blox.screen reads and SIGSEGVing the Go side (addr=0xb8). Reusing the
 * stored id avoids the teardown entirely; the id is deterministic from the DID
 * keypair, so reuse is identity-safe.
 *
 * Kept in a dedicated file that imports only the pure module (no react-native-
 * fula) so it runs independently of the native package's type declarations.
 */
import { resolveAppPeerId } from '../appPeerId';

describe('resolveAppPeerId()', () => {
  it('reuses a stored appPeerId WITHOUT calling initFn', async () => {
    const initFn = jest.fn().mockResolvedValue('SHOULD_NOT_BE_USED');
    const result = await resolveAppPeerId('12D3KooWStored', initFn);
    expect(result).toBe('12D3KooWStored');
    expect(initFn).not.toHaveBeenCalled();
  });

  it('falls back to initFn when no appPeerId is stored', async () => {
    const initFn = jest.fn().mockResolvedValue('12D3KooWFresh');
    const result = await resolveAppPeerId(undefined, initFn);
    expect(result).toBe('12D3KooWFresh');
    expect(initFn).toHaveBeenCalledTimes(1);
  });

  it('treats an empty-string appPeerId as absent (calls initFn)', async () => {
    const initFn = jest.fn().mockResolvedValue('12D3KooWFresh');
    const result = await resolveAppPeerId('', initFn);
    expect(result).toBe('12D3KooWFresh');
    expect(initFn).toHaveBeenCalledTimes(1);
  });
});
