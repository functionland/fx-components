import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blockchain, fula } from '@functionland/react-native-fula';
import { TAccount, TBloxFreeSpace } from '../models';
import { KeyChain } from '../utils';
import { useBloxsStore } from './useBloxsStore';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';

type BloxConectionStatus =
  | 'CONNECTED'
  | 'CHECKING'
  | 'DISCONNECTED'
  | 'NO INTERNET'
  | 'NO CLIENT';
interface UserProfileActions {
  setHasHydrated: (isHydrated: boolean) => void;
  setKeyChainValue: (service: KeyChain.Service, value: string) => Promise<void>;
  loadAllCredentials: () => Promise<void>;
  setWalletId: (walletId: string, clearSigniture?: boolean) => Promise<void>;
  setAppPeerId: (peerId: string | undefined) => void;
  setBloxPeerIds: (peerIds: string[] | undefined) => void;
  createAccount: ({ seed }: { seed: string }) => Promise<TAccount>;
  getEarnings: () => Promise<void>;
  getBloxSpace: () => Promise<TBloxFreeSpace>;
  logout: () => boolean;
  setFulaIsReady: (value: boolean) => void;
  checkBloxConnection: (
    maxTries?: number,
    waitBetweenRetries?: number
  ) => Promise<boolean>;
  reset: () => void;
  checkFulaReadiness: () => Promise<void>; // New method to update fulaReady
}
export interface UserProfileSlice {
  _hasHydrated: boolean;
  walletId?: string | undefined;
  /**
   * Password is a phares that user enter to create DID and make signiture
   */
  password?: string | undefined;
  /**
   * signiture is the result of signing password and did secret key by wallet
   */
  signiture?: string | undefined;
  address?: string | undefined;
  fulaPeerId?: string | undefined;
  fulaRoodCID?: string | undefined;
  appPeerId?: string | undefined;
  bloxPeerIds?: string[] | undefined;
  accounts: TAccount[];
  earnings: string;
  activeAccount?: TAccount | undefined;
  bloxSpace: TBloxFreeSpace | undefined;
  fulaIsReady: boolean;
  bloxConnectionStatus: BloxConectionStatus;
}
// define the initial state
const initialState: UserProfileSlice = {
  _hasHydrated: false,
  bloxPeerIds: [],
  accounts: [],
  earnings: '0.0',
  bloxSpace: undefined,
  fulaIsReady: false,
  bloxConnectionStatus: 'CHECKING',
  appPeerId: undefined,
  fulaRoodCID: undefined,
  fulaPeerId: undefined,
  signiture: undefined,
  password: undefined,
  address: undefined,
  walletId: undefined,
};
const createUserProfileSlice: StateCreator<
  UserProfileSlice & UserProfileActions,
  [],
  [['zustand/persist', Partial<UserProfileSlice & UserProfileActions>]],
  UserProfileSlice & UserProfileActions
