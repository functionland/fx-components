// @ts-ignore-next-line
import '@walletconnect/react-native-compat';
import { HDKEY, DID } from '@functionland/fula-sec';
import { fula } from '@functionland/react-native-fula';
import { numberToHex, sanitizeHex, utf8ToHex } from '@walletconnect/encoding';
import { Constants } from '.';
import { useSignMessage, useAccount } from 'wagmi';


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
      //if (await fula.isReady())
      await fula.shutdown();
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
      console.log('initFula', error);
      throw error;
    }
  }
};

export const generateUniqueId = () => {
  const timestamp = Date.now();
  const randomNum = Math.random() * Math.pow(10, 18);
  return `${timestamp}-${randomNum}`;
};

export interface RpcRequestParams {
  message: string;
}

export const signMessage = async ({
  message,
}: RpcRequestParams): Promise<string> => {

  const { address, isConnected } = useAccount();
  if (!isConnected) {
    throw new Error('web3Provider not connected');
  }
  if (!address) {
    throw new Error('No address found');
  }

  const { data, isError, isLoading, isSuccess, signMessage }  = useSignMessage({message: message});
  if (!isSuccess || data === undefined) {
    throw new Error('Failed to sign the message');
  }
  return data.toString();
};
