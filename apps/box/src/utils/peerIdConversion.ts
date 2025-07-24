import { ethers } from 'ethers';

// Use dynamic import for ES modules
let base58btc: any;

async function initializeBase58() {
  if (!base58btc) {
    const module = await import('multiformats/bases/base58');
    base58btc = module.base58btc;
  }
  return base58btc;
}

/**
 * Convert PeerID to bytes32 format for smart contract usage
 * @param {string} peerId - The peer ID to convert
 * @returns {Promise<string>} - Hex string representation of bytes32
 */
export async function peerIdToBytes32(peerId: string): Promise<string> {
  try {
    const base58 = await initializeBase58();

    // Normalize to multibase format (starts with z)
    if (!peerId.startsWith("z")) {
      peerId = `z${peerId}`;
    }

    const decoded = base58.decode(peerId);
    console.log({ decoded });

    let bytes32: string | undefined = undefined;

    // CIDv1 (Ed25519 public key) format
    const CID_HEADER = [0x00, 0x24, 0x08, 0x01, 0x12];
    const isCIDv1 = CID_HEADER.every((v, i) => decoded[i] === v);

    if (isCIDv1 && decoded.length >= 37) {
      const pubkey = decoded.slice(decoded.length - 32);
      bytes32 = ethers.utils.hexlify(pubkey);
    }

    // Legacy multihash format
    if (decoded.length === 34 && decoded[0] === 0x12 && decoded[1] === 0x20) {
      const digest = decoded.slice(2);
      bytes32 = ethers.utils.hexlify(digest);
    }

    if (!bytes32) {
      throw new Error(`Unsupported PeerID format or unexpected length: ${decoded.length}`);
    }

    // Reversible check
    const reconstructed = await bytes32ToPeerId(bytes32);
    if (reconstructed !== peerId.slice(1)) {
      throw new Error(`Could not revert the encoded bytes32 back to original PeerID. Got: ${reconstructed}`);
    }

    return bytes32;
  } catch (err) {
    console.error("Failed to convert PeerID to bytes32:", peerId, err);
    throw err;
  }
}

/**
 * Reconstructs the full Base58 PeerID from a bytes32 digest retrieved from the contract.
 * Always returns a multibase-style PeerID (without the 'z' prefix by default).
 * @param {string} digestBytes32 - Hex string of bytes32
 * @returns {Promise<string>} - Original peer ID
 */
export async function bytes32ToPeerId(digestBytes32: string): Promise<string> {
  try {
    const base58 = await initializeBase58();

    // Remove 0x prefix if present
    if (digestBytes32.startsWith('0x')) {
      digestBytes32 = digestBytes32.slice(2);
    }

    const pubkeyBytes = Buffer.from(digestBytes32, 'hex');

    const full = Uint8Array.from([
      0x00, 0x24,       // CIDv1 prefix
      0x08, 0x01,       // ed25519-pub key
      0x12, 0x20,       // multihash: sha2-256, 32 bytes
      ...pubkeyBytes,
    ]);

    // Return without the multibase 'z' prefix (match legacy PeerID style)
    return base58.encode(full).slice(1);
  } catch (err) {
    console.error("Failed to convert bytes32 to PeerID:", digestBytes32, err);
    return digestBytes32;
  }
}
