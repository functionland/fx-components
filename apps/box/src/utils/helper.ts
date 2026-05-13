// @ts-ignore-next-line
import '@walletconnect/react-native-compat';
import { HDKEY, DID } from '@functionland/fula-sec';
import { fula } from '@functionland/react-native-fula';
import { numberToHex, sanitizeHex, utf8ToHex } from '@walletconnect/encoding';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Constants } from '.';
import { time } from 'console';

// ─── Discovery API integration ─────────────────────────────────────────────
// Resolves a target blox's reachable circuit multiaddrs at runtime instead of
// hardcoding a single relay. Order of preference inside findBox():
//   1. Workers /find-box (the box's self-reported live circuit addresses)
//   2. Cached /relays list (AsyncStorage) — constructed addresses
//   3. Constants.FXRelay (hardcoded fallback) — only if 1 and 2 unavailable
// ───────────────────────────────────────────────────────────────────────────

interface DiscoveryRelay {
  dnsName: string;
  peerId: string;
  addr: string;
  multiaddr: string;
}

interface DiscoveryFindBoxEntry {
  multiaddr: string;
}

const DISCOVERY_TIMEOUT_MS = 5000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Refresh the cached relay list from Workers. Call this opportunistically
 * (e.g., on app startup); non-blocking. Failure is silent and logged at debug.
 */
export const refreshRelayCache = async (): Promise<void> => {
  try {
    const r = await fetchWithTimeout(
      `${Constants.FXDiscoveryURL}/relays`,
      { method: 'GET', headers: { accept: 'application/json' } },
      DISCOVERY_TIMEOUT_MS,
    );
    if (!r.ok) return;
    const list = (await r.json()) as DiscoveryRelay[];
    if (!Array.isArray(list) || list.length === 0) return;
    await AsyncStorage.setItem(
      Constants.FXRelayCacheKey,
      JSON.stringify({ list, ts: Date.now() }),
    );
  } catch (e) {
    // Discovery unreachable; cache stays as-is. Caller can still use hardcoded fallback.
    console.debug('refreshRelayCache failed:', e);
  }
};

/**
 * Given a target box peer ID, return the ordered list of circuit multiaddrs
 * to try. Always returns at least one address (the hardcoded fallback).
 */
export const findBox = async (bloxPeerId: string): Promise<string[]> => {
  // Tier 1: live Workers lookup — returns box-specific circuit addresses.
  try {
    const r = await fetchWithTimeout(
      `${Constants.FXDiscoveryURL}/find-box`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ peerId: bloxPeerId }),
      },
      DISCOVERY_TIMEOUT_MS,
    );
    if (r.ok) {
      const entries = (await r.json()) as DiscoveryFindBoxEntry[];
      if (Array.isArray(entries) && entries.length > 0) {
        return entries.map(e => e.multiaddr).filter(Boolean);
      }
    }
  } catch (e) {
    console.debug('findBox: /find-box failed:', e);
  }

  // Tier 2: cached relay list — construct addresses from each cached relay.
  try {
    const raw = await AsyncStorage.getItem(Constants.FXRelayCacheKey);
    if (raw) {
      const parsed = JSON.parse(raw) as { list: DiscoveryRelay[]; ts: number };
      if (
        parsed &&
        Array.isArray(parsed.list) &&
        Date.now() - parsed.ts < Constants.FXRelayCacheMaxAgeMs
      ) {
        const constructed = parsed.list
          .map(r => `${r.addr}/p2p/${r.peerId}/p2p-circuit/p2p/${bloxPeerId}`);
        if (constructed.length > 0) return constructed;
      }
    }
  } catch (e) {
    console.debug('findBox: cache read failed:', e);
  }

  // Tier 3: hardcoded fallback — matches pre-Workers behavior exactly.
  return [`${Constants.FXRelay}/p2p/${bloxPeerId}`];
};

export const getMyDID = (password: string, signiture: string): string => {
  const ed = new HDKEY(password);
  const keyPair = ed.createEDKeyPair(signiture);
  const did = new DID(keyPair.secretKey);
  return did.did();
};

