// @ts-ignore-next-line
import '@walletconnect/react-native-compat';
import { HDKEY, DID } from '@functionland/fula-sec';
import { fula } from '@functionland/react-native-fula';
import { numberToHex, sanitizeHex, utf8ToHex } from '@walletconnect/encoding';
import { Constants } from '.';
import { time } from 'console';

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
  initFulaPromise = new Promise((resolve, reject) => {
    // Set timeout for cleanup (30 seconds)
    initFulaTimeout = setTimeout(() => {
      console.warn('initFula timeout reached, cleaning up...');
      if (initFulaGen === myGen) {
        cleanupInitFula();
      }
      reject(new Error('initFula operation timed out'));
    }, 30000);

    (async () => {
      try {
        if (!password || !signiture) {
          throw new Error(
            'Password and signature are required to initialize Fula.'
          );
        }

        // Determine the Blox address
        const bloxAddress = bloxAddr
          ? bloxAddr
          : bloxPeerId
            ? `${conAddr}/p2p/${bloxPeerId}`.trim()
            : '';

        const keyPair = getMyDIDKeyPair(password, signiture);

        // Log without sensitive keyPair data
        console.log('initFula helper.ts', { bloxAddress, bloxPeerId, keyPairGenerated: !!keyPair });

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

        // Initialize a new Fula client
        const peerId = await fula.newClient(
          keyPair.secretKey.toString(), // Private key of DID identity in string format
          '', // Leave empty to use the default temp one
          bloxAddress,
          bloxAddress ? '' : 'noop', // Leave empty for testing without a backend node
          true, // Enable IPFS storage
          true, // Enable IPFS networking
          true // Enable IPFS pubsub
        );

        console.log('Fula initialized successfully with peerId:', peerId);
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
