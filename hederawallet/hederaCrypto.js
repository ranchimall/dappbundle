(function (EXPORTS) {
  "use strict";
  const hederaCrypto = EXPORTS;

  function hexToBytes(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
  }

  function bytesToHex(bytes) {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Generate a new random key
  function generateNewID() {
    var key = new Bitcoin.ECKey(false);
    key.setCompressed(true);
    return {
      floID: key.getBitcoinAddress(),
      pubKey: key.getPubKeyHex(),
      privKey: key.getBitcoinWalletImportFormat(),
    };
  }

  Object.defineProperties(hederaCrypto, {
    newID: {
      get: () => generateNewID(),
    },
    hashID: {
      value: (str) => {
        let bytes = ripemd160(Crypto.SHA256(str, { asBytes: true }), {
          asBytes: true,
        });
        bytes.unshift(bitjs.pub);
        var hash = Crypto.SHA256(Crypto.SHA256(bytes, { asBytes: true }), {
          asBytes: true,
        });
        var checksum = hash.slice(0, 4);
        return bitjs.Base58.encode(bytes.concat(checksum));
      },
    },
    tmpID: {
      get: () => {
        let bytes = Crypto.util.randomBytes(20);
        bytes.unshift(bitjs.pub);
        var hash = Crypto.SHA256(Crypto.SHA256(bytes, { asBytes: true }), {
          asBytes: true,
        });
        var checksum = hash.slice(0, 4);
        return bitjs.Base58.encode(bytes.concat(checksum));
      },
    },
  });

  // --- Multi-chain Generator (BTC, FLO, HBAR) ---
  hederaCrypto.generateMultiChain = async function (inputWif) {
    const versions = {
      BTC: { pub: 0x00, priv: 0x80 },
      FLO: { pub: 0x23, priv: 0xa3 },
    };

    const origBitjsPub = bitjs.pub;
    const origBitjsPriv = bitjs.priv;
    const origBitjsCompressed = bitjs.compressed;
    const origCoinJsCompressed = coinjs.compressed;

    bitjs.compressed = true;
    coinjs.compressed = true;

    let privKeyHex;
    let compressed = true;

    // --- Decode input or generate new ---
    if (typeof inputWif === "string" && inputWif.trim().length > 0) {
      const trimmedInput = inputWif.trim();
      const hexOnly = /^[0-9a-fA-F]+$/.test(trimmedInput);

      if (hexOnly && (trimmedInput.length === 64 || trimmedInput.length === 128)) {
        privKeyHex =
          trimmedInput.length === 128 ? trimmedInput.substring(0, 64) : trimmedInput;
      } else {
        try {
          const decode = Bitcoin.Base58.decode(trimmedInput);
          const keyWithVersion = decode.slice(0, decode.length - 4);
          let key = keyWithVersion.slice(1);
          if (key.length >= 33 && key[key.length - 1] === 0x01) {
            key = key.slice(0, key.length - 1);
            compressed = true;
          }
          privKeyHex = bytesToHex(key);
        } catch (e) {
          console.warn("Invalid WIF, generating new key:", e);
          const newKey = generateNewID();
          const decode = Bitcoin.Base58.decode(newKey.privKey);
          const keyWithVersion = decode.slice(0, decode.length - 4);
          let key = keyWithVersion.slice(1);
          if (key.length >= 33 && key[key.length - 1] === 0x01)
            key = key.slice(0, key.length - 1);
          privKeyHex = bytesToHex(key);
        }
      }
    } else {
      // Generate new key if no input
      const newKey = generateNewID();
      const decode = Bitcoin.Base58.decode(newKey.privKey);
      const keyWithVersion = decode.slice(0, decode.length - 4);
      let key = keyWithVersion.slice(1);
      if (key.length >= 33 && key[key.length - 1] === 0x01)
        key = key.slice(0, key.length - 1);
      privKeyHex = bytesToHex(key);
    }

    // --- Derive addresses for each chain ---
    const result = { BTC: {}, FLO: {}, HBAR: {} };

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

    // HBAR (Hedera) 
    try {
      const privBytes = hexToBytes(privKeyHex.substring(0, 64));
      
      // Create ECDSA key from private key bytes
      const ecKey = new Bitcoin.ECKey(privBytes);
      ecKey.setCompressed(false); // Uncompressed for EVM address derivation
      
      // Get uncompressed public key (65 bytes: 04 + 32 bytes X + 32 bytes Y)
      const pubKeyHex = ecKey.getPubKeyHex();
      
      
      // Derive EVM address from public key using Keccak-256
      // Remove '04' prefix and hash the remaining 64 bytes
      const pubKeyBytes = pubKeyHex.substring(2); 
      
      // Use web3.js for proper Keccak-256 hash (Ethereum standard)
      const hash = Web3.utils.keccak256('0x' + pubKeyBytes);
      // hash is '0x...' format, take last 20 bytes (40 hex chars)
      const evmAddress = '0x' + hash.substring(26); 
      
      // Compressed public key for display
      ecKey.setCompressed(true);
      const compressedPubKey = ecKey.getPubKeyHex();
      
      result.HBAR.evmAddress = evmAddress;
      result.HBAR.publicKey = compressedPubKey;
      result.HBAR.privateKey = privKeyHex.substring(0, 64);
      result.HBAR.address = evmAddress; // EVM address
    } catch (error) {
      console.error("Error generating HBAR keys:", error);
      result.HBAR.evmAddress = "Error generating address";
      result.HBAR.publicKey = "Error";
      result.HBAR.privateKey = privKeyHex;
      result.HBAR.address = "Error";
    }

    bitjs.pub = origBitjsPub;
    bitjs.priv = origBitjsPriv;
    bitjs.compressed = origBitjsCompressed;
    coinjs.compressed = origCoinJsCompressed;

    return result;
  };


})(typeof module === "object" ? module.exports : (window.hederaCrypto = {}));
