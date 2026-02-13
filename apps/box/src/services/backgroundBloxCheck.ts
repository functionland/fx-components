import BackgroundFetch from 'react-native-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { fula } from '@functionland/react-native-fula';
import { Helper, KeyChain } from '../utils';
import { Platform } from 'react-native';
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

    for (const peerId of bloxList) {
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

    // 6. Restore fula to original blox
    if (originalBloxPeerId && bloxList.length > 1) {
      try {
        Helper.resetInitFula();
        await Helper.initFula({
          password,
          signiture,
          bloxPeerId: originalBloxPeerId,
        });
      } catch {
        // Best effort — app will re-init on next foreground launch
      }
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
        await performBloxStatusCheck();
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
    await performBloxStatusCheck();
  } catch (error) {
    console.error('backgroundBloxCheck: headless error', error);
  }
  BackgroundFetch.finish(taskId);
}
