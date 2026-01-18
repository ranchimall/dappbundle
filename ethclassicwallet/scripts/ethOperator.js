(function (EXPORTS) { // ethOperator v1.0.2
  /* ETC Crypto and API Operator */
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
    // Ethereum Classic network token addresses
    wetc: "0x1953cab0E5bFa6D4a9BaD6E05fD46C1CC6527a5a"  // Wrapped ETC (canonical address)
  }
  /**
   * Get Ethereum Classic provider (MetaMask or public RPC)
   * @param {boolean} readOnly - If true, use public RPC; if false, use MetaMask when available
   * @returns {ethers.providers.Provider} Ethereum Classic provider instance
   */
  const getProvider = ethOperator.getProvider = (readOnly = false) => {
    if (!readOnly && window.ethereum) {
      return new ethers.providers.Web3Provider(window.ethereum);
    } else {
      return new ethers.providers.JsonRpcProvider(`https://go.getblock.io/25daad33439f4cd0ae1ffdde6ff6b560`)
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
      if (!CONTRACT_ADDRESSES[token] && !contractAddress)
        return new Error('Contract address of token not available')

      // Use read-only provider (public RPC) for token balance checks
      const provider = getProvider(true);
      const tokenAddress = CONTRACT_ADDRESSES[token] || contractAddress;
      const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
      let balance = await tokenContract.balanceOf(address);

      // WETC uses 18 decimals (like native ETC), USDC and USDT use 6 decimals
      const decimals = token === 'wetc' ? 18 : 6;
      balance = parseFloat(ethers.utils.formatUnits(balance, decimals));
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

      // Get current gas price from the network (Legacy transaction)
      const gasPrice = await provider.getGasPrice();

      // Creating and sending the transaction object (Type 0 Legacy)
      return signer.sendTransaction({
        to: receiver,
        value: ethers.utils.parseUnits(amount, "ether"),
        gasLimit: limit,
        nonce: await signer.getTransactionCount(),
        gasPrice: gasPrice,
        type: 0
      })
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
   * Send ERC20 tokens (USDC, USDT, or WETC)
   * @param {object} params - Transaction parameters
   * @param {string} params.token - Token symbol ('usdc', 'usdt', or 'wetc')
   * @param {string} params.privateKey - Sender's private key
   * @param {string} params.amount - Amount to send
   * @param {string} params.receiver - Recipient's Ethereum Classic address
   * @param {string} params.contractAddress - Optional custom contract address
   * @returns {Promise} Transaction promise
   */
  const sendToken = ethOperator.sendToken = async ({ token, privateKey, amount, receiver, contractAddress }) => {
    const provider = getProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    const tokenContract = new ethers.Contract(CONTRACT_ADDRESSES[token] || contractAddress, ERC20ABI, wallet);
    // Convert amount to smallest unit: WETC uses 18 decimals, USDC and USDT use 6 decimals
    const decimals = token === 'wetc' ? 18 : 6;
    const amountWei = ethers.utils.parseUnits(amount.toString(), decimals);

    // Get gas price for legacy transaction
    const gasPrice = await provider.getGasPrice();

    return tokenContract.transfer(receiver, amountWei, {
      gasPrice: gasPrice,
      type: 0
    })
  }


  const MORALIS_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjNmMjE5NjM5LTQwYmYtNDhkMC1hNDMxLTI5YjA4YzhlYzE5MiIsIm9yZ0lkIjoiNDkwNTU1IiwidXNlcklkIjoiNTA0NzE5IiwidHlwZUlkIjoiYWNiMjQzOWUtMDEzYy00YjhjLWI2N2MtNjRlNGNhMjA4YTlkIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3Njg1MDcyNTIsImV4cCI6NDkyNDI2NzI1Mn0.X4Hn3VxLVRJL6HlAGPFQdWvQAdTXO20_Z8CpWhNt5CE';

  /**
   * Get transaction history for an Ethereum Classic address using BlockScout API
   * @param {string} address - Ethereum Classic address
   * @param {object} options - Optional parameters
   * @returns {Promise<Array>} Array of transactions
   */
  const getTransactionHistory = ethOperator.getTransactionHistory = async (address, options = {}) => {
    try {
      if (!address || !isValidAddress(address)) {
        throw new Error('Invalid Ethereum Classic address');
      }

      const {
        page = 1,
        offset = 100,
      } = options;

      // BlockScout API endpoint for Ethereum Classic
      const blockscoutUrl = `https://blockscout.com/etc/mainnet/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=${offset}&sort=desc`;

      // List of CORS proxies for redundancy
      const proxies = [
        'https://api.allorigins.win/get?url=',
        'https://corsproxy.io/?'
      ];

      // Retry logic (up to 5 attempts with proxy rotation)
      let response, data, lastError;
      for (let attempt = 1; attempt <= 5; attempt++) {
        const currentProxy = proxies[(attempt - 1) % proxies.length];
        try {
          if (attempt > 1) {
            const delay = 500 * attempt; // Exponential backoff for retries
            await new Promise(resolve => setTimeout(resolve, delay));
            console.log(`Retry ${attempt}/5 for ${address} using ${currentProxy}`);
          }

          const finalUrl = currentProxy + encodeURIComponent(blockscoutUrl);
          response = await fetch(finalUrl);

          if (response.ok) {
            const result = await response.json();
            // Handle different proxy response formats (AllOrigins wraps JSON, CORSProxy.io is direct)
            const contents = result.contents ? result.contents : JSON.stringify(result);
            data = typeof contents === 'string' ? JSON.parse(contents) : contents;
            break; // Success!
          }

          lastError = `Status ${response.status} ${response.statusText}`;
        } catch (err) {
          lastError = err.message;
          console.warn(`Proxy ${currentProxy} failed on attempt ${attempt}: ${lastError}`);
        }
      }

      if (!data || !data.result || data.status !== '1') {
        if (lastError && !data) {
          throw new Error(`Failed to fetch transactions after 5 attempts. Last error: ${lastError}`);
        }
        // No transactions found or API returned status '0' (which usually means no txs for this address)
        return [];
      }

      // Parse and format transactions from BlockScout response
      return data.result.map(tx => {
        const isReceived = tx.to && tx.to.toLowerCase() === address.toLowerCase();
        const value = parseFloat(ethers.utils.formatEther(tx.value || '0'));

        return {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: value,
          symbol: 'ETC',
          timestamp: parseInt(tx.timeStamp),
          blockNumber: parseInt(tx.blockNumber),
          isReceived: isReceived,
          isSent: !isReceived,
          gasUsed: tx.gasUsed ? parseInt(tx.gasUsed) : 0,
          gasPrice: tx.gasPrice ? parseFloat(ethers.utils.formatUnits(tx.gasPrice, 'gwei')) : 0,
          isError: tx.isError === '1',
          contractAddress: tx.contractAddress || null,
          tokenName: null,
          confirmations: parseInt(tx.confirmations || '0'),
          nonce: tx.nonce ? parseInt(tx.nonce) : 0,
          input: tx.input || '0x',
          isTokenTransfer: false
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
      let tokenTransfer = null;
      if (receipt && receipt.logs.length > 0) {
        // Try to decode ERC20 Transfer event
        const transferEventSignature = ethers.utils.id('Transfer(address,address,uint256)');
        const transferLog = receipt.logs.find(log => log.topics[0] === transferEventSignature);

        if (transferLog) {
          try {
            const tokenContract = new ethers.Contract(transferLog.address, ERC20ABI, provider);
            const [symbol, decimals] = await Promise.all([
              tokenContract.symbol().catch(() => 'TOKEN'),
              tokenContract.decimals().catch(() => 18)
            ]);

            const from = ethers.utils.getAddress('0x' + transferLog.topics[1].slice(26));
            const to = ethers.utils.getAddress('0x' + transferLog.topics[2].slice(26));
            const value = parseFloat(ethers.utils.formatUnits(transferLog.data, decimals));

            tokenTransfer = {
              from,
              to,
              value,
              symbol,
              contractAddress: transferLog.address
            };
          } catch (e) {
            console.warn('Could not decode token transfer:', e);
          }
        }
      }

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: parseFloat(ethers.utils.formatEther(tx.value)),
        symbol: 'ETC',
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
        tokenTransfer: tokenTransfer,
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
