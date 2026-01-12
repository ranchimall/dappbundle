import * as CardanoLib from "cardano-crypto.js";
import { Buffer } from "buffer";

window.cardanoCrypto = window.cardanoCrypto || {};

const cardanoCrypto = window.cardanoCrypto;

/**
 * Generate a new random BTC/FLO/ADA wallet
 * @returns {Promise<Object>} Wallet data with BTC, FLO, ADA addresses and Root Key
 */
cardanoCrypto.generateWallet = async function () {
  function generateNewID() {
    var key = new Bitcoin.ECKey(false);
    key.setCompressed(true);
    return {
      floID: key.getBitcoinAddress(),
      pubKey: key.getPubKeyHex(),
      privKey: key.getBitcoinWalletImportFormat(),
    };
  }

  const newID = generateNewID();
  
  return await cardanoCrypto.importFromKey(newID.privKey);
};





/**
 * Import from BTC/FLO private key or ADA Root Key
 * @param {string} input - BTC/FLO WIF, Hex, or ADA Root Key (128-byte hex)
 * @returns {Promise<Object>} Wallet data
 */
cardanoCrypto.importFromKey = async function (input) {
  const trimmedInput = input.trim();
  const hexOnly = /^[0-9a-fA-F]+$/.test(trimmedInput);

  // Check if it's a ADA Root Key (128 bytes = 256 hex chars)
  if (hexOnly && trimmedInput.length === 256) {
    return await cardanoCrypto.importFromRootKey(trimmedInput);
  } else {
    return await cardanoCrypto.importFromBtcFlo(trimmedInput);
  }
};

/**
 * Import from BTC/FLO private key and generate ADA Root Key
 * @param {string} key - BTC/FLO private key (WIF or Hex)
 * @returns {Promise<Object>} Wallet data
 */
cardanoCrypto.importFromBtcFlo = async function (key) {
  try {
    // Decode private key to hex
    const privKeyHex = await decodePrivateKey(key);
    
    console.log("BTC/FLO key (32 bytes):", privKeyHex);
    
    // Convert to bytes
    const privateKeyBytes = hexToBytes(privKeyHex);
    
    // Duplicate to create 64-byte extended key
    const extendedKeyBytes = new Uint8Array(64);
    extendedKeyBytes.set(privateKeyBytes, 0);
    extendedKeyBytes.set(privateKeyBytes, 32);
    
    console.log("Extended key (64 bytes):", bytesToHex(extendedKeyBytes));
    
    // Expand to 128-byte ADA Root Key using SHA-512
    const hashBuffer = await window.crypto.subtle.digest('SHA-512', extendedKeyBytes);
    const secondHalf = new Uint8Array(hashBuffer);
    
    const rootKey128 = new Uint8Array(128);
    rootKey128.set(extendedKeyBytes, 0);
    rootKey128.set(secondHalf, 64);
    
    console.log("ADA Root Key (128 bytes):", bytesToHex(rootKey128));
    
    // Derive ADA address from Root Key
    const cardanoData = await deriveCardanoFromRoot(rootKey128);
    
    // Derive BTC/FLO addresses from original key
    const btcFloData = await deriveBtcFloFromKey(privKeyHex);
    
    return {
      BTC: btcFloData.BTC,
      FLO: btcFloData.FLO,
      Cardano: cardanoData,
      cardanoRootKey: bytesToHex(rootKey128),
      originalKey: privKeyHex
    };
    
  } catch (error) {
    console.error("Import from BTC/FLO failed:", error);
    throw new Error(`Failed to import: ${error.message}`);
  }
};

/**
 * Import from ADA Root Key and extract BTC/FLO keys
 * @param {string} rootKeyHex - 128-byte ADA Root Key (256 hex chars)
 * @returns {Promise<Object>} Wallet data
 */
