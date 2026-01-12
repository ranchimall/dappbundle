import * as CardanoWasm from '@emurgo/cardano-serialization-lib-browser';
import * as CardanoLib from 'cardano-crypto.js';


class CardanoAPI {
  constructor(cardanoscanApiKey = null) {
    // GetBlock Ogmios JSON-RPC endpoint (for UTXOs and transactions only)
    this.rpcUrl = "https://go.getblock.io/9260a43da7164b6fa58ac6a54fee2d21";
    
    // CardanoScan API configuration
    this.cardanoscanApiKey = cardanoscanApiKey;
    this.cardanoscanBaseUrl = "https://api.cardanoscan.io/api/v1";
    this.useCardanoScan = !!cardanoscanApiKey;
  }

  /**
   * Convert Bech32 address to full hex bytes
   * CardanoScan expects the FULL address bytes (including network tag),
   * not just the payment credential hash
   * @param {string} address - Bech32 address (addr1...)
   * @returns {string} Full address in hex format (e.g., 0193a4ef...)
   */
  addressToHex(address) {
    try {
      const CSL = CardanoWasm;
      const addr = CSL.Address.from_bech32(address);
      
      // Return the full address bytes as hex
      // This includes the network tag (01 for mainnet base address) 
      // plus payment credential and staking credential
      const addressBytes = addr.to_bytes();
      const hexAddress = Buffer.from(addressBytes).toString('hex');
      
      return hexAddress;
    } catch (error) {
      console.error('[CardanoAPI] Error converting address to hex:', error);
      // If conversion fails, return the address as-is
      return address;
    }
  }

  /**
   * Convert Hex address to Bech32
   * @param {string} hexAddress
   * @returns {string} Bech32 address
   */
  hexToAddress(hexAddress) {
    try {
      if (hexAddress.startsWith('addr')) return hexAddress;
      
      const CSL = CardanoWasm;
      const bytes = Buffer.from(hexAddress, 'hex');
      const addr = CSL.Address.from_bytes(bytes);
      return addr.to_bech32();
    } catch (error) {
      return hexAddress;
    }
  }

