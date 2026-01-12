(function (EXPORTS) {
  "use strict";
  const algoCrypto = EXPORTS;

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

  // SHA-512/256 using js-sha512 library (loaded from CDN)
  function sha512_256(data) {
    return new Uint8Array(sha512.sha512_256.array(data));
  }

  // Base32 decode (for Algorand addresses)
  function base32Decode(str) {
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = [];
    
    for (let i = 0; i < str.length; i++) {
      const idx = ALPHABET.indexOf(str[i].toUpperCase());
      if (idx === -1) continue;
      
      value = (value << 5) | idx;
      bits += 5;
      
      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 0xFF);
        bits -= 8;
      }
    }
    
    return new Uint8Array(output);
  }

  // Minimal MessagePack encoder for Algorand transactions
  const msgpack = {
    encode: function(obj) {
      const parts = [];
      this._encode(obj, parts);
      const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const part of parts) {
        result.set(part, offset);
        offset += part.length;
      }
      return result;
    },
    
    _encode: function(value, parts) {
      if (value === null || value === undefined) {
        parts.push(new Uint8Array([0xc0]));
      } else if (typeof value === 'boolean') {
        parts.push(new Uint8Array([value ? 0xc3 : 0xc2]));
      } else if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          if (value >= 0) {
            if (value < 128) {
              parts.push(new Uint8Array([value]));
            } else if (value < 256) {
              parts.push(new Uint8Array([0xcc, value]));
            } else if (value < 65536) {
              parts.push(new Uint8Array([0xcd, value >> 8, value & 0xff]));
            } else if (value < 4294967296) {
              parts.push(new Uint8Array([0xce, value >> 24, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]));
            } else {
              // 64-bit unsigned
              const hi = Math.floor(value / 4294967296);
              const lo = value >>> 0;
              parts.push(new Uint8Array([0xcf, 
                hi >> 24, (hi >> 16) & 0xff, (hi >> 8) & 0xff, hi & 0xff,
                lo >> 24, (lo >> 16) & 0xff, (lo >> 8) & 0xff, lo & 0xff
              ]));
            }
          } else {
            if (value >= -32) {
              parts.push(new Uint8Array([value & 0xff]));
            } else if (value >= -128) {
              parts.push(new Uint8Array([0xd0, value & 0xff]));
            } else if (value >= -32768) {
              parts.push(new Uint8Array([0xd1, (value >> 8) & 0xff, value & 0xff]));
            } else {
              parts.push(new Uint8Array([0xd2, (value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]));
            }
          }
        }
      } else if (typeof value === 'string') {
        const encoded = new TextEncoder().encode(value);
        if (encoded.length < 32) {
          parts.push(new Uint8Array([0xa0 | encoded.length]));
        } else if (encoded.length < 256) {
          parts.push(new Uint8Array([0xd9, encoded.length]));
        } else {
          parts.push(new Uint8Array([0xda, encoded.length >> 8, encoded.length & 0xff]));
        }
        parts.push(encoded);
      } else if (value instanceof Uint8Array) {
        if (value.length < 256) {
          parts.push(new Uint8Array([0xc4, value.length]));
        } else {
          parts.push(new Uint8Array([0xc5, value.length >> 8, value.length & 0xff]));
        }
        parts.push(value);
      } else if (Array.isArray(value)) {
        if (value.length < 16) {
          parts.push(new Uint8Array([0x90 | value.length]));
        } else {
          parts.push(new Uint8Array([0xdc, value.length >> 8, value.length & 0xff]));
        }
        for (const item of value) {
          this._encode(item, parts);
        }
      } else if (typeof value === 'object') {
        const keys = Object.keys(value).filter(k => value[k] !== undefined && value[k] !== null).sort();
        if (keys.length < 16) {
          parts.push(new Uint8Array([0x80 | keys.length]));
        } else {
          parts.push(new Uint8Array([0xde, keys.length >> 8, keys.length & 0xff]));
        }
        for (const key of keys) {
          this._encode(key, parts);
          this._encode(value[key], parts);
        }
      }
    }
  };

  // Build Algorand payment transaction
  algoCrypto.buildPaymentTx = function(params) {
    const { from, to, amount, fee, firstRound, lastRound, genesisId, genesisHash, note } = params;
    
    // Decode addresses to get public keys (remove checksum)
    const fromDecoded = base32Decode(from);
    const toDecoded = base32Decode(to);
    const fromPubKey = fromDecoded.slice(0, 32);
    const toPubKey = toDecoded.slice(0, 32);
    
    // Decode genesis hash from base64
    const genesisHashBytes = new Uint8Array(atob(genesisHash).split('').map(c => c.charCodeAt(0)));
    
    // Build transaction object
    const tx = {
      amt: amount,
      fee: fee,
      fv: firstRound,
      gen: genesisId,
      gh: genesisHashBytes,
      lv: lastRound,
      rcv: toPubKey,
      snd: fromPubKey,
      type: 'pay'
    };
    
    if (note) {
      tx.note = new TextEncoder().encode(note);
    }
    
    return tx;
  };

  // Encode transaction for signing (with "TX" prefix)
  algoCrypto.encodeTxForSigning = function(tx) {
    const encoded = msgpack.encode(tx);
    const prefix = new TextEncoder().encode('TX');
    const result = new Uint8Array(prefix.length + encoded.length);
    result.set(prefix, 0);
    result.set(encoded, prefix.length);
    return result;
  };

  // Encode signed transaction for broadcasting
  algoCrypto.encodeSignedTx = function(tx, signature) {
    const signedTx = {
      sig: signature,
      txn: tx
    };
    return msgpack.encode(signedTx);
  };

  // Complete function to build, sign, and encode transaction
  algoCrypto.createSignedPaymentTx = async function(params, privateKey) {
    // Build the transaction
    const tx = this.buildPaymentTx(params);
    
    // Encode for signing
    const txForSigning = this.encodeTxForSigning(tx);
    
    // Sign the transaction
    const signature = await this.signAlgo(txForSigning, privateKey);
    
    // Encode the signed transaction
    const signedTxBytes = this.encodeSignedTx(tx, signature);
    
    return signedTxBytes;
  };

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

  Object.defineProperties(algoCrypto, {
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

  // --- Multi-chain Generator (BTC, FLO, ALGO) ---
  algoCrypto.generateMultiChain = async function (inputWif) {
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
    const result = { BTC: {}, FLO: {}, ALGO: {} };

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

    // ALGO
    try {
      const privBytes = hexToBytes(privKeyHex.substring(0, 64));
      const seed = new Uint8Array(privBytes.slice(0, 32));

      // Generate Ed25519 keypair from seed
      const keyPair = nacl.sign.keyPair.fromSeed(seed);
      const pubKey = keyPair.publicKey;

      // Algorand uses SHA-512/256 (32 bytes output) for checksum
      const hashResult = sha512_256(pubKey);
      const checksum = hashResult.slice(28, 32);
      const addressBytes = new Uint8Array([...pubKey, ...checksum]);

      // Base32 encode the address
      const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let bits = 0;
      let value = 0;
      let output = '';

      for (let i = 0; i < addressBytes.length; i++) {
        value = (value << 8) | addressBytes[i];
        bits += 8;

        while (bits >= 5) {
          output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
          bits -= 5;
        }
      }

      if (bits > 0) {
        output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
      }

      const algoAddress = output;
      // Algorand private key format: seed (32 bytes) + publicKey (32 bytes) = 64 bytes total (128 hex chars)
      const seedHex = bytesToHex(seed);
      const pubKeyHexFull = bytesToHex(pubKey);
      const algoPrivateKey = seedHex + pubKeyHexFull;

      result.ALGO.address = algoAddress;
      result.ALGO.privateKey = algoPrivateKey;
    } catch (error) {
      console.error("Error generating ALGO address:", error);
      result.ALGO.address = "Error generating address";
      result.ALGO.privateKey = privKeyHex;
    }

    bitjs.pub = origBitjsPub;
    bitjs.priv = origBitjsPriv;
    bitjs.compressed = origBitjsCompressed;
    coinjs.compressed = origCoinJsCompressed;

    return result;
  };

  // Sign Algo Transaction 
  algoCrypto.signAlgo = async function (txBytes, algoPrivateKey) {
    const privKeyOnly = algoPrivateKey.substring(0, 64);
    const privBytes = hexToBytes(privKeyOnly);
    const seed = new Uint8Array(privBytes.slice(0, 32));

    const keypair = nacl.sign.keyPair.fromSeed(seed);

    let txData;
    if (typeof txBytes === 'string') {
      txData = new Uint8Array(atob(txBytes).split('').map(c => c.charCodeAt(0)));
    } else {
      txData = new Uint8Array(txBytes);
    }

    const signature = nacl.sign.detached(txData, keypair.secretKey);

    return signature;
  };

})("object" === typeof module ? module.exports : (window.algoCrypto = {}));