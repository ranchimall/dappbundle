function updateURLForPage(page, value) {
  let params = new URLSearchParams();
  if (page === "transaction") {
    params.set("page", "transactions");
    params.set("tx", value);
  } else if (page === "balance" || page === "history") {
    params.set("page", "transactions");
    params.set("address", value);
  }
  window.history.replaceState(
    {},
    "",
    `${location.pathname}?${params.toString()}`
  );
}

function shareBalanceLink(address) {
  const addr =
    address || (document.getElementById("balanceAddr").value || "").trim();
  if (!addr) return;
  const url = new URL(window.location.href);
  url.searchParams.set("page", "transactions");
  url.searchParams.set("address", addr);
  navigator.clipboard.writeText(url.toString()).then(() => {
    if (typeof notify === "function")
      notify("Shareable balance link copied", "success");
  });
}
function shareTxLink(txid) {
  const id = txid || (document.getElementById("txHash").value || "").trim();
  if (!id) return;
  const url = new URL(window.location.href);
  url.searchParams.set("page", "transactions");
  url.searchParams.set("tx", id);
  navigator.clipboard.writeText(url.toString()).then(() => {
    if (typeof notify === "function")
      notify("Shareable tx link copied", "success");
  });
}
async function getTransactionDetails(txHash) {
  const url = "https://api.trongrid.io/wallet/gettransactionbyid";
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const body = JSON.stringify({
    value: txHash,
    visible: true,
  });

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  console.log("Transaction details:", data);
  return data;
}

async function getTransactionInfoById(txHash) {
  const url = "https://api.trongrid.io/wallet/gettransactioninfobyid";
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const body = JSON.stringify({
    value: txHash,
  });

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  console.log("Transaction info:", data);
  return data;
}
async function getBalanceByAddress(address) {
  try {
    const balance = await tronWeb.trx.getBalance(address);
    return balance / 1e6;
  } catch (err) {
    throw new Error("Failed to fetch balance: " + err.message);
  }
}

async function getBalanceByPrivKey(privKey) {
  try {
    let rawHexKey;

    // Detect WIF (BTC/FLO style)
    if (/^[5KLc9RQ][1-9A-HJ-NP-Za-km-z]{50,}$/.test(privKey)) {
      const decoded = coinjs.wif2privkey(privKey);
      if (!decoded || !decoded.privkey) {
        throw new Error("Invalid WIF private key");
      }
      rawHexKey = decoded.privkey;
      console.log("Detected WIF private key:", rawHexKey);

      // Detect 64-char raw hex private key
    } else if (/^[0-9a-fA-F]{64}$/.test(privKey)) {
      rawHexKey = privKey;
    } else {
      throw new Error("Unsupported private key format");
    }

    // Derive Tron address from private key
    const tronAddress = tronWeb.address.fromPrivateKey(rawHexKey);
    const balance = await getBalanceByAddress(tronAddress);

    return { tronAddress, balance };
  } catch (err) {
    throw new Error("Invalid private key: " + err.message);
  }
}

