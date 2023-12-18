const bobsFund = (function () {
    const productStr = "Bobs Fund";

    const magnitude = m => {
        switch (m) {
            case "thousand": return 1000;
            case "lakh": case "lakhs": return 100000;
            case "million": return 1000000;
            case "crore": case "crores": return 10000000;
            default: return null;
        }
    }
    const parseNumber = (str) => {
        let n = 0,
            g = 0;
        str.toLowerCase().replace(/,/g, '').split(" ").forEach(s => {
            if (!isNaN(s))
                g = parseFloat(s);
            else {
                let m = magnitude(s);
                if (m !== null) {
                    n += m * g;
                    g = 0;
                }
            }
        });
        return n + g;
    }
    const parsePeriod = (str) => {
        let P = '', n = 0;
        str.toLowerCase().replace(/,/g, '').split(" ").forEach(s => {
            if (!isNaN(s))
                n = parseFloat(s);
            else switch (s) {
                case "year(s)": case "year": case "years": P += (n + 'Y'); n = 0; break;
                case "month(s)": case "month": case "months": P += (n + 'M'); n = 0; break;
                case "day(s)": case "day": case "days": P += (n + 'D'); n = 0; break;
            }
        });
        return P;
    }
    const dateFormat = (date = null) => {
        let d = (date ? new Date(date) : new Date()).toDateString();
        return [d.substring(8, 10), d.substring(4, 7), d.substring(11, 15)].join(" ");
    }

    const dateAdder = function (start_date, duration) {
        let date = new Date(start_date);
        let y = parseInt(duration.match(/\d+Y/)),
            m = parseInt(duration.match(/\d+M/)),
            d = parseInt(duration.match(/\d+D/));
        if (!isNaN(y))
            date.setFullYear(date.getFullYear() + y);
        if (!isNaN(m))
            date.setMonth(date.getMonth() + m);
        if (!isNaN(d))
            date.setDate(date.getDate() + d);
        return date;
    }

    function calcNetValue(BTC_base, BTC_net, USD_base, USD_net, amount, fee) {
        let gain, interest, net;
        gain = (BTC_net - BTC_base) / BTC_base;
        interest = gain * (1 - fee)
        net = amount / USD_base;
        net += net * interest;
        return net * USD_net;
    }

    function stringify_main(BTC_base, USD_base, start_date, duration, investments, fee = 0, tapoutWindow = null, tapoutInterval = null) {
        let result = [
            `${productStr}`,
            `Base Value: ${BTC_base} USD`,
            `USD INR rate at start: ${USD_base}`,
            `Start date: ${dateFormat(start_date)}`,
            `Duration: ${duration}`,
            `Management Fee: ${fee != 0 ? fee + "%" : "0 (Zero)"}`
        ];
        if (tapoutInterval) {
            if (Array.isArray(tapoutInterval)) {
                let x = tapoutInterval.pop(),
                    y = tapoutInterval.join(", ")
                tapoutInterval = `${y} and ${x}`
            }
            result.push(`Tapout availability: ${tapoutWindow} after ${tapoutInterval}`);
        }
        result.push(`Investment(s) (INR): ${investments.map(f => `${f[0].trim()}-${f[1].trim()}`).join("; ")}`);
        return result.join("|");
    }

    function stringify_continue(fund_id, investments) {
        return [
            `${productStr}`,
            `continue: ${fund_id}`,
            `Investment(s) (INR): ${investments.map(f => `${f[0].trim()}-${f[1].trim()}`).join("; ")}`
        ].join("|");
    }

    function stringify_end(fund_id, floID, end_date, BTC_net, USD_net, amount, ref_sign, payment_ref) {
        return [
            `${productStr}`,
            `close: ${fund_id}`,
            `Investor: ${floID}`,
            `End value: ${BTC_net} USD`,
            `Date of withdrawal: ${dateFormat(end_date)}`,
            `USD INR rate at end: ${USD_net}`,
            `Amount withdrawn: Rs ${amount} via ${payment_ref}`,
            `Reference: ${ref_sign}`
        ].join("|");
    }

    function parse_details(data) {
        let funds = {};
        funds.investments = {};
        if (!Array.isArray(data))
            data = [data];
        data.forEach((fd, i) => {
            if (!/close: [a-z0-9]{64}\|/.test(fd)) { // not a closing tx
                let cont = /continue: [a-z0-9]{64}\|/.test(fd);
                fd.split("|").forEach(d => {
                    d = d.split(': ');
                    if (["invesment(s) (inr)", "investment(s) (inr)"].includes(d[0].toLowerCase()))
                        d[1].split(";").forEach(a => {
                            a = a.split("-");
                            let floID = a[0].replace(/\s/g, ''); //for removing spaces (trailing) if any
                            funds["investments"][floID] = funds["investments"][floID] || {};
                            funds["investments"][floID].amount = parseNumber(a[1]);
                            funds["investments"][floID].i = i;
                        });
                    else if (!cont)
                        switch (d[0].toLowerCase()) {
                            case "start date":
                                funds["start_date"] = new Date(d[1]); break;
                            case "base value":
                                funds["BTC_base"] = parseNumber(d[1].slice(0, -4)); break;
                            case "usd inr rate at start":
                                funds["USD_base"] = parseFloat(d[1]); break;
                            case "duration":
                                funds["duration"] = parsePeriod(d[1]); break;
                            case "management fee":
                                funds["fee"] = parseFloat(d[1]); break;
                            case "tapout availability":
                                let x = d[1].toLowerCase().split("after")
                                funds["tapoutInterval"] = x[1].match(/\d+ [a-z]+/gi).map(y => parsePeriod(y))
                                funds["topoutWindow"] = parsePeriod(x[0]); break;
                        }
                });
            } else {
                let floID, details = {};
                fd.split("|").forEach(d => {
                    d = d.split(': ');
                    switch (d[0].toLowerCase()) {
                        case "investor":
                            floID = d[1]; break;
                        case "end value":
                            details["BTC_net"] = parseNumber(d[1].slice(0, -4)); break;
                        case "date of withdrawal":
                            details["endDate"] = new Date(d[1]); break;
                        case "amount withdrawn":
                            details["amountFinal"] = parseNumber(d[1].match(/\d.+ via/).toString());
                            details["payment_refRef"] = d[1].match(/via .+/).toString().substring(4); break;
                        case "usd inr rate at end":
                            details["USD_net"] = parseFloat(d[1]); break;
                        case "reference":
                            details["refSign"] = d[1]; break;
                    }
                });
                if (floID) {
                    funds.investments[floID] = funds.investments[floID] || {};
                    funds.investments[floID].closed = details;
                    funds.investments[floID].closed.i = i;
                }
            }
        });
        return funds;
    }

    return {
        productStr,
        dateAdder,
        dateFormat,
        calcNetValue,
        parse: parse_details,
        stringify: {
            main: stringify_main,
            continue: stringify_continue,
            end: stringify_end
        }
    }

})();

