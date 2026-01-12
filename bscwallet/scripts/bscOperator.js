(function (EXPORTS) {
  //bscOperator v1.0.2
  /* ETH Crypto and API Operator */
  if (!window.ethers) return console.error("ethers.js not found");
  const bscOperator = EXPORTS;
  const isValidAddress = (bscOperator.isValidAddress = (address) => {
    try {
      // Check if the address is a valid checksum address
      const isValidChecksum = ethers.utils.isAddress(address);
      // Check if the address is a valid non-checksum address
      const isValidNonChecksum =
        ethers.utils.getAddress(address) === address.toLowerCase();
      return isValidChecksum || isValidNonChecksum;
    } catch (error) {
      return false;
    }
  });
  const BEP20ABI = [
    {
      constant: true,
      inputs: [],
      name: "name",
      outputs: [
        {
          name: "",
          type: "string",
        },
      ],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
    {
      constant: false,
      inputs: [
        {
          name: "_spender",
          type: "address",
        },
        {
          name: "_value",
          type: "uint256",
        },
      ],
      name: "approve",
      outputs: [
        {
          name: "",
          type: "bool",
        },
      ],
      payable: false,
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      constant: true,
      inputs: [],
      name: "totalSupply",
      outputs: [
        {
          name: "",
          type: "uint256",
        },
      ],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
    {
      constant: false,
      inputs: [
        {
          name: "_from",
          type: "address",
        },
        {
          name: "_to",
          type: "address",
        },
        {
          name: "_value",
          type: "uint256",
        },
      ],
      name: "transferFrom",
      outputs: [
        {
          name: "",
          type: "bool",
        },
      ],
      payable: false,
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      constant: true,
      inputs: [],
      name: "decimals",
      outputs: [
        {
          name: "",
          type: "uint8",
        },
      ],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
    {
      constant: true,
      inputs: [
        {
          name: "_owner",
          type: "address",
        },
      ],
      name: "balanceOf",
      outputs: [
        {
          name: "balance",
          type: "uint256",
        },
      ],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
    {
      constant: true,
      inputs: [],
      name: "symbol",
      outputs: [
        {
          name: "",
          type: "string",
        },
      ],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
    {
      constant: false,
      inputs: [
        {
          name: "_to",
          type: "address",
        },
        {
          name: "_value",
          type: "uint256",
        },
      ],
      name: "transfer",
      outputs: [
        {
          name: "",
          type: "bool",
        },
      ],
      payable: false,
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      constant: true,
      inputs: [
        {
          name: "_owner",
          type: "address",
        },
        {
          name: "_spender",
          type: "address",
        },
      ],
      name: "allowance",
      outputs: [
        {
          name: "",
          type: "uint256",
        },
      ],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
    {
      payable: true,
      stateMutability: "payable",
      type: "fallback",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          name: "owner",
          type: "address",
        },
        {
          indexed: true,
          name: "spender",
          type: "address",
        },
        {
          indexed: false,
          name: "value",
          type: "uint256",
        },
      ],
      name: "Approval",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          name: "from",
          type: "address",
        },
        {
          indexed: true,
          name: "to",
          type: "address",
        },
        {
          indexed: false,
          name: "value",
          type: "uint256",
        },
      ],
      name: "Transfer",
      type: "event",
    },
  ];
  const CONTRACT_ADDRESSES = {
    usdc: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
    usdt: "0x55d398326f99059ff775485246999027b3197955",
  };
  function getProvider() {
    // switches provider based on whether the user is using MetaMask or not
    const bscMainnet = {
      chainId: 56,
      name: "binance",
      rpc: "https://bsc-dataseed.binance.org/",
      explorer: "https://bscscan.com",
    };

    if (window.ethereum) {
      return new ethers.providers.Web3Provider(window.ethereum);
    } else {
      return new ethers.providers.JsonRpcProvider(bscMainnet.rpc, bscMainnet);
    }
  }
  function connectToMetaMask() {
    return new Promise((resolve, reject) => {
      // if (typeof window.ethereum === "undefined")
      //   return reject("MetaMask not installed");
      return resolve(true);
      ethereum
        .request({ method: "eth_requestAccounts" })
        .then((accounts) => {
          console.log("Connected to MetaMask");
          return resolve(accounts);
        })
        .catch((err) => {
          console.log(err);
          return reject(err);
        });
    });
  }
  const getTransactionHistory = (bscOperator.getTransactionHistory = async (
    address,
    cursor = null
  ) => {
    try {
      if (!address || !isValidAddress(address))
        return new Error("Invalid address");
      
      // Moralis API endpoint for BSC transactions
      const MORALIS_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjQyZWNiMjk0LTBiMGItNDg4Yy1hNjUwLTE4NmJhMjFjNjNhYyIsIm9yZ0lkIjoiNDg4NzAzIiwidXNlcklkIjoiNTAyODExIiwidHlwZUlkIjoiZjE5ZmZjYTYtNDllMS00NTdlLTllNjgtMGI1MDIyODU2N2Q4IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3Njc1NDkxNDQsImV4cCI6NDkyMzMwOTE0NH0.yr_jtBCrrid4Y5d48iTwJ4PwgMOZn8mwWyiQ7dAmNvw";
      
      // Fetch 10 transactions per page
      const url = `https://deep-index.moralis.io/api/v2/${address}?chain=bsc&limit=10${cursor ? `&cursor=${cursor}` : ''}`;

      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "X-API-Key": MORALIS_API_KEY
        }
      });
      const data = await response.json();

      if (data.result && Array.isArray(data.result)) {
        // Get current block number to calculate confirmations
        const provider = getProvider();
        const currentBlockNumber = await provider.getBlockNumber();
        
        const transactions = data.result.map((tx) => ({
          hash: tx.hash,
          from: tx.from_address,
          to: tx.to_address,
          value: tx.value,
          timeStamp: Math.floor(new Date(tx.block_timestamp).getTime() / 1000),
          blockNumber: tx.block_number,
          confirmations: currentBlockNumber - parseInt(tx.block_number),
          gasPrice: tx.gas_price,
          gasUsed: tx.receipt_gas_used,
        }));
        
        // Return transactions along with cursor for next page
        return {
          transactions: transactions,
          nextCursor: data.cursor || null,
          hasMore: !!data.cursor
        };
      } else {
        console.error("Error fetching transaction history:", data.message || "No results");
        return {
          transactions: [],
          nextCursor: null,
          hasMore: false
        };
      }
    } catch (error) {
      console.error("Error:", error.message);
      return error;
    }
  });

  const getTransactionDetails = (bscOperator.getTransactionDetails = async (
    txHash
  ) => {
    try {
      if (!txHash || !/^0x([A-Fa-f0-9]{64})$/.test(txHash)) return null;
      const provider = getProvider();
      const tx = await provider.getTransaction(txHash);

      if (!tx) return null;
      const receipt = await provider.getTransactionReceipt(txHash);

      let timestamp = null;
      let confirmations = 0;
      if (tx.blockNumber) {
        const block = await provider.getBlock(tx.blockNumber);
        timestamp = block.timestamp;
        const currentBlockNumber = await provider.getBlockNumber();
        confirmations = currentBlockNumber - tx.blockNumber;
      }

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        gasPrice: tx.gasPrice,
        gasUsed: receipt ? receipt.gasUsed : null,
        blockNumber: tx.blockNumber,
        timeStamp: timestamp,
        confirmations: confirmations,
        status: receipt ? (receipt.status ? "success" : "failed") : "pending",
      };
    } catch (error) {
      console.error("Error fetching transaction details:", error);
      return null;
    }
  });

  const getBalance = (bscOperator.getBalance = async (address) => {
    try {
      if (!address || !isValidAddress(address)) {
        return new Error("Invalid address");
      }
  
      const provider = getProvider();
      const balanceWei = await provider.getBalance(address);
      const balanceEth = parseFloat(ethers.utils.formatEther(balanceWei));
      return balanceEth;
    } catch (error) {
      console.error("Error in getBalance:", error);
      return error;
    }
  });

  const getTokenBalance = (bscOperator.getTokenBalance = async (
    address,
    token,
    { contractAddress } = {}
  ) => {
    try {
      if (!address) {
        
        throw new Error("Address not specified");
      }
      if (!token) {
       
        throw new Error("Token not specified");
      }
      if (!CONTRACT_ADDRESSES[token] && !contractAddress) {
        
        throw new Error("Contract address of token not available");
      }

      const provider = getProvider();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES[token] || contractAddress,
        BEP20ABI,
        provider
      );

      let balance = await contract.balanceOf(address);

      const decimals = 18;
      balance = parseFloat(ethers.utils.formatUnits(balance, decimals));

      return balance;
    } catch (e) {
      console.error("Error in getTokenBalance:", e);
      throw e;
    }
  });


  const estimateGas = (bscOperator.estimateGas = async ({
    privateKey,
    receiver,
    amount,
  }) => {
    try {
      const provider = getProvider();
      const signer = new ethers.Wallet(privateKey, provider);
      return provider.estimateGas({
        from: signer.address,
        to: receiver,
        value: ethers.utils.parseUnits(amount, "ether"),
      });
    } catch (e) {
      throw new Error(e);
    }
  });

  const sendTransaction = (bscOperator.sendTransaction = async ({
    privateKey,
    receiver,
    amount,
  }) => {
    try {
      const provider = getProvider();
      const signer = new ethers.Wallet(privateKey, provider);

      const limit = await estimateGas({ privateKey, receiver, amount });

      const tx = await signer.sendTransaction({
        to: receiver,
        value: ethers.utils.parseUnits(amount, "ether"),
        gasLimit: limit,
        nonce: await signer.getTransactionCount(),
        maxPriorityFeePerGas: ethers.utils.parseUnits("2", "gwei"),
      });

      return tx;
    } catch (e) {
      console.error("Error in sendTransaction:", e);
      throw e;
    }
  });

  const sendToken = (bscOperator.sendToken = async ({
    token,
    privateKey,
    amount,
    receiver,
    contractAddress,
  }) => {
    try {
      const wallet = new ethers.Wallet(privateKey, getProvider());

      const tokenContract = new ethers.Contract(
        CONTRACT_ADDRESSES[token] || contractAddress,
        BEP20ABI,
        wallet
      );

      const decimals = await tokenContract.decimals();

      const amountWei = ethers.utils.parseUnits(amount.toString(), decimals);

      const gasLimit = await tokenContract.estimateGas.transfer(
        receiver,
        amountWei
      );

      const gasPrice = await wallet.provider.getGasPrice();

      const gasCost = gasPrice.mul(gasLimit);

      const balance = await wallet.getBalance();

      if (balance.lt(gasCost)) {
        throw new Error("Insufficient funds for gas fee");
      }

      const tx = await tokenContract.transfer(receiver, amountWei, {
        gasLimit,
        gasPrice,
      });
      return tx;
    } catch (e) {
      console.error("Error in sendToken:", e);
      throw e;
    }
  });
})("object" === typeof module ? module.exports : (window.bscOperator = {}));
