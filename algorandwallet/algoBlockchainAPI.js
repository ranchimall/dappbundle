(function(GLOBAL) {
  'use strict';

  const ALGOD_URL = 'https://mainnet-api.4160.nodely.dev';
  const INDEXER_URL = 'https://mainnet-idx.4160.nodely.dev';

  const algoAPI = {};

  // Get account balance and info
  algoAPI.getBalance = async function(address) {
    const response = await fetch(`${ALGOD_URL}/v2/accounts/${address}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch balance: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      address: data.address,
      balance: data.amount, // in microAlgos
      balanceAlgo: data.amount / 1000000, // in ALGO
      minBalance: data['min-balance'],
      pendingRewards: data['pending-rewards'],
      rewards: data.rewards,
      status: data.status,
      totalAppsOptedIn: data['total-apps-opted-in'] || 0,
      totalAssetsOptedIn: data['total-assets-opted-in'] || 0
    };
  };

  // Get transaction history with pagination
  algoAPI.getTransactions = async function(address, options = {}) {
    const limit = options.limit || 10;
    const nextToken = options.next || null;
    const txType = options.txType || null; 
    
    let url = `${INDEXER_URL}/v2/accounts/${address}/transactions?limit=${limit}`;
    
    if (nextToken) {
      url += `&next=${nextToken}`;
    }
    
    if (txType) {
      url += `&tx-type=${txType}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch transactions: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Format transactions
    const transactions = (data.transactions || []).map(tx => {
      // Check for payment transaction or asset transfer
      const paymentTx = tx['payment-transaction'];
      const assetTx = tx['asset-transfer-transaction'];
      
      return {
        id: tx.id,
        type: tx['tx-type'],
        roundTime: tx['round-time'],
        confirmedRound: tx['confirmed-round'],
        fee: tx.fee,
        sender: tx.sender,
        // Get receiver from payment or asset transfer
        receiver: paymentTx?.receiver || assetTx?.receiver || null,
        amount: paymentTx?.amount || 0,
        amountAlgo: (paymentTx?.amount || 0) / 1000000,
        // Asset transfer details
        assetId: assetTx?.['asset-id'] || null,
        assetAmount: assetTx?.amount || 0,
        note: tx.note ? atob(tx.note) : null
      };
    });
    
    return {
      transactions,
      nextToken: data['next-token'] || null,
      hasMore: !!data['next-token']
    };
  };

  // Get transaction parameters (needed for sending)
  algoAPI.getTransactionParams = async function() {
    const response = await fetch(`${ALGOD_URL}/v2/transactions/params`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tx params: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      fee: data.fee || data['min-fee'],
      firstRound: data['last-round'],
      lastRound: data['last-round'] + 1000,
      genesisId: data['genesis-id'],
      genesisHash: data['genesis-hash']
    };
  };

  // Send signed transaction
  algoAPI.sendTransaction = async function(signedTxnBytes) {
    const response = await fetch(`${ALGOD_URL}/v2/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-binary'
      },
      body: signedTxnBytes
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to send transaction: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      txId: data.txId
    };
  };

  // Wait for transaction confirmation
  algoAPI.waitForConfirmation = async function(txId, timeout = 10) {
    const startRound = (await algoAPI.getTransactionParams()).firstRound;
    let currentRound = startRound;
    
    while (currentRound < startRound + timeout) {
      // Check if transaction is confirmed
      const response = await fetch(`${INDEXER_URL}/v2/transactions/${txId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.transaction && data.transaction['confirmed-round']) {
          return {
            confirmed: true,
            round: data.transaction['confirmed-round'],
            txId: txId
          };
        }
      }
      
      // Wait 4 seconds (Algorand block time)
      await new Promise(resolve => setTimeout(resolve, 4000));
      currentRound++;
    }
    
    throw new Error('Transaction confirmation timeout');
  };

  // Get single transaction by ID
  algoAPI.getTransaction = async function(txId) {
    const response = await fetch(`${INDEXER_URL}/v2/transactions/${txId}`);
    
    if (!response.ok) {
      throw new Error(`Transaction not found: ${response.status}`);
    }
    
    const data = await response.json();
    const tx = data.transaction;
    
    // Check for payment transaction or asset transfer
    const paymentTx = tx['payment-transaction'];
    const assetTx = tx['asset-transfer-transaction'];
    
    return {
      id: tx.id,
      type: tx['tx-type'],
      roundTime: tx['round-time'],
      confirmedRound: tx['confirmed-round'],
      fee: tx.fee,
      sender: tx.sender,
      // Get receiver from payment or asset transfer
      receiver: paymentTx?.receiver || assetTx?.receiver || null,
      amount: paymentTx?.amount || 0,
      amountAlgo: (paymentTx?.amount || 0) / 1000000,
      // Asset transfer details
      assetId: assetTx?.['asset-id'] || null,
      assetAmount: assetTx?.amount || 0,
      note: tx.note ? atob(tx.note) : null
    };
  };

  // Format ALGO amount for display
  algoAPI.formatAlgo = function(microAlgos) {
    return (microAlgos / 1000000).toFixed(6);
  };

  // Parse ALGO to microAlgos
  algoAPI.parseAlgo = function(algo) {
    return Math.floor(parseFloat(algo) * 1000000);
  };

  GLOBAL.algoAPI = algoAPI;

})(typeof window !== 'undefined' ? window : global);