function refreshBlockchainData(newOnly = false) {
    return new Promise((resolve, reject) => {
        compactIDB.readData("appendix", "lastTx").then(lastTx => {
            var query_options = { tx: true, filter: d => d.startsWith(bobsFund.productStr) };
            query_options.senders = floExchangeAPI.nodeList.concat(floGlobals.adminID); //sentOnly: true,
            if (typeof lastTx == 'number')  //lastTx is tx count (*backward support)
                query_options.ignoreOld = lastTx;
            else if (typeof lastTx == 'string') //lastTx is txid of last tx
                query_options.after = lastTx;
            floBlockchainAPI.readData(floGlobals.adminID, query_options).then(result => {
                compactIDB.readAllData("funds").then(funds => {
                    let writeKeys = new Set();
                    result.items.reverse().forEach(d => {
                        if (/close: /i.test(d.data)) {
                            let ctx = d.data.match(/close: [0-9a-z]{64}/i).toString().split(": ")[1];
                            funds[ctx].push({
                                txid: d.txid,
                                data: d.data
                            })
                            writeKeys.add(ctx);
                        } else if (d.senders.has(floGlobals.adminID)) {
                            if (/continue: /i.test(d.data)) {
                                let ctx = d.data.match(/continue: [0-9a-z]{64}/i).toString().split(": ")[1];
                                funds[ctx].push({
                                    txid: d.txid,
                                    data: d.data
                                })
                                writeKeys.add(ctx);
                            } else if (/start: /i.test(d.data)) {
                                funds[d.txid] = [{
                                    txid: d.txid,
                                    data: d.data
                                }]
                                writeKeys.add(d.txid);
                            }
                        }
                    })
                    writeKeys = Array.from(writeKeys);
                    Promise.all(writeKeys.map(k => compactIDB.writeData("funds", funds[k], k))).then(results => {
                        compactIDB.writeData('appendix', result.lastItem, "lastTx");
                        resolve(newOnly ? writeKeys.map(k => funds[k]) : funds)
                    }).catch(error => reject(error))
                }).catch(error => reject(error))
            }).catch(error => reject(error))
        }).catch(error => reject(error))
    })
}

function getCurrentRates() {
    let fetchData = api => new Promise((resolve, reject) => {
        fetch(api).then(response => {
            if (response.ok)
                response.json().then(data => resolve(data))
            else
                reject(response)
        }).catch(error => reject(error))
    })
    return new Promise((resolve, reject) => {
        fetchData(`https://bitpay.com/api/rates`).then(result => {
            let BTC_USD, BTC_INR, USD_INR
            for (let i of result)
                i.code == "USD" ? BTC_USD = i.rate : i.code == "INR" ? BTC_INR = i.rate : null;
            USD_INR = BTC_INR / BTC_USD;
            resolve({
                BTC_USD,
                BTC_INR,
                USD_INR
            })
        }).catch(error => reject(error))
    })
}