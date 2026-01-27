(function (EXPORTS) {
  "use strict";
  const ltcBlockchainAPI = EXPORTS;

  const DEFAULT = {
    // Fee rate in satoshis per byte (10 sat/byte is safe for Litecoin)
    feeRateSatPerByte: 10,
    // Fallback fixed fee in LTC (only used if calculation fails)
    fallbackFee: 0.00001,
  };

  /**
   * Calculate transaction fee based on number of inputs and outputs
   * Formula: (10 + inputs*148 + outputs*34) * satPerByte
   * @param {number} numInputs - Number of transaction inputs
   * @param {number} numOutputs - Number of transaction outputs
   * @param {number} satPerByte - Fee rate in satoshis per byte (default 10)
   * @returns {number} Fee in LTC
   */
  function calculateFee(numInputs, numOutputs, satPerByte = DEFAULT.feeRateSatPerByte) {
    // P2PKH transaction size estimation:
    // - Overhead: ~10 bytes
    // - Per input: ~148 bytes (for compressed pubkey signatures)
    // - Per output: ~34 bytes
    const estimatedSize = 10 + (numInputs * 148) + (numOutputs * 34);
    const feeInSatoshis = estimatedSize * satPerByte;
    const feeInLTC = feeInSatoshis / 100000000;
    console.log(`Estimated tx size: ${estimatedSize} bytes, Fee: ${feeInLTC.toFixed(8)} LTC (${feeInSatoshis} satoshis)`);
    return feeInLTC;
  }

  //Get balance for the given Address
  ltcBlockchainAPI.getBalance = function (addr) {
    return new Promise((resolve, reject) => {
      fetch(
        `https://go.getblock.io/cfa5c9eb49c944a7aa4856e4e9a516a2/api/address/${addr}`
      )
        .then((response) => {
          if (!response.ok)
            throw new Error(`HTTP error! Status: ${response.status}`);
          return response.json();
        })
        .then((data) => {
          console.log("Balance data:", data);
          if (data && typeof data.balance !== "undefined")
            resolve(parseFloat(data.balance));
          else reject("Balance not found in response");
        })
        .catch((error) => reject(error));
    });
  };

  // Helper function to get UTXOs for an address
  const getUTXOs = async (addr) => {
    const url = `https://go.getblock.io/cfa5c9eb49c944a7aa4856e4e9a516a2/api/address/${addr}?details=txs`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.txs) throw new Error("No transactions found for address");

    const utxos = [];
    data.txs.forEach((tx) => {
      tx.vout.forEach((vout) => {
        const addresses =
          vout.addresses ||
          (vout.scriptPubKey ? vout.scriptPubKey.addresses : []);
        if (
          !vout.spent &&
          vout.scriptPubKey &&
          vout.scriptPubKey.hex &&
          addresses &&
          addresses.some((a) => a.toLowerCase() === addr.toLowerCase())
        ) {
          console.log("Found UTXO:", {
            txid: tx.txid,
            vout: vout.n,
            value: parseFloat(vout.value),
          });

          utxos.push({
            txid: tx.txid,
            vout: vout.n,
            value: parseFloat(vout.value),
            scriptPubKey: vout.scriptPubKey.hex,
          });
        }
      });
    });
    return utxos;
  };

  function toLTC(val) {
    if (typeof val === "string" && val.includes("LTC")) {
      return parseFloat(val.replace("LTC", "").trim());
    }

    const num = parseFloat(val || "0");

    return isNaN(num) ? 0 : num;
  }

  /**
   * Get transaction history for a Litecoin address
   * @param {string} address - The Litecoin address to check
   * @param {Object} options - Optional parameters
   * @param {number} options.limit - Number of transactions to retrieve (default: 10)
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise} Promise object that resolves with transaction list
   */
  ltcBlockchainAPI.getLtcTransactions = function (address, options = {}) {
    return new Promise((resolve, reject) => {
      console.log(`Fetching transaction history for: ${address}`);
      fetch(
        `https://go.getblock.io/cfa5c9eb49c944a7aa4856e4e9a516a2/api/address/${address}?details=txs`
      )
        .then((response) => {
          if (!response.ok) {
            if (response.status === 429) {
              throw new Error(
                "API rate limit exceeded. Please try again later."
              );
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then(async (data) => {
          console.log("Raw API response data:", data);
          const txs = data.txs || [];
          const txids = txs.map((tx) => tx.txid) || [];
          console.log(
            `Found ${txids.length} transactions for address ${address}`
          );
          const limit = options.limit || 10;
          const offset = options.offset || 0;

          const maxTxToProcess = Math.min(10, limit);
          const txsToProcess = txs.slice(offset, offset + maxTxToProcess);

          if (txsToProcess.length === 0) {
            console.log("No transactions to process based on offset/limit");
            resolve({
              transactions: [],
              total: txs.length,
              offset: offset,
              limit: limit,
            });
            return;
          }

          console.log(`Processing ${txsToProcess.length} transactions`);

          const transactions = txsToProcess;
          console.log("Transactions to process:", transactions);

          try {
            const processedTransactions = transactions.map((tx) => {
              const inputs = tx.vin || [];
              const outputs = tx.vout || [];

              // Check if address is sender (in vin)
              const isSender = inputs.some((i) =>
                i.addresses?.includes(address)
              );

              // Check if address is receiver (in vout)
              const isReceiver = outputs.some(
                (o) =>
                  (o.addresses && o.addresses.includes(address)) ||
                  (o.scriptPubKey?.addresses &&
                    o.scriptPubKey.addresses.includes(address))
              );

              let type = "unknown";
              let value = 0;
              let fromAddresses = [];
              let toAddresses = [];

              // Extract sender addresses (from)
              inputs.forEach((input) => {
                if (input.addresses && input.addresses.length > 0) {
                  input.addresses.forEach((addr) => {
                    if (!fromAddresses.includes(addr)) {
                      fromAddresses.push(addr);
                    }
                  });
                }
              });

              // Extract recipient addresses (to)
              outputs.forEach((output) => {
                const outAddresses =
                  output.addresses ||
                  (output.scriptPubKey ? output.scriptPubKey.addresses : []);

                if (outAddresses && outAddresses.length > 0) {
                  outAddresses.forEach((addr) => {
                    if (!toAddresses.includes(addr)) {
                      toAddresses.push(addr);
                    }
                  });
                }
              });

              if (isSender && isReceiver) {
                type = "self";

                const totalInput = inputs
                  .filter((i) => i.addresses?.includes(address))
                  .reduce((sum, i) => sum + toLTC(i.value), 0);

                const totalOutput = outputs
                  .filter(
                    (o) =>
                      (o.addresses && o.addresses.includes(address)) ||
                      (o.scriptPubKey?.addresses &&
                        o.scriptPubKey.addresses.includes(address))
                  )
                  .reduce((sum, o) => sum + toLTC(o.value), 0);

                value = totalOutput - totalInput;
              } else if (isSender) {
                type = "sent";

                const totalInput = inputs
                  .filter((i) => i.addresses?.includes(address))
                  .reduce((sum, i) => sum + toLTC(i.value), 0);

                const changeBack = outputs
                  .filter(
                    (o) =>
                      (o.addresses && o.addresses.includes(address)) ||
                      (o.scriptPubKey?.addresses &&
                        o.scriptPubKey.addresses.includes(address))
                  )
                  .reduce((sum, o) => sum + toLTC(o.value), 0);

                value = -(totalInput - changeBack);
              } else if (isReceiver) {
                type = "received";

                value = outputs
                  .filter(
                    (o) =>
                      (o.addresses && o.addresses.includes(address)) ||
                      (o.scriptPubKey?.addresses &&
                        o.scriptPubKey.addresses.includes(address))
                  )
                  .reduce((sum, o) => sum + toLTC(o.value), 0);
              }

              console.log(`Transaction ${tx.txid} time data:`, {
                blockTime: tx.blocktime,
                blockheight: tx.blockheight,
                time: tx.time,
              });

              const timestamp =
                tx.time ||
                tx.blockTime ||
                (tx.confirmations
                  ? Math.floor(Date.now() / 1000) - tx.confirmations * 600
                  : Math.floor(Date.now() / 1000));

              return {
                txid: tx.txid,
                type,
                value: value.toFixed(8),
                time: timestamp,
                blockHeight: tx.blockheight,
                formattedTime: new Date(timestamp * 1000).toLocaleString(),
                confirmations: tx.confirmations || 0,
                rawTx: tx.hex,
                fromAddresses: fromAddresses,
                toAddresses: toAddresses,
              };
            });

            if (processedTransactions.length > 0) {
              console.log(
                "Sample transaction processed:",
                processedTransactions[0]
              );

              console.log("Raw transaction data:", transactions[0]);
            } else {
              console.log("No transactions were processed successfully");
              console.log("Original txids found:", txids);
            }
            resolve({
              transactions: processedTransactions,
              total: txids.length,
              offset: offset,
              limit: limit,
            });
          } catch (error) {
            console.error("Error processing transactions:", error);
            reject(error);
          }
        })
        .catch((error) => {
          console.error("API Error:", error);
          reject(error);
        });
    });
  };

  /**
   * Send Litecoin transaction using client-side signing with bitjs library
   * Transaction is constructed and signed locally, then broadcast via RPC
   * @param {string} senderAddr - Sender's Litecoin address
   * @param {string} receiverAddr - Receiver's Litecoin address
   * @param {number} sendAmt - Amount to send in LTC
   * @param {string} privKey - Private key of the sender (WIF format)
   * @returns {Promise} Promise that resolves with the transaction ID
   */
  ltcBlockchainAPI.sendLitecoinRPC = function (
    senderAddr,
    receiverAddr,
    sendAmt,
    privKey
  ) {
    return new Promise((resolve, reject) => {
      if (!ltcCrypto.validateLtcID(senderAddr, true))
        return reject(`Invalid sender address: ${senderAddr}`);
      if (!ltcCrypto.validateLtcID(receiverAddr))
        return reject(`Invalid receiver address: ${receiverAddr}`);
      if (typeof sendAmt !== "number" || sendAmt <= 0)
        return reject(`Invalid send amount: ${sendAmt}`);

      // Minimum amount to avoid dust errors (GetBlock requires ~10000 satoshis minimum)
      const MIN_SEND_AMOUNT = 0.0001; // 10000 satoshis
      if (sendAmt < MIN_SEND_AMOUNT)
        return reject(`Amount too small. Minimum is ${MIN_SEND_AMOUNT} LTC to avoid dust rejection.`);
      if (privKey.length < 1 || !ltcCrypto.verifyPrivKey(privKey, senderAddr))
        return reject("Invalid Private key!");

      const apiToken = "31ea37c3a0c44b368e879007af7a64c8";
      const rpcEndpoint = `https://go.getblock.io/${apiToken}/`;

      async function rpc(method, params = []) {
        const res = await fetch(rpcEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: "1", method, params }),
        });
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (data.error) {
            // Extract meaningful error message from RPC response
            const errMsg = data.error.message || JSON.stringify(data.error);
            throw new Error(`RPC Error: ${errMsg}`);
          }
          return data.result;
        } catch (err) {
          // Re-throw if it's already our formatted error
          if (err.message.startsWith("RPC Error:")) throw err;
          console.error("Raw RPC response:\n", text);
          throw new Error("Failed to parse JSON-RPC response");
        }
      }

      // Get UTXOs for the address
      getUTXOs(senderAddr)
        .then(async (utxos) => {
          if (utxos.length === 0) return reject("No valid UTXOs found");
          console.log("Found UTXOs:", utxos);

          const utxoTotal = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
          console.log("Total UTXO value:", utxoTotal);

          // Calculate fee based on transaction size
          // Inputs = number of UTXOs, Outputs = 2 (receiver + change)
          const numInputs = utxos.length;
          const numOutputs = 2; // receiver + change output
          const fee = calculateFee(numInputs, numOutputs);
          console.log(`Dynamic fee calculated: ${fee.toFixed(8)} LTC for ${numInputs} inputs, ${numOutputs} outputs`);

          if (utxoTotal < sendAmt + fee)
            return reject(
              `Insufficient funds: ${utxoTotal.toFixed(8)} LTC < ${(sendAmt + fee).toFixed(8)} LTC (${sendAmt} + ${fee.toFixed(8)} fee)`
            );

          // Calculate change amount
          const change = utxoTotal - sendAmt - fee;

          try {
            // Save original bitjs settings and set Litecoin version bytes
            const origPub = bitjs.pub;
            const origPriv = bitjs.priv;
            const origCompressed = bitjs.compressed;

            // Litecoin mainnet version bytes
            bitjs.pub = 0x30;      // Litecoin P2PKH address prefix
            bitjs.priv = 0xb0;     // Litecoin WIF prefix
            bitjs.compressed = true;

            // Create transaction using bitjs
            console.log("Creating transaction with bitjs...");
            const tx = bitjs.transaction();

            // Add all UTXOs as inputs
            for (const utxo of utxos) {
              tx.addinput(utxo.txid, utxo.vout, utxo.scriptPubKey);
              console.log(`Added input: ${utxo.txid}:${utxo.vout}`);
            }

            // Add outputs: receiver first, then change back to sender
            tx.addoutput(receiverAddr, sendAmt);
            console.log(`Added output to receiver: ${receiverAddr} = ${sendAmt} LTC`);

            if (change > 0.00000546) {  // Only add change if above dust threshold
              tx.addoutput(senderAddr, change);
              console.log(`Added change output: ${senderAddr} = ${change} LTC`);
            }

            // Sign the transaction with private key
            console.log("Signing transaction locally...");
            const signedTxHex = tx.sign(privKey);
            console.log("Signed transaction hex:", signedTxHex);

            // Restore original bitjs settings
            bitjs.pub = origPub;
            bitjs.priv = origPriv;
            bitjs.compressed = origCompressed;

            // Broadcast the signed transaction
            console.log("Broadcasting transaction...");
            const txid = await rpc("sendrawtransaction", [signedTxHex]);
            console.log("Transaction broadcast successful! TXID:", txid);

            resolve(txid);
          } catch (error) {
            console.error("Transaction error:", error);
            reject(error);
          }
        })
        .catch((error) => reject(error));
    });
  };
  /**
   * Get transaction details by transaction ID
   * @param {string} txid - The transaction ID to look up
   * @returns {Promise} Promise object that resolves with transaction details
   */
  ltcBlockchainAPI.getTransactionDetails = function (txid) {
    return new Promise((resolve, reject) => {
      if (!txid || typeof txid !== "string" || txid.length !== 64) {
        reject(new Error("Invalid transaction ID format"));
        return;
      }

      console.log(`Fetching transaction details for txid: ${txid}`);

      fetch(
        `https://go.getblock.io/cfa5c9eb49c944a7aa4856e4e9a516a2/api/tx/${txid}`
      )
        .then((response) => {
          if (!response.ok) {
            if (response.status === 404) {
              throw new Error("Transaction not found");
            } else if (response.status === 429) {
              throw new Error(
                "API rate limit exceeded. Please try again later."
              );
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          console.log("Transaction details data:", data);

          if (!data || !data.txid) {
            throw new Error("Invalid transaction data returned");
          }

          const processedData = {
            txid: data.txid,
            blockHeight: data.blockheight,
            blockHash: data.blockhash,
            blockTime: data.blocktime
              ? new Date(data.blocktime * 1000).toLocaleString()
              : "Pending",
            confirmations: data.confirmations || 0,
            fees: data.fees,
            size: data.hex.length / 2, // Size in bytes
            inputsCount: data.vin ? data.vin.length : 0,
            outputsCount: data.vout ? data.vout.length : 0,
            totalInput: 0,
            totalOutput: 0,
            inputs: [],
            outputs: [],
          };

          // Process inputs
          if (data.vin && Array.isArray(data.vin)) {
            data.vin.forEach((input) => {
              const inputValue = parseFloat(input.value || 0);
              processedData.totalInput += inputValue;

              const inputData = {
                txid: input.txid,
                vout: input.vout,
                addresses: input.addresses || [],
                value: inputValue,
              };

              processedData.inputs.push(inputData);
            });
          }

          // Process outputs
          if (data.vout && Array.isArray(data.vout)) {
            data.vout.forEach((output) => {
              const outputValue = parseFloat(output.value || 0);
              processedData.totalOutput += outputValue;

              const addresses =
                output.scriptPubKey && output.scriptPubKey.addresses
                  ? output.scriptPubKey.addresses
                  : [];

              const outputData = {
                n: output.n,
                addresses: addresses,
                value: outputValue,
                spent: output.spent || false,
                scriptPubKey: output.scriptPubKey
                  ? output.scriptPubKey.hex
                  : "",
              };

              processedData.outputs.push(outputData);
            });
          }

          resolve(processedData);
        })
        .catch((error) => {
          console.error("Error fetching transaction details:", error);
          reject(error);
        });
    });
  };
})(
  "object" === typeof module ? module.exports : (window.ltcBlockchainAPI = {})
);
