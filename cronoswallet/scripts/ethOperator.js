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
    // Cronos network token addresses
    usdc: "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59", // USDC on Cronos
    usdt: "0x66e428c3f67a68878562e79A0234c1F83c208770", // USDT on Cronos
    wcro: "0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23"  // Wrapped CRO on Cronos
  }
  /**
   * Get Cronos provider (MetaMask or public RPC)
   * @param {boolean} readOnly - If true, use public RPC; if false, use MetaMask when available
   * @returns {ethers.providers.Provider} Cronos provider instance
   */
  const getProvider = ethOperator.getProvider = (readOnly = false) => {
    if (!readOnly && window.ethereum) {
      return new ethers.providers.Web3Provider(window.ethereum);
    } else {
      return new ethers.providers.JsonRpcProvider(`https://evm.cronos.org`)
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

      // WCRO uses 18 decimals (like native CRO), USDC and USDT use 6 decimals
      const decimals = token === 'wcro' ? 18 : 6;
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
   * Send ERC20 tokens (USDC, USDT, or WCRO)
   * @param {object} params - Transaction parameters
   * @param {string} params.token - Token symbol ('usdc', 'usdt', or 'wcro')
   * @param {string} params.privateKey - Sender's private key
   * @param {string} params.amount - Amount to send
   * @param {string} params.receiver - Recipient's Cronos address
   * @param {string} params.contractAddress - Optional custom contract address
   * @returns {Promise} Transaction promise
   */
  const sendToken = ethOperator.sendToken = async ({ token, privateKey, amount, receiver, contractAddress }) => {
    const wallet = new ethers.Wallet(privateKey, getProvider());
    const tokenContract = new ethers.Contract(CONTRACT_ADDRESSES[token] || contractAddress, ERC20ABI, wallet);
    // Convert amount to smallest unit: WCRO uses 18 decimals, USDC and USDT use 6 decimals
    const decimals = token === 'wcro' ? 18 : 6;
    const amountWei = ethers.utils.parseUnits(amount.toString(), decimals);
    return tokenContract.transfer(receiver, amountWei)
  }


  const MORALIS_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjNmMjE5NjM5LTQwYmYtNDhkMC1hNDMxLTI5YjA4YzhlYzE5MiIsIm9yZ0lkIjoiNDkwNTU1IiwidXNlcklkIjoiNTA0NzE5IiwidHlwZUlkIjoiYWNiMjQzOWUtMDEzYy00YjhjLWI2N2MtNjRlNGNhMjA4YTlkIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3Njg1MDcyNTIsImV4cCI6NDkyNDI2NzI1Mn0.X4Hn3VxLVRJL6HlAGPFQdWvQAdTXO20_Z8CpWhNt5CE';

  /**
   * Get transaction history for a Cronos address using Moralis API
   * @param {string} address - Cronos address
   * @param {object} options - Optional parameters
   * @returns {Promise<Array>} Array of transactions
   */
  const getTransactionHistory = ethOperator.getTransactionHistory = async (address, options = {}) => {
    try {
      if (!address || !isValidAddress(address)) {
        throw new Error('Invalid Cronos address');
      }

      const {
        page = 1,
        offset = 100,
      } = options;

      // Moralis API endpoint for Cronos 
      const chain = '0x19'; // Cronos chain ID in hex

      // Fetch transactions using Moralis API
      const moralisUrl = `https://deep-index.moralis.io/api/v2.2/${address}?chain=${chain}&limit=${offset}`;

      const response = await fetch(moralisUrl, {
        headers: {
          'Accept': 'application/json',
          'X-API-Key': MORALIS_API_KEY
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Moralis API Error: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();

      if (!data.result || data.result.length === 0) {
        return [];
      }

      // Parse and format transactions from Moralis response
      return data.result.map(tx => {
        const isReceived = tx.to_address && tx.to_address.toLowerCase() === address.toLowerCase();
        const value = parseFloat(ethers.utils.formatEther(tx.value || '0'));

        return {
          hash: tx.hash,
          from: tx.from_address,
          to: tx.to_address,
          value: value,
          symbol: 'CRO',
          timestamp: new Date(tx.block_timestamp).getTime() / 1000,
          blockNumber: parseInt(tx.block_number),
          isReceived: isReceived,
          isSent: !isReceived,
          gasUsed: tx.receipt_gas_used ? parseInt(tx.receipt_gas_used) : 0,
          gasPrice: tx.gas_price ? parseFloat(ethers.utils.formatUnits(tx.gas_price, 'gwei')) : 0,
          isError: tx.receipt_status === '0',
          contractAddress: tx.to_address && tx.input !== '0x' ? tx.to_address : null,
          tokenName: null,
          confirmations: 0,
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