  /**
   * Call CardanoScan API
   * @param {string} endpoint - API endpoint (e.g., '/address/balance')
   * @param {object} params - Query parameters
   */
  async callCardanoScan(endpoint, params = {}) {
    if (!this.cardanoscanApiKey) {
      throw new Error("CardanoScan API key not configured");
    }

    const url = new URL(this.cardanoscanBaseUrl + endpoint);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "apiKey": this.cardanoscanApiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`CardanoScan API Error: ${data.error}`);
      }
      
      return data;
    } catch (error) {
      console.error(`[CardanoScan] Error calling ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Generic JSON-RPC call to Ogmios
   * @param {string} method - RPC method name
   * @param {object} params - RPC parameters
   */
  async callRpc(method, params = null) {
    const payload = {
      jsonrpc: "2.0",
      method: method,
      id: Date.now(),
    };
    if (params !== null && params !== undefined && Object.keys(params).length > 0) {
      payload.params = params;
    }

    try {
      const response = await fetch(this.rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[CardanoAPI] HTTP ${response.status} response:`, errorText);
        throw new Error(`HTTP Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      if (data.error) {
        console.error(`[CardanoAPI] RPC Error:`, data.error);
        throw new Error(`RPC Error: ${JSON.stringify(data.error)}`);
      }

      return data.result;
    } catch (error) {
      console.error(`[CardanoAPI] Error calling ${method}:`, error);
      throw error;
    }
  }

  /**
   * Get balance for an address (in Lovelace)
   * Uses CardanoScan API exclusively
   */
  async getBalance(address) {
    if (!this.useCardanoScan) {
      throw new Error("CardanoScan API key not configured");
    }

    // Convert to hex to support all address types (Base, Enterprise, etc.)
    const hexAddress = this.addressToHex(address);

    const result = await this.callCardanoScan('/address/balance', { address: hexAddress });
    return result.balance || "0";
  }

  /**
   * Get transaction history for an address
   * Uses CardanoScan API exclusively
   * @param {string} address - Cardano address (Bech32 format)
   * @param {number} pageNo - Page number (default: 1)
   * @param {number} limit - Results per page (default: 20, max: 50)
   * @param {string} order - Sort order: 'asc' or 'desc' (default: 'desc')
   */
  async getHistory(address, pageNo = 1, limit = 20, order = 'desc') {
    if (!this.useCardanoScan) {
      throw new Error("CardanoScan API key not configured");
    }
    
    // Convert address to hex for transaction list endpoint
    const hexAddress = this.addressToHex(address);
    
    const result = await this.callCardanoScan('/transaction/list', { 
      address: hexAddress, 
      pageNo, 
      limit, 
      order 
    });
    
    // Transform CardanoScan response to our format
    const transactions = result.transactions || [];
    return transactions.map(tx => ({
      txHash: tx.hash,
      blockHash: tx.blockHash,
      fees: tx.fees,
      slot: tx.slot,
      epoch: tx.epoch,
      blockHeight: tx.blockHeight,
      absSlot: tx.absSlot,
      timestamp: tx.timestamp,
      index: tx.index,
      inputs: tx.inputs || [],
      outputs: tx.outputs || [],
      netAmount: this.calculateNetAmount(tx, address)
    }));
  }

  /**
   * Get transaction details by hash with status (confirmed/pending/failed)
   * Uses CardanoScan API exclusively with fallback for pending detection
   * @param {string} hash - Transaction hash
   * @returns {object} Transaction details with status
   */
  async getTransaction(hash) {
    if (!this.useCardanoScan) {
      throw new Error("CardanoScan API key not configured");
    }
    
    try {
      // Try to get transaction from CardanoScan (confirmed transactions)
      const result = await this.callCardanoScan('/transaction', { hash });
      
      // If we get here, transaction is confirmed on-chain
      return {
        ...result,
        status: 'confirmed',
        statusLabel: 'Confirmed',
        statusColor: '#28a745' 
      };
    } catch (error) {
      console.log(`[CardanoAPI] Transaction ${hash} not found in CardanoScan, checking status...`);
      
  
      
      return {
        hash: hash,
        status: 'pending',
        statusLabel: 'Pending or Failed',
        statusColor: '#ffc107', // warning
        message: 'Transaction not yet confirmed on-chain. It may still be pending in the mempool, or it may have failed/expired. Please check again in a few minutes.',
        timestamp: null,
        blockHeight: null,
        inputs: [],
        outputs: [],
        fees: null,
        error: error.message
      };
    }
  }

  /**
   * Calculate net amount for an address in a transaction
   * @param {object} tx - Transaction object from CardanoScan
   * @param {string} address - Address to calculate for (Bech32 format)
   * @returns {string} Net amount (positive for incoming, negative for outgoing)
   */
  calculateNetAmount(tx, address) {
    let totalIn = 0n;
    let totalOut = 0n;

    // Convert address to hex for comparison
    const hexAddress = this.addressToHex(address);

    // Sum inputs from this address
    if (tx.inputs) {
      for (const input of tx.inputs) {
        // Compare both hex and bech32 formats
        if (input.address === address || input.address === hexAddress) {
          totalIn += BigInt(input.value || 0);
        }
      }
    }

    // Sum outputs to this address
    if (tx.outputs) {
      for (const output of tx.outputs) {
        // Compare both hex and bech32 formats
        if (output.address === address || output.address === hexAddress) {
          totalOut += BigInt(output.value || 0);
        }
      }
    }

    const net = totalOut - totalIn;
    return net.toString();
  }

  /**
   * Fetch UTXOs for an address (using Ogmios)
   */
  async getUtxos(address) {
      try {
          const result = await this.callRpc("queryLedgerState/utxo", {
              addresses: [address]
          });
          return this.parseUtxoResult(result);
      } catch (e) {
          console.warn("queryLedgerState/utxo failed, trying 'query' method...", e);
          const result = await this.callRpc("query", {
              query: "utxo",
              arg: { addresses: [address] }
          });
          return this.parseUtxoResult(result);
      }
  }

  parseUtxoResult(result) {
      console.log("Parsing UTXO result:", JSON.stringify(result, null, 2));
      
      const utxos = [];
      
      if (Array.isArray(result)) {
          for (const item of result) {
              // GetBlock/Ogmios direct format
              if (item.transaction && item.transaction.id !== undefined && item.index !== undefined) {
                  utxos.push({
                      txHash: item.transaction.id,
                      index: item.index,
                      value: item.value,
                      address: item.address
                  });
              }
              // Standard Ogmios array of pairs
              else if (Array.isArray(item) && item.length === 2) {
                  const [input, output] = item;
                  utxos.push({
                      txHash: input.txId,
                      index: input.index,
                      value: output.value,
                      address: output.address
                  });
              }
          }
      } else if (typeof result === 'object' && result !== null) {
          //Object with "txId#index" keys
          console.log("Received object result for UTXOs, parsing keys...");
          
          for (const [key, output] of Object.entries(result)) {
              const parts = key.split('#');
              if (parts.length === 2) {
                  const [txHash, indexStr] = parts;
                  const index = parseInt(indexStr, 10);
                  
                  utxos.push({
                      txHash: txHash,
                      index: index,
                      value: output.value,
                      address: output.address
                  });
              }
          }
          
          console.log(`Parsed ${utxos.length} UTXOs from object format`);
      }
      
      console.log("Final parsed UTXOs:", utxos);
      return utxos;
  }

  /**
   * Get protocol parameters from Ogmios
   */
  async getProtocolParameters() {
      try {
          // Try queryLedgerState/protocolParameters first
          try {
              const result = await this.callRpc("queryLedgerState/protocolParameters");
              return result;
          } catch (e) {
              console.warn("queryLedgerState/protocolParameters failed, trying 'query' method...", e);
              // Fallback to 'query' method
              const result = await this.callRpc("query", {
                  query: "protocolParameters"
              });
              return result;
          }
      } catch (e) {
          console.error("Failed to fetch protocol parameters:", e);
          throw new Error("Could not fetch protocol parameters needed for transaction.");
      }
  }

  /**
   * Get current tip (latest block slot) from Ogmios
   * Used for calculating transaction TTL
   */
  async getCurrentSlot() {
      try {
          const tip = await this.callRpc("queryNetwork/tip");
          // Handle different response formats
          if (tip && tip.slot !== undefined) {
              return tip.slot;
          } else if (Array.isArray(tip) && tip.length > 0 && tip[0].slot !== undefined) {
              return tip[0].slot;
          }
          throw new Error("Unable to parse current slot from tip response");
      } catch (error) {
          console.error("[CardanoAPI] Error fetching current slot:", error);
          throw new Error("Failed to fetch current slot for TTL calculation");
      }
  }

  /**
   * Estimate transaction fee by building the transaction without submitting
   * @param {string} senderAddress - Bech32 address
   * @param {string} recipientAddress - Bech32 address  
   * @param {string|BigInt} amountLovelace - Amount in Lovelace
   * @returns {object} Fee estimation details
   */
  async estimateFee(senderAddress, recipientAddress, amountLovelace) {
    try {
      console.log("[CardanoAPI] Estimating transaction fee...");
      
      // Fetch required data
      const [protocolParams, utxos] = await Promise.all([
        this.getProtocolParameters(),
        this.getUtxos(senderAddress)
      ]);

      if (utxos.length === 0) {
        throw new Error("No UTXOs found. Balance is 0.");
      }

      // Calculate total balance
      let totalBalance = 0n;
      for (const utxo of utxos) {
        if (utxo.value?.ada?.lovelace) {
          totalBalance += BigInt(utxo.value.ada.lovelace);
        }
      }

      // Parse protocol parameters
      const minFeeA = protocolParams.minFeeCoefficient || 44;
      const minFeeB = protocolParams.minFeeConstant?.ada?.lovelace || protocolParams.minFeeConstant || 155381;

      // Calculate how many inputs we'll need
      let inputsNeeded = 0;
      let accumulatedInput = 0n;
      const estimatedFeePerInput = 200000n; // Conservative estimate
      const targetAmount = BigInt(amountLovelace) + estimatedFeePerInput;
      
      for (const utxo of utxos) {
        let utxoValue = 0n;
        if (utxo.value?.ada?.lovelace) {
          utxoValue = BigInt(utxo.value.ada.lovelace);
        }
        
        accumulatedInput += utxoValue;
        inputsNeeded++;
        
        if (accumulatedInput >= targetAmount) {
          break;
        }
      }

      // Estimate transaction size based on inputs/outputs
      // Formula: ~150 bytes base + ~150 bytes per input + ~50 bytes per output
      const willHaveChange = (accumulatedInput - BigInt(amountLovelace)) >= 1000000n;
      const outputCount = willHaveChange ? 2 : 1; // recipient + change (if any)
      const estimatedSize = 150 + (inputsNeeded * 150) + (outputCount * 50);
      
      // Calculate fee using Cardano formula: fee = a * size + b
      const estimatedFee = BigInt(minFeeA) * BigInt(estimatedSize) + BigInt(minFeeB);

      // Calculate change
      const change = accumulatedInput - BigInt(amountLovelace) - estimatedFee;

      return {
        success: true,
        fee: estimatedFee.toString(),
        feeAda: (Number(estimatedFee) / 1000000).toFixed(6),
        amount: amountLovelace.toString(),
        amountAda: (Number(amountLovelace) / 1000000).toFixed(6),
        totalCost: (BigInt(amountLovelace) + estimatedFee).toString(),
        totalCostAda: (Number(BigInt(amountLovelace) + estimatedFee) / 1000000).toFixed(6),
        change: change.toString(),
        changeAda: (Number(change) / 1000000).toFixed(6),
        balance: totalBalance.toString(),
        balanceAda: (Number(totalBalance) / 1000000).toFixed(6),
        inputsNeeded,
        outputCount,
        estimatedSize,
        sufficientBalance: totalBalance >= (BigInt(amountLovelace) + estimatedFee)
      };
    } catch (error) {
      console.error("[CardanoAPI] Fee estimation failed:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send ADA 
   * Uses TransactionBuilder for proper fee calculation and change handling
   * @param {string} senderPrivKeyHex - Hex private key (extended or normal)
   * @param {string} senderAddress - Bech32 address
   * @param {string} recipientAddress - Bech32 address
   * @param {string|BigInt} amountLovelace - Amount in Lovelace
   * @returns {object} Transaction submission result with txId
   */
  async sendAda(senderPrivKeyHex, senderAddress, recipientAddress, amountLovelace) {
      console.log("[CardanoAPI] Initiating Send ADA transaction...");
      console.log(`  From: ${senderAddress}`);
      console.log(`  To: ${recipientAddress}`);
      console.log(`  Amount: ${amountLovelace} lovelace`);
      
      const CSL = CardanoWasm;
      if (!CSL) {
          throw new Error("Cardano Serialization Library not loaded.");
      }

      try {
          // Fetch required data in parallel
          console.log("[CardanoAPI] Fetching protocol parameters, UTXOs, and current slot...");
          const [protocolParams, utxos, currentSlot] = await Promise.all([
              this.getProtocolParameters(),
              this.getUtxos(senderAddress),
              this.getCurrentSlot()
          ]);

          if (utxos.length === 0) {
              throw new Error("No UTXOs found. Your balance is 0 or address has no funds.");
          }

          console.log(`[CardanoAPI] Found ${utxos.length} UTXOs, current slot: ${currentSlot}`);
          
          // Calculate total available balance
          let totalBalance = 0n;
          for (const utxo of utxos) {
              if (utxo.value?.ada?.lovelace) {
                  totalBalance += BigInt(utxo.value.ada.lovelace);
              } else if (utxo.value?.lovelace) {
                  totalBalance += BigInt(utxo.value.lovelace);
              } else if (utxo.value?.coins) {
                  totalBalance += BigInt(utxo.value.coins);
              }
          }
          
          console.log(`[CardanoAPI] Total balance: ${totalBalance} lovelace (${(Number(totalBalance) / 1000000).toFixed(2)} ADA)`);
          
          // Estimate fee (conservative estimate: ~0.2 ADA)
          const estimatedFee = 200000n;
          const totalNeeded = BigInt(amountLovelace) + estimatedFee;
          
          console.log(`[CardanoAPI] Amount to send: ${amountLovelace} lovelace (${(Number(amountLovelace) / 1000000).toFixed(2)} ADA)`);
          console.log(`[CardanoAPI] Estimated fee: ${estimatedFee} lovelace (~0.2 ADA)`);
          console.log(`[CardanoAPI] Total needed: ${totalNeeded} lovelace (${(Number(totalNeeded) / 1000000).toFixed(2)} ADA)`);
          
          // Check if balance is sufficient
          if (totalBalance < totalNeeded) {
              const shortfall = totalNeeded - totalBalance;
              throw new Error(
                  `Insufficient balance! ` +
                  `You have ${totalBalance} lovelace (${(Number(totalBalance) / 1000000).toFixed(2)} ADA), ` +
                  `but need ${totalNeeded} lovelace (${(Number(totalNeeded) / 1000000).toFixed(2)} ADA) ` +
                  `for ${amountLovelace} lovelace + ~${estimatedFee} lovelace fee. ` +
                  `You're short by ${shortfall} lovelace (${(Number(shortfall) / 1000000).toFixed(2)} ADA).`
              );
          }
          
          console.log(`[CardanoAPI] ✅ Balance check passed`);

          //Parse protocol parameters (handle nested Ogmios structure)
          const minFeeA = protocolParams.minFeeCoefficient || 44;
          const minFeeB = protocolParams.minFeeConstant?.ada?.lovelace || 
                          protocolParams.minFeeConstant || 155381;
          const maxTxSize = protocolParams.maxTransactionSize?.bytes || 
                           protocolParams.maxTxSize || 16384;
          const utxoCostPerByte = protocolParams.utxoCostPerByte?.ada?.lovelace ||
                                 protocolParams.coinsPerUtxoByte || 4310;
          const poolDeposit = protocolParams.stakePoolDeposit?.ada?.lovelace ||
                             protocolParams.poolDeposit || 500000000;
          const keyDeposit = protocolParams.stakeCredentialDeposit?.ada?.lovelace ||
                            protocolParams.keyDeposit || 2000000;

          console.log("[CardanoAPI] Protocol parameters:", {
              minFeeA,
              minFeeB,
              maxTxSize,
              utxoCostPerByte,
              poolDeposit,
              keyDeposit
          });

          // Configure TransactionBuilder
          const txBuilderConfig = CSL.TransactionBuilderConfigBuilder.new()
              .fee_algo(
                  CSL.LinearFee.new(
                      CSL.BigNum.from_str(minFeeA.toString()),
                      CSL.BigNum.from_str(minFeeB.toString())
                  )
              )
              .coins_per_utxo_byte(CSL.BigNum.from_str(utxoCostPerByte.toString()))
              .pool_deposit(CSL.BigNum.from_str(poolDeposit.toString()))
              .key_deposit(CSL.BigNum.from_str(keyDeposit.toString()))
              .max_tx_size(maxTxSize)
              .max_value_size(5000)
              .build();

          const txBuilder = CSL.TransactionBuilder.new(txBuilderConfig);

         

          //  Validate minimum UTXO value
          const recipientAddr = CSL.Address.from_bech32(recipientAddress);
          const outputValue = CSL.Value.new(CSL.BigNum.from_str(amountLovelace.toString()));
          
          // Calculate approximate minimum ADA required for a standard output
          // Formula: utxoCostPerByte × estimatedOutputSize
          // Standard output (address + ADA value) ≈ 225 bytes
          const estimatedOutputSize = 225;
          const minAdaRequired = BigInt(utxoCostPerByte) * BigInt(estimatedOutputSize);
          
          console.log(`[CardanoAPI] Minimum ADA required for output: ${minAdaRequired} lovelace (~${(Number(minAdaRequired) / 1000000).toFixed(2)} ADA)`);
          
          // Validate amount meets minimum
          if (BigInt(amountLovelace) < minAdaRequired) {
              const minAdaInAda = (Number(minAdaRequired) / 1000000).toFixed(2);
              const requestedInAda = (Number(amountLovelace) / 1000000).toFixed(2);
              throw new Error(
                  `Amount too small! Cardano requires a minimum of ${minAdaRequired} lovelace (~${minAdaInAda} ADA) per UTXO. ` +
                  `You tried to send ${amountLovelace} lovelace (~${requestedInAda} ADA). ` +
                  `Please send at least ${minAdaInAda} ADA.`
              );
          }
          
          console.log(`[CardanoAPI] ✅ Amount ${amountLovelace} lovelace meets minimum requirement`);
          
          // Use TransactionOutputBuilder for better compatibility
          let output;
          try {
              output = CSL.TransactionOutputBuilder.new()
                  .with_address(recipientAddr)
                  .next()
                  .with_value(outputValue)
                  .build();
              console.log(`[CardanoAPI] Output created using TransactionOutputBuilder`);
          } catch (e) {
              console.log(`[CardanoAPI] Falling back to TransactionOutput.new()`);
              output = CSL.TransactionOutput.new(recipientAddr, outputValue);
          }
          
          txBuilder.add_output(output);
          console.log(`[CardanoAPI] Added output: ${amountLovelace} lovelace to ${recipientAddress}`);

          // Add inputs (UTXOs) using TransactionUnspentOutputs
          const txUnspentOutputs = CSL.TransactionUnspentOutputs.new();
          
          for (const utxo of utxos) {
              try {
                  // Parse UTXO amount
                  let lovelaceAmount = 0n;
                  if (utxo.value?.ada?.lovelace) {
                      lovelaceAmount = BigInt(utxo.value.ada.lovelace);
                  } else if (utxo.value?.lovelace) {
                      lovelaceAmount = BigInt(utxo.value.lovelace);
                  } else if (utxo.value?.coins) {
                      lovelaceAmount = BigInt(utxo.value.coins);
                  } else {
                      console.warn("[CardanoAPI] Skipping UTXO with unknown value format:", utxo);
                      continue;
                  }

                  // Create TransactionInput
                  const txHash = CSL.TransactionHash.from_bytes(
                      Buffer.from(utxo.txHash, "hex")
                  );
                  const txInput = CSL.TransactionInput.new(txHash, utxo.index);

                  // Create TransactionOutput for this UTXO
                  const utxoAddr = CSL.Address.from_bech32(utxo.address || senderAddress);
                  const utxoValue = CSL.Value.new(CSL.BigNum.from_str(lovelaceAmount.toString()));
                  
                  // Use TransactionOutputBuilder for compatibility
                  let utxoOutput;
                  try {
                      utxoOutput = CSL.TransactionOutputBuilder.new()
                          .with_address(utxoAddr)
                          .next()
                          .with_value(utxoValue)
                          .build();
                  } catch (e) {
                      utxoOutput = CSL.TransactionOutput.new(utxoAddr, utxoValue);
                  }

                  // Create TransactionUnspentOutput
                  const txUnspentOutput = CSL.TransactionUnspentOutput.new(txInput, utxoOutput);
                  txUnspentOutputs.add(txUnspentOutput);
              } catch (error) {
                  console.warn("[CardanoAPI] Error processing UTXO, skipping:", error, utxo);
              }
          }

          if (txUnspentOutputs.len() === 0) {
              throw new Error("No valid UTXOs could be processed");
          }

          console.log(`[CardanoAPI] Prepared ${txUnspentOutputs.len()} UTXOs for input selection`);

          // Manual input selection for better control and correct fee calculation
          const senderAddr = CSL.Address.from_bech32(senderAddress);
          
          console.log(`[CardanoAPI] Using manual coin selection for accurate fee calculation...`);
          
          // Derive public key and key hash once (reused for all inputs)
          const privKey = CSL.PrivateKey.from_hex(senderPrivKeyHex);
          const pubKey = privKey.to_public();
          const keyHash = pubKey.hash();
          
          // Add inputs manually until we have enough
          let accumulatedValue = 0n;
          const targetValue = BigInt(amountLovelace) + 300000n; // amount + estimated fee buffer
          
          for (let i = 0; i < txUnspentOutputs.len(); i++) {
              const utxo = txUnspentOutputs.get(i);
              const utxoValue = BigInt(utxo.output().amount().coin().to_str());
              
              // Use add_key_input with Ed25519KeyHash
              txBuilder.add_key_input(
                  keyHash,
                  utxo.input(),
                  utxo.output().amount()
              );
              
              accumulatedValue += utxoValue;
              console.log(`[CardanoAPI] Added input ${i + 1}: ${utxoValue} lovelace (total: ${accumulatedValue} lovelace)`);
              
              // Stop when we have enough (don't add all UTXOs unnecessarily)
              if (accumulatedValue >= targetValue) {
                  console.log(`[CardanoAPI] ✅ Sufficient inputs added (${i + 1} UTXO${i > 0 ? 's' : ''})`);
                  break;
              }
          }
          
          //  Add change output automatically
          console.log(`[CardanoAPI] Adding change output...`);
          
          // const senderAddr = CSL.Address.from_bech32(senderAddress); // Already declared above
          
          // Ensure currentSlot is a number
          const slotNumber = Number(currentSlot);
          if (isNaN(slotNumber) || slotNumber <= 0) {
              throw new Error(`Invalid current slot: ${currentSlot}`);
          }

          // Calculate TTL (time-to-live) - 2 hours from current slot
          const ttl = slotNumber + 7200; // 2 hours = 7200 slots (1 slot = 1 second)
          console.log(`[CardanoAPI] Calculated TTL: ${ttl} (current slot: ${slotNumber} + 7200)`);
          
          // Set TTL on transaction builder
          // In cardano-serialization-lib v15, use set_ttl_bignum for reliability
          try {
              // Try set_ttl_bignum first (v15+ recommended method)
              if (typeof txBuilder.set_ttl_bignum === 'function') {
                  txBuilder.set_ttl_bignum(CSL.BigNum.from_str(ttl.toString()));
                  console.log(`[CardanoAPI] ✅ TTL set using set_ttl_bignum: ${ttl}`);
              } else {
                  // Fallback to set_ttl (older versions)
                  txBuilder.set_ttl(CSL.BigNum.from_str(ttl.toString()));
                  console.log(`[CardanoAPI] ✅ TTL set using set_ttl: ${ttl}`);
              }
          } catch (e) {
              console.error(`[CardanoAPI] Failed to set TTL:`, e);
              throw new Error(`Cannot set TTL on TransactionBuilder: ${e.message}`);
          }

          // This calculates the fee and adds a change output if the remainder is sufficient
          const changeAdded = txBuilder.add_change_if_needed(senderAddr);
          console.log(`[CardanoAPI] Change added: ${changeAdded}`);
          
          // Build the transaction body
          // Note: In v15, TransactionBody may not have a ttl() getter method,
          // but the TTL is properly set internally and will be included in the serialized transaction
          const txBody = txBuilder.build();
          
          console.log(`[CardanoAPI] ✅ Transaction body built successfully`);
          console.log(`  Fee: ${txBody.fee().to_str()} lovelace`);

          //Sign the transaction
          // Create the transaction hash for signing
          console.log("[CardanoAPI] Creating transaction hash for signing...");
          
          let txHash;
          try {
              // Try different methods to get the transaction hash
              if (typeof txBody.to_hash === 'function') {
                  txHash = txBody.to_hash();
                  console.log("[CardanoAPI] Hash created using txBody.to_hash()");
              } else if (typeof CSL.hash_transaction === 'function') {
                  //  Use hash_transaction if available
                  txHash = CSL.hash_transaction(txBody);
                  console.log("[CardanoAPI] Hash created using hash_transaction()");
              } else {
                  // Manually create hash from transaction body bytes
                  console.log("[CardanoAPI] Using manual hash creation from body bytes");
                  
                  const bodyBytes = txBody.to_bytes();
                  console.log(`[CardanoAPI] Transaction body size: ${bodyBytes.length} bytes`);
                  
                  
                  console.log("[CardanoAPI] Computing Blake2b-256 hash using CardanoLib...");
                  const bodyBuffer = Buffer.from(bodyBytes);
                  const hashBytes = CardanoLib.blake2b(bodyBuffer, 32);
                  txHash = CSL.TransactionHash.from_bytes(hashBytes);
                  console.log("[CardanoAPI] ✅ Transaction hash created successfully using Blake2b-256");
              }
          } catch (e) {
              console.error("[CardanoAPI] Failed to create transaction hash:", e);
              throw new Error(`Cannot create transaction hash: ${e.message}`);
          }
          
          console.log("[CardanoAPI] Signing transaction with private key...");
          
          const vkeyWitnesses = CSL.Vkeywitnesses.new();
          let vkeyWitness;
          
          try {
              vkeyWitness = CSL.make_vkey_witness(txHash, privKey);
              console.log("[CardanoAPI] ✅ Transaction signed successfully");
          } catch (e) {
              console.error("[CardanoAPI] Signing failed:", e);
              throw new Error(`Failed to sign transaction: ${e.message}`);
          }
          
          vkeyWitnesses.add(vkeyWitness);

          const witnessSet = CSL.TransactionWitnessSet.new();
          witnessSet.set_vkeys(vkeyWitnesses);

          console.log("[CardanoAPI] Transaction signed successfully");

          // Construct final transaction
          const transaction = CSL.Transaction.new(
              txBody,
              witnessSet,
              undefined // No auxiliary data (metadata)
          );

          // Serialize to CBOR hex
          const signedTxBytes = transaction.to_bytes();
          const signedTxHex = Buffer.from(signedTxBytes).toString("hex");
          
          console.log(`[CardanoAPI] Transaction serialized (${signedTxBytes.length} bytes)`);
          console.log(`[CardanoAPI] Transaction CBOR (first 100 chars): ${signedTxHex.substring(0, 100)}...`);

          // Submit transaction to network via Ogmios
          console.log("[CardanoAPI] Submitting transaction to network...");
          const submitResult = await this.callRpc("submitTransaction", {
              transaction: { cbor: signedTxHex }
          });

          console.log("[CardanoAPI] Transaction submitted successfully!");
          console.log("  Result:", submitResult);

          // Return transaction details
          return {
              success: true,
              txId: submitResult?.transaction?.id || "unknown",
              txHash: Buffer.from(txHash.to_bytes()).toString("hex"),
              fee: txBody.fee().to_str(),
              submitResult: submitResult
          };

      } catch (error) {
          console.error("[CardanoAPI] Error in sendAda:", error);
          throw new Error(`Failed to send ADA: ${error.message}`);
      }
  }
}

export default CardanoAPI;