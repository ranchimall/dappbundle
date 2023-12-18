/*jshint esversion: 6 */
const TYPE_MONEY_REQUEST = "MoneyRequests",
    TYPE_CASHIER_REQUEST = "CashierRequests",
    TYPE_CASHIER_UPI = "CashierUPI";

const cashierUPI = {};
const cashierPubKeys = {};

//For regular users
const User = {};
const cashierStatus = {};

User.init = function () {
    return new Promise((resolve, reject) => {
        let promises;
        //Request cashier for token-cash exchange
        promises = floGlobals.subAdmins.map(cashierID => floCloudAPI.requestGeneralData(TYPE_CASHIER_REQUEST, {
            senderID: myFloID,
            receiverID: cashierID,
            group: "Cashiers",
            callback: userUI.renderCashierRequests //UI_fn
        }));
        //Request received from other Users for token
        promises.push(floCloudAPI.requestGeneralData(TYPE_MONEY_REQUEST, {
            receiverID: myFloID,
            callback: userUI.renderMoneyRequests //UI_fn
        }));
        //Check online status of cashiers
        promises.push(floCloudAPI.requestStatus(Array.from(floGlobals.subAdmins), {
            callback: (d, e) => {
                if (e) return console.error(e);
                for (let i in d)
                    cashierStatus[i] = d[i];
                //Add any UI_fn if any
                if (User.findCashier()) {
                    getRef('topup_wallet_process').classList.remove('hide')
                    getRef('withdraw_wallet_process').classList.remove('hide')
                    document.querySelectorAll('.cashier-status').forEach(elem => elem.classList.add('hide'))
                } else {
                    getRef('topup_wallet_process').classList.add('hide')
                    getRef('withdraw_wallet_process').classList.add('hide')
                    document.querySelectorAll('.cashier-status').forEach(elem => elem.classList.remove('hide'))
                }
            }
        }))
        /*
        promises.push(floCloudAPI.requestObjectData("UPI", { //Is this needed?
            callback: UI_RENDER_FN
        }));
        */
        promises.push(User.getCashierUPI());
        promises.push(organizeSyncedData('savedUserData'));
        Promise.all(promises)
            .then(result => resolve(result))
            .catch(error => reject(error))
    })
}

User.getCashierUPI = function () {
    return new Promise((resolve) => {
        Promise.allSettled(floGlobals.subAdmins.map(cashierID => floCloudAPI.requestApplicationData(TYPE_CASHIER_UPI, {
            senderID: cashierID,
            mostRecent: true
        }))).then(result => {
            for (let r of result)
                if (r.status === "fulfilled" && Object.keys(r.value).length) {
                    let vc = Object.keys(r.value).sort().pop()
                    cashierUPI[r.value[vc].senderID] = r.value[vc].message.upi;
                    cashierPubKeys[r.value[vc].senderID] = r.value[vc].pubKey; //get pubKey of cashier from messages for encryption
                }
            resolve(cashierUPI);
        })
    })
}

Object.defineProperty(User, 'cashierRequests', {
    get: function () {
        let fk = floCloudAPI.util.filterKey(TYPE_CASHIER_REQUEST, {
            senderID: myFloID,
            group: "Cashiers",
        });
        return floGlobals.generalData[fk];
    }
});

Object.defineProperty(User, 'moneyRequests', {
    get: function () {
        let fk = floCloudAPI.util.filterKey(TYPE_MONEY_REQUEST, {
            receiverID: myFloID,
        });
        return floGlobals.generalData[fk];
    }
});

User.findCashier = function () {
    let online = [];
    for (let c in cashierStatus)
        if (cashierStatus[c] && cashierUPI[c])
            online.push(c);
    if (!online.length) {
        if (floGlobals.settings.default_cashier && floGlobals.settings.default_cashier in cashierUPI)
            return floGlobals.settings.default_cashier;
        else
            return null;
    } else {
        const random = floCrypto.randInt(0, online.length - 1)
        return online[random];
    }
}

User.cashToToken = function (cashier, amount, txCode, upiID) {
    return new Promise((resolve, reject) => {
        if (!floGlobals.subAdmins.includes(cashier))
            return reject("Invalid cashier");
        floCloudAPI.sendGeneralData({
            mode: "cash-to-token",
            amount: amount,
            // upi_txid: upiTxID,
            upiID,
            txCode
        }, TYPE_CASHIER_REQUEST, {
            receiverID: cashier
        }).then(result => resolve(result))
            .catch(error => reject(error))
    })
}

User.tokenToCash = function (cashier, amount, blkTxID, upiID) {
    return new Promise((resolve, reject) => {
        if (!floGlobals.subAdmins.includes(cashier))
            return reject("Invalid cashier");
        floCloudAPI.sendGeneralData({
            mode: "token-to-cash",
            amount: amount,
            token_txid: blkTxID,
            upi_id: floCrypto.encryptData(upiID, cashierPubKeys[cashier])
        }, TYPE_CASHIER_REQUEST, {
            receiverID: cashier
        }).then(result => resolve(result))
            .catch(error => reject(error))
    })
}

User.sendToken = function (receiverID, amount, remark = '', options = {}) {
    return new Promise((resolve, reject) => {
        floDapps.user.private.then(privateKey => {
            floTokenAPI.sendToken(privateKey, amount, receiverID, remark, floTokenAPI.currency, options)
                .then(result => resolve(result))
                .catch(error => reject(error))
        }).catch(error => {
            console.log(error);
            notify('Invalid password', 'error');
            reject(error);
        })
    })
}

