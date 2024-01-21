import * as ReactNativeKeychain from 'react-native-keychain';
export { UserCredentials, Result } from 'react-native-keychain';

export enum Service {
  /**
   * DID password
   */
  DIDPassword = 'DIDCredentials',
  /**
   * Wallet signiture
   */
  Signiture = 'Signiture',
  /**
   * Wallet address
   */
  Address = 'Address',
  /**
   * WNFS' root cid
   */
  FULARootCID = 'FULARootCID',
  /**
   * FULA client's PeerId
   */
  FULAPeerId = 'FULAPeerId',
}

/**
 * Saves some credentials securely.
 *
 * @param username The username
 * @param password The password
 * @param service The service these creds are for.
 */
export const save = async (
  username: string,
  password: string,
  service?: Service | undefined
): Promise<null | ReactNativeKeychain.UserCredentials> => {
  if (
    await ReactNativeKeychain.setGenericPassword(username, password, {
      service,
    })
  ) {
    return {
      username,
      password,
      service,
      storage: '',
    };
  } else return null;
};

/**
 * Loads credentials that were already saved.
 *
 * @param service The service that these creds are for
 */
export const load = async (
  service?: Service | undefined
): Promise<false | ReactNativeKeychain.UserCredentials> => {
  return await ReactNativeKeychain.getGenericPassword({ service });
};

/**
 * Resets any existing credentials for the given server.
 *
 * @param service The service which has these creds
 */
export const reset = async (
  service?: Service | undefined
): Promise<boolean> => {
  return await ReactNativeKeychain.resetGenericPassword({ service });
};
