(function (EXPORTS) {
    /**
     * ethOperator.js
     * 
     * Core logic for interacting with the Mantle network. 
     * Handles address validation, balance checks, gas estimation (the hard part),
     * and transaction management for both MNT and ERC20 tokens.
     */
    if (!window.ethers)
        return console.error('ethers.js not found')
    const ethOperator = EXPORTS;
    const isValidAddress = ethOperator.isValidAddress = (address) => {
        try {
            // We verify both checksummed and non-checksummed addresses to be user-friendly.
            // Some scanners/explorers might provide lowercased addresses.
            const isValidChecksum = ethers.utils.isAddress(address);
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
        usdc: "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9",
        usdt: "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE",
        wmnt: "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8"
    }

    const MANTLE_GAS_ORACLE = "0x420000000000000000000000000000000000000F";
    const GAS_ORACLE_ABI = [
        "function getL1Fee(bytes data) view returns (uint256)",
        "function l1BaseFee() view returns (uint256)"
    ];
    /**
     * Determines which provider to use. 
     * By default, we prefer the Public RPC for balance checks to avoid 
     * unnecessary MetaMask population/permissions.
     */
    const getProvider = ethOperator.getProvider = (readOnly = false) => {
        if (!readOnly && window.ethereum) {
            return new ethers.providers.Web3Provider(window.ethereum);
        } else {
            return new ethers.providers.JsonRpcProvider(`https://rpc.mantle.xyz`)
        }
    }
    // Note: Connection logic is managed in index.html, we just handle the pipe here.
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

            // Fetching via Public RPC for speed and to avoid MetaMask prompts.
            const provider = getProvider(true);
            const tokenAddress = CONTRACT_ADDRESSES[token] || contractAddress;
            const tokenContract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
            let balance = await tokenContract.balanceOf(address);

            // Tokens like USDC/USDT use 6 decimals, while WMNT/MNT use 18.
            const decimals = token === 'wmnt' ? 18 : 6;
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

            let gasLimit;
            try {
                gasLimit = await provider.estimateGas({
                    from: signer.address,
                    to: receiver,
                    value: ethers.utils.parseUnits(amount, "ether"),
                });
            } catch (estimateError) {
                // If RPC estimation fails (often due to balance or sequencer check), 
                // we use a block-limit fallback that triggers our secondary check below.
                console.warn('Gas estimation RPC call failed, using fallback:', estimateError.message);
                gasLimit = ethers.BigNumber.from("89000000");
            }

            /**
             * MANTLE SPECIFIC: Sequence Logic
             * The sequencer often returns the block limit (~89M) if it thinks the tx will fail 
             * or if the gas is below the L1 requirement. To satisfy the "intrinsic gas" check, 
             * we calculate the limit relative to the L1 Base Fee.
             * 
             * A threshold of 80M is used to identify these "fake" estimates from the sequencer.
             */
            try {
                const gasLimitValue = BigInt(gasLimit.toString());
                if (gasLimitValue > 1000000n) {
                    const oracle = new ethers.Contract(MANTLE_GAS_ORACLE, GAS_ORACLE_ABI, getProvider(true));
                    const l1BaseFee = await oracle.l1BaseFee();

                    if (l1BaseFee.gt(21000)) {
                        // 80M is a safe "super buffer" threshold for the Mantle sequencer.
                        const minLimit = ethers.BigNumber.from("80000000");
                        const fallbackLimit = l1BaseFee.gt(minLimit) ? l1BaseFee.add(1000000) : minLimit;
                        return fallbackLimit;
                    }
                    return ethers.BigNumber.from("21000");
                }
            } catch (err) {
                console.warn('Error in gas limit fallback logic:', err);
                if (gasLimit.gt(1000000)) return ethers.BigNumber.from("21000");
            }
            return gasLimit;
        } catch (e) {
            console.warn('Gas estimation failed completely, using default 21000', e);
            return ethers.BigNumber.from("21000");
        }
    }

    /**
     * Get Mantle L1 fee based on transaction data
     * @param {string} data - The hex transaction data
     * @returns {Promise<ethers.BigNumber>} - The estimated L1 fee in Wei
     */
    const getL1Fee = ethOperator.getL1Fee = async (data = "0x") => {
        try {
            const provider = getProvider(true);
            const oracle = new ethers.Contract(MANTLE_GAS_ORACLE, GAS_ORACLE_ABI, provider);
            return await oracle.getL1Fee(data);
        } catch (e) {
            console.error('L1 Fee estimation error:', e);
            return ethers.BigNumber.from("0");
        }
    }

    const sendTransaction = ethOperator.sendTransaction = async ({ privateKey, receiver, amount }) => {
        try {
            const provider = getProvider();
            const signer = new ethers.Wallet(privateKey, provider);
            const limit = await estimateGas({ privateKey, receiver, amount })

            const gasPrice = await provider.getGasPrice();

            // We force Legacy (Type 0) transactions here. 
            // Mantle's L2 infrastructure is currently more stable with legacy transactions 
            // than with EIP-1559 due to specific L1 fee rollup logic.
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
     * Send ERC20 tokens (USDC, USDT, or WMNT)
     * @param {object} params - Transaction parameters
     * @param {string} params.token - Token symbol ('usdc', 'usdt', or 'wmnt')
     * @param {string} params.privateKey - Sender's private key
     * @param {string} params.amount - Amount to send
     * @param {string} params.receiver - Recipient's Mantle address
     * @param {string} params.contractAddress - Optional custom contract address
     * @returns {Promise} Transaction promise
     */
    const sendToken = ethOperator.sendToken = async ({ token, privateKey, amount, receiver, contractAddress }) => {
        const wallet = new ethers.Wallet(privateKey, getProvider());
        const tokenContract = new ethers.Contract(CONTRACT_ADDRESSES[token] || contractAddress, ERC20ABI, wallet);
        // Convert amount to smallest unit: WMNT uses 18 decimals, USDC and USDT use 6 decimals
        const decimals = token === 'wmnt' ? 18 : 6;
        const amountWei = ethers.utils.parseUnits(amount.toString(), decimals);
        return tokenContract.transfer(receiver, amountWei)
    }



    /**
    * Get transaction history for a Mantle address using Mobula API
    * Free API with full transaction history support
    * @param {string} address - Mantle address
    * @param {object} options - Optional parameters
    * @returns {Promise<Array>} Array of transactions
    */
    const getTransactionHistory = ethOperator.getTransactionHistory = async (address, options = {}) => {
        try {
            if (!address || !isValidAddress(address)) {
                throw new Error('Invalid Mantle address');
            }

            const { page = 1, offset = 50 } = options;

            // We use Mobula API because it provides the best free-tier support for Mantle history.
            const MOBULA_API_URL = 'https://api.mobula.io/api/1/wallet/transactions';
            const url = `${MOBULA_API_URL}?wallet=${address}&blockchain=mantle&limit=${offset}&offset=${(page - 1) * offset}`;


            const response = await fetch(url);

            if (!response.ok) {
                console.warn(`Mobula API returned ${response.status}`);
                return [];
            }

            const data = await response.json();

            if (!data.data || !data.data.transactions || data.data.transactions.length === 0) {
                return [];
            }

            // Normalizing Mobula data to our unified transaction format.
            const transactions = data.data.transactions
                .filter(tx => tx.blockchain && tx.blockchain.toLowerCase() === 'mantle')
                .map(tx => {
                    const isReceived = tx.to && tx.to.toLowerCase() === address.toLowerCase();

                    // tx_cost is returned in MNT by Mobula, representing the total fee paid.
                    const txFee = parseFloat(tx.tx_cost || 0);

                    return {
                        hash: tx.hash,
                        from: tx.from,
                        to: tx.to,
                        value: parseFloat(tx.amount || 0),
                        symbol: tx.asset?.symbol || 'MNT',
                        timestamp: Math.floor(tx.timestamp / 1000),
                        blockNumber: tx.block_number,
                        isReceived: isReceived,
                        isSent: !isReceived,
                        gasUsed: txFee > 0 ? 21000 : 0,
                        gasPrice: txFee > 0 ? (txFee / 21000) * 1e18 : 0,
                        transactionFee: txFee,
                        isError: false,
                        contractAddress: tx.contract !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ? tx.contract : null,
                        tokenName: tx.asset?.name || null,
                        confirmations: 0,
                        nonce: 0,
                        input: '0x',
                        isTokenTransfer: tx.type !== 'native',
                        amountUSD: tx.amount_usd,
                        txType: tx.type,
                        txCost: tx.tx_cost
                    };
                });


            return transactions;

        } catch (error) {
            console.error('Error fetching transaction history:', error);
            return [];
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

            const provider = getProvider(true);
            const tx = await provider.getTransaction(txHash);

            if (!tx) {
                throw new Error('Transaction not found');
            }

            const receipt = await provider.getTransactionReceipt(txHash);
            const currentBlock = await provider.getBlockNumber();
            const block = await provider.getBlock(tx.blockNumber);

            const gasUsed = receipt ? receipt.gasUsed : null;
            const effectiveGasPrice = receipt ? receipt.effectiveGasPrice : tx.gasPrice;
            const gasFee = gasUsed && effectiveGasPrice ?
                parseFloat(ethers.utils.formatEther(gasUsed.mul(effectiveGasPrice))) : null;

            // Decoding ERC20 transfers by looking for the standard Transfer(address,address,uint256) event.
            let tokenTransfer = null;
            if (receipt && receipt.logs.length > 0) {
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
                        console.warn('Could not decode token transfer event:', e);
                    }
                }
            }

            return {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: parseFloat(ethers.utils.formatEther(tx.value)),
                symbol: 'MNT',
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
            console.error('Error fetching deep transaction details:', error);
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
