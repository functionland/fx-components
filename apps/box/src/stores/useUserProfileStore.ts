import create, { StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blockchain, fula } from '@functionland/react-native-fula'
import { KeyChain } from '../utils';
import { TAccount, TBloxFreeSpace } from '../models';


interface UserProfileSlice {
  _hasHydrated: boolean;
  setHasHydrated: (isHydrated: boolean) => void;
  walletId?: string | undefined;
  /**
   * Password is a phares that user enter to create DID and make signiture
   */
  password?: string | undefined;
  /**
   * signiture is the result of signing password and did secret key by wallet
   */
  signiture?: string | undefined;
  fulaPeerId?: string | undefined;
  fulaRoodCID?: string | undefined;
  appPeerId?: string | undefined;
  bloxPeerIds?: string[] | undefined;
  accounts: TAccount[];
  activeAccount?: TAccount | undefined;
  bloxSpace: TBloxFreeSpace | undefined;
  setKeyChainValue: (service: KeyChain.Service, value: string) => Promise<void>;
  loadAllCredentials: () => Promise<void>;
  setWalletId: (walletId: string, clearSigniture?: boolean) => Promise<void>;
  setAppPeerId: (peerId: string | undefined) => void;
  setBloxPeerIds: (peerIds: string[] | undefined) => void;
  createAccount: ({ seed }: { seed: string }) => Promise<TAccount>;
  getBloxSpace: () => Promise<TBloxFreeSpace>;
  logout: () => boolean;
}
const createUserProfileSlice: StateCreator<
  UserProfileSlice,
  [],
  [['zustand/persist', Partial<UserProfileSlice>]],
  UserProfileSlice
> = persist(
  (set, get) => ({
    _hasHydrated: false,
    setHasHydrated: (isHydrated) => {
      set({
        _hasHydrated: isHydrated,
      });
    },
    bloxPeerIds: [],
    accounts: [],
    bloxSpace: undefined,
    loadAllCredentials: async () => {
      const password =
        (await KeyChain.load(KeyChain.Service.DIDPassword)) || undefined;
      const fulaPeerId =
        (await KeyChain.load(KeyChain.Service.FULAPeerId)) || undefined;
      const fulaRoodCID =
        (await KeyChain.load(KeyChain.Service.FULARootCID)) || undefined;
      const signiture =
        (await KeyChain.load(KeyChain.Service.Signiture)) || undefined;
      set({
        password: password?.password,
        fulaPeerId: fulaPeerId?.password,
        fulaRoodCID: fulaRoodCID?.password,
        signiture: signiture?.password,
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
        default:
          break;
      }
    },
    setWalletId: async (walletId, clearSigniture) => {
      if (clearSigniture) {
        await KeyChain.reset(KeyChain.Service.DIDPassword);
        await KeyChain.reset(KeyChain.Service.Signiture);
        set({
          walletId,
          password: undefined,
          signiture: undefined,
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
      try {
        const accounts = get().accounts;
        const account = await blockchain.createAccount(`/${seed}`);
        set({
          accounts: [account, ...accounts]
        })
        return account;
      } catch (error) {
        throw error;
      }
    },
    logout: () => {
      // TO: cleare all persist user profile data
      throw 'Not implemented';
    },
    getBloxSpace: async () => {
      try {
        // if (!await fula.isReady())
        //   throw 'Fula is not ready!'
        const bloxSpace = await blockchain.getBloxSpace();
        console.log('bloxSpace',bloxSpace)
        set({
          bloxSpace
        })
        return bloxSpace;
      } catch (error) {
        throw error;
      }
    }
  }),
  {
    name: 'userProfileSlice',
    getStorage: () => AsyncStorage,
    serialize: (state) => JSON.stringify(state),
    deserialize: (str) => JSON.parse(str),
    onRehydrateStorage: () => {
      // anything to run before rehydrating, return function is called after rehydrating
      return (state) => {
        state.setHasHydrated(true);
      };
    },
    partialize: (state): Partial<UserProfileSlice> => ({
      walletId: state.walletId,
      bloxPeerIds: state.bloxPeerIds,
      appPeerId: state.appPeerId,
      accounts: state.accounts,
      activeAccount: state.activeAccount,
    }),
  }
);

export const useUserProfileStore = create<UserProfileSlice>()((...a) => ({
  ...createUserProfileSlice(...a),
}));