async function runBalanceCheck() {
  const inputVal = document.getElementById("balanceAddr").value.trim();
  const output = document.getElementById("balanceOutput");

  // Set loading state
  if (typeof setButtonLoading === "function") {
    setButtonLoading("balanceBtn", true);
  }

  try {
    if (inputVal.startsWith("T")) {
      // Direct Tron address
      const tronAddress = inputVal;
      const balance = await getBalanceByAddress(inputVal);
      output.innerHTML = `
            <div class="card balance-info">
              <div class="balance-header">
                <h3><i class="fas fa-wallet"></i> Account Balance</h3>
                <button class="btn-icon share-btn" onclick="shareBalanceLink('${tronAddress}')" title="Copy shareable balance link">
                  <i class="fas fa-share-alt"></i>
                </button>
              </div>
              <div class="balance-display">
                <div class="balance-amount">
                  <span class="amount-number">${balance.toLocaleString()} TRX</span>
              </div>
              </div>
              <div class="account-details">
                <div class="detail-row">
                  <label><i class="fas fa-map-marker-alt"></i> Address</label>
                  <div class="value-container">
                    <code>${tronAddress}</code>
                    <button class="btn-icon" onclick="navigator.clipboard.writeText('${tronAddress}').then(()=>notify && notify('Address copied','success'))" title="Copy Address">
                      <i class="fas fa-copy"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;
      if (typeof notify === "function") notify("Balance loaded", "success");
      loadHistoryFor(tronAddress);

      // Save searched address to IndexedDB
      if (typeof searchedAddressDB !== "undefined") {
        try {
          await searchedAddressDB.saveSearchedAddress(
            tronAddress,
            balance.toLocaleString()
          );
          await updateSearchedAddressesList();
        } catch (dbError) {
          console.warn("Failed to save address to IndexedDB:", dbError);
        }
      }

      updateURLForPage("balance", tronAddress);
    } else {
      // Treat as private key (WIF or HEX)
      const { tronAddress, balance } = await getBalanceByPrivKey(inputVal);

      let sourceInfo = null;
      if (/^[5KLc9RQ][1-9A-HJ-NP-Za-km-z]{50,}$/.test(inputVal)) {
        // This is a BTC/FLO WIF key
        sourceInfo = {
          type: "Private Key",
          originalKey: inputVal,
          originalAddress: inputVal, // Store the original private key for toggling
          blockchain: /^[KL]/.test(inputVal) ? "BTC" : "FLO",
        };
      }

      output.innerHTML = `
        <div class="card balance-info">
              <div class="balance-header">
                <h3><i class="fas fa-wallet"></i> Account Balance</h3>
                <button class="btn-icon share-btn" onclick="shareBalanceLink('${tronAddress}')" title="Copy shareable balance link">
                  <i class="fas fa-share-alt"></i>
                </button>
              </div>
              <div class="balance-display">
                <div class="balance-amount">
                  <span class="amount-number">${balance.toLocaleString()} TRX</span>
              </div>
              </div>
              <div class="account-details">
                <div class="detail-row">
                  <label><i class="fas fa-map-marker-alt"></i> Address</label>
                  <div class="value-container">
                    <code>${tronAddress}</code>
                    <button class="btn-icon" onclick="navigator.clipboard.writeText('${tronAddress}').then(()=>notify && notify('Address copied','success'))" title="Copy Address">
                      <i class="fas fa-copy"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
      `;
      if (typeof notify === "function") notify("Balance loaded", "success");
      loadHistoryFor(tronAddress);

      // Save searched address to IndexedDB
      if (typeof searchedAddressDB !== "undefined") {
        try {
          await searchedAddressDB.saveSearchedAddress(
            tronAddress,
            balance.toLocaleString(),
            Date.now(),
            sourceInfo
          );
          await updateSearchedAddressesList();
        } catch (dbError) {
          console.warn("Failed to save address to IndexedDB:", dbError);
        }
      }

      updateURLForPage("balance", tronAddress);
    }
  } catch (err) {
    output.innerHTML = `<div class="error-state"><div class="error-icon"><i class=\"fas fa-exclamation-triangle\"></i></div><h3>Failed</h3><p>${err.message}</p></div>`;
    if (typeof notify === "function") notify(err.message, "error");
  } finally {
    setButtonLoading("balanceBtn", false);
  }
}

async function runTxSearch() {
  const input = document.getElementById("txHash");
  const output = document.getElementById("txOutput");
  const txid = (input.value || "").trim();
  if (!txid) {
    alert("Please enter a transaction hash");
    return;
  }

  // Validation for Tron transaction hash
  if (!/^[a-fA-F0-9]{64}$/.test(txid)) {
    if (typeof notify === "function") {
      notify("Invalid transaction hash format.", "error");
    } else {
      alert("Invalid transaction hash format.");
    }
    return;
  }

  setButtonLoading("txSearchBtn", true);
  try {
    if (typeof notify === "function")
      notify("Searching transaction...", "success", 1200);

    const [tx, txInfo] = await Promise.all([
      getTransactionDetails(txid),
      getTransactionInfoById(txid),
    ]);

    // Extract transaction details from the response
    const id = tx.txID || txid;
    const ret = (tx.ret && tx.ret[0] && tx.ret[0].contractRet) || "SUCCESS";
    const contract =
      (tx.raw_data && tx.raw_data.contract && tx.raw_data.contract[0]) || {};
    const type = contract.type || "TransferContract";
    const parameter = contract.parameter && contract.parameter.value;
    const timestamp =
      tx.raw_data && tx.raw_data.timestamp
        ? new Date(tx.raw_data.timestamp).toLocaleString()
        : "-";
    const blockNumber = txInfo.blockNumber || "-";

    // Extract resources and fees from both transaction objects

    let bandwidth = undefined;
    if (txInfo.receipt && txInfo.receipt.net_usage) {
      bandwidth = txInfo.receipt.net_usage;
    } else if (tx.net_usage) {
      bandwidth = tx.net_usage;
    }

    // Check both transaction info and receipt for energy usage
    let energy = undefined;
    if (txInfo.receipt && txInfo.receipt.energy_usage) {
      energy = txInfo.receipt.energy_usage;
    } else if (tx.energy_usage) {
      energy = tx.energy_usage;
    }

    // Check for fees from multiple sources
    let fee = "-";
    if (txInfo.receipt && txInfo.receipt.net_fee) {
      fee = txInfo.receipt.net_fee / 1000000;
    } else if (txInfo.fee) {
      fee = txInfo.fee / 1000000;
    } else if (tx.fee) {
      fee = tx.fee / 1000000;
    }

    // Format the resource consumption and fee HTML
    let resourcesFeeHtml = "";
    let feeParts = [];
    if (bandwidth && bandwidth !== "-")
      feeParts.push(`<div class="resource-item">${bandwidth} Bandwidth</div>`);
    if (energy && energy !== "-")
      feeParts.push(`<div class="resource-item">${energy} Energy</div>`);
    if (fee && fee !== "-")
      feeParts.push(`<div class="resource-item">${fee} TRX</div>`);

    if (feeParts.length) {
      resourcesFeeHtml = `
        <div class='tx-detail-row resource-row'>
          <span class='tx-detail-label'><i class='fas fa-cogs'></i> Resources Consumed & Fee:</span>
          <span class='tx-detail-value resources-list'>${feeParts.join(
            ""
          )}</span>
        </div>
      `;
    } else {
      resourcesFeeHtml = `
        <div class='tx-detail-row resource-row'>
          <span class='tx-detail-label'><i class='fas fa-cogs'></i> Resources Consumed & Fee:</span>
          <span class='tx-detail-value resources-list'><span class="resource-item">- No resources consumed</span></span>
        </div>
      `;
    }

    let detailsHtml = "";
    let owner = (parameter && parameter.owner_address) || "-";
    let to = (parameter && parameter.to_address) || "-";
    let amount =
      parameter && parameter.amount ? parameter.amount / 1000000 : "-";
    let tokenInfo = "";
    let resourceInfo = "";

    if (type === "TriggerSmartContract") {
      let contractAddr =
        parameter && parameter.contract_address
          ? parameter.contract_address
          : "-";
      let tokenAmount = "-";
      let tokenSymbol = "USDT";
      let tokenTo = "-";
      if (txInfo.log && txInfo.log.length > 0) {
        const log = txInfo.log[0];
        if (log.topics && log.topics.length >= 3) {
          tokenTo = tronWeb.address.fromHex("41" + log.topics[2].slice(-40));
          tokenAmount = parseInt(log.data, 16) / 1e6;
        }
      }
      tokenInfo = `<div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-coins'></i> Amount:</span><span class='tx-detail-value amount'>${tokenAmount} USDT</span></div>`;
      detailsHtml = `
        <div class='tx-detail-card'>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-check-circle'></i> Status:</span><span class='tx-detail-value success'>${ret}</span></div>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-exchange-alt'></i> Type:</span><span class='tx-detail-value'>${type}</span></div>
          ${tokenInfo}
        </div>
        <div class='tx-detail-card'>
          ${resourcesFeeHtml}
        </div>
        <div class='tx-detail-card'>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-user-minus'></i> From:</span><span class='tx-detail-value'>${owner}</span></div>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-user-plus'></i> To:</span><span class='tx-detail-value'>${tokenTo}</span></div>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-hashtag'></i> Hash:</span><span class='tx-detail-value'>${id}</span></div>
        </div>
        <div class='tx-detail-card'>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-layer-group'></i> Block:</span><span class='tx-detail-value'>${blockNumber}</span></div>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-clock'></i> Date:</span><span class='tx-detail-value'>${timestamp}</span></div>
        </div>
      `;
    } else if (
      type === "DelegateResourceContract" ||
      type === "UnDelegateResourceContract"
    ) {
      // Resource delegation/undelegation
      let resourceType =
        parameter && parameter.resource ? parameter.resource : "BANDWIDTH";
      let stakedAmount =
        amount !== "-" ? `${amount} TRX` : `${parameter.balance / 1e6} TRX`;
      let resourceTakenFrom =
        parameter && parameter.receiver_address
          ? parameter.receiver_address
          : "-";
      let stakedAssetHtml = "";
      let delegatedHtml = "";
      let reclaimedHtml = "";
      if (type === "DelegateResourceContract") {
        stakedAssetHtml = `<div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-coins'></i> Staked Asset Withheld:</span><span class='tx-detail-value amount'>${stakedAmount} </span></div>`;
        delegatedHtml = `<div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-leaf'></i> Delegated Resources:</span><span class='tx-detail-value'>${resourceType}</span></div>`;
      } else if (type === "UnDelegateResourceContract") {
        stakedAssetHtml = `<div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-coins'></i> Staked Asset Released:</span><span class='tx-detail-value amount'>${stakedAmount}</span></div>`;
        reclaimedHtml = `<div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-leaf'></i> Reclaimed Resources:</span><span class='tx-detail-value'>${resourceType}</span></div>`;
      }
      detailsHtml = `
        <div class='tx-detail-card'>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-check-circle'></i> Status:</span><span class='tx-detail-value success'>${ret}</span></div>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-exchange-alt'></i> Type:</span><span class='tx-detail-value'>${type}</span></div>
          ${stakedAssetHtml}
          ${delegatedHtml}
          ${reclaimedHtml}
        </div>
        <div class='tx-detail-card'>
          ${resourcesFeeHtml}
        </div>
        <div class='tx-detail-card'>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-user-minus'></i> Owner Address:</span><span class='tx-detail-value'>${owner}</span></div>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-user-plus'></i> Resource Taken From:</span><span class='tx-detail-value'>${resourceTakenFrom}</span></div>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-hashtag'></i> Hash:</span><span class='tx-detail-value'>${id}</span></div>
        </div>
        <div class='tx-detail-card'>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-layer-group'></i> Block:</span><span class='tx-detail-value'>${blockNumber}</span></div>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-clock'></i> Date:</span><span class='tx-detail-value'>${timestamp}</span></div>
        </div>
      `;
    } else {
      // Default rendering (TransferContract, etc)
      detailsHtml = `
        <div class='tx-detail-card'>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-check-circle'></i> Status:</span><span class='tx-detail-value success'>${ret}</span></div>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-exchange-alt'></i> Type:</span><span class='tx-detail-value'>${type}</span></div>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-coins'></i> Amount:</span><span class='tx-detail-value amount'>${amount} TRX</span></div>
          ${resourcesFeeHtml}
        </div>
        <div class='tx-detail-card'>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-user-minus'></i> From:</span><span class='tx-detail-value'>${owner}</span></div>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-user-plus'></i> To:</span><span class='tx-detail-value'>${to}</span></div>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-hashtag'></i> Hash:</span><span class='tx-detail-value'>${id}</span></div>
        </div>
        <div class='tx-detail-card'>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-layer-group'></i> Block:</span><span class='tx-detail-value'>${blockNumber}</span></div>
          <div class='tx-detail-row'><span class='tx-detail-label'><i class='fas fa-clock'></i> Date:</span><span class='tx-detail-value'>${timestamp}</span></div>
        </div>
      `;
    }

    output.innerHTML = `<div class='card transaction-details'><div class='transaction-details-header'><h3><i class='fas fa-receipt'></i> Transaction Details</h3><button onclick="shareTxLink('${id}')" class='btn-icon share-btn' title='Copy Shareable Link'><i class='fas fa-share-alt'></i></button></div><div class='transaction-details-content'>${detailsHtml}</div></div>`;

    if (typeof notify === "function") notify("Transaction found", "success");
  } catch (err) {
    output.innerHTML = `<div class="error-state"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Failed</h3><p>${err.message}</p></div>`;
    if (typeof notify === "function") notify(err.message, "error");
  } finally {
    setButtonLoading("txSearchBtn", false);
  }
  updateURLForPage("transaction", txid);
}
