// @ts-ignore-next-line
import '@walletconnect/react-native-compat';
import { HDKEY, DID } from '@functionland/fula-sec';
import { fula } from '@functionland/react-native-fula';
import { numberToHex, sanitizeHex, utf8ToHex } from '@walletconnect/encoding';
import { Constants } from '.';

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

export const initFula = async ({
  password,
  signiture,
  bloxAddr = undefined,
  bloxPeerId,
}: {
  password: string;
  signiture: string;
  bloxAddr?: string;
  bloxPeerId?: string;
}) => {
  if (password && signiture) {
    // Use FxRelay if bloxAddr is null or empty if bloxPeerId is null
    const bloxAddress = bloxAddr
      ? bloxAddr
      : bloxPeerId
      ? `${Constants.FXRelay}/p2p/${bloxPeerId}`.trim()
      : '';
    const keyPair = getMyDIDKeyPair(password, signiture);
    try {
      console.log('initFula helper.ts', { bloxAddress, bloxPeerId, keyPair });
      //if (await fula.isReady(false))
      try {
        await fula.shutdown();
      } catch (error) {
        console.log('fula shutdown failed', error);
      }
      const peerId = await fula.newClient(
        keyPair.secretKey.toString(), //bytes of the privateKey of did identity in string format
        ``, // leave empty to use the default temp one
        bloxAddress,
        bloxAddress ? '' : 'noop', //leave empty for testing without a backend node
        true,
        true,
        true
      );
      console.log('peerId: ', peerId);
      return peerId;
    } catch (error) {
      console.log('initFula failed for bloxAddress='+bloxAddress, error);
      throw error;
    }
  }
};

export const generateUniqueId = () => {
  const timestamp = Date.now();
  const randomNum = Math.random() * Math.pow(10, 18);
  return `${timestamp}-${randomNum}`;
};
