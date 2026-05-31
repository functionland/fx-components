import BackgroundFetch from 'react-native-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { fula } from '@functionland/react-native-fula';
import { Helper, KeyChain } from '../utils';
import { Platform, AppState } from 'react-native';
import { TBlox } from '../models';

/**
 * Performs a headless-safe blox status check.
 * Reads credentials from Keychain and blox list from AsyncStorage directly
 * (Zustand stores are not hydrated in Android headless mode).
 *
 * For each blox: resets fula, inits with that blox's peerId, waits for
 * relay connection, then checks connection. Collects disconnected blox names
 * and shows a notification if any are offline.
 */
export async function performBloxStatusCheck(): Promise<void> {
  let foregroundServiceStarted = false;

  // If the app is in the foreground, IT owns the shared native client (and
  // checks status itself) — a background sweep here would fight it over the one
  // client. Defer to the foreground (audit M1). This re-checks after the
  // caller's pre-lock check in case the app became active while we waited for
  // the sweep lock.
  if ((AppState.currentState as string) === 'active') {
    console.log('backgroundBloxCheck: skipped — app is active (foreground owns client)');
    return;
  }

  try {
    // 1. Ensure notification channels exist (headless context may not have them)
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: 'sticky',
        name: 'Sticky Channel',
        importance: AndroidImportance.LOW,
      });
    }
    await notifee.createChannel({
      id: 'blox-status',
      name: 'Blox Status',
      importance: AndroidImportance.HIGH,
    });

    // 2. Read blox data from AsyncStorage (Zustand persist format)
    const raw = await AsyncStorage.getItem('bloxsModelSlice');
    if (!raw) {
      console.log('backgroundBloxCheck: no blox data in AsyncStorage');
      return;
    }
    const persisted = JSON.parse(raw);
    const bloxs: Record<string, TBlox> = persisted?.state?.bloxs ?? {};
    const originalBloxPeerId: string | undefined =
      persisted?.state?.currentBloxPeerId;

    const bloxList = Object.keys(bloxs);
    if (bloxList.length === 0) {
      console.log('backgroundBloxCheck: no bloxes configured');
      return;
    }

    // 3. Read credentials from Keychain
    const passwordCred = await KeyChain.load(KeyChain.Service.DIDPassword);
    const signitureCred = await KeyChain.load(KeyChain.Service.Signiture);
    if (!passwordCred || !signitureCred) {
      console.log('backgroundBloxCheck: missing credentials');
      return;
    }
    const password = passwordCred.password;
    const signiture = signitureCred.password;

    // 4. Show Android foreground service notification (for long-running background work)
    if (Platform.OS === 'android') {
      try {
        notifee.registerForegroundService(
          () => new Promise<void>(() => {}) // keeps alive until stopForegroundService
        );
        await notifee.displayNotification({
          id: 'blox-check-progress',
          title: 'Checking Blox Status',
          body: `Checking ${bloxList.length} blox(es)...`,
          android: {
            progress: { indeterminate: true },
            pressAction: { id: 'default' },
            ongoing: true,
            asForegroundService: true,
            channelId: 'sticky',
          },
        });
        foregroundServiceStarted = true;
      } catch {
        // Notification may fail — continue anyway
      }
    }

    // 5. Check each blox
    const disconnected: string[] = [];
    let aborted = false;

    // From the first reset/init below, the shared native client is no longer on
    // whatever blox the foreground last selected. Flag it so the foreground
    // reclaims the client on its next resume (audit M1).
    Helper.markSweepMovedClient(true);

    for (const peerId of bloxList) {
      // If the app became active mid-sweep, the foreground now owns the client.
      // Stop touching it immediately and skip the restore (the foreground will
      // reclaim it) so we don't tear down a client the user is actively using.
      if ((AppState.currentState as string) === 'active') {
        console.log('backgroundBloxCheck: app became active — aborting sweep');
        aborted = true;
        break;
      }
      try {
        Helper.resetInitFula();
        await Helper.initFula({
          password,
          signiture,
          bloxPeerId: peerId,
        });

        // Wait for relay connections to establish
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const connected = await fula.checkConnection();
        if (!connected) {
          disconnected.push(bloxs[peerId]?.name || peerId);
        }
      } catch (error) {
        console.log(`backgroundBloxCheck: error checking ${peerId}:`, error);
        disconnected.push(bloxs[peerId]?.name || peerId);
      }
    }

    // 6. Restore the client to the foreground's CURRENT blox. Skip entirely if
    // we aborted (the foreground is active and will reclaim the client itself —
    // touching it here would race the user). Re-read currentBloxPeerId FRESH
    // from AsyncStorage rather than using the value captured at task start, in
    // case it changed during the sweep (audit M1).
    if (aborted) {
      // Leave sweepMovedClient = true so the foreground reclaims on resume.
    } else if (bloxList.length > 1) {
      try {
        const freshRaw = await AsyncStorage.getItem('bloxsModelSlice');
        const freshCurrent: string | undefined = freshRaw
          ? JSON.parse(freshRaw)?.state?.currentBloxPeerId
          : originalBloxPeerId;
        if (freshCurrent) {
          Helper.resetInitFula();
          await Helper.initFula({
            password,
            signiture,
            bloxPeerId: freshCurrent,
          });
          // Client is back on the current blox — no foreground reclaim needed.
          Helper.markSweepMovedClient(false);
        }
      } catch {
        // Best effort — leave sweepMovedClient = true so the foreground reclaims.
      }
    } else {
      // Single blox: the client is already on the only (== current) blox.
      Helper.markSweepMovedClient(false);
    }

    // 7. Show result notification if any disconnected
    if (disconnected.length > 0) {
      await notifee.displayNotification({
        id: 'blox-status-result',
        title: 'Blox Status Alert',
        body: `Disconnected: ${disconnected.join(', ')}`,
        android: {
          channelId: 'blox-status',
          pressAction: { id: 'default' },
        },
      });
    }
  } finally {
    // 8. Clean up foreground service
    if (foregroundServiceStarted) {
      try {
        await notifee.cancelNotification('blox-check-progress');
        notifee.stopForegroundService();
      } catch {
        // ignore cleanup errors
      }
    }
  }
}

