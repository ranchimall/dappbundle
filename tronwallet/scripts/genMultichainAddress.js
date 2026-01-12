function getRandomPrivateKey() {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function generateFLOFromPrivateKey(privateKey) {
  try {
    let flowif = privateKey;

    if (/^[0-9a-fA-F]{64}$/.test(privateKey)) {
      flowif = coinjs.privkey2wif(privateKey);
    }

    let floprivateKey = btcOperator.convert.wif(flowif, bitjs.priv);
    let floAddress = floCrypto.getFloID(floprivateKey);

    if (!floAddress) {
      throw new Error("No working FLO address generation method found");
    }

    return {
      address: floAddress,
      privateKey: floprivateKey, // Returns the format that actually works
    };
  } catch (error) {
    console.warn("FLO generation not available:", error.message);
    return null;
  }
}
function generateBTCFromPrivateKey(privateKey) {
  try {
    if (typeof btcOperator === "undefined") {
      throw new Error("btcOperator library not available");
    }

    // Convert private key to WIF format if it's hex
    let wifKey = privateKey;
    if (/^[0-9a-fA-F]{64}$/.test(privateKey)) {
      wifKey = coinjs.privkey2wif(privateKey);
    }
    let btcPrivateKey = btcOperator.convert.wif(wifKey);
    let btcAddress;
    btcAddress = btcOperator.bech32Address(wifKey);

    return {
      address: btcAddress,
      privateKey: btcPrivateKey,
    };
  } catch (error) {
    console.warn("BTC generation error:", error.message);
    return null;
  }
}

async function generateTronWallet() {
  const fullNode = "https://api.trongrid.io";
  const solidityNode = "https://api.trongrid.io";
  const eventServer = "https://api.trongrid.io";

  const tronWeb = new TronWeb(
    fullNode,
    solidityNode,
    eventServer,
    getRandomPrivateKey()
  );

  const wallet = await tronWeb.createAccount();
  return {
    address: wallet.address.base58,
    privateKey: wallet.privateKey,
  };
}
window.generateTronWallet = generateTronWallet;
window.generateBTCFromPrivateKey = generateBTCFromPrivateKey;
window.generateFLOFromPrivateKey = generateFLOFromPrivateKey;
window.getRandomPrivateKey = getRandomPrivateKey;
