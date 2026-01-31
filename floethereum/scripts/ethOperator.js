(function (EXPORTS) { // ethOperator v1.0.2
  /* ETH Crypto and API Operator */
  if (!window.ethers)
    return console.error('ethers.js not found')
  const ethOperator = EXPORTS;
  const isValidAddress = ethOperator.isValidAddress = (address) => {
    try {
      // Check if the address is a valid checksum address
      const isValidChecksum = ethers.utils.isAddress(address);
      // Check if the address is a valid non-checksum address
      const isValidNonChecksum = ethers.utils.getAddress(address) === address.toLowerCase();
      return isValidChecksum || isValidNonChecksum;
    } catch (error) {
      return false;
    }
  }
  const ERC20ABI = [
    {
      "constant": true,
      "inputs": [],
      "name": "name",
      "outputs": [
        {
          "name": "",
          "type": "string"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "_spender",
          "type": "address"
        },
        {
          "name": "_value",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [
        {
          "name": "",
          "type": "bool"
        }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "totalSupply",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "_from",
          "type": "address"
        },
        {
          "name": "_to",
          "type": "address"
        },
        {
          "name": "_value",
          "type": "uint256"
        }
      ],
      "name": "transferFrom",
      "outputs": [
        {
          "name": "",
          "type": "bool"
        }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "decimals",
      "outputs": [
        {
          "name": "",
          "type": "uint8"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [
        {
          "name": "_owner",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "name": "balance",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "symbol",
      "outputs": [
        {
          "name": "",
          "type": "string"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "constant": false,
      "inputs": [
        {
          "name": "_to",
          "type": "address"
        },
        {
          "name": "_value",
          "type": "uint256"
        }
      ],
      "name": "transfer",
      "outputs": [
        {
          "name": "",
          "type": "bool"
        }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [
        {
          "name": "_owner",
          "type": "address"
        },
        {
          "name": "_spender",
          "type": "address"
        }
      ],
      "name": "allowance",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    },
    {
      "payable": true,
      "stateMutability": "payable",
      "type": "fallback"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "name": "spender",
          "type": "address"
        },
        {
          "indexed": false,
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Approval",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Transfer",
      "type": "event"
    }
  ]
  const CONTRACT_ADDRESSES = {
    usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    usdt: "0xdac17f958d2ee523a2206206994597c13d831ec7"
  }
  /**
   * Get Ethereum provider (MetaMask or public RPC)
   * @param {boolean} readOnly - If true, use public RPC; if false, use MetaMask when available
   * @returns {ethers.providers.Provider} Ethereum provider instance
   */
  const getProvider = ethOperator.getProvider = (readOnly = false) => {
    if (!readOnly && window.ethereum) {
      return new ethers.providers.Web3Provider(window.ethereum);
    } else {
      return new ethers.providers.JsonRpcProvider(`https://mainnet.infura.io/v3/6e12fee52bdd48208f0d82fb345bcb3c`)
    }
  }
  // Note: MetaMask connection is handled in the UI layer, not here
  const getBalance = ethOperator.getBalance = async (address) => {
    try {
      if (!address || !isValidAddress(address))
        return new Error('Invalid address');

      // Use read-only provider (public RPC) for balance checks
      const provider = getProvider(true);
      const balanceWei = await provider.getBalance(address);
      const balanceEth = parseFloat(ethers.utils.formatEther(balanceWei));
      return balanceEth;
    } catch (error) {
      console.error('Balance error:', error.message);
      return 0;
    }
  }
  const getTokenBalance = ethOperator.getTokenBalance = async (address, token, { contractAddress } = {}) => {
    try {
      if (!token)
        return new Error("Token not specified");
      if (!CONTRACT_ADDRESSES[token] && contractAddress)
        return new Error('Contract address of token not available')

      // Use read-only provider (public RPC) for token balance checks
      const provider = getProvider(true);
      const tokenAddress = CONTRACT_ADDRESSES[token] || contractAddress;
      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
      let balance = await tokenContract.balanceOf(address);
      balance = parseFloat(ethers.utils.formatUnits(balance, 6)); // USDC and USDT use 6 decimals
      return balance;
    } catch (e) {
      console.error('Token balance error:', e);
      return 0;
    }
  }

  const estimateGas = ethOperator.estimateGas = async ({ privateKey, receiver, amount }) => {
    try {
      const provider = getProvider();
      const signer = new ethers.Wallet(privateKey, provider);
      return provider.estimateGas({
        from: signer.address,
        to: receiver,
        value: ethers.utils.parseUnits(amount, "ether"),
      });
    } catch (e) {
      throw new Error(e)
    }
  }

  const sendTransaction = ethOperator.sendTransaction = async ({ privateKey, receiver, amount }) => {
    try {
      const provider = getProvider();
      const signer = new ethers.Wallet(privateKey, provider);
      const limit = await estimateGas({ privateKey, receiver, amount })

      // Get current fee data from the network
      const feeData = await provider.getFeeData();

      // Calculate priority fee (tip to miners) - use 1.5 gwei or the network's suggested priority fee, whichever is higher
      const priorityFee = feeData.maxPriorityFeePerGas || ethers.utils.parseUnits("1.5", "gwei");

      // Calculate max fee per gas (base fee + priority fee)
      // Use the network's suggested maxFeePerGas or calculate it manually
      let maxFee = feeData.maxFeePerGas;

      // If maxFeePerGas is not available or is less than priority fee, calculate it
      if (!maxFee || maxFee.lt(priorityFee)) {
        // Get the base fee from the latest block and add our priority fee
        const block = await provider.getBlock("latest");
        const baseFee = block.baseFeePerGas || ethers.utils.parseUnits("1", "gwei");
        // maxFee = (baseFee * 2) + priorityFee to account for potential base fee increases
        maxFee = baseFee.mul(2).add(priorityFee);
      }

      // Ensure maxFee is at least 1.5x the priority fee for safety
      const minMaxFee = priorityFee.mul(15).div(10); // 1.5x priority fee
      if (maxFee.lt(minMaxFee)) {
        maxFee = minMaxFee;
      }

      // Creating and sending the transaction object
      return signer.sendTransaction({
        to: receiver,
        value: ethers.utils.parseUnits(amount, "ether"),
        gasLimit: limit,
        nonce: await signer.getTransactionCount(),
        maxPriorityFeePerGas: priorityFee,
        maxFeePerGas: maxFee,
      })
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
   * Send ERC20 tokens (USDC or USDT)
   * @param {object} params - Transaction parameters
   * @param {string} params.token - Token symbol ('usdc' or 'usdt')
   * @param {string} params.privateKey - Sender's private key
   * @param {string} params.amount - Amount to send
   * @param {string} params.receiver - Recipient's Ethereum address
   * @param {string} params.contractAddress - Optional custom contract address
   * @returns {Promise} Transaction promise
   */
  const sendToken = ethOperator.sendToken = async ({ token, privateKey, amount, receiver, contractAddress }) => {
    const wallet = new ethers.Wallet(privateKey, getProvider());
    const tokenContract = new ethers.Contract(CONTRACT_ADDRESSES[token] || contractAddress, ERC20ABI, wallet);
    // Convert amount to smallest unit (both USDC and USDT use 6 decimals)
    const amountWei = ethers.utils.parseUnits(amount.toString(), 6);
    return tokenContract.transfer(receiver, amountWei)
  }


  const ETHERSCAN_API_KEY = 'M3YBAHI21FVE7VS2FEKU6ZFGRA128WUVQK';

  /**
   * Get transaction history for an Ethereum address
   * @param {string} address - Ethereum address
   * @param {object} options - Optional parameters
   * @returns {Promise<Array>} Array of transactions
   */
  const getTransactionHistory = ethOperator.getTransactionHistory = async (address, options = {}) => {
    try {
      if (!address || !isValidAddress(address)) {
        throw new Error('Invalid Ethereum address');
      }

      const {
        startBlock = 0,
        endBlock = 99999999,
        page = 1,
        offset = 100,
        sort = 'desc'
      } = options;

      // Fetch normal transactions using V2 API
      const normalTxUrl = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address}&startblock=${startBlock}&endblock=${endBlock}&page=${page}&offset=${offset}&sort=${sort}&apikey=${ETHERSCAN_API_KEY}`;

      const normalTxResponse = await fetch(normalTxUrl);
      const normalTxData = await normalTxResponse.json();

      if (normalTxData.status !== '1') {
        if (normalTxData.message === 'No transactions found') {
          return [];
        }
        // Provide more detailed error messages
        if (normalTxData.result && normalTxData.result.includes('Invalid API Key')) {
          throw new Error('Invalid Etherscan API Key. Please check your API key.');
        }
        if (normalTxData.result && normalTxData.result.includes('Max rate limit reached')) {
          throw new Error('Etherscan API rate limit reached. Please try again later.');
        }
        throw new Error(`Etherscan API Error: ${normalTxData.message || normalTxData.result || 'Failed to fetch transactions'}`);
      }

      // Fetch ERC20 token transfers using V2 API
      const tokenTxUrl = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=tokentx&address=${address}&startblock=${startBlock}&endblock=${endBlock}&page=${page}&offset=${offset}&sort=${sort}&apikey=${ETHERSCAN_API_KEY}`;

      const tokenTxResponse = await fetch(tokenTxUrl);
      const tokenTxData = await tokenTxResponse.json();

      const allowedTokenAddresses = Object.values(CONTRACT_ADDRESSES).map(addr => addr.toLowerCase());
      const rawTokenTransfers = tokenTxData.status === '1' ? tokenTxData.result : [];
      const tokenTransfers = rawTokenTransfers.filter(tx =>
        allowedTokenAddresses.includes(tx.contractAddress.toLowerCase()) && tx.value !== '0'
      );

      // Combine and sort transactions
      // Filter out normal transactions that are already present in token transfers (duplicate hash) AND have 0 value
      // This prevents showing "0 ETH to Contract" alongside the actual "Token Transfer"
      const tokenTxHashes = new Set(tokenTransfers.map(tx => tx.hash));
      const uniqueNormalTxs = normalTxData.result.filter(tx => {
        if (tokenTxHashes.has(tx.hash) && tx.value === '0') {
          return false;
        }
        return true;
      });

      const allTransactions = [...uniqueNormalTxs, ...tokenTransfers];

      // Sort by timestamp (descending)
      allTransactions.sort((a, b) => parseInt(b.timeStamp) - parseInt(a.timeStamp));


      // Parse and format transactions
      return allTransactions.map(tx => {
        const isTokenTransfer = tx.tokenSymbol !== undefined;
        const isReceived = tx.to.toLowerCase() === address.toLowerCase();

        let value, symbol, decimals;

        if (isTokenTransfer) {
          decimals = parseInt(tx.tokenDecimal) || 18;
          value = parseFloat(ethers.utils.formatUnits(tx.value, decimals));
          symbol = tx.tokenSymbol || 'TOKEN';
        } else {
          value = parseFloat(ethers.utils.formatEther(tx.value));
          symbol = 'ETH';
        }

        return {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: value,
          symbol: symbol,
          timestamp: parseInt(tx.timeStamp),
          blockNumber: parseInt(tx.blockNumber),
          isReceived: isReceived,
          isSent: !isReceived,
          gasUsed: tx.gasUsed ? parseInt(tx.gasUsed) : 0,
          gasPrice: tx.gasPrice ? parseFloat(ethers.utils.formatUnits(tx.gasPrice, 'gwei')) : 0,
          isError: tx.isError === '1' || tx.txreceipt_status === '0',
          contractAddress: tx.contractAddress || null,
          tokenName: tx.tokenName || null,
          confirmations: tx.confirmations ? parseInt(tx.confirmations) : 0,
          nonce: tx.nonce ? parseInt(tx.nonce) : 0,
          input: tx.input || '0x',
          isTokenTransfer: isTokenTransfer
        };
      });

    } catch (error) {
      console.error('Error fetching transaction history:', error);
      throw error;
    }
  };

  /**
   * Get detailed information about a specific transaction
   * @param {string} txHash - Transaction hash
   * @returns {Promise<Object>} Transaction details
   */
  const getTransactionDetails = ethOperator.getTransactionDetails = async (txHash) => {
    try {
      if (!txHash || !/^0x([A-Fa-f0-9]{64})$/.test(txHash)) {
        throw new Error('Invalid transaction hash');
      }

      // Use read-only provider for fetching transaction details
      const provider = getProvider(true);

      // Get transaction details
      const tx = await provider.getTransaction(txHash);

      if (!tx) {
        throw new Error('Transaction not found');
      }

      // Get transaction receipt for status and gas used
      const receipt = await provider.getTransactionReceipt(txHash);

      // Get current block number for confirmations
      const currentBlock = await provider.getBlockNumber();

      // Get block details for timestamp
      const block = await provider.getBlock(tx.blockNumber);

      // Calculate gas fee
      const gasUsed = receipt ? receipt.gasUsed : null;
      const effectiveGasPrice = receipt ? receipt.effectiveGasPrice : tx.gasPrice;
      const gasFee = gasUsed && effectiveGasPrice ?
        parseFloat(ethers.utils.formatEther(gasUsed.mul(effectiveGasPrice))) : null;

      // Check if it's a token transfer by examining logs
      let tokenTransfers = [];
      // Simple in-memory cache for token metadata to avoid rate limiting
      const TOKEN_METADATA_CACHE = ethOperator.TOKEN_METADATA_CACHE || {};
      ethOperator.TOKEN_METADATA_CACHE = TOKEN_METADATA_CACHE;

      if (receipt && receipt.logs.length > 0) {
        // Try to decode ERC20 Transfer event
        const transferEventSignature = ethers.utils.id('Transfer(address,address,uint256)');
        const transferLogs = receipt.logs.filter(log => log.topics[0] === transferEventSignature);

        if (transferLogs.length > 0) {
          try {
            // Process all transfer logs
            tokenTransfers = await Promise.all(transferLogs.map(async (transferLog) => {
              const contractAddress = transferLog.address;
              let symbol, decimals;

              // Check cache first
              if (TOKEN_METADATA_CACHE[contractAddress]) {
                ({ symbol, decimals } = TOKEN_METADATA_CACHE[contractAddress]);
              } else {
                // Fetch from network if not cached
                const tokenContract = new ethers.Contract(contractAddress, ERC20ABI, provider);
                [symbol, decimals] = await Promise.all([
                  tokenContract.symbol().catch(() => 'TOKEN'),
                  tokenContract.decimals().catch(() => 18)
                ]);
                // Store in cache
                TOKEN_METADATA_CACHE[contractAddress] = { symbol, decimals };
              }

              const from = ethers.utils.getAddress('0x' + transferLog.topics[1].slice(26));
              const to = ethers.utils.getAddress('0x' + transferLog.topics[2].slice(26));
              const value = parseFloat(ethers.utils.formatUnits(transferLog.data, decimals));

              return {
                from,
                to,
                value,
                symbol,
                contractAddress
              };
            }));
          } catch (e) {
            console.warn('Could not decode token transfers:', e);
          }
        }
      }

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: parseFloat(ethers.utils.formatEther(tx.value)),
        symbol: 'ETH',
        blockNumber: tx.blockNumber,
        timestamp: block ? block.timestamp : null,
        confirmations: currentBlock - tx.blockNumber,
        gasLimit: tx.gasLimit.toString(),
        gasUsed: gasUsed ? gasUsed.toString() : null,
        gasPrice: parseFloat(ethers.utils.formatUnits(tx.gasPrice, 'gwei')),
        gasFee: gasFee,
        nonce: tx.nonce,
        input: tx.data,
        status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
        isError: receipt ? receipt.status !== 1 : false,
        tokenTransfers: tokenTransfers,
        logs: receipt ? receipt.logs : [],
        type: tx.type
      };

    } catch (error) {
      console.error('Error fetching transaction details:', error);
      throw error;
    }
  };

  /**
   * Check if a string is a valid transaction hash
   * @param {string} hash - Potential transaction hash
   * @returns {boolean}
   */
  const isValidTxHash = ethOperator.isValidTxHash = (hash) => {
    return /^0x([A-Fa-f0-9]{64})$/.test(hash);
  };

})('object' === typeof module ? module.exports : window.ethOperator = {});