/**
 * Configure (or stop) periodic background blox status checks.
 * @param intervalMinutes - 0 to disable, 480 for 8h, 1440 for 24h
 */
export async function configureBackgroundBloxCheck(
  intervalMinutes: number
): Promise<void> {
  if (intervalMinutes <= 0) {
    await BackgroundFetch.stop();
    console.log('backgroundBloxCheck: stopped');
    return;
  }

  await BackgroundFetch.configure(
    {
      minimumFetchInterval: intervalMinutes,
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
    },
    async (taskId) => {
      console.log('backgroundBloxCheck: task fired', taskId);
      try {
        // Serialize with the foreground sweep over the single shared client
        // (audit M1). performBloxStatusCheck also bails if the app is active.
        await Helper.withFulaSweepLock(() => performBloxStatusCheck());
      } catch (error) {
        console.error('backgroundBloxCheck: error in task', error);
      }
      BackgroundFetch.finish(taskId);
    },
    (taskId) => {
      // Timeout callback — OS is forcing the task to end
      console.warn('backgroundBloxCheck: task timed out', taskId);
      BackgroundFetch.finish(taskId);
    }
  );

  console.log('backgroundBloxCheck: configured with interval', intervalMinutes);
}

/**
 * Android headless task handler.
 * Called by react-native-background-fetch when app is terminated.
 */
export async function headlessBloxCheckTask(event: {
  taskId: string;
  timeout: boolean;
}): Promise<void> {
  const { taskId, timeout } = event;
  if (timeout) {
    console.warn('backgroundBloxCheck: headless task timed out', taskId);
    BackgroundFetch.finish(taskId);
    return;
  }
  console.log('backgroundBloxCheck: headless task fired', taskId);
  try {
    // Serialize with any foreground sweep when the app process is still alive
    // (audit M1). When truly terminated this is a fresh context with no
    // contention — the lock is uncontended and performBloxStatusCheck runs.
    await Helper.withFulaSweepLock(() => performBloxStatusCheck());
  } catch (error) {
    console.error('backgroundBloxCheck: headless error', error);
  }
  BackgroundFetch.finish(taskId);
}
