// @ts-ignore-next-line
import { HDKEY, DID } from '@functionland/fula-sec';
import { fula } from '@functionland/react-native-fula';
import { Constants } from '.';
import moment from 'moment';

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
  bloxPeerId
}: {
  password: string,
  signiture: string,
  bloxAddr?: string,
  bloxPeerId?: string
}) => {
  if (password && signiture) {
    // Use FxRelay if bloxAddr is null or empty if bloxPeerId is null
    let bloxAddress = bloxAddr ? bloxAddr : (bloxPeerId ? `${Constants.FXRelat}/p2p/${bloxPeerId}`.trim() : '')
    const keyPair = getMyDIDKeyPair(password, signiture);
    try {
      if (await fula.isReady()) await fula.shutdown();
      const peerId = await fula.newClient(
        keyPair.secretKey.toString(), //bytes of the privateKey of did identity in string format
        ``, // leave empty to use the default temp one
        bloxAddress,
        bloxAddress ? bloxAddress : 'noop', //leave empty for testing without a backend node
        false
      );
      console.log('peerId: ', peerId);
      return peerId;
    } catch (error) {
      console.log('initFula', error);
      return null;
    }
  }
};

export const generateUniqueId = () => {
  const timestamp = Date.now();
  const randomNum = Math.random() * Math.pow(10, 18);
  return `${timestamp}-${randomNum}`;
}
export const toggleDebugMode = (debugMode?: { endDate: Date, uniqueId: string }) => {
  if (debugMode && new Date(debugMode.endDate.toString()) > new Date()) {
    //Disable debug mode
    return {
      uniqueId: debugMode?.uniqueId || generateUniqueId(),
      endDate: moment().add(-2, 'days').toDate()
    }
  } else {
    //Enable debug mode
    return {
      uniqueId: debugMode?.uniqueId || generateUniqueId(),
      endDate: moment().add(2, 'days').toDate()
    }
  }
}