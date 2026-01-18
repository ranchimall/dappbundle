(function (EXPORTS) { //floEthereum v1.0.1a
    /* FLO Ethereum Operators */
    /* Make sure you added Taproot, Keccak, FLO and BTC Libraries before */
    'use strict';
    const floEthereum = EXPORTS;

    const ethAddressFromPrivateKey = floEthereum.ethAddressFromPrivateKey = function (privateKey, onlyEvenY = false) {
        var t1, t1_x, t1_y, t1_y_BigInt, t2, t3, t4;
        var groupOrder = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F");

        t1 = bitjs.newPubkey(privateKey);
        t1_x = t1.slice(2, 66); t1_y = t1.slice(-64);
        if (onlyEvenY) {
            t1_y_BigInt = BigInt("0x" + t1_y);
            if (t1_y_BigInt % 2n !== 0n) { t1_y_BigInt = (groupOrder - t1_y_BigInt) % groupOrder; t1_y = t1_y_BigInt.toString(16) }
        };

        t2 = t1_x.toString(16) + t1_y.toString(16);
        t3 = keccak.keccak_256(Crypto.util.hexToBytes(t2));
        t4 = keccak.extractLast20Bytes(t3);
        return "0x" + t4;
    }

    const ethAddressFromCompressedPublicKey = floEthereum.ethAddressFromCompressedPublicKey = function (compressedPublicKey) {
        var t1, t2, t3, t4;
        t1 = coinjs.compressedToUncompressed(compressedPublicKey);
        t2 = t1.slice(2);
        t3 = keccak.keccak_256(Crypto.util.hexToBytes(t2));
        t4 = keccak.extractLast20Bytes(t3);
        return "0x" + t4;
    }

    const ethPrivateKeyFromUntweakedPrivateKey = floEthereum.ethPrivateKeyFromUntweakedPrivateKey = function (untweakedPrivateKey) {
        var t1;
        t1 = hex.encode(taproot.taprootTweakPrivKey(hex.decode(untweakedPrivateKey)));
        return t1;
    }

    const ethAddressFromUntweakedPrivateKey = floEthereum.ethAddressFromUntweakedPrivateKey = function (untweakedPrivateKey) {
        var t1, t2;
        t1 = hex.encode(taproot.taprootTweakPrivKey(hex.decode(untweakedPrivateKey)));
        t2 = ethAddressFromPrivateKey(t1);
        return t2;
    }

    const ethAddressFromTaprootAddress = floEthereum.ethAddressFromTaprootAddress = function (taprootAddress) {
        var t1, t2, t3, t4;
        t1 = coinjs.addressDecode(taprootAddress);
        t2 = t1.outstring.slice(4);
        t3 = "02" + t2;
        t4 = ethAddressFromCompressedPublicKey(t3);
        return t4;
    }



})('object' === typeof module ? module.exports : window.floEthereum = {});