> = persist(
  (set, get) => {
    let readinessPromise: Promise<void> | null = null; // Shared promise for tracking execution
    return {
      ...initialState,
      checkFulaReadiness: async (maxAttempts = 5): Promise<void> => {
        // If a readiness check is already running, wait for it to finish
        if (readinessPromise) {
          console.log('checkFulaReadiness is already running. Waiting...');
          try {
            // Wait for the existing readinessPromise with a timeout of 5 seconds
            await Promise.race([
              readinessPromise,
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error('Timeout waiting for readiness')),
                  5000
                )
              ),
            ]);
          } catch (error) {
            console.error(error.message);
          }
          return; // Return immediately after waiting
        }

        // Create a new promise for this execution
        readinessPromise = new Promise((resolve, reject) => {
          (async () => {
            try {
              let attempts = 0;
              const checkInterval = 3000;

              const check = async () => {
                const netState = await NetInfo?.fetch();
                if (!netState?.isConnected || !netState?.isInternetReachable) {
                  const pingResponse = await axios?.head('https://google.com', {
                    timeout: 5000,
                  });
                  if (pingResponse?.status !== 200) {
                    console.log(
                      'Internet is not connected, waiting for connection...'
                    );
                    set({ fulaIsReady: false });
                    resolve(); // Resolve the promise after updating state
                    return;
                  }
                }

                const ready = await fula.isReady(false);
                console.log('ready is : ' + ready);

                if (ready || attempts >= maxAttempts) {
                  set({ fulaIsReady: ready });

                  if (attempts >= maxAttempts && !ready) {
                    await fula.shutdown();
                    set({ fulaIsReady: undefined });
                  }
                  resolve(); // Resolve the promise after updating state
                } else {
                  console.log('Fula is not ready yet, retrying...');
                  attempts++;
                  setTimeout(check, checkInterval);
                }
              };

              await check();
            } catch (error) {
              console.error('Error in checkFulaReadiness:', error);
              reject(error); // Reject the promise in case of an error
            } finally {
              readinessPromise = null; // Reset the shared promise after execution
            }
          })(); // Immediately invoke the async function inside the executor
        });

        return readinessPromise;
      },
      setHasHydrated: (isHydrated) => {
        set({
          _hasHydrated: isHydrated,
        });
      },
      loadAllCredentials: async () => {
        const password =
          (await KeyChain.load(KeyChain.Service.DIDPassword)) || undefined;
        const fulaPeerId =
          (await KeyChain.load(KeyChain.Service.FULAPeerId)) || undefined;
        const fulaRoodCID =
          (await KeyChain.load(KeyChain.Service.FULARootCID)) || undefined;
        const signiture =
          (await KeyChain.load(KeyChain.Service.Signiture)) || undefined;
        const address =
          (await KeyChain.load(KeyChain.Service.Address)) || undefined;
        set({
          password: password?.password,
          fulaPeerId: fulaPeerId?.password,
          fulaRoodCID: fulaRoodCID?.password,
          signiture: signiture?.password,
          address: address?.password,
        });
      },
      setKeyChainValue: async (service, value) => {
        switch (service) {
          case KeyChain.Service.DIDPassword: {
            const dIDPassword =
              (await KeyChain.save('DIDPassword', value, service)) || undefined;
            set({
              password: dIDPassword?.password,
            });
            break;
          }
          case KeyChain.Service.FULAPeerId: {
            const fULAPeerId =
              (await KeyChain.save('FULAPeerId', value, service)) || undefined;
            set({
              fulaPeerId: fULAPeerId?.password,
            });
            break;
          }
          case KeyChain.Service.FULARootCID: {
            const fULARootCID =
              (await KeyChain.save('FULARootCID', value, service)) || undefined;
            set({
              fulaRoodCID: fULARootCID?.password,
            });
            break;
          }
          case KeyChain.Service.Signiture: {
            const signiture =
              (await KeyChain.save('Signiture', value, service)) || undefined;
            set({
              signiture: signiture?.password,
            });
            break;
          }
          case KeyChain.Service.Address: {
            const address =
              (await KeyChain.save('Address', value, service)) || undefined;
            set({
              address: address?.password,
            });
            break;
          }
          default:
            break;
        }
      },
      setWalletId: async (walletId, clearSigniture) => {
        if (clearSigniture) {
          await KeyChain.reset(KeyChain.Service.DIDPassword);
          await KeyChain.reset(KeyChain.Service.Signiture);
          await KeyChain.reset(KeyChain.Service.Address);
          set({
            walletId,
            password: undefined,
            signiture: undefined,
            address: undefined,
          });
        } else {
          set({
            walletId,
          });
        }
      },
      setAppPeerId: (peerId) => {
        set({
          appPeerId: peerId,
        });
      },
      setBloxPeerIds: (peerIds) => {
        set({
          bloxPeerIds: peerIds,
        });
      },
      createAccount: async ({ seed }) => {
        // eslint-disable-next-line no-useless-catch
        try {
          const { fulaIsReady } = get();
          if (!fulaIsReady) {
            console.log('Fula is not ready. Please wait...');
            Promise.reject('internet is not connected');
          }
          const accounts = get().accounts;
          await fula.isReady(false);
          const account = await blockchain.createAccount(`/${seed}`);
          set({
            accounts: [account, ...accounts],
          });
          return account;
        } catch (error) {
          throw error;
        }
      },
      getEarnings: async () => {
        try {
          const { fulaIsReady } = get();
          if (!fulaIsReady) {
            console.log('Fula is not ready. Please wait...');
            Promise.reject('internet is not connected');
          }
          await fula.isReady(false);
          const account = await blockchain.getAccount();
          console.log({ account: account });
          const earnings = await blockchain.assetsBalance(
            account.account,
            '100',
            '100'
          );
          console.log({ earnings: earnings });
          set({
            earnings: earnings.amount,
          });
        } catch (error) {
          if (!error.toString().includes('response: 400')) {
            console.log('Bad request: ', error.toString());
          }
          set({
            earnings: 'NaN',
          });
          throw error;
        } finally {
        }
      },
      logout: () => {
        // TO: cleare all persist user profile data
        throw 'Not implemented';
      },
      getBloxSpace: async () => {
        // eslint-disable-next-line no-useless-catch
        try {
          const { fulaIsReady } = get();
          if (!fulaIsReady) {
            console.log('Fula is not ready. Please wait...');
            Promise.reject('internet is not connected');
          }
          // if (!await fula.isReady(false))
          //   throw 'Fula is not ready!'
          await fula.isReady(false);
          const bloxSpace = await blockchain.bloxFreeSpace();
          console.log('bloxSpace', bloxSpace);
          set({
            bloxSpace: {
              ...bloxSpace,
            } as TBloxFreeSpace,
          });
          return bloxSpace as TBloxFreeSpace;
        } catch (error) {
          throw error;
        }
      },
      setFulaIsReady: (value: boolean) => {
        set({
          fulaIsReady: value,
        });
      },
      checkBloxConnection: async (maxTries = 1, waitBetweenRetries = 3) => {
        const delay = (seconds: number) =>
          new Promise((resolve) => setTimeout(resolve, seconds * 1000));

        const attemptConnection = async (attempt = 1) => {
          console.log('checkBloxConnection attempt ' + attempt);
          // attempt is now a parameter of attemptConnection
          set({ bloxConnectionStatus: 'CHECKING' });
          try {
            console.log('NetInfo check');
            const state = await NetInfo?.fetch();
            if (
              NetInfo &&
              (!state?.isConnected || !state?.isInternetReachable)
            ) {
              const pingResponse = await axios?.head('https://google.com', {
                timeout: 5000, // 5 seconds timeout
              });
              if (pingResponse?.status !== 200) {
                console.log(
                  'Internet is not connected, waiting for connection...'
                );
                // Optionally, you might want to handle the lack of internet connectivity accordingly
                set({ bloxConnectionStatus: 'NO INTERNET' });
                Promise.reject('internet is not connected');
                return false;
              }
            }
            console.log('NetInfo check done');
            const { fulaIsReady } = get();
            if (!fulaIsReady) {
              console.log('Fula is not ready. Please wait...');
              set({ bloxConnectionStatus: 'NO CLIENT' });
              Promise.reject('Fula is not ready. Please wait...');
              return false;
            }
            const connected = await fula.checkConnection();
            console.log(
              'checkBloxConnection attempt:',
              attempt,
              'connected:',
              connected
            );

            if (connected) {
              set({ bloxConnectionStatus: 'CONNECTED' });
              return true; // Connection successful
            } else if (attempt < maxTries) {
              console.log(
                `Attempt ${attempt} failed, retrying after ${waitBetweenRetries} seconds...`
              );
              await delay(waitBetweenRetries);
              return attemptConnection(attempt + 1); // Increment attempt and retry
            } else {
              throw new Error('Max retries reached without success.');
            }
          } catch (error) {
            console.log(
              `Failed to connect after ${attempt} attempts. Error: ${error.message}`
            );
            set({ bloxConnectionStatus: 'DISCONNECTED' });
            return false; // Connection was not successful after max attempts
          }
        };

        return attemptConnection(); // Start the attempt process without specifying the attempt, defaults to 1
      },

      reset: () => {
        set(initialState);
      },
    };
  },
  {
    name: 'userProfileSlice',
    version: 1,
    getStorage: () => AsyncStorage,
    serialize: (state) => JSON.stringify(state),
    deserialize: (str) => JSON.parse(str),
    onRehydrateStorage: () => {
      // anything to run before rehydrating, return function is called after rehydrating
      return (state) => {
        state.setHasHydrated(true);
      };
    },
    partialize: (state): Partial<UserProfileSlice & UserProfileActions> => ({
      walletId: state.walletId,
      bloxPeerIds: state.bloxPeerIds,
      appPeerId: state.appPeerId,
      accounts: state.accounts,
      activeAccount: state.activeAccount,
    }),
    migrate: async (persistedState, version) => {
      const { setState } = useBloxsStore;
      try {
        if (version === 0) {
          if (persistedState) {
            const userPrfoile = persistedState as UserProfileSlice;
            const bloxs =
              userPrfoile?.bloxPeerIds?.reduce((obj, peerId, index) => {
                obj[peerId] = {
                  peerId,
                  name: `Blox Unit #${index}`,
                };
                return obj;
              }, {}) || {};
            setState({
              bloxs,
            });
          }
        }
      } catch (error) {
        console.log(error);
      }
      return persistedState;
    },
  }
);

export const useUserProfileStore = create<
  UserProfileSlice & UserProfileActions
>()((...a) => ({
  ...createUserProfileSlice(...a),
}));
