const blockchainBond = (function () {
    const productStr = "Product: RanchiMall Bitcoin Bond";

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
    const yearDiff = (d1 = null, d2 = null) => {
        d1 = d1 ? new Date(d1) : new Date();
        d2 = d2 ? new Date(d2) : new Date();
        let y = d1.getYear() - d2.getYear(),
            m = d1.getMonth() - d2.getMonth(),
            d = d1.getDate() - d2.getDate()
        return y + m / 12 + d / 365;
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

    function calcNetValue(BTC_base, BTC_net, startDate, minIpa, maxPeriod, cut, amount, USD_base, USD_net) {
        let gain, duration, interest, net;
        gain = (BTC_net - BTC_base) / BTC_base;
        duration = yearDiff(Math.min(Date.now(), dateAdder(startDate, maxPeriod).getTime()), startDate);
        interest = Math.max(cut * gain, minIpa * duration);
        net = amount / USD_base;
        net += net * interest;
        return net * USD_net;
    }

    function stringify_main(BTC_base, start_date, guaranteed_interest, guarantee_period, gain_cut, amount, USD_base, lockin_period, floID) {
        return [
            `${productStr}`,
            `Base value: ${BTC_base} USD`,
            `Date of bond start: ${dateFormat(start_date)}`,
            `Guaranteed interest: ${guaranteed_interest}% per annum simple for ${guarantee_period}`,
            `Bond value: guaranteed interest or ${gain_cut}% of the gains whichever is higher`,
            `Amount invested: Rs ${amount}`,
            `USD INR rate at start: ${USD_base}`,
            `Lockin period: ${lockin_period}`,
            `FLO ID of Bond Holder: ${floID}`
        ].join("|");
    }

    function parse_main(data) {
        //Data (add bond) sent by admin 
        let details = {};
        data.split("|").forEach(d => {
            d = d.split(': ');
            switch (d[0].toLowerCase()) {
                case "base value":
                    details["BTC_base"] = parseNumber(d[1].slice(0, -4)); break;
                case "date of bond start":
                    details["startDate"] = new Date(d[1]); break;
                case "guaranteed interest":
                    details["minIpa"] = parseFloat(d[1].match(/\d+%/)) / 100;
                    details["maxPeriod"] = parsePeriod(d[1].match(/for .+/).toString()); break;
                case "bond value":
                    details["cut"] = parseFloat(d[1].match(/\d+%/)) / 100; break;
                case "amount invested":
                    details["amount"] = parseNumber(d[1].substring(3)); break;
                case "usd inr rate at start":
                    details["USD_base"] = parseFloat(d[1]); break;
                case "lockin period":
                    details["lockinPeriod"] = parsePeriod(d[1]); break;
                case "flo id of bond holder":
                    details["floID"] = d[1]; break;
            }
        });
        return details;
    }

    function stringify_end(bond_id, end_date, BTC_net, USD_net, amount, ref_sign, payment_ref) {
        return [
            `${productStr}`,
            `Bond: ${bond_id}`,
            `End value: ${BTC_net} USD`,
            `Date of bond end: ${dateFormat(end_date)}`,
            `USD INR rate at end: ${USD_net}`,
            `Amount withdrawn: Rs ${amount} via ${payment_ref}`,
            `Reference: ${ref_sign}`
        ].join("|");
    }

    function parse_end(data) {
        //Data (end bond) send by market nodes
        let details = {};
        data.split("|").forEach(d => {
            d = d.split(': ');
            switch (d[0].toLowerCase()) {
                case "bond":
                    details["bondID"] = d[1]; break;
                case "end value":
                    details["BTC_net"] = parseNumber(d[1].slice(0, -4)); break;
                case "date of bond end":
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
        return details;
    }

    return {
        productStr,
        dateAdder,
        dateFormat,
        calcNetValue,
        parse: {
            main: parse_main,
            end: parse_end
        },
        stringify: {
            main: stringify_main,
            end: stringify_end
        }
    }
})();

function refreshBlockchainData() {
    return new Promise((resolve, reject) => {
        compactIDB.readData("appendix", "lastTx" + floGlobals.adminID).then(lastTx => {
            var query_options = { tx: true, filter: d => d.startsWith(blockchainBond.productStr) };
            query_options.senders = floExchangeAPI.nodeList.concat(floGlobals.adminID); //sentOnly: true,
            if (typeof lastTx == 'number')  //lastTx is tx count (*backward support)
                query_options.ignoreOld = lastTx;
            else if (typeof lastTx == 'string') //lastTx is txid of last tx
                query_options.after = lastTx;
            floBlockchainAPI.readData(floGlobals.adminID, query_options).then(result => {
                result.items.reverse().forEach(d => {
                    if (d.senders.has(floGlobals.adminID) && /bond start/i.test(d.data))
                        compactIDB.addData('bonds', d.data, d.txid);
                    else
                        compactIDB.addData('closings', d.data, d.txid);
                });
                compactIDB.writeData('appendix', result.lastItem, "lastTx" + floGlobals.adminID);
                resolve(true);
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