(function (EXPORTS) {
  //maticOperator v1.0.2
  /* ETH Crypto and API Operator */
  if (!window.ethers) return console.error("ethers.js not found");
  const maticOperator = EXPORTS;
  const isValidAddress = (maticOperator.isValidAddress = (address) => {
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
    usdc: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
    usdt: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
  };
  function getProvider() {
    // switches provider based on whether the user is using MetaMask or not
    const maticMainnet = {
      chainId: 137, // Hexadecimal representation of 137
      name: 'matic',
      rpc: 'https://polygon-mainnet.g.alchemy.com/v2/Xycml_AQd_BHbbUME4fNAjGGR2ILxYWO', // RPC URL for Polygon (Matic)
      explorer: 'https://polygonscan.com'
    };
    if (window.ethereum) {
      return new ethers.providers.Web3Provider(window.ethereum);
    } else {
      return new ethers.providers.JsonRpcProvider(maticMainnet.rpc, maticMainnet);
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
  // connectToMetaMask();
  const getBalance = (maticOperator.getBalance = async (address) => {
    try {
      if (!address || !isValidAddress(address))
        return new Error("Invalid address");
      // Get the balance
      const provider = getProvider();
      const balanceWei = await provider.getBalance(address);
      const balanceEth = parseFloat(ethers.utils.formatEther(balanceWei));
      return balanceEth;
    } catch (error) {
      console.error("Error:", error.message);
      return error;
    }
  });
  const getTokenBalance = (maticOperator.getTokenBalance = async (
    address,
    token,
    { contractAddress } = {}
  ) => {
      try {
        // if (!window.ethereum.isConnected()) {
        //   await connectToMetaMask();
        // }
        if (!token)
          return new Error("Token not specified");
        if (!CONTRACT_ADDRESSES[token] && contractAddress)
          return new Error('Contract address of token not available')
        const usdcContract = new ethers.Contract(CONTRACT_ADDRESSES[token] || contractAddress, BEP20ABI, getProvider());
        let balance = await usdcContract.balanceOf(address);
        balance = parseFloat(ethers.utils.formatUnits(balance, 6)); // Assuming 6 decimals
        return balance;
      } catch (e) {
        console.error(e);
      }
  });

  const estimateGas = (maticOperator.estimateGas = async ({
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

  const sendTransaction = (maticOperator.sendTransaction = async ({
    privateKey,
    receiver,
    amount,
  }) => {
    try {
      const provider = getProvider();
      const signer = new ethers.Wallet(privateKey, provider);
      const limit = await estimateGas({ privateKey, receiver, amount });
      // Creating and sending the transaction object
      return signer.sendTransaction({
        to: receiver,
        value: ethers.utils.parseUnits(amount, "ether"),
        gasLimit: limit,
        nonce: signer.getTransactionCount(),
        maxPriorityFeePerGas: ethers.utils.parseUnits("2", "gwei"),
      });
    } catch (e) {
      throw new Error(e);
    }
  });

  const sendToken = (maticOperator.sendToken = async ({
    token,
    privateKey,
    amount,
    receiver,
    contractAddress,
  }) => {
    try {
      // Create a wallet using the private key
      const wallet = new ethers.Wallet(privateKey, getProvider());
      
      // Contract interface
      const tokenContract = new ethers.Contract(
        CONTRACT_ADDRESSES[token] || contractAddress,
        BEP20ABI,
        wallet
      );
  
      // Fetch the correct number of decimals for the token
      const decimals = await tokenContract.decimals();
  
      // Convert the amount to the smallest unit of the token
      const amountWei = ethers.utils.parseUnits(amount.toString(), decimals);
  
      // Estimate gas limit for the transaction
      let gasLimit;
      try {
        gasLimit = await tokenContract.estimateGas.transfer(receiver, amountWei);
      } catch (error) {
        console.warn("Gas limit estimation failed, using default gas limit:", error);
        gasLimit = ethers.BigNumber.from("60000"); // Default value, adjust as necessary
      }
  
      // Get the current gas price and add a buffer to avoid the "replacement fee too low" error
      let gasPrice;
      try {
        gasPrice = await wallet.provider.getGasPrice();
        gasPrice = gasPrice.mul(ethers.BigNumber.from(2)); // Increase the gas price to avoid the error
      } catch (error) {
        console.warn("Gas price fetching failed, using default gas price:", error);
        gasPrice = ethers.utils.parseUnits("5", "gwei"); // Default value, adjust as necessary
      }
  
      // Check if the wallet has enough balance to cover gas fees
      const gasCost = gasPrice.mul(gasLimit);
      const balance = await wallet.getBalance();
      if (balance.lt(gasCost)) {
        throw new Error("Insufficient funds for gas fee");
      }
  
      // Call the transfer function on the token contract
      const tx = await tokenContract.transfer(receiver, amountWei, {
        gasLimit: gasLimit,
        gasPrice: gasPrice,
      });
  
      await tx.wait(); // Wait for the transaction to be mined
  
      return tx;
    } catch (error) {
      console.error("Token transfer error:", error);
      throw new Error("Failed to transfer token");
    }
  });
})("object" === typeof module ? module.exports : (window.maticOperator = {}));
