(function (EXPORTS) {
    /*FLO Web Wallet operations*/
    'use strict';
    const floWebWallet = EXPORTS;

    //generate a new Address triplet : resolves Object(floID,pubKey,privKey)
    floWebWallet.generateNewAddr = function () {
        return new Promise((resolve, reject) => {
            try {
                var triplet = floCrypto.generateNewID();
                resolve(triplet);
            } catch (error) {
                reject(error);
            }
        })
    }

    //recover triplet from given privKey : resolves Object(floID,pubKey,privKey)
    floWebWallet.recoverAddr = function (privKey) {
        return new Promise((resolve, reject) => {
            try {
                var triplet = {}
                triplet.privKey = privKey;
                triplet.pubKey = floCrypto.getPubKeyHex(triplet.privKey);
                triplet.floID = floCrypto.getFloID(triplet.pubKey);
                resolve(triplet);
            } catch (error) {
                reject(error);
            }
        })
    }

    //get balance of address using API : resolves (balance)
    floWebWallet.getBalance = function (address) {
        return new Promise((resolve, reject) => {
            floBlockchainAPI.getBalance(address)
                .then(txid => resolve(txid))
                .catch(error => reject(error))
        })
    }

    //send transaction to the blockchain using API : resolves (txid)
    floWebWallet.sendTransaction = function (sender, receiver, amount, floData, privKey) {
        return new Promise((resolve, reject) => {
            floBlockchainAPI.sendTx(sender, receiver, amount, privKey, floData)
                .then(txid => resolve(txid))
                .catch(error => reject(error))
        })
    }

    function formatTx(address, tx) {
        let result = {
            time: tx.time,
            block: tx.blockheight,
            blockhash: tx.blockhash,
            txid: tx.txid,
            floData: tx.floData,
            confirmations: tx.confirmations
        }

        //format receivers
        let receivers = {};
        for (let vout of tx.vout) {
            if (vout.scriptPubKey.isAddress) {
                let id = vout.scriptPubKey.addresses[0];
                if (id in receivers)
                    receivers[id] += vout.value;
                else receivers[id] = vout.value;
            }
        }
        result.receivers = receivers;
        //format senders (or mined)
        if (!tx.vin[0].isAddress) { //mined (ie, coinbase)
            let coinbase = tx.vin[0].coinbase;
            result.mine = coinbase;
            result.mined = { [coinbase]: tx.valueOut }
        } else {
            result.sender = tx.vin[0].addresses[0];
            result.receiver = tx.vout[0].scriptPubKey.addresses[0];
            result.fees = tx.fees;
            let senders = {};
            for (let vin of tx.vin) {
                if (vin.isAddress) {
                    let id = vin.addresses[0];
                    if (id in senders)
                        senders[id] += vin.value;
                    else senders[id] = vin.value;
                }
            }
            result.senders = senders;

            //remove change amounts
            for (let id in senders) {
                if (id in receivers) {
                    if (senders[id] > receivers[id]) {
                        senders[id] -= receivers[id];
                        delete receivers[id];
                    } else if (senders[id] < receivers[id]) { //&& id != address 
                        receivers[id] -= senders[id];
                        delete senders[id];
                    }
                }
            }
        }

        return result;
    }

    floWebWallet.listTransactions = function (address, page_options = {}) {
        return new Promise((resolve, reject) => {
            let options = {};
            if (Number.isInteger(page_options.page))
                options.page = page_options.page;
            if (Number.isInteger(page_options.pageSize))
                options.pageSize = page_options.pageSize;
            floBlockchainAPI.readTxs(address, options).then(response => {
                const result = {}
                result.items = response.txs.map(tx => formatTx(address, tx));
                result.page = response.page;
                result.totalPages = response.totalPages;
                resolve(result);
            }).catch(error => reject(error))
        })
    }

    //get address-label pairs from IDB : resolves Object(floID:label)
    floWebWallet.getLabels = function () {
        return new Promise((resolve, reject) => {
            compactIDB.readAllData('labels')
                .then(IDBresult => resolve(IDBresult))
                .catch(error => reject(error))
        })
    }

    //bulk transfer tokens
    floWebWallet.bulkTransferTokens = function (sender, privKey, token, receivers) {
        return new Promise((resolve, reject) => {
            floTokenAPI.bulkTransferTokens(sender, privKey, token, receivers)
                .then(result => resolve(result))
                .catch(error => reject(error))
        })
    }

})(window.floWebWallet = {});