cardanoCrypto.importFromRootKey = async function (rootKeyHex) {
  try {
    const rootKey128 = hexToBytes(rootKeyHex);
    
    if (rootKey128.length !== 128) {
      throw new Error(`Invalid Root Key length: ${rootKey128.length} bytes. Expected 128.`);
    }
    
    console.log("Cardano Root Key (128 bytes):", rootKeyHex);
    
    // Extract original BTC/FLO key from first 32 bytes
    const privateKeyBytes = rootKey128.slice(0, 32);
    const privKeyHex = bytesToHex(privateKeyBytes);
    
    console.log("Extracted BTC/FLO key (32 bytes):", privKeyHex);
    
    // Derive ADA address from Root Key
    const cardanoData = await deriveCardanoFromRoot(rootKey128);
    
    // Derive BTC/FLO addresses from extracted key
    const btcFloData = await deriveBtcFloFromKey(privKeyHex);
    
    return {
      BTC: btcFloData.BTC,
      FLO: btcFloData.FLO,
      Cardano: cardanoData,
      cardanoRootKey: rootKeyHex,
      extractedKey: privKeyHex
    };
    
  } catch (error) {
    console.error("Import from ADA Root failed:", error);
    throw new Error(`Failed to import: ${error.message}`);
  }
};

/**
 * Get the Spend Private Key (hex) from the Root Key
 * Needed for signing transactions
 * @param {string} rootKeyHex - 128-byte ADA Root Key
 * @returns {Promise<string>} Private Key Hex (64 bytes extended or 32 bytes)
 */
cardanoCrypto.getSpendPrivateKey = async function(rootKeyHex) {
  try {
    const rootKey = hexToBytes(rootKeyHex);
    const rootKeyBuffer = Buffer.from(rootKey);

    // Derivation path: m/1852'/1815'/0'/0/0
    const accountKey = CardanoLib.derivePrivate(rootKeyBuffer, 0x80000000 + 1852, 2);
    const coinKey = CardanoLib.derivePrivate(accountKey, 0x80000000 + 1815, 2);
    const accountIndex = CardanoLib.derivePrivate(coinKey, 0x80000000 + 0, 2);
    const chainKey = CardanoLib.derivePrivate(accountIndex, 0, 2);
    const spendKey = CardanoLib.derivePrivate(chainKey, 0, 2);
    
    return bytesToHex(spendKey.slice(0, 64));
    
  } catch (error) {
    console.error("Failed to derive spend private key:", error);
    throw error;
  }
};

/**
 * Derive ADA address from 128-byte Root Key
 * @private
 */
async function deriveCardanoFromRoot(rootKey) {
  // Ensure rootKey is a Buffer
  const rootKeyBuffer = Buffer.from(rootKey);

  // Use CIP-1852 derivation path: m/1852'/1815'/0'/0/0 (spend) and m/1852'/1815'/0'/2/0 (stake)
  const accountKey = CardanoLib.derivePrivate(rootKeyBuffer, 0x80000000 + 1852, 2);
  const coinKey = CardanoLib.derivePrivate(accountKey, 0x80000000 + 1815, 2);
  const accountIndex = CardanoLib.derivePrivate(coinKey, 0x80000000 + 0, 2);
  
  // Spending key
  const chainKey = CardanoLib.derivePrivate(accountIndex, 0, 2);
  const spendKey = CardanoLib.derivePrivate(chainKey, 0, 2);
  
  // Staking key
  const stakingChainKey = CardanoLib.derivePrivate(accountIndex, 2, 2);
  const stakeKey = CardanoLib.derivePrivate(stakingChainKey, 0, 2);
  
  // Extract public keys (32 bytes each, from offset 64-96)
  const spendPubKey = spendKey.slice(64, 96);
  const stakePubKey = stakeKey.slice(64, 96);
  
  // Create payment and stake credentials
  const paymentKeyHash = CardanoLib.blake2b(spendPubKey, 28);
  const stakeKeyHash = CardanoLib.blake2b(stakePubKey, 28);
  
  // Build base address (mainnet)
  const networkTag = 0x01;
  const header = (0b0000 << 4) | networkTag;
  const addressBytes = new Uint8Array(1 + 28 + 28);
  addressBytes[0] = header;
  addressBytes.set(paymentKeyHash, 1);
  addressBytes.set(stakeKeyHash, 29);
  
  
  // Re-import bech32 here to be safe
  const { bech32 } = await import("bech32");

  const words = bech32.toWords(addressBytes);
  const address = bech32.encode("addr", words, 1000);
  
  // Encode keys to bech32
  const spendKeyBech32 = bech32.encode("ed25519e_sk", bech32.toWords(spendKey.slice(0, 64)), 1000);
  const stakeKeyBech32 = bech32.encode("ed25519e_sk", bech32.toWords(stakeKey.slice(0, 64)), 1000);
  
  return {
    address: address,
    rootKey: bytesToHex(rootKey),
    spendKeyBech32: spendKeyBech32,
    stakeKeyBech32: stakeKeyBech32
  };
}

