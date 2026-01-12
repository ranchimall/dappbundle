function isHex64(str) {
  return /^[0-9a-fA-F]{64}$/.test(str);
}
function isWif(str) {
  return /^[5KLc9RQ][1-9A-HJ-NP-Za-km-z]{50,}$/.test(str); // BTC/FLO WIF regex
}

async function recoverAllAddressesFromPrivKey(privKey) {
  const tronWeb = new TronWeb(
    "https://api.trongrid.io",
    "https://api.trongrid.io",
    "https://api.trongrid.io"
  );

  try {
    let hexPrivateKey = privKey;
    let source = "Tron";

    // Convert WIF to hex if needed
    if (isWif(privKey)) {
      const decoded = coinjs.wif2privkey(privKey);
      if (!decoded || !decoded["privkey"]) {
        return { error: "Invalid WIF private key" };
      }
      hexPrivateKey = decoded["privkey"];
      source = "BTC/FLO";
    } else if (!isHex64(privKey)) {
      return {
        error:
          "Unsupported private key format. Please use Tron hex (64 characters) or BTC/FLO WIF format.",
      };
    }

    // Generate TRON address
    const tronAddress = tronWeb.address.fromPrivateKey(hexPrivateKey);

    // Generate FLO address
    const floWallet = generateFLOFromPrivateKey(hexPrivateKey);

    // Generate BTC address
    const btcWallet = generateBTCFromPrivateKey(hexPrivateKey);

    return {
      source,
      hexPrivateKey,
      tronAddress,
      floWallet,
      btcWallet,
    };
  } catch (err) {
    return { error: err.message };
  }
}

async function runAddressRecovery() {
  const privKey = document.getElementById("recoveryPrivKey").value.trim();
  const output = document.getElementById("recoveryOutput");

  if (!privKey) {
    output.innerHTML = `<div class="error-state"><i class="fas fa-triangle-exclamation"></i>Enter a private key</div>`;
    if (typeof notify === "function") notify("Enter a private key", "error");
    return;
  }

  // Set loading state
  if (typeof setButtonLoading === "function") {
    setButtonLoading("recoverBtn", true);
  }

  // Show notification
  if (typeof notify === "function") {
    notify("Recovering address...", "success", 1500);
  }

  const recovered = await recoverAllAddressesFromPrivKey(privKey);

  if (recovered.error) {
    output.innerHTML = `<div class="error-state"><i class="fas fa-triangle-exclamation"></i>${recovered.error}</div>`;
    if (typeof notify === "function") notify(recovered.error, "error");
  } else {
    output.innerHTML = `
      <div class="wallet-generated-success">
        <div class="success-header">
          <div class="success-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <h3>Addresses Recovered Successfully!</h3>
          <p>Your multi-blockchain addresses have been recovered. All addresses are derived from the same private key.</p>
        </div>
      </div>
      
      <div class="blockchain-section">
        <div class="blockchain-header">
          <h4><i class="fas fa-coins"></i> TRON (TRX)</h4>
          <div class="blockchain-badge primary">Primary</div>
        </div>
        <div class="detail-row">
          <label><i class="fas fa-map-marker-alt"></i> TRON Address</label>
          <div class="value-container">
            <code>${recovered.tronAddress}</code>
            <button class="btn-icon" onclick="navigator.clipboard.writeText('${
              recovered.tronAddress
            }').then(()=>notify && notify('TRON address copied','success'))" title="Copy TRON Address">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </div>
        <div class="detail-row">
          <label><i class="fas fa-key"></i> TRON Private Key</label>
          <div class="value-container">
            <code>${recovered.hexPrivateKey}</code>
            <button class="btn-icon" onclick="navigator.clipboard.writeText('${
              recovered.hexPrivateKey
            }').then(()=>notify && notify('Private key copied','success'))" title="Copy Private Key">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </div>
      </div>
      
      ${
        recovered.floWallet
          ? `
      <div class="blockchain-section">
        <div class="blockchain-header">
          <h4><i class="fas fa-coins"></i> FLO</h4>
          <div class="blockchain-badge secondary">Secondary</div>
        </div>
        <div class="detail-row">
          <label><i class="fas fa-map-marker-alt"></i> FLO Address</label>
          <div class="value-container">
            <code>${recovered.floWallet.address}</code>
            <button class="btn-icon" onclick="navigator.clipboard.writeText('${recovered.floWallet.address}').then(()=>notify && notify('FLO address copied','success'))" title="Copy FLO Address">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </div>
        <div class="detail-row">
          <label><i class="fas fa-key"></i> FLO Private Key</label>
          <div class="value-container">
            <code>${recovered.floWallet.privateKey}</code>
            <button class="btn-icon" onclick="navigator.clipboard.writeText('${recovered.floWallet.privateKey}').then(()=>notify && notify('Private key copied','success'))" title="Copy Private Key">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </div>
      </div>`
          : ""
      }
      
      ${
        recovered.btcWallet
          ? `
      <div class="blockchain-section">
        <div class="blockchain-header">
          <h4><i class="fab fa-btc"></i> Bitcoin (BTC)</h4>
          <div class="blockchain-badge secondary">Secondary</div>
        </div>
        <div class="detail-row">
          <label><i class="fas fa-map-marker-alt"></i> BTC Address</label>
          <div class="value-container">
            <code>${recovered.btcWallet.address}</code>
            <button class="btn-icon" onclick="navigator.clipboard.writeText('${recovered.btcWallet.address}').then(()=>notify && notify('BTC address copied','success'))" title="Copy BTC Address">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </div>
        <div class="detail-row">
          <label><i class="fas fa-key"></i> BTC Private Key</label>
          <div class="value-container">
            <code>${recovered.btcWallet.privateKey}</code>
            <button class="btn-icon" onclick="navigator.clipboard.writeText('${recovered.btcWallet.privateKey}').then(()=>notify && notify('Private key copied','success'))" title="Copy Private Key">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </div>
      </div>`
          : ""
      }
      
      <div class="wallet-security-notice">
        <div class="notice-icon">
          <i class="fas fa-shield-alt"></i>
        </div>
        <div class="notice-content">
          <h4>Security Reminder</h4>
          <p>Keep your private key safe and secure. Never share it with anyone. Consider backing it up in a secure location.</p>
        </div>
      </div>
    `;
    if (typeof notify === "function")
      notify("All addresses recovered", "success");
  }

  // Clear loading state
  if (typeof setButtonLoading === "function") {
    setButtonLoading("recoverBtn", false);
  }
}