export const getMyDIDKeyPair = (
  password: string,
  signiture: string
): {
  secretKey: Uint8Array;
  pubKey: Uint8Array;
} => {
  const ed = new HDKEY(password);
  const keyPair = ed.createEDKeyPair(signiture);
  return keyPair;
};

let initFulaPromise: Promise<string | undefined> | null = null; // Shared promise to track execution
let initFulaTimeout: NodeJS.Timeout | null = null; // Timeout for cleanup
let initFulaGen = 0; // Generation counter so stale finally/timeout don't clear a newer promise

// Cleanup function to reset promise and timeout
const cleanupInitFula = () => {
  if (initFulaTimeout) {
    clearTimeout(initFulaTimeout);
    initFulaTimeout = null;
  }
  initFulaPromise = null;
};

// Allow a new initFula to start by clearing the promise guard.
// The old native call may still be running — the new initFula's
// logout+shutdown will clean it up.
export const resetInitFula = () => {
  initFulaGen++; // prevent old finally/timeout from clearing new state
  if (initFulaTimeout) {
    clearTimeout(initFulaTimeout);
    initFulaTimeout = null;
  }
  initFulaPromise = null;
};

export const initFula = async ({
  password,
  signiture,
  bloxAddr = undefined,
  bloxPeerId,
  conAddr = Constants.FXRelay,
  shouldCancel,
}: {
  password: string;
  signiture: string;
  bloxAddr?: string;
  bloxPeerId?: string;
  conAddr?: string;
  shouldCancel?: () => boolean;
}): Promise<string | undefined> => {
  // If a previous call is in progress, wait for it to finish
  if (initFulaPromise) {
    console.log(
      'initFula is already running. Waiting for the previous call...'
    );
    return initFulaPromise;
  }

  // Create a new promise for this execution
  const myGen = ++initFulaGen;
  // `timedOut` is observable by the retry loop so an orphaned iteration
  // doesn't continue calling newClient after the outer reject has fired.
  let timedOut = false;
  initFulaPromise = new Promise((resolve, reject) => {
    // 90 seconds covers up to 5 candidate addresses at ~15s each, plus
    // logout/shutdown overhead between attempts. Single-candidate calls
    // typically resolve within ~15s; this is a ceiling, not a target.
    initFulaTimeout = setTimeout(() => {
      console.warn('initFula timeout reached, cleaning up...');
      timedOut = true;
      if (initFulaGen === myGen) {
        cleanupInitFula();
      }
      reject(new Error('initFula operation timed out'));
    }, 90000);

    (async () => {
      try {
        if (!password || !signiture) {
          throw new Error(
            'Password and signature are required to initialize Fula.'
          );
        }

        // Determine candidate Blox addresses.
        //   - If bloxAddr is provided explicitly: use exactly that one.
        //   - If bloxPeerId is provided: ask the Discovery API for the box's
        //     current circuit addresses (falls back to cached/hardcoded).
        //   - Otherwise: empty string (no specific blox target).
        // We iterate the candidates below; the first newClient that succeeds
        // wins. Pre-Workers behavior is preserved exactly when neither the
        // Workers API nor the cache is reachable — see findBox() tier 3.
        let bloxAddresses: string[];
        if (bloxAddr) {
          bloxAddresses = [bloxAddr];
        } else if (bloxPeerId) {
          bloxAddresses = await findBox(bloxPeerId);
        } else {
          bloxAddresses = [''];
        }

        const keyPair = getMyDIDKeyPair(password, signiture);

        // Log without sensitive keyPair data
        console.log('initFula helper.ts', {
          candidateCount: bloxAddresses.length,
          firstCandidate: bloxAddresses[0],
          bloxPeerId,
          keyPairGenerated: !!keyPair,
        });

        try {
          // Attempt to logout and shutdown any previous Fula client
          await fula.logout(keyPair.secretKey.toString(), '');
          if (shouldCancel?.()) {
            throw new Error('initFula cancelled — switch superseded after logout');
          }
          await fula.shutdown();
          console.log('Previous Fula client shutdown successfully.');
        } catch (shutdownError) {
          // Re-throw cancellation errors
          if (shutdownError?.message?.includes('cancelled')) throw shutdownError;
          console.warn(
            'Failed to shutdown previous Fula client:',
            shutdownError
          );
        }

        // Bail out before the expensive newClient call if superseded
        if (shouldCancel?.()) {
          throw new Error('initFula cancelled — switch superseded before newClient');
        }

        // Iterate candidate Blox addresses until one connects. Each newClient
        // attempt is independent; if one address fails (e.g. that relay is
        // down), we try the next. Last error is thrown if all candidates fail.
        //
        // Native state cleanup between attempts: a failed `fula.newClient`
        // may leave the native module in a partially-initialised state
        // (e.g. DNS resolved but circuit reservation timed out). We must
        // logout+shutdown again before the next attempt, otherwise the
        // second `newClient` can race against leftover state. Skip cleanup
        // before the FIRST attempt — the outer logout/shutdown above already
        // handled it.
        let peerId: string | undefined;
        let lastError: any;
        for (let i = 0; i < bloxAddresses.length; i++) {
          const candidate = bloxAddresses[i];
          if (timedOut) {
            // Outer timeout already fired and rejected; abandon further work.
            throw new Error('initFula aborted — outer timeout fired');
          }
          if (shouldCancel?.()) {
            throw new Error('initFula cancelled — switch superseded during retry');
          }
          if (i > 0) {
            // Clean native state before retrying with a new candidate.
            try {
              await fula.logout(keyPair.secretKey.toString(), '');
              await fula.shutdown();
            } catch (cleanupErr: any) {
              if (cleanupErr?.message?.includes('cancelled')) throw cleanupErr;
              console.warn('Pre-retry cleanup failed (non-fatal):', cleanupErr);
            }
            if (shouldCancel?.()) {
              throw new Error('initFula cancelled — switch superseded during retry cleanup');
            }
          }
          try {
            peerId = await fula.newClient(
              keyPair.secretKey.toString(), // Private key of DID identity in string format
              '', // Leave empty to use the default temp one
              candidate,
              candidate ? '' : 'noop', // Leave empty for testing without a backend node
              true, // Enable IPFS storage
              true, // Enable IPFS networking
              true // Enable IPFS pubsub
            );
            console.log('Fula initialized via', candidate, 'with peerId:', peerId);
            break;
          } catch (newClientError: any) {
            // Cancellation must propagate immediately — don't try further candidates.
            if (newClientError?.message?.includes('cancelled')) throw newClientError;
            console.warn(`newClient failed for candidate ${candidate}:`, newClientError);
            lastError = newClientError;
          }
        }
        if (peerId === undefined) {
          throw lastError ?? new Error('initFula: all blox addresses failed');
        }

        resolve(peerId); // Resolve with the peer ID on success
      } catch (error) {
        console.error('initFula failed:', error);
        reject(error); // Reject with the error on failure
      } finally {
        console.log('Resetting initFulaPromise');
        // Only clean up if we're still the active generation —
        // resetInitFula() may have already cleared us for a newer call.
        if (initFulaGen === myGen) {
          // Delay cleanup by one microtick so concurrent awaiters see the
          // resolved/rejected promise rather than null
          await Promise.resolve().then(() => cleanupInitFula());
        }
      }
    })(); // Immediately invoke the async function inside the executor
  });

  return initFulaPromise;
};

export const waitForFulaInit = async (): Promise<void> => {
  if (initFulaPromise) {
    try {
      await initFulaPromise;
    } catch {
      // Ignore errors - we just need to wait for init to complete
    }
  }
};

export const generateUniqueId = () => {
  const timestamp = Date.now();
  const randomNum = Math.random() * Math.pow(10, 18);
  return `${timestamp}-${randomNum}`;
};