/**
 * Derive BTC and FLO addresses from private key hex
 * @private
 */
async function deriveBtcFloFromKey(privKeyHex) {
  const versions = {
    BTC: { pub: 0x00, priv: 0x80 },
    FLO: { pub: 0x23, priv: 0xa3 }
  };

  const origBitjsPub = bitjs.pub;
  const origBitjsPriv = bitjs.priv;
  const origBitjsCompressed = bitjs.compressed;
  const origCoinJsCompressed = coinjs.compressed;

  // Enforce compressed keys
  bitjs.compressed = true;
  coinjs.compressed = true;

  const result = { BTC: {}, FLO: {} };

  // BTC
  bitjs.pub = versions.BTC.pub;
  bitjs.priv = versions.BTC.priv;
  const pubKeyBTC = bitjs.newPubkey(privKeyHex);
  result.BTC.address = coinjs.bech32Address(pubKeyBTC).address;
  result.BTC.privateKey = bitjs.privkey2wif(privKeyHex);

  // FLO
  bitjs.pub = versions.FLO.pub;
  bitjs.priv = versions.FLO.priv;
  const pubKeyFLO = bitjs.newPubkey(privKeyHex);
  result.FLO.address = bitjs.pubkey2address(pubKeyFLO);
  result.FLO.privateKey = bitjs.privkey2wif(privKeyHex);

  // Restore original values
  bitjs.pub = origBitjsPub;
  bitjs.priv = origBitjsPriv;
  bitjs.compressed = origBitjsCompressed;
  coinjs.compressed = origCoinJsCompressed;

  return result;
}

/**
 * Decode private key from WIF or Hex to hex string
 * @private
 */
async function decodePrivateKey(key) {
  const trimmed = key.trim();
  const hexOnly = /^[0-9a-fA-F]+$/.test(trimmed);

  // If it's already hex (64 chars = 32 bytes)
  if (hexOnly && trimmed.length === 64) {
    return trimmed;
  }

  // Decode WIF
  try {
    const decode = Bitcoin.Base58.decode(trimmed);
    const keyWithVersion = decode.slice(0, decode.length - 4);
    let keyBytes = keyWithVersion.slice(1);
    
    // Remove compression flag if present
    if (keyBytes.length >= 33 && keyBytes[keyBytes.length - 1] === 0x01) {
      keyBytes = keyBytes.slice(0, keyBytes.length - 1);
    }
    
    return Crypto.util.bytesToHex(keyBytes);
  } catch (e) {
    throw new Error(`Invalid private key format: ${e.message}`);
  }
}

/**
 * Helper: Convert hex string to Uint8Array
 * Uses built-in Crypto.util.hexToBytes from lib.cardano.js
 * @private
 */
function hexToBytes(hex) {
  return new Uint8Array(Crypto.util.hexToBytes(hex));
}

/**
 * Helper: Convert Uint8Array to hex string
 * Uses built-in Crypto.util.bytesToHex from lib.cardano.js
 * @private
 */
function bytesToHex(bytes) {
  return Crypto.util.bytesToHex(Array.from(bytes));
}
