// @ts-ignore-next-line
import { HDKEY, DID } from '@functionland/fula-sec';

export const getMyDID = (password: string, signiture: string): string => {
  const ed = new HDKEY(password);
  const keyPair = ed.createEDKeyPair(signiture);
  const did = new DID(keyPair.secretKey);
  return did.did();
};

export const getMyDIDKeyPair = (
  password: string,
  signiture: string,
): {
  secretKey: Uint8Array
  pubKey: Uint8Array
} => {
  const ed = new HDKEY(password)
  const keyPair = ed.createEDKeyPair(signiture)
  return keyPair
}