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
      const result = {
        time: tx.time,
        block: tx.blockheight,
        blockhash: tx.blockhash,
        txid: tx.txid,
        floData: tx.floData,
        confirmations: tx.confirmations
      };

      // ---- Receivers (outputs) ----
      const receivers = {};
      for (const vout of tx.vout || []) {
        const outAddrs =
          (vout.addresses && vout.addresses.length ? vout.addresses :
           vout.scriptPubKey && vout.scriptPubKey.addresses ? vout.scriptPubKey.addresses : null);
        if (outAddrs && outAddrs.length) {
          const id = outAddrs[0];
          receivers[id] = (receivers[id] || 0) + Number(vout.value || 0);
        }
      }
      result.receivers = receivers;

      // ---- Coinbase vs normal ----
      const isCoinbase = !!(tx.vin && tx.vin[0] && tx.vin[0].coinbase);

      if (isCoinbase) {
        const coinbase = tx.vin[0].coinbase; // string
        result.mine = coinbase;
        result.mined = { [coinbase]: Number(tx.valueOut || 0) };
        return result;
      }

      // ---- Normal tx: senders, fees, first-party heuristics ----
      result.fees = tx.fees;

      const firstInAddr = (tx.vin && tx.vin[0] && tx.vin[0].addresses && tx.vin[0].addresses[0]) || undefined;
      const firstOutAddrs =
        (tx.vout && tx.vout[0] &&
          ((tx.vout[0].addresses && tx.vout[0].addresses[0]) ||
           (tx.vout[0].scriptPubKey && tx.vout[0].scriptPubKey.addresses && tx.vout[0].scriptPubKey.addresses[0]))) || undefined;
      if (firstInAddr) result.sender = firstInAddr;
      if (firstOutAddrs) result.receiver = firstOutAddrs;

      const senders = {};
      for (const vin of tx.vin || []) {
        const inAddrs = vin.addresses;
        if (inAddrs && inAddrs.length) {
          const id = inAddrs[0];
          senders[id] = (senders[id] || 0) + Number(vin.value || 0);
        }
      }
      result.senders = senders;

      // ---- Remove change (net flow) ----
      for (const id of Object.keys(senders)) {
        if (receivers[id] != null) {
          if (senders[id] > receivers[id]) {
            senders[id] -= receivers[id];
            delete receivers[id];
          } else if (senders[id] < receivers[id]) {
            receivers[id] -= senders[id];
            delete senders[id];
          } else {
            // equal -> cancel both
            delete senders[id];
            delete receivers[id];
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
