// @ts-ignore-next-line
import { HDKEY, DID } from '@functionland/fula-sec';
import { fula } from '@functionland/react-native-fula'

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

export const initFula = async (
  password: string,
  signiture: string,
  bloxAddr?: string
) => {
  if (password && signiture) {
    const keyPair = getMyDIDKeyPair(password, signiture);
    try {
      if (await fula.isReady()) await fula.shutdown();
      const peerId = await fula.newClient(
        keyPair.secretKey.toString(), //bytes of the privateKey of did identity in string format
        ``, // leave empty to use the default temp one
        bloxAddr,
        bloxAddr??'noop', //leave empty for testing without a backend node
        false
      );
      return peerId;
    } catch (error) {
      console.log('initFula', error);
      return null;
    }
  }
};

