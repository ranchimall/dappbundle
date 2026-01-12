(function (EXPORTS) {
  "use strict";
  const hederaAPI = EXPORTS;

  // API Configuration - Mainnet Only
  const NETWORK_CONFIG = {
    mirrorNode: 'https://mainnet-public.mirrornode.hedera.com',
    jsonRpcRelay: 'https://mainnet.hashio.io/api',
    chainId: 295, // Hedera Mainnet
    explorer: 'https://hashscan.io/mainnet'
  };

  /**
   * Get network configuration
   */
  function getNetworkConfig() {
    return NETWORK_CONFIG;
  }


  /**
   * Get account balance using Hedera Mirror Node API
   * @param {string} address - EVM address (0x...) or Account ID (0.0.xxxx)
   * @returns {Promise<Object>} - Balance information
   */
  hederaAPI.getBalance = async function(address) {
    try {
      const config = getNetworkConfig();
      
      // Clean address
      address = address.trim();
      
      // Determine if it's an EVM address or Account ID
      let endpoint;
      if (address.startsWith('0x')) {
        // EVM address format
        endpoint = `${config.mirrorNode}/api/v1/accounts/${address}`;
      } else if (address.match(/^\d+\.\d+\.\d+$/)) {
        // Account ID format (0.0.xxxx)
        endpoint = `${config.mirrorNode}/api/v1/accounts/${address}`;
      } else {
        throw new Error('Invalid address format. Use EVM address (0x...) or Account ID (0.0.xxxx)');
      }

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Account not found. Make sure the account exists on the network.');
        }
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Convert balance from tinybars to HBAR (1 HBAR = 100,000,000 tinybars)
      const balanceInTinybars = parseInt(data.balance.balance);
      const balanceInHbar = balanceInTinybars / 100000000;

      return {
        address: address,
        accountId: data.account,
        evmAddress: data.evm_address,
        balance: balanceInHbar,
        balanceTinybars: balanceInTinybars,
        autoRenewPeriod: data.auto_renew_period,
        expiryTimestamp: data.expiry_timestamp,
        memo: data.memo,
        key: data.key
      };
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw error;
    }
  };

  /**
   * Get transaction history using Hedera Mirror Node API
   * @param {string} address - EVM address or Account ID
   * @param {Object} options - Query options (limit, order, timestamp)
   * @returns {Promise<Object>} - Transaction history
   */
  hederaAPI.getTransactionHistory = async function(address, options = {}) {
    try {
      const config = getNetworkConfig();
      address = address.trim();

      // Build query parameters for account endpoint
      const params = new URLSearchParams();
      params.append('limit', options.limit || 25);
      params.append('order', options.order || 'desc');
      
      if (options.timestamp) {
        params.append('timestamp', options.timestamp);
      }

      // Use the account endpoint which includes transactions
      let endpoint;
      if (address.startsWith('0x')) {
        endpoint = `${config.mirrorNode}/api/v1/accounts/${address}?${params}`;
      } else if (address.match(/^\d+\.\d+\.\d+$/)) {
        endpoint = `${config.mirrorNode}/api/v1/accounts/${address}?${params}`;
      } else {
        throw new Error('Invalid address format');
      }

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Account not found');
        }
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      // Check if transactions exist in response
      if (!data.transactions || data.transactions.length === 0) {
        return {
          transactions: [],
          links: data.links || {}
        };
      }

      // Process transactions
      const transactions = data.transactions.map(tx => {
        // Determine transaction type and amount
        let type = 'unknown';
        let amount = 0;
        let counterparty = null;

        if (tx.transfers && tx.transfers.length > 0) {
          // Find transfers involving our address
          const accountId = data.account; // Use the account ID from response
          const ourTransfers = tx.transfers.filter(t => 
            t.account === address || 
            t.account === accountId
          );

          if (ourTransfers.length > 0) {
            const transfer = ourTransfers[0];
            amount = Math.abs(transfer.amount) / 100000000; // Convert to HBAR
            
            if (transfer.amount > 0) {
              type = 'receive';
              // Find sender
              const senderTransfer = tx.transfers.find(t => t.amount < 0);
              if (senderTransfer) counterparty = senderTransfer.account;
            } else {
              type = 'send';
              // Find receiver
              const receiverTransfer = tx.transfers.find(t => t.amount > 0 && t.account !== address && t.account !== accountId);
              if (receiverTransfer) counterparty = receiverTransfer.account;
            }
          }
        }

        // Convert Base64 transaction hash to hex format
        let hexHash = tx.transaction_hash;
        if (hexHash && !hexHash.startsWith('0x')) {
          try {
            const binaryString = atob(hexHash);
            hexHash = '0x' + Array.from(binaryString)
              .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
              .join('');
          } catch (e) {
            console.warn('Could not convert hash to hex:', e);
          }
        }

        return {
          id: tx.transaction_id,
          hash: hexHash, // Add transaction hash in hex format
          consensusTimestamp: tx.consensus_timestamp,
          type: type,
          amount: amount,
          counterparty: counterparty,
          result: tx.result,
          name: tx.name,
          memo: tx.memo_base64 ? atob(tx.memo_base64) : '',
          charged_tx_fee: tx.charged_tx_fee / 100000000, // Convert to HBAR
          max_fee: tx.max_fee ? tx.max_fee / 100000000 : 0,
          valid_start_timestamp: tx.valid_start_timestamp,
          node: tx.node,
          scheduled: tx.scheduled,
          nonce: tx.nonce,
          transfers: tx.transfers
        };
      });

      return {
        transactions: transactions,
        links: data.links || {}
      };
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  };

  /**
   * Get transaction details by transaction ID
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} - Transaction details
   */
  hederaAPI.getTransactionById = async function(transactionId) {
    try {
      const config = getNetworkConfig();
      const endpoint = `${config.mirrorNode}/api/v1/transactions/${transactionId}`;

      const response = await fetch(endpoint);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Transaction not found');
        }
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.transactions && data.transactions.length > 0) {
        const tx = data.transactions[0];
        
        // Convert Base64 transaction hash to hex format 
        let hexHash = tx.transaction_hash;
        if (hexHash && !hexHash.startsWith('0x')) {
          try {
            // Decode Base64 to binary, then convert to hex
            const binaryString = atob(hexHash);
            hexHash = '0x' + Array.from(binaryString)
              .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
              .join('');
          } catch (e) {
            console.warn('Could not convert hash to hex:', e);
          }
        }
        
        
        // Fetch block number based on consensus timestamp
        let blockNumber = null;
        try {
          const blockEndpoint = `${config.mirrorNode}/api/v1/blocks?timestamp=gte:${tx.consensus_timestamp}&limit=1&order=asc`;
          console.log('Fetching block from:', blockEndpoint);
          const blockResponse = await fetch(blockEndpoint);
          console.log('Block response status:', blockResponse.status);
          if (blockResponse.ok) {
            const blockData = await blockResponse.json();
            console.log('Block data:', blockData);
            if (blockData.blocks && blockData.blocks.length > 0) {
              blockNumber = blockData.blocks[0].number;
              console.log('Block number found:', blockNumber);
            } else {
              console.warn('No blocks found in response');
            }
          } else {
            console.warn('Block fetch failed with status:', blockResponse.status);
          }
        } catch (e) {
          console.warn('Could not fetch block number:', e);
        }

        let memo='';
        
        return {
          id: tx.transaction_id,
          hash: hexHash, // Transaction hash in hex format
          consensusTimestamp: tx.consensus_timestamp,
          result: tx.result,
          name: tx.name,
          memo: memo,
          charged_tx_fee: tx.charged_tx_fee / 100000000,
          max_fee: tx.max_fee ? tx.max_fee / 100000000 : 0,
          valid_start_timestamp: tx.valid_start_timestamp,
          node: tx.node,
          transfers: tx.transfers,
          block_number: blockNumber,
          raw: tx
        };
      }

      throw new Error('Transaction not found');
    } catch (error) {
      console.error('Error fetching transaction:', error);
      throw error;
    }
  };

  /**
   * Send HBAR using JSON-RPC Relay (EVM-compatible)
   * @param {string} fromPrivateKey - Sender's private key (hex format)
   * @param {string} toAddress - Recipient's EVM address (0x...) - Account IDs should be converted to EVM addresses before calling
   * @param {number} amount - Amount in HBAR
   * @param {string} memo - Optional memo
   * @returns {Promise<Object>} - Transaction result
   */
  hederaAPI.sendHBAR = async function(fromPrivateKey, toAddress, amount, memo = '') {
    try {
      const config = getNetworkConfig();

      // Validate inputs
      if (!fromPrivateKey || fromPrivateKey.length !== 64) {
        throw new Error('Invalid private key format. Expected 64-character hex string.');
      }

      if (!toAddress || !toAddress.startsWith('0x')) {
        throw new Error('Invalid recipient address. Expected EVM address (0x...)');
      }

      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Use Web3.js to create and sign the transaction
      if (typeof Web3 === 'undefined') {
        throw new Error('Web3.js is required for sending transactions');
      }

      const web3 = new Web3(config.jsonRpcRelay);

      // Add 0x prefix to private key if not present
      const privateKey = fromPrivateKey.startsWith('0x') ? fromPrivateKey : '0x' + fromPrivateKey;

      // Create account from private key
      const account = web3.eth.accounts.privateKeyToAccount(privateKey);
      const fromAddress = account.address;

      // Get current gas price
      const gasPrice = await web3.eth.getGasPrice();

      // Get nonce
      const nonce = await web3.eth.getTransactionCount(fromAddress, 'pending');

      // Convert HBAR to Wei (1 HBAR = 10^18 Wei in EVM context)
      
      const amountString = typeof amount === 'number' ? amount.toFixed(18) : amount.toString();
      const amountInWei = web3.utils.toWei(amountString, 'ether');

      // Prepare transaction object for gas estimation
      let gasLimit = 21000; // Default for existing accounts
      
      // Try to estimate gas (will be higher for new accounts)
      try {
        const estimatedGas = await web3.eth.estimateGas({
          from: fromAddress,
          to: toAddress,
          value: amountInWei
        });
        gasLimit = Math.floor(estimatedGas * 1.2); // Add 20% buffer
        console.log('Estimated gas:', estimatedGas, 'Using:', gasLimit);
      } catch (error) {
        // If estimation fails, use high limit for new account creation
        console.warn('Gas estimation failed, using high limit for potential new account:', error.message);
        gasLimit = 800000; // High limit for new account auto-creation
      }

      // Prepare transaction
      const tx = {
        from: fromAddress,
        to: toAddress,
        value: amountInWei,
        gas: gasLimit,
        gasPrice: gasPrice,
        nonce: nonce,
        chainId: config.chainId
      };


      // Sign transaction
      const signedTx = await account.signTransaction(tx);

      // Send transaction
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        from: receipt.from,
        to: receipt.to,
        gasUsed: receipt.gasUsed,
        status: receipt.status,
        explorerUrl: `${config.explorer}/transaction/${receipt.transactionHash}`
      };
    } catch (error) {
      console.error('Error sending HBAR:', error);
      
      // Parse error message
      let errorMessage = error.message;
      if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient balance to complete this transaction';
      } else if (error.message.includes('nonce')) {
        errorMessage = 'Transaction nonce error. Please try again.';
      } else if (error.message.includes('gas')) {
        errorMessage = 'Gas estimation failed. Please check the transaction details.';
      }

      throw new Error(errorMessage);
    }
  };


  /**
   * Validate address format
   * @param {string} address - Address to validate
   * @returns {Object} - Validation result
   */
  hederaAPI.validateAddress = function(address) {
    address = address.trim();

    // Check EVM address format
    if (address.startsWith('0x')) {
      const isValid = /^0x[a-fA-F0-9]{40}$/.test(address);
      return {
        valid: isValid,
        type: 'evm',
        address: address
      };
    }

    // Check Account ID format (0.0.xxxx)
    if (address.match(/^\d+\.\d+\.\d+$/)) {
      return {
        valid: true,
        type: 'accountId',
        address: address
      };
    }

    return {
      valid: false,
      type: 'unknown',
      address: address
    };
  };

  /**
   * Format timestamp to readable date
   * @param {string} timestamp - Consensus timestamp
   * @returns {string} - Formatted date
   */
  hederaAPI.formatTimestamp = function(timestamp) {
    if (!timestamp) return 'N/A';
    
    // Timestamp format: seconds.nanoseconds
    const [seconds, nanoseconds] = timestamp.split('.');
    const date = new Date(parseInt(seconds) * 1000);
    
    return date.toLocaleString();
  };

})(typeof module === "object" ? module.exports : (window.hederaAPI = {}));
