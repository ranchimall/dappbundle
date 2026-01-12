(function (EXPORTS) {
  "use strict";
  const tonBlockchainAPI = EXPORTS;

  const API = "https://toncenter.com/api/v2";
  const API_KEY =
    "62bbf0ea18f197520db44c23d961a4213f373c4c08bf5cb818b722b85192ca63";
  const USDT_MASTER = "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs";

  const addrCache = new Map();

  // TonWeb initialization
  let tonweb;
  if (typeof TonWeb !== "undefined") {
    tonweb = new TonWeb(
      new TonWeb.HttpProvider("https://toncenter.com/api/v2/jsonRPC"),
      {
        headers: {
          "X-API-Key": API_KEY,
        },
      }
    );
  }

  /**
   * Get TON balance for the given address
   * @param {string} address - The TON address to check
   * @returns {Promise} Promise object that resolves with balance in TON
   */
  tonBlockchainAPI.getTonBalance = function (address) {
    return new Promise((resolve, reject) => {
      fetch(`${API}/getAddressInformation?address=${address}`, {
        headers: { "X-API-Key": API_KEY },
      })
        .then((response) => {
          if (!response.ok)
            throw new Error(`HTTP error! Status: ${response.status}`);
          return response.json();
        })
        .then((data) => {
          const balance = (data?.result?.balance || 0) / 1e9;
          resolve(balance);
        })
        .catch((error) => {
          console.error("TON balance error:", error);
          resolve(0);
        });
    });
  };

  /**
   * Get USDT jetton balance for the given address
   * @param {string} ownerAddress - The TON address to check for USDT balance
   * @returns {Promise} Promise object that resolves with USDT balance
   */
  tonBlockchainAPI.getUsdtBalance = function (ownerAddress) {
    return new Promise((resolve, reject) => {
      console.log("Getting USDT balance for:", ownerAddress);

      fetch(`https://tonapi.io/v2/accounts/${ownerAddress}/jettons`)
        .then((response) => {
          if (!response.ok) throw new Error(`TonAPI error: ${response.status}`);
          return response.json();
        })
        .then((data) => {
          console.log("TonAPI jettons response:", data);

          const usdtJetton = data.balances?.find(
            (jetton) =>
              jetton.jetton?.address === USDT_MASTER ||
              jetton.jetton?.symbol === "USDT" ||
              jetton.jetton?.name?.includes("Tether")
          );

          if (usdtJetton) {
            const balance = parseInt(usdtJetton.balance) / 1e6;
            console.log("USDT balance found:", balance);
            resolve(balance);
          } else {
            console.log("No USDT balance found");
            resolve(0);
          }
        })
        .catch((error) => {
          console.error("USDT balance error:", error);
          resolve(0);
        });
    });
  };

  // Rate limiting for API calls
  let requestQueue = [];
  let isProcessingQueue = false;
  const REQUEST_DELAY = 300;
  let conversionEnabled = true;

  /**
   * Process request queue with rate limiting
   */
  function processRequestQueue() {
    if (isProcessingQueue || requestQueue.length === 0) return;

    isProcessingQueue = true;

    const processNext = () => {
      if (requestQueue.length === 0) {
        isProcessingQueue = false;
        return;
      }

      const { rawAddr, resolve } = requestQueue.shift();

      // Check cache first
      if (addrCache.has(rawAddr)) {
        resolve(addrCache.get(rawAddr));
        setTimeout(processNext, 50);
        return;
      }

      fetch(
        `https://toncenter.com/api/v2/detectAddress?address=${encodeURIComponent(
          rawAddr
        )}`,
        {
          headers: { "X-API-Key": API_KEY },
        }
      )
        .then((response) => {
          if (!response.ok) {
            if (response.status === 429) {
              if (rawAddr.includes(":retry:")) {
                console.warn(
                  "Rate limit exceeded, using original address:",
                  rawAddr.replace(":retry:", "")
                );
                const originalAddr = rawAddr.replace(":retry:", "");
                resolve(originalAddr);
                setTimeout(processNext, REQUEST_DELAY);
                return;
              }

              requestQueue.push({ rawAddr: rawAddr + ":retry:", resolve });
              setTimeout(processNext, 2000);
              return;
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          if (data) {
            const friendly =
              data?.result?.bounceable?.b64url ||
              rawAddr.replace(":retry:", "");
            const cleanAddr = rawAddr.replace(":retry:", "");
            addrCache.set(cleanAddr, friendly);
            resolve(friendly);
          } else {
            resolve(rawAddr.replace(":retry:", ""));
          }
          setTimeout(processNext, REQUEST_DELAY);
        })
        .catch((error) => {
          console.warn("Address conversion failed:", error);
          resolve(rawAddr.replace(":retry:", "")); // Fallback to original address
          setTimeout(processNext, REQUEST_DELAY);
        });
    };

    processNext();
  }

  /**
   * Convert address to b64 format with rate limiting
   * @param {string} rawAddr - The address to convert (raw, EQ, UQ formats)
   * @returns {Promise} Promise object that resolves with user-friendly address
   */
  tonBlockchainAPI.convertTob64 = function (rawAddr) {
    return new Promise((resolve) => {
      // if it doesn't look like an address, return as-is
      if (!rawAddr || typeof rawAddr !== "string" || rawAddr === "Unknown") {
        resolve(rawAddr);
        return;
      }

      // If conversion is disabled, return original address
      if (!conversionEnabled) {
        resolve(rawAddr);
        return;
      }

      const isRawAddress =
        rawAddr.includes(":") && rawAddr.match(/^-?\d+:[a-fA-F0-9]{64}$/);

      const isFriendlyAddress = rawAddr.match(/^[EUk]Q[A-Za-z0-9_-]{46}$/);

      if (!isRawAddress && !isFriendlyAddress) {
        resolve(rawAddr);
        return;
      }

      // Check cache first
      if (addrCache.has(rawAddr)) {
        resolve(addrCache.get(rawAddr));
        return;
      }

      // Add to queue for conversion (works for both raw and friendly addresses)
      requestQueue.push({ rawAddr, resolve });
      processRequestQueue();
    });
  };

  /**
   * Enable or disable address conversion
   * @param {boolean} enabled - Whether to enable address conversion
   */
  tonBlockchainAPI.setConversionEnabled = function (enabled) {
    conversionEnabled = enabled;
  };

  /**
   * Fetch transaction history for an address
   * @param {string} address - The TON address to check
   * @param {Object} options - Optional parameters
   * @param {number} options.limit - Number of transactions to retrieve (default: 100)
   * @param {string} options.beforeLt - Last transaction LT for pagination
   * @returns {Promise} Promise object that resolves with transaction data
   */
  tonBlockchainAPI.fetchTransactions = function (address, options = {}) {
    return new Promise((resolve, reject) => {
      const limit = options.limit || 100;
      const beforeLt = options.beforeLt || null;

      const url = `https://tonapi.io/v2/blockchain/accounts/${address}/transactions?limit=${limit}${
        beforeLt ? "&before_lt=" + beforeLt : ""
      }`;

      console.log(`Fetching transactions for: ${address}`);

      fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error(`API Error ${response.status}`);
          return response.json();
        })
        .then((data) => {
          const transactions = data.transactions || [];
          resolve({
            transactions,
            hasMore: transactions.length === limit,
            nextBeforeLt:
              transactions.length > 0
                ? transactions[transactions.length - 1].lt
                : null,
          });
        })
        .catch((error) => {
          console.error("Error fetching transactions:", error);
          reject(error);
        });
    });
  };

  /**
   * Get  balance for an address
   * @param {string} address - The TON address to check
   * @returns {Promise} Promise object that resolves with balance in TON
   */
  tonBlockchainAPI.getMainnetBalance = function (address) {
    return new Promise((resolve, reject) => {
      fetch(
        `https://toncenter.com/api/v2/getAddressBalance?address=${address}`,
        {
          headers: { "X-API-Key": API_KEY },
        }
      )
        .then((response) => {
          if (!response.ok)
            throw new Error(`HTTP error! Status: ${response.status}`);
          return response.json();
        })
        .then((data) => {
          const balance = parseFloat(data.result) / 1e9;
          resolve(balance);
        })
        .catch((error) => {
          console.error("Balance check error:", error);
          resolve(0);
        });
    });
  };

  tonBlockchainAPI.getUQAddress = function (address) {
    return new Promise((resolve, reject) => {
      try {
        if (!address || typeof address !== "string") {
          resolve(address);
          return;
        }

        const isValidTonAddress = address.match(/^[EUk]Q[A-Za-z0-9_-]{46}$/);
        if (!isValidTonAddress) {
          resolve(address);
          return;
        }

        
        if (address.startsWith("UQ")) {
          resolve(address);
          return;
        }

        
        fetch(
          `https://toncenter.com/api/v2/detectAddress?address=${encodeURIComponent(
            address
          )}`,
          {
            headers: { "X-API-Key": API_KEY },
          }
        )
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            if (data && data.result) {
              
              const uqAddress =
                data.result.non_bounceable?.b64url ||
                data.result.non_bounceable?.b64 ||
                address;
              resolve(uqAddress);
            } else {
              resolve(address);
            }
          })
          .catch((error) => {
            console.warn("Failed to convert address using API:", error);
            resolve(address);
          });
      } catch (error) {
        console.error("Error in getUQAddress:", error);
        resolve(address);
      }
    });
  };

  /**
   * Create wallet from private key
   * @param {string} privHex - Private key in hexadecimal format
   * @returns {Promise} Promise object that resolves with wallet, address, and keyPair
   */
  tonBlockchainAPI.getSenderWallet = function (privHex) {
    return new Promise((resolve, reject) => {
      if (!tonweb) {
        reject(new Error("TonWeb not initialized"));
        return;
      }

      try {
        const seed = TonWeb.utils.hexToBytes(privHex.slice(0, 64));
        const keyPair = TonWeb.utils.keyPairFromSeed(seed.slice(0, 32));

        // v4R2 wallet
        const WalletClass = tonweb.wallet.all.v4R2;
        const wallet = new WalletClass(tonweb.provider, {
          publicKey: keyPair.publicKey,
        });

        wallet
          .getAddress()
          .then((address) => {
            resolve({ wallet, address, keyPair });
          })
          .catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  };

  /**
   * Send TON transaction
   * @param {string} privHex - Private key in hexadecimal format
   * @param {string} toAddress - Recipient's TON address
   * @param {string|number} amount - Amount to send in TON
   * @returns {Promise} Promise object that resolves with wallet, seqno, and sender address
   */
  tonBlockchainAPI.sendTonTransaction = function (privHex, toAddress, amount) {
    return new Promise(async (resolve, reject) => {
      try {
        const { wallet, address, keyPair } =
          await tonBlockchainAPI.getSenderWallet(privHex);
        const seqno = await wallet.methods.seqno().call();
        const senderAddr = address.toString(true, true, true);
        toAddress=await tonBlockchainAPI.getUQAddress(toAddress);
        
        console.log(
          `Sending ${amount} TON from ${senderAddr} to ${toAddress}, seqno: ${seqno}`
        );
        await wallet.methods
          .transfer({
            secretKey: keyPair.secretKey,
            toAddress: toAddress,
            amount: TonWeb.utils.toNano(amount),
            seqno: seqno || 0,
            payload: null,
            sendMode: 3,
          })
          .send();

        resolve({ wallet, seqno, senderAddr });
      } catch (error) {
        reject(error);
      }
    });
  };

  /**
   * Wait for transaction confirmation and get hash
   * @param {Object} wallet - The TON wallet object
   * @param {number} originalSeqno - The original sequence number before transaction
   * @param {string} senderAddr - The sender's address
   * @returns {Promise} Promise object that resolves with transaction hash and explorer URL
   */
  tonBlockchainAPI.waitForTransactionConfirmation = function (
    wallet,
    originalSeqno,
    senderAddr
  ) {
    return new Promise(async (resolve, reject) => {
      try {
        let seqAfter = originalSeqno;
        for (let i = 0; i < 30; i++) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          seqAfter = await wallet.methods.seqno().call();
          if (Number(seqAfter) > Number(originalSeqno)) break;
        }

        if (seqAfter === originalSeqno) {
          reject(
            new Error(
              "Seqno not increased — transaction might not be confirmed yet."
            )
          );
          return;
        }

        // Wait and fetch transaction hash
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const txRes = await fetch(
          `https://toncenter.com/api/v2/getTransactions?address=${senderAddr}&limit=5`,
          {
            headers: { "X-API-Key": API_KEY },
          }
        );
        const txData = await txRes.json();
        const txs = txData.result || [];

        if (txs.length === 0) {
          reject(new Error("No transactions found."));
          return;
        }

        const latestTx = txs[0];
        const hash = latestTx.transaction_id?.hash || "Unknown";
        const urlHash = hash.replace(/\+/g, "-").replace(/\//g, "_");

        resolve({
          urlHash,
          explorerUrl: `https://tonviewer.com/transaction/${urlHash}`,
        });
      } catch (error) {
        reject(error);
      }
    });
  };
})(
  "object" === typeof module ? module.exports : (window.tonBlockchainAPI = {})
);
