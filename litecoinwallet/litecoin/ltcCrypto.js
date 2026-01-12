(function (EXPORTS) {
  "use strict";
  const ltcCrypto = EXPORTS;

  const generateNewID = (ltcCrypto.generateNewID = function () {
    var key = new Bitcoin.ECKey(false);
    key.setCompressed(true);
    return {
      floID: key.getBitcoinAddress(),
      pubKey: key.getPubKeyHex(),
      privKey: key.getBitcoinWalletImportFormat(),
    };
  });

  Object.defineProperties(ltcCrypto, {
    newID: {
      get: () => generateNewID(),
    },
    hashID: {
      value: (str) => {
        let bytes = ripemd160(Crypto.SHA256(str, { asBytes: true }), {
          asBytes: true,
        });
        bytes.unshift(bitjs.pub);
        var hash = Crypto.SHA256(
          Crypto.SHA256(bytes, {
            asBytes: true,
          }),
          {
            asBytes: true,
          }
        );
        var checksum = hash.slice(0, 4);
        return bitjs.Base58.encode(bytes.concat(checksum));
      },
    },
    tmpID: {
      get: () => {
        let bytes = Crypto.util.randomBytes(20);
        bytes.unshift(bitjs.pub);
        var hash = Crypto.SHA256(
          Crypto.SHA256(bytes, {
            asBytes: true,
          }),
          {
            asBytes: true,
          }
        );
        var checksum = hash.slice(0, 4);
        return bitjs.Base58.encode(bytes.concat(checksum));
      },
    },
  });

  //Verify the private-key for the given public-key or ltc-ID
  ltcCrypto.verifyPrivKey = function (privateKeyWIF, ltcAddress) {
    if (!privateKeyWIF || !ltcAddress) return false;
    try {
      var derivedAddress =
        ltcCrypto.generateMultiChain(privateKeyWIF).LTC.address;
      return derivedAddress === ltcAddress;
    } catch (e) {
      console.error("verifyPrivKey error:", e);
      return false;
    }
  };

  //Check if the given ltc-id is valid or not
  ltcCrypto.validateLtcID = function (ltcID) {
    if (!ltcID) return false;

    // Check for SegWit addresses (ltc1...)
    if (ltcID.toLowerCase().startsWith("ltc1")) {
      try {
        // Basic SegWit validation
        if (ltcID.length < 42 || ltcID.length > 62) return false;

        // Check if it contains only valid bech32 characters
        const bech32Regex = /^ltc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/i;
        return bech32Regex.test(ltcID);
      } catch (e) {
        return false;
      }
    }

    // Legacy address validation (L, M prefixes)
    try {
      // Decode Base58Check
      let bytes = bitjs.Base58.decode(ltcID);
      if (!bytes || bytes.length < 25) return false;
      let version = bytes[0];

      return version === 0x30 || version === 0x32 || version === 0x05; // Litecoin legacy (L), P2SH (M), or segwit compatible
    } catch (e) {
      return false;
    }
  };

  //Generates multi-chain addresses (LTC, BTC, FLO, DOGE) from the given WIF or new WIF
  ltcCrypto.generateMultiChain = function (inputWif) {
    try {
      const origBitjsPub = bitjs.pub;
      const origBitjsPriv = bitjs.priv;
      const origBitjsCompressed = bitjs.compressed;
      const origCoinJsCompressed = coinjs.compressed;

      bitjs.compressed = true;
      coinjs.compressed = true;

      const versions = {
        LTC: { pub: 0x30, priv: 0xb0 },
        BTC: { pub: 0x00, priv: 0x80 },
        FLO: { pub: 0x23, priv: 0xa3 },
        DOGE: { pub: 0x1e, priv: 0x9e },
      };

      let privKeyHex;
      let compressed = true;

      if (typeof inputWif === "string" && inputWif.length > 0) {
        const decode = Bitcoin.Base58.decode(inputWif);
        const keyWithVersion = decode.slice(0, decode.length - 4);
        let key = keyWithVersion.slice(1);

        if (key.length >= 33 && key[key.length - 1] === 0x01) {
          key = key.slice(0, key.length - 1);
          compressed = true;
        } else {
          compressed = false;
        }

        privKeyHex = Crypto.util.bytesToHex(key);
      } else {
        const newKey = generateNewID();
        const decode = Bitcoin.Base58.decode(newKey.privKey);
        const keyWithVersion = decode.slice(0, decode.length - 4);
        let key = keyWithVersion.slice(1);

        if (key.length >= 33 && key[key.length - 1] === 0x01) {
          key = key.slice(0, key.length - 1);
        }

        privKeyHex = Crypto.util.bytesToHex(key);
      }

      bitjs.compressed = compressed;
      coinjs.compressed = compressed;

      // Generate public key
      const pubKey = bitjs.newPubkey(privKeyHex);

      const result = {
        LTC: { address: "", privateKey: "" },
        BTC: { address: "", privateKey: "" },
        FLO: { address: "", privateKey: "" },
        DOGE: { address: "", privateKey: "" },
      };

      // For LTC
      bitjs.pub = versions.LTC.pub;
      bitjs.priv = versions.LTC.priv;
      result.LTC.address = bitjs.pubkey2address(pubKey);
      result.LTC.privateKey = bitjs.privkey2wif(privKeyHex);

      // For BTC
      bitjs.pub = versions.BTC.pub;
      bitjs.priv = versions.BTC.priv;
      result.BTC.address = coinjs.bech32Address(pubKey).address;
      result.BTC.privateKey = bitjs.privkey2wif(privKeyHex);

      // For FLO
      bitjs.pub = versions.FLO.pub;
      bitjs.priv = versions.FLO.priv;
      result.FLO.address = bitjs.pubkey2address(pubKey);
      result.FLO.privateKey = bitjs.privkey2wif(privKeyHex);

      // For DOGE
      bitjs.pub = versions.DOGE.pub;
      bitjs.priv = versions.DOGE.priv;
      result.DOGE.address = bitjs.pubkey2address(pubKey);
      result.DOGE.privateKey = bitjs.privkey2wif(privKeyHex);

      bitjs.pub = origBitjsPub;
      bitjs.priv = origBitjsPriv;
      bitjs.compressed = origBitjsCompressed;
      coinjs.compressed = origCoinJsCompressed;

      return result;
    } catch (error) {
      console.error("Error in generateMultiChain:", error);
      throw error;
    }
  };

  /**
   * Translates an address from one blockchain to equivalent addresses on other chains
   * Works by extracting the public key hash from the address and recreating addresses with different version bytes
   */
  ltcCrypto.translateAddress = function (address) {
    try {
      let sourceChain = null;

      if (address.startsWith("bc1")) {
        sourceChain = "BTC";
      } else if (address.startsWith("D")) {
        sourceChain = "DOGE";
      } else if (address.startsWith("F")) {
        sourceChain = "FLO";
      } else if (address.startsWith("L") || address.startsWith("M")) {
        sourceChain = "LTC";
      } else {
        throw new Error("Unsupported address format");
      }

      let decoded, hash160;

      if (sourceChain === "BTC") {
        decoded = coinjs.bech32_decode(address);
        if (!decoded) throw new Error("Invalid bech32 address");

        // For segwit addresses, convert from 5-bit to 8-bit
        const data = coinjs.bech32_convert(decoded.data.slice(1), 5, 8, false);
        hash160 = Crypto.util.bytesToHex(data);
      } else {
        // Handle LTC, DOGE and FLO addresses (Base58)
        const decodedBytes = Bitcoin.Base58.decode(address);
        if (!decodedBytes || decodedBytes.length < 25)
          throw new Error("Invalid address");

        // Remove version byte (first byte) and checksum (last 4 bytes)
        const bytes = decodedBytes.slice(1, decodedBytes.length - 4);
        hash160 = Crypto.util.bytesToHex(bytes);
      }

      if (!hash160) throw new Error("Could not extract hash160 from address");

      const versions = {
        LTC: 0x30,
        DOGE: 0x1e,
        FLO: 0x23,
        BTC: 0x00,
      };

      const result = {};

      // Generate address for LTC
      const ltcBytes = Crypto.util.hexToBytes(hash160);
      ltcBytes.unshift(versions.LTC);
      const ltcChecksum = Crypto.SHA256(
        Crypto.SHA256(ltcBytes, { asBytes: true }),
        { asBytes: true }
      ).slice(0, 4);
      result.LTC = Bitcoin.Base58.encode(ltcBytes.concat(ltcChecksum));

      // Generate address for DOGE
      const dogeBytes = Crypto.util.hexToBytes(hash160);
      dogeBytes.unshift(versions.DOGE);
      const dogeChecksum = Crypto.SHA256(
        Crypto.SHA256(dogeBytes, { asBytes: true }),
        { asBytes: true }
      ).slice(0, 4);
      result.DOGE = Bitcoin.Base58.encode(dogeBytes.concat(dogeChecksum));

      // Generate address for FLO
      const floBytes = Crypto.util.hexToBytes(hash160);
      floBytes.unshift(versions.FLO);
      const floChecksum = Crypto.SHA256(
        Crypto.SHA256(floBytes, { asBytes: true }),
        { asBytes: true }
      ).slice(0, 4);
      result.FLO = Bitcoin.Base58.encode(floBytes.concat(floChecksum));

      // Generate address for BTC
      try {
        const words = coinjs.bech32_convert(
          Crypto.util.hexToBytes(hash160),
          8,
          5,
          true
        );
        result.BTC = coinjs.bech32_encode("bc", [0].concat(words));
      } catch (e) {
        console.log("Could not generate segwit address:", e);
      }

      return result;
    } catch (err) {
      console.error("Address translation error:", err);
      throw new Error("Address translation failed: " + err.message);
    }
  };
})("object" === typeof module ? module.exports : (window.ltcCrypto = {}));
