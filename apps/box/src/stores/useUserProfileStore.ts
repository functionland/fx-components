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
  setFulaReinitCount: (count: number) => void;
  setUseLocalIp: (localIp: string) => void;
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
  fulaReinitCount: number;
  useLocalIp: string | undefined;
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
  fulaReinitCount: 0,
  useLocalIp: 'scan',
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
      checkFulaReadiness: async (maxAttempts = 3): Promise<void> => {
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
                    // Read the current value of useLocalIp
                    const currentLocalIp = get().useLocalIp;

                    // Check if useLocalIp is set and not equal to "scan" or "delete"
                    if (
                      currentLocalIp &&
                      currentLocalIp !== 'scan' &&
                      currentLocalIp !== 'delete'
                    ) {
                      // Set useLocalIp to "delete"
                      set({ useLocalIp: 'delete' });
                      console.log(
                        `useLocalIp was updated to "delete" from "${currentLocalIp}"`
                      );
                    } else if (!currentLocalIp || currentLocalIp === '') {
                      set({ useLocalIp: 'scan' });
                    } else {
                      // Increment fulaReinitCount instead of shutting down Fula
                      set((state) => ({
                        fulaReinitCount: state.fulaReinitCount + 1,
                      }));
                    }
                    reject('could not initialize fula');
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
      setUseLocalIp: (localIp: string) => {
        set({
          useLocalIp: localIp,
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
      setFulaReinitCount: (count: number) => {
        set({
          fulaReinitCount: count,
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
      checkBloxConnection: async (
        maxTries = 1,
        waitBetweenRetries = 5
      ): Promise<boolean> => {
        const delay = (seconds: number) =>
          new Promise((resolve) => setTimeout(resolve, seconds * 1000));

        const attemptConnection = async (attempt: number): Promise<boolean> => {
          console.log('checkBloxConnection attempt ' + attempt);

          try {
            // Set initial status to CHECKING
            set({ bloxConnectionStatus: 'CHECKING' });

            // Check network connectivity
            console.log('NetInfo check');
            const state = await NetInfo?.fetch();
            if (!state?.isConnected || !state?.isInternetReachable) {
              try {
                const pingResponse = await axios?.head('https://google.com', {
                  timeout: 5000,
                });
                if (pingResponse?.status !== 200) {
                  throw new Error('Internet is not connected.');
                }
              } catch (error) {
                console.error('Network check failed:', error.message);
                set({ bloxConnectionStatus: 'NO INTERNET' });
                return false;
              }
            }
            console.log('NetInfo check done');

            // Check Fula readiness
            const { fulaIsReady } = get();
            if (!fulaIsReady) {
              console.warn('Fula is not ready.');
              set({ bloxConnectionStatus: 'NO CLIENT' });
              return false;
            }

            // Check Blox connection
            const connected = await fula.checkConnection();
            console.log(
              `checkBloxConnection attempt ${attempt}, connected: ${connected}`
            );
            if (connected) {
              set({ bloxConnectionStatus: 'CONNECTED' });
              return true; // Connection successful
            }

            // Retry logic
            if (attempt < maxTries) {
              console.log(
                `Attempt ${attempt} failed, retrying after ${waitBetweenRetries} seconds...`
              );
              await delay(waitBetweenRetries);
              return attemptConnection(attempt + 1); // Increment attempt and retry
            } else {
              handleMaxRetriesReached();
              return false;
            }
          } catch (error) {
            console.error(
              `Error during connection attempt ${attempt}:`,
              error.message
            );

            // Update status to DISCONNECTED on failure
            set({ bloxConnectionStatus: 'DISCONNECTED' });
            return false; // Connection failed
          }
        };

        const handleMaxRetriesReached = () => {
          const currentLocalIp = get().useLocalIp;

          if (
            currentLocalIp &&
            currentLocalIp !== 'scan' &&
            currentLocalIp !== 'delete'
          ) {
            console.log('inside first if');
            set({ useLocalIp: 'delete' });
            console.log(
              `useLocalIp was updated to "delete" from "${currentLocalIp}"`
            );
          } else if (!currentLocalIp || currentLocalIp === '') {
            console.log('inside second if');
            set({ useLocalIp: 'scan' });
          } else {
            console.log('inside third if: currentLocalIp=' + currentLocalIp);
            set((state) => ({
              fulaReinitCount: state.fulaReinitCount + 1,
            }));
          }
          console.error('Max retries reached without success.');
        };

        // Start connection attempts and ensure final status update
        try {
          return await attemptConnection(1); // Start with first attempt
        } catch (error) {
          console.error('checkBloxConnection failed:', error.message);
          set({ bloxConnectionStatus: 'DISCONNECTED' }); // Ensure final status update on failure
          return false;
        }
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
      fulaReinitCount: state.fulaReinitCount,
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
