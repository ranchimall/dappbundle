(function (EXPORTS) { //floEthereum v1.0.1a
    /* FLO Ethereum Operators */
    /* Make sure you added Taproot, Keccak, FLO and BTC Libraries before */
    'use strict';
    const floEthereum = EXPORTS;

const ethAddressFromPrivateKey = floEthereum.ethAddressFromPrivateKey = function(privateKey){
    var t1,t2,t3,t4;

    t1 = secp.Point.fromPrivateKey(hex.decode(privateKey));
    if (!t1.hasEvenY()) { t1 = t1.negate(); }
    t2 = t1.x.toString(16) + t1.y.toString(16);
    t3 = keccak.keccak_256(Crypto.util.hexToBytes(t2));
    t4 = keccak.extractLast20Bytes(t3);
    return "0x" + t4;
}

const ethAddressFromCompressedPublicKey = floEthereum.ethAddressFromCompressedPublicKey = function(compressedPublicKey){
    var t1,t2,t3,t4;
    t1 = coinjs.compressedToUncompressed(compressedPublicKey);
    t2 = t1.slice(2);
    t3 = keccak.keccak_256(Crypto.util.hexToBytes(t2));
    t4 = keccak.extractLast20Bytes(t3);
    return "0x" + t4; 
}

const ethPrivateKeyFromUntweakedPrivateKey = floEthereum.ethPrivateKeyFromUntweakedPrivateKey = function(untweakedPrivateKey) {
    var t1;
    t1 = hex.encode(taproot.taprootTweakPrivKey(hex.decode(untweakedPrivateKey)));
    return t1;
}

const ethAddressFromUntweakedPrivateKey = floEthereum.ethAddressFromUntweakedPrivateKey = function(untweakedPrivateKey) {
    var t1,t2;
    t1 = hex.encode(taproot.taprootTweakPrivKey(hex.decode(untweakedPrivateKey)));
    t2 = ethAddressFromPrivateKey(t1);
    return t2;
}

const ethAddressFromTaprootAddress = floEthereum.ethAddressFromTaprootAddress = function(taprootAddress) {
    var t1,t2,t3,t4;
    t1 = coinjs.addressDecode(taprootAddress);
    t2 = t1.outstring.slice(4);
    t3 = "02" + t2;
    t4 = ethAddressFromCompressedPublicKey(t3);
    return t4;
}



})('object' === typeof module ? module.exports : window.floEthereum = {});
