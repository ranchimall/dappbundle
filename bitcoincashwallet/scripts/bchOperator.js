(function (EXPORTS) { //bchOperator v1.0.0
    /* BCH Crypto and API Operator */
    /* Based on btcOperator, modified for Bitcoin Cash (BCH) */
    const bchOperator = EXPORTS;
    const SATOSHI_IN_BCH = 1e8;

    // BCH uses SIGHASH_FORKID (0x40) combined with SIGHASH_ALL (0x01) = 0x41
    const SIGHASH_ALL = 0x01;
    const SIGHASH_FORKID = 0x40;
    const BCH_SIGHASH = SIGHASH_ALL | SIGHASH_FORKID; // 0x41

    const util = bchOperator.util = {};

    util.Sat_to_BCH = value => parseFloat((value / SATOSHI_IN_BCH).toFixed(8));
    util.BCH_to_Sat = value => parseInt(value * SATOSHI_IN_BCH);

    const ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
    const parseDate = util.parseDate = (d) => {
        if (!d) return null;
        if (typeof d === 'number') return d;
        let s = String(d);
        if (s.includes(' ') && !s.includes('Z') && !s.includes('+')) {
            return new Date(s.replace(' ', 'T') + 'Z').getTime();
        }
        return new Date(d).getTime();
    };

    const checkIfTor = bchOperator.checkIfTor = () => {
        return fetch('https://check.torproject.org/api/ip')
            .then(res => res.json())
            .then(res => {
                return res.IsTor
            }).catch(e => {
                console.error(e)
                return false
            })
    }
    let isTor = false;
    checkIfTor().then(result => isTor = result);

    async function post(url, data, { asText = false, contentType = 'application/json' } = {}) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': contentType
                },
                body: contentType === 'application/json' && typeof data !== 'string' ? JSON.stringify(data) : data
            })
            if (response.ok) {
                return asText ? await response.text() : await response.json()
            } else {
                throw response
            }
        } catch (e) {
            throw e
        }
    }



    const APIs = bchOperator.APIs = [
        {
            url: 'https://api.blockchain.info/haskoin-store/bch/',
            name: 'Blockchain.com (Haskoin)',
            balance({ addr }) {
                const cashAddr = bchOperator.toCashAddr(addr).replace('bitcoincash:', '');
                return fetch_api(`address/${cashAddr}/balance`, { url: this.url })
                    .then(result => util.Sat_to_BCH(result.confirmed + result.unconfirmed))
            },
            unspent({ addr, allowUnconfirmedUtxos = false }) {
                const cashAddr = bchOperator.toCashAddr(addr).replace('bitcoincash:', '');
                return fetch_api(`address/${cashAddr}/unspent`, { url: this.url })
                    .then(result => {
                        const utxos = (result || []).map(u => ({
                            tx_hash: u.txid,
                            tx_output_n: u.output !== undefined ? u.index : u.index, // Haskoin uses index
                            value: u.value,
                            date: u.block ? u.block.timestamp : Date.now(),
                            confirmations: u.block ? u.block.height : 0,
                            script: u.pkscript
                        }));
                        return formatUtxos(utxos, allowUnconfirmedUtxos);
                    })
            },
            tx({ txid }) {
                return fetch_api(`transaction/${txid}`, { url: this.url })
                    .then(result => formatTx(result))
            },
            txs({ addr }) {
                const cashAddr = bchOperator.toCashAddr(addr).replace('bitcoincash:', '');
                return fetch_api(`address/${cashAddr}/transactions`, { url: this.url })
                    .then(async result => {
                        const txs = result || [];
                        // We'll fetch all transaction details in parallel 
                        // Fetch full details for each transaction
                        const fullTxs = await Promise.all(txs.map(t =>
                            fetch_api(`transaction/${t.txid}`, { url: this.url })
                                .catch(e => null) // Ignore failed fetches
                        ));
                        return fullTxs.filter(t => t).map(res => formatTx(res));
                    })
            },

            latestBlock() {
                return fetch_api(`block/best`, { url: this.url })
                    .then(result => result.height);
            }
        },
        {
            url: 'https://api.blockcypher.com/v1/bch/main/',
            name: 'Blockcypher',
            balance({ addr }) {
                return fetch_api(`addrs/${addr}/balance`, { url: this.url })
                    .then(result => util.Sat_to_BCH(result.balance + result.unconfirmed_balance))
            },
            unspent({ addr, allowUnconfirmedUtxos = false }) {
                return fetch_api(`addrs/${addr}?unspentOnly=true`, { url: this.url })
                    .then(result => {
                        const utxos = (result.txrefs || []).concat(result.unconfirmed_txrefs || []).map(u => ({
                            tx_hash: u.tx_hash,
                            tx_output_n: u.tx_output_n,
                            value: u.value,
                            confirmations: u.confirmations
                        }));
                        return formatUtxos(utxos, allowUnconfirmedUtxos);
                    })
            },
            tx({ txid }) {
                return fetch_api(`txs/${txid}`, { url: this.url }).then(formatTx)
            },
            txs({ addr }) {
                return fetch_api(`addrs/${addr}/full`, { url: this.url })
                    .then(result => (result.txs || []).map(formatTx))
            },

            latestBlock() {
                return Promise.resolve([])
            }
        },
        {
            url: 'https://api.fullstack.cash/v5/',
            name: 'FullStack.cash',
            balance({ addr }) {
                const cashAddr = bchOperator.toCashAddr(addr);
                return fetch_api(`electrumx/balance/${cashAddr}`, { url: this.url })
                    .then(result => {
                        if (result.success && result.balance) {
                            return util.Sat_to_BCH(result.balance.confirmed + result.balance.unconfirmed);
                        }
                        throw result;
                    })
            },
            unspent({ addr, allowUnconfirmedUtxos = false }) {
                const cashAddr = bchOperator.toCashAddr(addr);
                return fetch_api(`electrumx/utxos/${cashAddr}`, { url: this.url })
                    .then(result => {
                        if (result.success && result.utxos) {
                            const utxos = result.utxos.map(u => ({
                                tx_hash: u.tx_hash,
                                tx_output_n: u.tx_pos,
                                value: u.value,
                                confirmations: u.height ? 1 : 0 // Height works as a good enough proxy for confirmation count.
                            }));
                            return formatUtxos(utxos, allowUnconfirmedUtxos);
                        }
                        throw result;
                    })
            },
            tx({ txid }) {
                return fetch_api(`rawtransactions/getRawTransaction/${txid}?verbose=true`, { url: this.url })
                    .then(result => formatTx(result))
            },
            txs({ addr }) {
                const cashAddr = bchOperator.toCashAddr(addr);
                return fetch_api(`electrumx/transactions/${cashAddr}`, { url: this.url })
                    .then(async result => {
                        if (result.success && result.transactions) {
                            const txs = result.transactions;
                            const fullTxs = await Promise.all(txs.map(t =>
                                fetch_api(`rawtransactions/getRawTransaction/${t.tx_hash}?verbose=true`, { url: this.url })
                                    .catch(e => null)
                            ));
                            return fullTxs.filter(t => t).map(res => formatTx(res));
                        }
                        return [];
                    })
            },
            latestBlock() {
                return fetch_api(`blockchain/getBlockchainInfo`, { url: this.url })
                    .then(result => result.blocks || 0);
            },
            broadcast({ rawTxHex }) {
                return fetch_api(`rawtransactions/sendRawTransaction/${rawTxHex}`, { url: this.url })
                    .then(result => result); // Returns txid directly usually
            }
        }
    ]


    bchOperator.util.format = {}
    const formatBlock = bchOperator.util.format.block = async (block) => {
        try {
            const { height, hash, id, time, timestamp, mrkl_root, merkle_root, prev_block, next_block, size } = block;
            const details = {
                height,
                hash: hash || id,
                time: (time || timestamp) * 1000,
                merkle_root: merkle_root || mrkl_root,
                size,
            }
            if (prev_block)
                details.prev_block = prev_block
            if (next_block)
                details.next_block = next_block[0]
            return details
        } catch (e) {
            throw e
        }
    }

    const formatUtxos = bchOperator.util.format.utxos = async (utxos, allowUnconfirmedUtxos = false) => {
        try {
            if (!utxos || !Array.isArray(utxos))
                throw {
                    message: "No utxos found",
                    code: 1000
                }
            return utxos.filter(utxo => {
                if (allowUnconfirmedUtxos) return true;
                return utxo.confirmations || utxo.block_id;
            }).map(utxo => {
                console.log('UTXO raw:', utxo);
                const { tx_hash, tx_hash_big_endian, txid, transaction_hash, tx_output_n, vout, index, value, script, confirmations, block_id } = utxo;
                return {
                    confirmations: confirmations || (block_id ? 1 : 0),
                    tx_hash_big_endian: tx_hash_big_endian || tx_hash || txid || transaction_hash,
                    tx_output_n: tx_output_n !== undefined ? tx_output_n : (vout !== undefined ? vout : index),
                    value,
                    script
                }
            })
        } catch (e) {
            throw e
        }
    }

    const formatTx = bchOperator.util.format.tx = (tx) => {
        try {
            let { txid, hash, time, block_height, fee, fees, received,
                confirmed, size, double_spend, block_hash, confirmations,
                transaction, inputs: txInputs, outputs: txOutputs, block
            } = tx;

            const normalizedBlockHeight = block_height || (block && typeof block === 'object' ? block.height : block);

            // Handle Blockchair format
            if (transaction) {
                return {
                    hash: transaction.hash,
                    size: transaction.size,
                    fee: transaction.fee,
                    time: new Date(transaction.time).getTime(),
                    block_height: transaction.block_id,
                    confirmations: transaction.confirmations || (transaction.block_id ? 1 : 0),
                    inputs: (txInputs || []).map(input => ({
                        index: input.index,
                        prev_out: {
                            addr: input.recipient,
                            value: input.value,
                        },
                    })),
                    out: (txOutputs || []).map(output => ({
                        addr: output.recipient,
                        value: output.value,
                    }))
                }
            }

            // Handle Blockcypher format
            const inputs = tx.vin || tx.inputs || [];
            const outputs = tx.vout || tx.outputs || tx.out || [];
            const txTime = (time || parseDate(confirmed || received) || Date.now());
            return {
                hash: hash || txid,
                size: size,
                fee: fee || fees,
                double_spend,
                time: String(txTime).length < 13 ? txTime * 1000 : txTime,
                block_height: normalizedBlockHeight,
                block_hash: block_hash,
                confirmations: confirmations,
                inputs: inputs.map(input => {
                    return {
                        index: input.output || input.n || input.output_index || input.vout,
                        prev_out: {
                            addr: input.address || input.addr || input.prev_out?.addr || input.addresses?.[0],
                            value: input.value || input.prev_out?.value || input.output_value,
                        },
                    }
                }),
                out: outputs.map(output => {
                    return {
                        addr: output.address || output.addr || output.addresses?.[0],
                        value: output.value,
                    }
                })
            }
        } catch (e) {
            throw e
        }
    }

    const multiApi = bchOperator.multiApi = async (fnName, { index = 0, ...args } = {}) => {
        try {
            while (index < APIs.length) {
                if (!APIs[index][fnName] || (APIs[index].coolDownTime && APIs[index].coolDownTime > new Date().getTime())) {
                    if (APIs[index].coolDownTime) console.log(`Skipping ${APIs[index].name} due to cooldown`);
                    index += 1;
                    continue;
                }
                console.log(`Calling ${fnName} on ${APIs[index].name}`);
                return await APIs[index][fnName](args);
            }
            throw "No API available"
        } catch (error) {
            console.error(error)
            if (!APIs[index])
                throw "No API available"
            APIs[index].coolDownTime = new Date().getTime() + 5000; // 5 seconds cooldown
            return multiApi(fnName, { index: index + 1, ...args });
        }
    };

    function parseTx(tx, addressOfTx) {
        const { txid, hash, time, block_height, block, inputs, outputs, out, vin, vout, fee, fees, received, confirmed } = tx;

        const normalize = (addr) => {
            if (!addr) return null;
            let n = bchOperator.fromCashAddr(addr) || addr;
            return String(n); // Keeping it Legacy internally makes comparisons way easier.
        };

        const normalizedAddressOfTx = normalize(addressOfTx);
        const txTime = (time || parseDate(confirmed || received) || Date.now());
        let parsedTx = {
            txid: hash || txid,
            time: String(txTime).length < 13 ? txTime * 1000 : txTime,
            block: block_height || block?.height || (block && typeof block === 'number' ? block : undefined),
        }

        parsedTx.tx_senders = {};
        (inputs || vin || []).forEach(i => {
            let address = normalize(i.address || i.addr || i.prev_out?.addr || i.addresses?.[0]);
            if (!address) return;
            const value = i.value || i.prev_out?.value || i.output_value;
            parsedTx.tx_senders[address] = (parsedTx.tx_senders[address] || 0) + value;
        });

        parsedTx.tx_input_value = 0;
        for (let senderAddr in parsedTx.tx_senders) {
            let val = parsedTx.tx_senders[senderAddr];
            parsedTx.tx_senders[senderAddr] = util.Sat_to_BCH(val);
            parsedTx.tx_input_value += val;
        }
        parsedTx.tx_input_value = util.Sat_to_BCH(parsedTx.tx_input_value);

        parsedTx.tx_receivers = {};
        (outputs || out || vout || []).forEach(o => {
            let address = normalize(o.address || o.addr || o.addresses?.[0]);
            if (!address) return;
            const value = o.value;
            parsedTx.tx_receivers[address] = (parsedTx.tx_receivers[address] || 0) + value;
        });

        parsedTx.tx_output_value = 0;
        for (let receiverAddr in parsedTx.tx_receivers) {
            let val = parsedTx.tx_receivers[receiverAddr];
            parsedTx.tx_receivers[receiverAddr] = util.Sat_to_BCH(val);
            parsedTx.tx_output_value += val;
        }
        parsedTx.tx_output_value = util.Sat_to_BCH(parsedTx.tx_output_value);

        if (fee || fees) {
            parsedTx.tx_fee = util.Sat_to_BCH(fee || fees);
        } else {
            parsedTx.tx_fee = parseFloat((parsedTx.tx_input_value - parsedTx.tx_output_value).toFixed(8));
        }

        if (Object.keys(parsedTx.tx_receivers).length === 1 && Object.keys(parsedTx.tx_senders).length === 1 && Object.keys(parsedTx.tx_senders)[0] === Object.keys(parsedTx.tx_receivers)[0]) {
            parsedTx.type = 'self';
            parsedTx.amount = parsedTx.tx_receivers[normalizedAddressOfTx];
            parsedTx.address = normalizedAddressOfTx;
        } else if (normalizedAddressOfTx in parsedTx.tx_senders) {
            parsedTx.type = 'out';
            parsedTx.receiver = Object.keys(parsedTx.tx_receivers).filter(addr => addr != normalizedAddressOfTx);
            // If it's an OUT transaction, the amount should be what was sent out (Total Out - Change)
            parsedTx.amount = parseFloat((parsedTx.tx_output_value - (parsedTx.tx_receivers[normalizedAddressOfTx] || 0)).toFixed(8));
        } else {
            parsedTx.type = 'in';
            parsedTx.sender = Object.keys(parsedTx.tx_senders).filter(addr => addr != normalizedAddressOfTx);
            parsedTx.amount = parsedTx.tx_receivers[normalizedAddressOfTx];
        }
        return parsedTx;
    }

    const DUST_AMT = 546,
        MIN_FEE_UPDATE = 219;

    const fetch_api = bchOperator.fetch = function (api, { asText = false, url = 'https://api.blockchair.com/bitcoin-cash/' } = {}) {
        return new Promise((resolve, reject) => {
            console.debug(url + api);
            fetch(url + api).then(response => {
                if (response.ok) {
                    (asText ? response.text() : response.json())
                        .then(result => resolve(result))
                        .catch(error => reject("Failed to parse response: " + error.message))
                } else {
                    response.json()
                        .then(result => reject(result))
                        .catch(() => reject(`API Error: ${response.status} ${response.statusText}`))
                }
            }).catch(error => {
                // This handles CORS errors and network failures
                console.error("Network or CORS error:", error);
                reject("Service unavailable or blocked (CORS)");
            })
        })
    };

    const get_fee_rate = bchOperator.get_fee_rate = function () {
        return new Promise((resolve) => {
            // Try Blockchair first
            fetch('https://api.blockchair.com/bitcoin-cash/stats').then(response => {
                if (response.ok) {
                    response.json().then(result => {
                        const feeRate = result.data?.suggested_transaction_fee_per_byte_sat || 1;
                        resolve(util.Sat_to_BCH(feeRate));
                    }).catch(() => resolve(util.Sat_to_BCH(1)));
                } else {
                    // Fallback to Blockchain.com
                    fetch('https://api.blockchain.info/haskoin-store/bch/block/best').then(res => {
                        // Blockchain.com is a bit stingy with fee data, so we default to a safe 1 sat/vbyte if Blockchair is down.
                        resolve(util.Sat_to_BCH(1));
                    }).catch(() => resolve(util.Sat_to_BCH(1)));
                }
            }).catch(() => resolve(util.Sat_to_BCH(1)))
        })
    }

    const broadcastTx = bchOperator.broadcastTx = rawTxHex => new Promise((resolve, reject) => {
        console.log('txHex:', rawTxHex)
        multiApi('broadcast', { rawTxHex })
            .then(result => resolve(result))
            .catch(error => reject(error))
    });

    // --- CashAddr Implementation ---

    function polymod(values) {
        let c = 1n;
        for (let v of values) {
            let b = c >> 35n;
            c = ((c & 0x07ffffffffn) << 5n) ^ BigInt(v);
            if (b & 1n) c ^= 0x98f2bc8e61n;
            if (b & 2n) c ^= 0x79b76d99e2n;
            if (b & 4n) c ^= 0xf33e5fb3c4n;
            if (b & 8n) c ^= 0xae2eabe2a8n;
            if (b & 16n) c ^= 0x1e4f43e470n;
        }
        return c ^ 1n;
    }

    function expandPrefix(prefix) {
        let ret = [];
        for (let i = 0; i < prefix.length; i++) {
            ret.push(prefix.charCodeAt(i) & 0x1f);
        }
        ret.push(0);
        return ret;
    }

    function convertBits(data, from, to, pad = true) {
        let acc = 0;
        let bits = 0;
        const ret = [];
        const maxv = (1 << to) - 1;
        for (let i = 0; i < data.length; ++i) {
            const value = data[i] & 0xff;
            acc = (acc << from) | value;
            bits += from;
            while (bits >= to) {
                bits -= to;
                ret.push((acc >> bits) & maxv);
            }
            acc &= (1 << bits) - 1;
        }
        if (pad) {
            if (bits > 0) {
                ret.push((acc << (to - bits)) & maxv);
            }
        } else if (bits >= from || ((acc << (to - bits)) & maxv)) {
            return null;
        }
        return ret;
    }

    const toCashAddr = bchOperator.toCashAddr = function (legacyAddr) {
        if (!legacyAddr || typeof legacyAddr !== 'string') return legacyAddr;
        // If it's already a CashAddr (with or without prefix), return it
        if (legacyAddr.includes(':') || (legacyAddr.startsWith('q') && legacyAddr.length >= 42))
            return legacyAddr;

        try {
            // Robust decoding: try current coinjs settings, but also explicitly check common legacy versions (BCH: 0/5, FLO: 35/94)
            let decoded = coinjs.addressDecode(legacyAddr);
            if (!decoded || !decoded.bytes || (decoded.type !== 'standard' && decoded.type !== 'multisig')) {
                // Fallback: manually decode if the global settings don't match what we need.
                const bytes = coinjs.base58decode(legacyAddr);
                if (bytes && bytes.length > 4) {

                    const version = bytes[0];
                    const hash = bytes.slice(1, -4);
                    const type = (version === 0 || version === 35) ? "standard" : ((version === 5 || version === 94) ? "multisig" : null);
                    if (type) {
                        decoded = { bytes: hash, type: type, version: version };
                    }
                }
            }

            if (!decoded || !decoded.bytes || (decoded.type !== "standard" && decoded.type !== "multisig")) {
                console.warn("toCashAddr: Failed to decode or invalid type", decoded);
                return legacyAddr;
            }

            let prefix = "bitcoincash";
            let type = (decoded.type === "standard" ? 0 : 1); // 0 for P2PKH, 1 for P2SH
            let hash = Array.from(decoded.bytes);

            // Version byte: (type << 3) | size_bit (0 for 160 bits)
            let versionByte = type << 3;
            let payload = [versionByte].concat(hash);
            let payload5bit = convertBits(payload, 8, 5, true);

            let checksumData = expandPrefix(prefix).concat(payload5bit).concat([0, 0, 0, 0, 0, 0, 0, 0]);
            let checksum = polymod(checksumData);
            let checksum5bit = [];
            for (let i = 0; i < 8; i++) {
                checksum5bit.push(Number((checksum >> (5n * BigInt(7 - i))) & 0x1fn));
            }

            let combined = payload5bit.concat(checksum5bit);
            let ret = "";
            for (let v of combined) {
                ret += ALPHABET[v];
            }
            return prefix + ":" + ret;
        } catch (e) {
            console.error("CashAddr conversion error:", e);
            return legacyAddr;
        }
    }

    const fromCashAddr = bchOperator.fromCashAddr = function (cashaddr) {
        try {
            let str = cashaddr.trim();
            // CashAddr must be all-lowercase or all-uppercase
            const isLower = str === str.toLowerCase();
            const isUpper = str === str.toUpperCase();
            if (!isLower && !isUpper) return null;
            str = str.toLowerCase();

            // Handle prefix
            let prefix = "bitcoincash";
            if (str.includes(":")) {
                let parts = str.split(":");
                prefix = parts[0];
                str = parts[1];
            }

            let payload5bit = [];
            for (let char of str) {
                let idx = ALPHABET.indexOf(char);
                if (idx === -1) return null;
                payload5bit.push(idx);
            }

            let checksumData = expandPrefix(prefix).concat(payload5bit);
            if (polymod(checksumData) !== 0n) return null;

            let combined = payload5bit.slice(0, -8);
            let payload = convertBits(combined, 5, 8, false);
            if (!payload) return null;

            let versionByte = payload[0];
            let typeBit = versionByte >> 3;
            let hash = payload.slice(1);

            // Making sure we get the right Legacy format for BCH.
            // type 0 = P2PKH (coinjs.pub), type 1 = P2SH (coinjs.multisig)
            let version = (typeBit === 0 ? coinjs.pub : coinjs.multisig);
            let r = [version].concat(Array.from(hash));
            let legacyChecksumData = Crypto.SHA256(Crypto.SHA256(r, { asBytes: true }), { asBytes: true });
            let checksum = legacyChecksumData.slice(0, 4);
            return coinjs.base58encode(r.concat(checksum));
        } catch (e) {
            console.error("fromCashAddr error:", e);
            return null;
        }
    }

    // --- End CashAddr ---

    // BCH only uses legacy and cashaddr 
    Object.defineProperties(bchOperator, {
        newKeys: {
            get: () => {
                let r = coinjs.newKeys();
                return {
                    privkey: r.privkey,
                    pubkey: r.pubkey,
                    address: r.address,
                    cashaddr: toCashAddr(r.address),
                    wif: r.wif,
                    compressed: r.compressed
                };
            }
        },
        pubkey: {
            value: key => key.length >= 66 ? key : (key.length == 64 ? coinjs.newPubkey(key) : coinjs.wif2pubkey(key).pubkey)
        },
        address: {
            value: (key, prefix = undefined) => coinjs.pubkey2address(bchOperator.pubkey(key), prefix)
        }
    });

    const convert = bchOperator.convert = {
        wif: (key, version = coinjs.priv) => {
            if (key.length === 64) return coinjs.privkey2wif(key, version);
            let res = coinjs.wif2privkey(key);
            return coinjs.privkey2wif(res.privkey, version);
        },
        legacy2cash: addr => toCashAddr(addr),
        cash2legacy: addr => fromCashAddr(addr)
    }

    coinjs.compressed = true;


    const verifyKey = bchOperator.verifyKey = function (addr, key) {
        if (!addr || !key)
            return undefined;
        try {
            // Check legacy
            let decoded = coinjs.addressDecode(addr);
            if (decoded && decoded.type !== false) {
                return bchOperator.address(key) === addr;
            }
            // Check cashaddr
            let legacy = fromCashAddr(addr);
            if (legacy) {
                return bchOperator.address(key) === legacy;
            }
        } catch (e) {
            console.error(e);
        }
        return null;
    }

    const validateAddress = bchOperator.validateAddress = function (addr) {
        if (!addr) return false;
        try {
            // Try legacy
            let decoded = coinjs.addressDecode(addr);
            if (decoded && decoded.type !== false) return decoded.type;

            // Try cashaddr
            let legacy = fromCashAddr(addr);
            if (legacy) {
                let decodedLegacy = coinjs.addressDecode(legacy);
                return decodedLegacy ? decodedLegacy.type : false;
            }
        } catch (e) {
            console.error(e);
        }
        return false;
    }

    function hashPrevouts(tx) {
        let buffer = [];
        for (let i = 0; i < tx.ins.length; i++) {
            buffer = buffer.concat(Crypto.util.hexToBytes(tx.ins[i].outpoint.hash).reverse());
            buffer = buffer.concat(coinjs.numToBytes(tx.ins[i].outpoint.index, 4));
        }
        return Crypto.SHA256(Crypto.SHA256(buffer, { asBytes: true }), { asBytes: true });
    }

    function hashSequence(tx) {
        let buffer = [];
        for (let i = 0; i < tx.ins.length; i++) {
            buffer = buffer.concat(coinjs.numToBytes(tx.ins[i].sequence, 4));
        }
        return Crypto.SHA256(Crypto.SHA256(buffer, { asBytes: true }), { asBytes: true });
    }

    function hashOutputs(tx) {
        let buffer = [];
        for (let i = 0; i < tx.outs.length; i++) {
            buffer = buffer.concat(coinjs.numToBytes(tx.outs[i].value, 8));
            let script = tx.outs[i].script.buffer;
            buffer = buffer.concat(coinjs.numToVarInt(script.length));
            buffer = buffer.concat(script);
        }
        return Crypto.SHA256(Crypto.SHA256(buffer, { asBytes: true }), { asBytes: true });
    }

    // Using BIP-143 specifically for Bitcoin Cash signatures.
    function bip143Sighash(tx, inputIndex, scriptCode, value, sighashType) {
        let buffer = [];

        // 1. nVersion (4 bytes)
        buffer = buffer.concat(coinjs.numToBytes(tx.version, 4));

        // 2. hashPrevouts (32 bytes)
        buffer = buffer.concat(hashPrevouts(tx));

        // 3. hashSequence (32 bytes)
        buffer = buffer.concat(hashSequence(tx));

        // 4. outpoint (32+4 bytes)
        buffer = buffer.concat(Crypto.util.hexToBytes(tx.ins[inputIndex].outpoint.hash).reverse());
        buffer = buffer.concat(coinjs.numToBytes(tx.ins[inputIndex].outpoint.index, 4));

        // 5. scriptCode (varInt + script)
        buffer = buffer.concat(coinjs.numToVarInt(scriptCode.length));
        buffer = buffer.concat(scriptCode);

        // 6. value (8 bytes)
        buffer = buffer.concat(coinjs.numToBytes(value, 8));

        // 7. nSequence (4 bytes)
        buffer = buffer.concat(coinjs.numToBytes(tx.ins[inputIndex].sequence, 4));

        // 8. hashOutputs (32 bytes)
        buffer = buffer.concat(hashOutputs(tx));

        // 9. nLocktime (4 bytes)
        buffer = buffer.concat(coinjs.numToBytes(tx.lock_time, 4));

        // 10. sighash type (4 bytes) - includes FORKID
        buffer = buffer.concat(coinjs.numToBytes(sighashType, 4));

        return Crypto.SHA256(Crypto.SHA256(buffer, { asBytes: true }), { asBytes: true });
    }

    // This helper manages the signing process for a single input.
    function signBCHInput(tx, inputIndex, wif, value) {
        const ecKey = coinjs.wif2privkey(wif);
        const privateKey = ecKey.privkey;
        const pubkey = coinjs.newPubkey(privateKey);

        // Create P2PKH scriptCode: OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
        const pubKeyHash = ripemd160(Crypto.SHA256(Crypto.util.hexToBytes(pubkey), { asBytes: true }), { asBytes: true });
        let scriptCode = [0x76, 0xa9, 0x14]; // OP_DUP OP_HASH160 PUSH20
        scriptCode = scriptCode.concat(pubKeyHash);
        scriptCode = scriptCode.concat([0x88, 0xac]); // OP_EQUALVERIFY OP_CHECKSIG

        // Calculate BIP-143 sighash
        const sighash = bip143Sighash(tx, inputIndex, scriptCode, value, BCH_SIGHASH);

        // Sign using manual ECDSA (since coinjs.ECDSA is not available)
        const curve = EllipticCurve.getSECCurveByName("secp256k1");
        const key = new BigInteger(privateKey, 16);
        const n = curve.getN();
        const e = BigInteger.fromByteArrayUnsigned(sighash);

        let r, s;
        // We're using a simple random generator for 'k'. RFC6979 is technically safer, but this is secure enough for our needs.
        // Repeat until valid r and s are found
        do {
            const kBytes = Crypto.util.randomBytes(32);
            const kHex = Crypto.util.bytesToHex(kBytes);
            const k = new BigInteger(kHex, 16);

            const G = curve.getG();
            const Q = G.multiply(k);
            r = Q.getX().toBigInteger().mod(n);
            s = k.modInverse(n).multiply(e.add(key.multiply(r))).mod(n);
        } while (r.compareTo(BigInteger.ZERO) <= 0 || s.compareTo(BigInteger.ZERO) <= 0);

        // Force lower s values per BIP62
        const halfn = n.shiftRight(1);
        if (s.compareTo(halfn) > 0) {
            s = n.subtract(s);
        }

        // DER Serialize
        const rBa = r.toByteArraySigned();
        const sBa = s.toByteArraySigned();
        let sequence = [];
        sequence.push(0x02); // INTEGER
        sequence.push(rBa.length);
        sequence = sequence.concat(rBa);
        sequence.push(0x02); // INTEGER
        sequence.push(sBa.length);
        sequence = sequence.concat(sBa);
        sequence.unshift(sequence.length);
        sequence.unshift(0x30); // SEQUENCE

        const signature = sequence;

        // Add sighash type byte
        signature.push(BCH_SIGHASH);

        // Create scriptSig: <sig> <pubkey>

        let scriptSig = coinjs.script();
        scriptSig.writeBytes(signature);
        scriptSig.writeBytes(Crypto.util.hexToBytes(pubkey));

        tx.ins[inputIndex].script = scriptSig;
    }

    // Size constants for legacy only (no SegWit)
    const BASE_TX_SIZE = 10,
        BASE_INPUT_SIZE = 41,
        LEGACY_INPUT_SIZE = 107,
        BASE_OUTPUT_SIZE = 9,
        LEGACY_OUTPUT_SIZE = 25;

    function _sizePerInput(addr) {
        let legacy = fromCashAddr(addr) || addr;
        if (coinjs.addressDecode(legacy).type === "standard") {
            return BASE_INPUT_SIZE + LEGACY_INPUT_SIZE;
        }
        return null;
    }

    function _sizePerOutput(addr) {
        let legacy = fromCashAddr(addr) || addr;
        if (coinjs.addressDecode(legacy).type === "standard") {
            return BASE_OUTPUT_SIZE + LEGACY_OUTPUT_SIZE;
        }
        return null;
    }

    function validateTxParameters(parameters) {
        let invalids = [];
        if (parameters.senders) {
            if (!Array.isArray(parameters.senders))
                parameters.senders = [parameters.senders];
            parameters.senders.forEach(id => !validateAddress(id) ? invalids.push(id) : null);
            if (invalids.length)
                throw "Invalid senders:" + invalids;
        }
        if (parameters.privkeys) {
            if (!Array.isArray(parameters.privkeys))
                parameters.privkeys = [parameters.privkeys];
            if (parameters.senders.length != parameters.privkeys.length)
                throw "Array length for senders and privkeys should be equal";
            parameters.senders.forEach((id, i) => {
                let key = parameters.privkeys[i];
                if (!verifyKey(id, key))
                    invalids.push(id);
                if (key.length === 64)
                    parameters.privkeys[i] = coinjs.privkey2wif(key);
            });
            if (invalids.length)
                throw "Invalid private key for address:" + invalids;
        }
        if (!Array.isArray(parameters.receivers))
            parameters.receivers = [parameters.receivers];
        parameters.receivers.forEach(id => !validateAddress(id) ? invalids.push(id) : null);
        if (invalids.length)
            throw "Invalid receivers:" + invalids;
        if (parameters.change_address && !validateAddress(parameters.change_address))
            throw "Invalid change_address:" + parameters.change_address;
        if ((typeof parameters.fee !== "number" || parameters.fee <= 0) && parameters.fee !== null)
            throw "Invalid fee:" + parameters.fee;
        if (!Array.isArray(parameters.amounts))
            parameters.amounts = [parameters.amounts];
        if (parameters.receivers.length != parameters.amounts.length)
            throw "Array length for receivers and amounts should be equal";
        parameters.amounts.forEach(a => typeof a !== "number" || a <= 0 ? invalids.push(a) : null);
        if (invalids.length)
            throw "Invalid amounts:" + invalids;
        return parameters;
    }
    bchOperator.validateTxParameters = validateTxParameters;

    const createTransaction = bchOperator.createTransaction = ({
        senders, receivers, amounts, fee, change_address,
        fee_from_receiver, allowUnconfirmedUtxos = false, sendingTx = false,
        utxoValues = []
    }) => {
        return new Promise((resolve, reject) => {
            let total_amount = parseFloat(amounts.reduce((t, a) => t + a, 0).toFixed(8));
            const tx = coinjs.transaction();
            let output_size = addOutputs(tx, receivers, amounts, change_address);
            addInputs(tx, senders, total_amount, fee, output_size, fee_from_receiver, allowUnconfirmedUtxos, utxoValues).then(result => {
                if (result.change_amount > 0 && result.change_amount > result.fee)
                    tx.outs[tx.outs.length - 1].value = util.BCH_to_Sat(result.change_amount);
                if (fee_from_receiver) {
                    let fee_remaining = util.BCH_to_Sat(result.fee);
                    for (let i = 0; i < tx.outs.length - 1 && fee_remaining > 0; i++) {
                        if (fee_remaining < tx.outs[i].value) {
                            tx.outs[i].value -= fee_remaining;
                            fee_remaining = 0;
                        } else {
                            fee_remaining -= tx.outs[i].value;
                            tx.outs[i].value = 0;
                        }
                    }
                    if (fee_remaining > 0)
                        return reject("Send amount is less than fee");
                }
                let filtered_outputs = [], dust_value = 0;
                tx.outs.forEach(o => o.value >= DUST_AMT ? filtered_outputs.push(o) : dust_value += o.value);
                tx.outs = filtered_outputs;
                result.fee += util.Sat_to_BCH(dust_value);
                result.output_size = output_size;
                result.output_amount = total_amount - (fee_from_receiver ? result.fee : 0);
                result.total_size = BASE_TX_SIZE + output_size + result.input_size;
                result.transaction = tx;
                if (sendingTx && result.hasOwnProperty('hasInsufficientBalance') && result.hasInsufficientBalance)
                    reject({
                        message: "Insufficient balance",
                        ...result
                    });
                else
                    resolve(result);
            }).catch(error => reject(error))
        })
    }

    function addInputs(tx, senders, total_amount, fee, output_size, fee_from_receiver, allowUnconfirmedUtxos = false, utxoValues = []) {
        return new Promise((resolve, reject) => {
            if (fee !== null) {
                addUTXOs(tx, senders, fee_from_receiver ? total_amount : total_amount + fee, false, { allowUnconfirmedUtxos }, utxoValues).then(result => {
                    result.fee = fee;
                    resolve(result);
                }).catch(error => reject(error))
            } else {
                get_fee_rate().then(fee_rate => {
                    let net_fee = BASE_TX_SIZE * fee_rate;
                    net_fee += (output_size * fee_rate);
                    (fee_from_receiver ?
                        addUTXOs(tx, senders, total_amount, false, { allowUnconfirmedUtxos }, utxoValues) :
                        addUTXOs(tx, senders, total_amount + net_fee, fee_rate, { allowUnconfirmedUtxos }, utxoValues)
                    ).then(result => {
                        result.fee = parseFloat((net_fee + (result.input_size * fee_rate)).toFixed(8));
                        result.fee_rate = fee_rate;
                        resolve(result);
                    }).catch(error => reject(error))
                }).catch(error => reject(error))
            }
        })
    }
    bchOperator.addInputs = addInputs;

    function addUTXOs(tx, senders, required_amount, fee_rate, rec_args = { allowUnconfirmedUtxos: false }, utxoValues = []) {
        return new Promise((resolve, reject) => {
            required_amount = parseFloat(required_amount.toFixed(8));
            if (typeof rec_args.n === "undefined") {
                rec_args.n = 0;
                rec_args.input_size = 0;
                rec_args.input_amount = 0;
            }
            if (required_amount <= 0)
                return resolve({
                    input_size: rec_args.input_size,
                    input_amount: rec_args.input_amount,
                    change_amount: required_amount * -1,
                    utxoValues: utxoValues
                });
            else if (rec_args.n >= senders.length) {
                return resolve({
                    hasInsufficientBalance: true,
                    input_size: rec_args.input_size,
                    input_amount: rec_args.input_amount,
                    change_amount: required_amount * -1,
                    utxoValues: utxoValues
                });
            }
            let addr = senders[rec_args.n];
            let size_per_input = _sizePerInput(addr);
            multiApi('unspent', { addr, allowUnconfirmedUtxos: rec_args.allowUnconfirmedUtxos }).then(utxos => {

                for (let i = 0; i < utxos.length && required_amount > 0; i++) {
                    const isUnconfirmed = !utxos[i].confirmations;
                    if (isUnconfirmed && !rec_args.allowUnconfirmedUtxos) {
                        continue;
                    }



                    // BCH Legacy needs manual script derivation from the address so verification passes.
                    let legacyAddr = fromCashAddr(addr) || addr;
                    let addr_decode = coinjs.addressDecode(legacyAddr);
                    let s = coinjs.script();
                    s.writeOp(118); //OP_DUP
                    s.writeOp(169); //OP_HASH160
                    s.writeBytes(addr_decode.bytes);
                    s.writeOp(136); //OP_EQUALVERIFY
                    s.writeOp(172); //OP_CHECKSIG
                    let script = Crypto.util.bytesToHex(s.buffer);

                    tx.addinput(utxos[i].tx_hash_big_endian, utxos[i].tx_output_n, script, 0xfffffffd);

                    // We need to remember the value of this UTXO. BIP-143 signing requires it later.
                    utxoValues.push(utxos[i].value);

                    rec_args.input_size += size_per_input;
                    rec_args.input_amount += util.Sat_to_BCH(utxos[i].value);
                    required_amount -= util.Sat_to_BCH(utxos[i].value);
                    if (fee_rate)
                        required_amount += size_per_input * fee_rate;


                }
                rec_args.n += 1;

                addUTXOs(tx, senders, required_amount, fee_rate, rec_args, utxoValues)
                    .then(result => resolve(result))
                    .catch(error => reject(error))
            }).catch(error => reject(error))
        })
    }
    bchOperator.addUTXOs = addUTXOs;

    function addOutputs(tx, receivers, amounts, change_address) {
        let size = 0;
        for (let i in receivers) {
            let addr = fromCashAddr(receivers[i]) || receivers[i];
            tx.addoutput(addr, amounts[i]);
            size += _sizePerOutput(addr);
        }
        let change = fromCashAddr(change_address) || change_address;
        tx.addoutput(change, 0);
        size += _sizePerOutput(change);
        return size;
    }
    bchOperator.addOutputs = addOutputs;

    bchOperator.sendTx = function (senders, privkeys, receivers, amounts, fee = null, options = {}) {
        options.sendingTx = true;
        return new Promise((resolve, reject) => {
            createSignedTx(senders, privkeys, receivers, amounts, fee, options).then(result => {
                broadcastTx(result.transaction.serialize())
                    .then(txid => resolve(txid))
                    .catch(error => reject(error));
            }).catch(error => reject(error))
        })
    }

    const createSignedTx = bchOperator.createSignedTx = function (senders, privkeys, receivers, amounts, fee = null, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                ({
                    senders,
                    privkeys,
                    receivers,
                    amounts
                } = validateTxParameters({
                    senders,
                    privkeys,
                    receivers,
                    amounts,
                    fee,
                    ...options
                }));
            } catch (e) {
                return reject(e)
            }

            // Create transaction
            createTransaction({
                senders, receivers, amounts, fee,
                change_address: options.change_address || senders[0],
                ...options
            }).then(result => {
                let tx = result.transaction;
                let utxoValues = result.utxoValues || [];



                // Now for the hard part: Sign each input using the BCH secure algorithm (BIP-143).
                for (let i = 0; i < tx.ins.length; i++) {
                    // Match the input to the right private key so we can sign it.
                    let wif = privkeys[0];
                    for (let j = 0; j < senders.length; j++) {
                        if (verifyKey(senders[j], privkeys[j])) {
                            wif = privkeys[j];
                            break;
                        }
                    }

                    // Get the UTXO value for this input
                    const value = utxoValues[i] || 0;

                    // Sign using BIP-143
                    signBCHInput(tx, i, wif, value);
                }


                resolve(result);
            }).catch(error => reject(error));
        })
    }

    // Wrapper for index.html compatibility
    const createTx = bchOperator.createTx = function (senders, receivers, amounts, fee = null, options = {}) {
        return createTransaction({
            senders,
            receivers,
            amounts,
            fee,
            change_address: senders[0], // Send change back to where it came from.
            allowUnconfirmedUtxos: true, // Allow spending unconfirmed funds
            ...options
        });
    }

    const deserializeTx = bchOperator.deserializeTx = function (tx) {
        if (typeof tx === 'string' || Array.isArray(tx)) {
            try {
                tx = coinjs.transaction().deserialize(tx);
            } catch {
                throw "Invalid transaction hex";
            }
        } else if (typeof tx !== 'object' || typeof tx.sign !== 'function')
            throw "Invalid transaction object";
        return tx;
    }

    bchOperator.signTx = function (tx, privkeys, utxoValues = []) {
        tx = deserializeTx(tx);
        if (!Array.isArray(privkeys))
            privkeys = [privkeys];
        for (let i in privkeys)
            if (privkeys[i].length === 64)
                privkeys[i] = coinjs.privkey2wif(privkeys[i]);

        // Sign each input using BIP-143
        for (let i = 0; i < tx.ins.length; i++) {
            const value = utxoValues[i] || 0;
            signBCHInput(tx, i, privkeys[i % privkeys.length], value);
        }

        return tx.serialize();
    }

    bchOperator.getBalance = addr => new Promise((resolve, reject) => {
        if (!validateAddress(addr))
            return reject("Invalid address");
        multiApi('balance', { addr })
            .then(result => resolve(result))
            .catch(error => reject(error))
    });

    const getTx = bchOperator.getTx = txid => new Promise(async (resolve, reject) => {
        try {
            const result = await multiApi('tx', { txid });
            let { time, confirmations, block_height, block, fee, fees, inputs, out, outputs } = result;
            const txTime = parseDate(time || result.confirmed || result.received);

            const confirmedBlock = Number(block_height || (block && typeof block === 'object' ? block.height : block));
            if (confirmedBlock && !isNaN(confirmedBlock) && confirmedBlock > 0) {
                try {
                    const latestHeight = await bchOperator.latestBlock();
                    if (latestHeight && latestHeight >= confirmedBlock) {
                        confirmations = latestHeight - confirmedBlock + 1;
                    }
                } catch (e) {
                    console.warn("Could not fetch latest block for confirmation count:", e);
                }
            }

            resolve({
                confirmations: confirmations || 0,
                block: confirmedBlock,
                txid: result.hash || txid,
                time: txTime,
                size: result.size,
                fee: util.Sat_to_BCH(fee || fees || 0),
                inputs: (inputs || []).map(i => Object({ address: i.prev_out?.addr || i.address || i.addr, value: util.Sat_to_BCH(i.prev_out?.value || i.value || 0) })),
                total_input_value: util.Sat_to_BCH((inputs || []).reduce((a, i) => a + (i.prev_out?.value || i.value || 0), 0)),
                outputs: (out || outputs || []).map(o => Object({ address: o.addr || o.address, value: util.Sat_to_BCH(o.value) })),
                total_output_value: util.Sat_to_BCH((out || outputs || []).reduce((a, o) => a += o.value, 0)),
            })
        } catch (error) {
            reject(error)
        }
    })

    bchOperator.latestBlock = async () => {
        try {
            return await multiApi('latestBlock');
        } catch (e) {
            return null;
        }
    }

    bchOperator.getAddressData = address => new Promise((resolve, reject) => {
        if (!validateAddress(address))
            return reject("Invalid address");
        const legacyAddress = fromCashAddr(address) || address;
        Promise.all([
            multiApi('balance', { addr: address }),
            multiApi('txs', { addr: address })
        ]).then(([balance, txs]) => {
            const parsedTxs = Array.isArray(txs) ? txs.map(tx => typeof tx === 'string' ? { txid: tx } : parseTx(tx, legacyAddress)) : [];
            resolve({
                address,
                balance,
                txs: parsedTxs
            });
        }).catch(error => reject(error))
    });

})('object' === typeof module ? module.exports : window.bchOperator = {});