User.requestToken = function (floID, amount, remark = '') {
    return new Promise((resolve, reject) => {
        floCloudAPI.sendGeneralData({
            amount: amount,
            remark: remark
        }, TYPE_MONEY_REQUEST, {
            receiverID: floID
        }).then(result => resolve(result))
            .catch(error => reject(error))
    })
}

User.decideRequest = function (request, note) {
    return new Promise((resolve, reject) => {
        floCloudAPI.noteApplicationData(request.vectorClock, note, {
            receiverID: myFloID
        }).then(result => resolve(result))
            .catch(error => reject(error))
    })
}

const Cashier = {};

var status_conn_id = null;

function statusReconnect() {
    if (status_conn_id) {
        floCloudAPI.closeRequest(status_conn_id)
        status_conn_id = null;
    }
    floCloudAPI.setStatus()
        .then(result => status_conn_id = result)
        .catch(error => console.error(error))
}

var status_interval_instance = null;
function startStatusInterval() {
    if (status_interval_instance) {
        clearInterval(status_interval_instance);
        status_interval_instance = null;
    }
    statusReconnect();
    status_interval_instance = setInterval(statusReconnect, 15 * 60 * 1000);
}

Cashier.init = function () {
    delegate(getRef('cashier_pending_request_list'), 'click', '.process-cashier-request', e => {
        const requestID = e.delegateTarget.closest('.cashier-request').dataset.vc;
        cashierUI.completeRequest(requestID)
    })
    getRef('cashier_requests_selector').addEventListener('change', e => {
        showChildElement('cashier_requests_wrapper', e.target.value === 'pending' ? 0 : 1)
    })
    return new Promise((resolve, reject) => {
        let promises = [];
        //Requests from user to cashier(self) for token-cash exchange
        promises.push(floCloudAPI.requestGeneralData(TYPE_CASHIER_REQUEST, {
            receiverID: myFloID,
            callback: cashierUI.renderRequests //UI_fn
        }));
        //Set online status of cashier(self)
        //promises.push(floCloudAPI.setStatus());
        /*
        promises.push(floCloudAPI.requestObjectData("UPI", { //Is this needed?
            callback: UI_RENDER_FN
        }));
        */
        promises.push(User.getCashierUPI());
        Promise.all(promises).then(result => {
            startStatusInterval(); //Set online status of cashier(self) [connection refreshes on interval]
            resolve(result)
        }).catch(error => reject(error));
    })
}

Cashier.updateUPI = function (upi_id) {
    return new Promise((resolve, reject) => {
        floCloudAPI.sendApplicationData({
            upi: upi_id
        }, TYPE_CASHIER_UPI)
            .then(result => resolve(result))
            .catch(error => reject(error))
    })
}
Object.defineProperty(Cashier, 'Requests', {
    get: function () {
        let fk = floCloudAPI.util.filterKey(TYPE_CASHIER_REQUEST, {
            receiverID: myFloID
        });
        console.debug(fk, floGlobals.generalData[fk]);
        return floGlobals.generalData[fk];
    }
});

Cashier.finishRequest = function (request, txid) {
    return new Promise((resolve, reject) => {
        floCloudAPI.tagApplicationData(request.vectorClock, 'COMPLETED', {
            receiverID: myFloID
        }).then(result => {
            floCloudAPI.noteApplicationData(request.vectorClock, txid, {
                receiverID: myFloID
            }).then(result => resolve(result))
                .catch(error => reject(error))
        }).catch(error => reject(error))
    })
}

Cashier.rejectRequest = function (request, reason) {
    return new Promise((resolve, reject) => {
        floCloudAPI.noteApplicationData(request.vectorClock, "REJECTED:" + reason, {
            receiverID: myFloID
        }).then(result => resolve(result))
            .catch(error => reject(error))
    })
}

Cashier.checkIfUpiTxIsValid = function (upiTxID) {
    return new Promise((resolve, reject) => {
        let requests = Cashier.Requests;
        for (let r in requests)
            if (requests[r].message.mode === "cash-to-token" && requests[r].note)
                if (requests[r].message.upi_txid === upiTxID)
                    return reject([true, "UPI transaction is already used for another request"]);
        return resolve(true);
    })
}

Cashier.checkIfTokenTxIsValid = function (tokenTxID, sender, amount) {
    return new Promise((resolve, reject) => {
        let requests = Cashier.Requests;
        for (let r in requests)
            if (requests[r].message.mode === "token-to-cash" && requests[r].note)
                if (requests[r].message.token_txid === tokenTxID)
                    return reject([true, "Token transaction is already used for another request"]);
        floTokenAPI.getTx(tokenTxID).then(tx => {
            let parsedTxData = floTokenAPI.util.parseTxData(tx);
            console.debug(parsedTxData);
            if (parsedTxData.type !== "transfer" || parsedTxData.transferType !== "token")
                reject([true, "Invalid token transfer type"]);
            else if (parsedTxData.tokenAmount !== amount)
                reject([true, "Incorrect token amount: " + parsedTxData.tokenAmount]);
            else if (parsedTxData.tokenIdentification !== floGlobals.currency)
                reject([true, "Incorrect token: " + parsedTxData.tokenIdentification]);
            else if (parsedTxData.sender !== sender)
                reject([true, "Incorrect senderID: " + parsedTxData.sender]);
            else if (parsedTxData.receiver !== myFloID)
                reject([true, "Incorrect receiverID: " + parsedTxData.receive])
            else resolve(true);
        }).catch(error => reject([null, error]))
    })
}