import bs58check from "https://cdn.jsdelivr.net/npm/bs58check/+esm";
const uiGlobals = {};

// IndexedDB for storing searched addresses
class SearchedAddressDB {
  constructor() {
    this.dbName = "RippleWalletDB";
    this.version = 1;
    this.storeName = "searchedAddresses";
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: "address",
          });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  async saveSearchedAddress(
    address,
    balance,
    timestamp = Date.now(),
    sourceInfo = null
  ) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      // First, check if this address already exists
      const getRequest = store.get(address);

      getRequest.onsuccess = () => {
        const existingRecord = getRequest.result;
        let finalSourceInfo = sourceInfo;

        // If record exists and has sourceInfo, preserve it unless we're providing new sourceInfo
        if (existingRecord && existingRecord.sourceInfo && !sourceInfo) {
          finalSourceInfo = existingRecord.sourceInfo;
        }
        // If existing record has sourceInfo and new one doesn't, keep the existing one
        else if (
          existingRecord &&
          existingRecord.sourceInfo &&
          sourceInfo === null
        ) {
          finalSourceInfo = existingRecord.sourceInfo;
        }

        const data = {
          address, // This will be the XRP address
          balance,
          timestamp,
          formattedBalance: `${balance} XRP`,
          sourceInfo: finalSourceInfo, // Contains original blockchain info if converted from private key
        };

        const putRequest = store.put(data);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getSearchedAddresses() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("timestamp");

      // Get all records sorted by timestamp (newest first)
      const request = index.getAll();
      request.onsuccess = () => {
        const results = request.result.sort(
          (a, b) => b.timestamp - a.timestamp
        );
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSearchedAddress(address) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      const request = store.delete(address);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllSearchedAddresses() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Initialize the database
const searchedAddressDB = new SearchedAddressDB();

const {
  html,
  svg,
  render: renderElem,
} = typeof uhtml !== "undefined"
  ? uhtml
  : {
      html: (strings, ...values) => strings.join(""),
      svg: () => "",
      render: () => {},
    };
const { signal, computed, effect } =
  typeof preactSignalsCore !== "undefined"
    ? preactSignalsCore
    : {
        signal: (val) => ({ value: val }),
        computed: () => ({}),
        effect: () => {},
      };
uiGlobals.connectionErrorNotification = [];
//Checks for internet connection status
if (!navigator.onLine)
  uiGlobals.connectionErrorNotification.push(
    notify(
      "There seems to be a problem connecting to the internet, Please check you internet connection.",
      "error"
    )
  );
window.addEventListener("offline", () => {
  uiGlobals.connectionErrorNotification.push(
    notify(
      "There seems to be a problem connecting to the internet, Please check you internet connection.",
      "error"
    )
  );
});
window.addEventListener("online", () => {
  uiGlobals.connectionErrorNotification.forEach((notification) => {
    getRef("notification_drawer").remove(notification);
  });
  notify("We are back online.", "success");
});

// Use instead of document.getElementById
function getRef(elementId) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element with ID '${elementId}' not found`);
  }
  return element;
}

// displays a popup for asking permission.
const getConfirmation = (title, options = {}) => {
  return new Promise((resolve) => {
    const {
      message = "",
      cancelText = "Cancel",
      confirmText = "OK",
      danger = false,
    } = options;
    openPopup("confirmation_popup", true);
    getRef("confirm_title").innerText = title;
    renderElem(getRef("confirm_message"), message);
    const cancelButton =
      getRef("confirmation_popup").querySelector(".cancel-button");
    const confirmButton =
      getRef("confirmation_popup").querySelector(".confirm-button");
    confirmButton.textContent = confirmText;
    cancelButton.textContent = cancelText;
    if (danger) confirmButton.classList.add("button--danger");
    else confirmButton.classList.remove("button--danger");
    confirmButton.onclick = () => {
      closePopup();
      resolve(true);
    };
    cancelButton.onclick = () => {
      closePopup();
      resolve(false);
    };
  });
};
const debounce = (callback, wait) => {
  let timeoutId = null;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback.apply(null, args);
    }, wait);
  };
};

let zIndex = 50;

function openPopup(popupId, pinned) {
  zIndex++;
  const popup = getRef(popupId);
  popup.setAttribute("style", `z-index: ${zIndex}`);
  popup.show({ pinned });

  if (typeof popupStack !== "undefined" && popupStack.push) {
    popupStack.push({ popup, id: popupId });
  }
  return popup;
}

function closePopup() {
  if (typeof popupStack !== "undefined" && popupStack.peek && popupStack.pop) {
    if (popupStack.peek() === undefined) return;
    const current = popupStack.pop();
    current.popup.hide();
  }
}

document.addEventListener("popupclosed", (e) => {
  zIndex--;
});

//Function for displaying toast notifications.
function notify(message, mode, options = {}) {
  const icon =
    mode === "success"
      ? `<svg class="icon icon--success" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M10 15.172l9.192-9.193 1.415 1.414L10 18l-6.364-6.364 1.414-1.414z"/></svg>`
      : mode === "error"
      ? `<svg class="icon icon--error" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"/></svg>`
      : "";

  const drawer = getRef("notification_drawer");
  if (!drawer) return;

  const notification = document.createElement("div");
  notification.className = `notification ${mode}`;
  notification.innerHTML = `${icon}<span>${message}</span>`;

  drawer.appendChild(notification);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, options.duration || 3000);
}

// Input field control functions
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const toggleBtn = input.parentElement.querySelector(".toggle-password");

  if (input.type === "password") {
    input.type = "text";
    toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    toggleBtn.title = "Hide";
  } else {
    input.type = "password";
    toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
    toggleBtn.title = "Show";
  }
}

function clearInput(inputId) {
  const input = document.getElementById(inputId);
  input.value = "";
  input.focus();

  // If it's a password field that was shown, hide it again
  if (input.type === "text" && input.classList.contains("password-field")) {
    const toggleBtn = input.parentElement.querySelector(".toggle-password");
    input.type = "password";
    toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
    toggleBtn.title = "Show";
  }

  notify("Input cleared", "success");
}

// Initialize input containers with controls
function initializeInputControls() {
  // List of input IDs that need controls
  const inputIds = [
    "sendKey", // Send page - sender key
    "recipient", // Send page - recipient
    "amount", // Send page - amount
    "recoverKey", // Retrieve page
    "checkAddress", // Balance check
    "checkTransactionHash", // Transaction hash search
    "generateKey", // Generate page
  ];

  inputIds.forEach((inputId) => {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Skip if already wrapped
    if (input.parentElement.classList.contains("input-container")) return;

    // Create wrapper container
    const container = document.createElement("div");
    container.className = "input-container";

    // Insert container before input
    input.parentNode.insertBefore(container, input);

    // Move input into container
    container.appendChild(input);

    // Determine if this is a sensitive field (private keys, seeds)
    const isSensitiveField = ["sendKey", "recoverKey", "generateKey"].includes(
      inputId
    );

    // Add password-field class for sensitive fields
    if (isSensitiveField) {
      input.classList.add("password-field");
      input.type = "password";
    }

    // Create controls container
    const controls = document.createElement("div");
    controls.className = "input-controls";

    // Add show/hide button for sensitive fields
    if (isSensitiveField) {
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "input-control-btn toggle-password";
      toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
      toggleBtn.title = "Show";
      toggleBtn.type = "button";
      toggleBtn.onclick = () => togglePasswordVisibility(inputId);
      controls.appendChild(toggleBtn);
    }

    // Add clear button for all fields
    const clearBtn = document.createElement("button");
    clearBtn.className = "input-control-btn clear-input";
    clearBtn.innerHTML = '<i class="fas fa-times"></i>';
    clearBtn.title = "Clear";
    clearBtn.type = "button";
    clearBtn.onclick = () => clearInput(inputId);
    controls.appendChild(clearBtn);

    // Add controls to container
    container.appendChild(controls);
  });
}

function getFormattedTime(timestamp, format) {
  try {
    if (String(timestamp).length < 13) timestamp *= 1000;
    let [day, month, date, year] = new Date(timestamp).toString().split(" "),
      minutes = new Date(timestamp).getMinutes(),
      hours = new Date(timestamp).getHours(),
      currentTime = new Date().toString().split(" ");

    minutes = minutes < 10 ? `0${minutes}` : minutes;
    let finalHours = ``;
    if (hours > 12) finalHours = `${hours - 12}:${minutes}`;
    else if (hours === 0) finalHours = `12:${minutes}`;
    else finalHours = `${hours}:${minutes}`;

    finalHours = hours >= 12 ? `${finalHours} PM` : `${finalHours} AM`;
    switch (format) {
      case "date-only":
        return `${month} ${date}, ${year}`;
        break;
      case "time-only":
        return finalHours;
      case "relative":
        // check if timestamp is older than a day
        if (Date.now() - new Date(timestamp) < 60 * 60 * 24 * 1000)
          return `${finalHours}`;
        else return relativeTime.from(timestamp);
      default:
        return `${month} ${date} ${year}, ${finalHours}`;
    }
  } catch (e) {
    console.error(e);
    return timestamp;
  }
}
// Simple state management for the wallet
let selectedCurrency = "xrp";
window.addEventListener("load", () => {
  document.body.classList.remove("hidden");
  document.addEventListener("keyup", (e) => {
    if (e.key === "Escape") {
      closePopup();
    }
  });
  document.addEventListener("copy", () => {
    notify("copied", "success");
  });
  document.addEventListener("pointerdown", (e) => {
    if (
      e.target.closest("button:not(:disabled), .interactive:not(:disabled)")
    ) {
      // createRipple effect can be added later
    }
  });

  // Initialize the wallet UI
  setTimeout(() => {
    const loadingPage = getRef("loading_page");
    if (loadingPage) {
      loadingPage.animate(
        [{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }],
        {
          duration: 300,
          fill: "forwards",
          easing: "ease",
        }
      ).onfinish = () => {
        loadingPage.remove();
      };
    }
  }, 500);
});

function getRippleAddress(input) {
  // This function should not accept addresses directly
  if (input.startsWith("r")) {
    throw new Error("Use private key or seed, not address");
  }
  if (input.startsWith("s")) return xrpl.Wallet.fromSeed(input).address;
  try {
    return convertWIFtoRippleWallet(input).address;
  } catch {
    return null;
  }
}

function convertWIFtoRippleWallet(wif) {
  try {
    const decoded = bs58check.decode(wif);
    let keyBuffer = decoded.slice(1); // remove version byte

    if (keyBuffer.length === 33 && keyBuffer[32] === 0x01) {
      keyBuffer = keyBuffer.slice(0, -1); // remove compression flag
    }
    const data = xrpl.Wallet.fromEntropy(keyBuffer);

    return {
      address: data.address,
      seed: data.seed,
    };
  } catch (error) {
    console.error("WIF conversion error:", error);
    throw new Error("Invalid WIF private key format: " + error.message);
  }
}

async function sendXRP() {
  const senderKeyElement = getRef("sendKey");
  const destinationElement = getRef("recipient");
  const amountElement = getRef("amount");

  if (!senderKeyElement || !destinationElement || !amountElement) {
    notify("Form elements not found", "error");
    return;
  }

  const senderKey = senderKeyElement.value;
  const destination = destinationElement.value;
  const amount = amountElement.value;

  // Validation
  if (!senderKey) return notify("Please enter your private key", "error");
  if (!destination) return notify("Please enter recipient address", "error");
  if (!amount || amount <= 0)
    return notify("Please enter valid amount", "error");

  try {
    let wallet;
    if (senderKey.startsWith("s")) {
      wallet = xrpl.Wallet.fromSeed(senderKey);
    } else {
      wallet = convertWIFtoRippleWallet(senderKey);
      wallet = xrpl.Wallet.fromSeed(wallet.seed);
    }

    // Store transaction data globally for confirmation
    window.pendingTransaction = {
      senderKey,
      destination,
      amount,
      wallet,
    };

    // Populate transaction details in confirmation popup
    const confirmAmountEl = getRef("confirmAmount");
    const confirmFromEl = getRef("confirmFrom");
    const confirmToEl = getRef("confirmTo");
    const confirmFeeEl = getRef("confirmFee");

    if (confirmAmountEl) confirmAmountEl.textContent = `${amount} XRP`;
    if (confirmFromEl)
      confirmFromEl.textContent = wallet.address || wallet.classicAddress;
    if (confirmToEl) confirmToEl.textContent = destination;
    if (confirmFeeEl) confirmFeeEl.textContent = "~0.00001 XRP";

    // Show confirmation popup
    openPopup("sendConfirm");
  } catch (err) {
    console.error("Send XRP error:", err);
    notify("Error processing transaction: ", "error");
  }
}

async function confirmSend() {
  if (!window.pendingTransaction) {
    notify("No transaction to confirm", "error");
    return;
  }

  const { wallet, destination, amount } = window.pendingTransaction;
  const client = new xrpl.Client("wss://s1.ripple.com/");

  // Show loading state on confirm button
  const confirmBtn = document.querySelector('[onclick="confirmSend()"]');
  const originalText = confirmBtn.innerHTML;
  confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
  confirmBtn.disabled = true;

  try {
    await client.connect();

    try {
      // Get the correct address from wallet object
      const walletAddress = wallet.classicAddress || wallet.address;

      const accountInfo = await client.request({
        command: "account_info",
        account: walletAddress,
        ledger_index: "validated",
      });

      // Check if account has sufficient balance
      const balance = xrpl.dropsToXrp(accountInfo.result.account_data.Balance);
      const requiredAmount = parseFloat(amount) + 0.000012; // Add typical fee

      if (balance < requiredAmount) {
        throw new Error(
          `Insufficient balance. Available: ${balance} XRP, Required: ${requiredAmount} XRP (including fee)`
        );
      }

      // Check if master key is disabled
      if (
        accountInfo.result.account_data.Flags &&
        accountInfo.result.account_data.Flags & 0x00100000
      ) {
        throw new Error(
          "Account master key is disabled. Cannot send transactions with this key."
        );
      }
    } catch (accountError) {
      if (accountError.message.includes("Account not found")) {
        throw new Error(
          "Sender account does not exist or is not activated on the ledger."
        );
      }
      throw accountError;
    }

    // Use your exact reference logic with improved LastLedgerSequence
    const ledgerInfo = await client.request({
      command: "ledger",
      ledger_index: "validated",
    });

    const currentLedger = ledgerInfo.result.ledger_index;

    const tx = {
      TransactionType: "Payment",
      Account: wallet.classicAddress || wallet.address,
      Destination: destination,
      Amount: xrpl.xrpToDrops(amount.toString()),
      LastLedgerSequence: currentLedger + 20,
    };

    const prepared = await client.autofill(tx);

    let signed;
    try {
      if (wallet.seed && wallet.seed.startsWith("s")) {
        const seedWallet = xrpl.Wallet.fromSeed(wallet.seed);
        signed = seedWallet.sign(prepared);
      } else {
        throw new Error("Invalid wallet object - no signing method available");
      }
    } catch (signError) {
      console.error("Error signing transaction:", signError);
      throw new Error(`Failed to sign transaction: ${signError.message}`);
    }

    const result = await client.submitAndWait(signed.tx_blob);

    // Safe access to transaction date
    let rippleDate = "N/A";
    if (result.result) {
      rippleDate = new Date(
        (result.result.date + 946684800) * 1000
      ).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: true,
      });
    }

    const Ledger_Index = result.result.ledger_index || "N/A";
    const fee = xrpl.dropsToXrp(result.result.Fee);

    // Check if transaction was successful
    if (result.result?.meta?.TransactionResult === "tesSUCCESS") {
      const fee = xrpl.dropsToXrp(result.result.Fee);

      // Close the confirmation popup first
      closePopup();

      // Populate success popup summary
      const successAmountEl = getRef("successAmount");
      const successFeeEl = getRef("successFee");

      if (successAmountEl) successAmountEl.textContent = `${amount} XRP`;
      if (successFeeEl) successFeeEl.textContent = `${fee} XRP`;

      // Populate detailed expandable section
      const expandableDetails = getRef("expandableDetails");
      if (expandableDetails) {
        expandableDetails.innerHTML = `
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">
                <i class="fas fa-user-minus"></i>
                From
              </span>
              <span class="detail-value address-value">${
                wallet.classicAddress || wallet.address
              }</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">
                <i class="fas fa-user-plus"></i>
                To
              </span>
              <span class="detail-value address-value">${destination}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">
                <i class="fas fa-hashtag"></i>
                Transaction Hash
              </span>
              <span class="detail-value hash-value" title="${signed.hash}">${
          signed.hash
        }</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">
                <i class="fas fa-clock"></i>
                Transaction Time
              </span>
              <span class="detail-value">${rippleDate}</span>
            </div>
          </div>
        `;
      }

      // Show success popup
      openPopup("transactionSuccess");

      // Clear form safely
      const sendKeyElement = getRef("sendKey");
      const recipientElement = getRef("recipient");
      const amountElement = getRef("amount");

      if (sendKeyElement) sendKeyElement.value = "";
      if (recipientElement) recipientElement.value = "";
      if (amountElement) amountElement.value = "";
    } else {
      console.error(
        "Transaction Failed:",
        result.result?.meta?.TransactionResult || "Unknown error"
      );
      throw new Error(
        `Transaction failed: ${
          result.result?.meta?.TransactionResult || "Unknown error"
        }`
      );
    }
  } catch (err) {
    console.error("Transaction failed:", err.message);

    let errorMessage = err.message;

    // Provide user-friendly error messages for common XRPL errors
    if (err.message.includes("tefMASTER_DISABLED")) {
      errorMessage =
        "The sender account's master key is disabled. Please use a different account or enable the master key.";
    } else if (err.message.includes("tefPAST_SEQ")) {
      errorMessage =
        "Transaction sequence number is too old. Please try again.";
    } else if (err.message.includes("terPRE_SEQ")) {
      errorMessage =
        "Transaction sequence number is too high. Please try again.";
    } else if (err.message.includes("tecUNFUNDED_PAYMENT")) {
      errorMessage = "Insufficient funds to complete the transaction.";
    } else if (err.message.includes("tecNO_DST")) {
      errorMessage = "Destination account does not exist on the ledger.";
    } else if (err.message.includes("tecNO_DST_INSUF_XRP")) {
      errorMessage =
        "Destination requires a minimum XRP balance to receive this transaction.";
    } else if (err.message.includes("LastLedgerSequence")) {
      errorMessage =
        "Transaction expired (took too long to process). Please try again.";
    } else if (err.message.includes("Account not found")) {
      errorMessage =
        "Sender account does not exist or is not activated on the ledger.";
    } else if (err.message.includes("master key is disabled")) {
      errorMessage =
        "This account's master key is disabled and cannot send transactions.";
    } else if (err.message.includes("Insufficient balance")) {
      // This is already user-friendly from our custom check
    } else if (
      err.message.includes("timeout") ||
      err.message.includes("network")
    ) {
      errorMessage =
        "Network timeout. Please check your connection and try again.";
    }

    const formattedError = `
      <div style="font-weight: 600; margin-bottom: 0.5rem;">
        <i class="fas fa-exclamation-circle" style="color: var(--danger-color); margin-right: 0.5rem;"></i>
        Transaction Failed
      </div>
      <div style="font-size: 0.875rem;">${errorMessage}</div>
    `;
    notify(formattedError, "error", { timeout: 8000 });

    // Close the confirmation popup on error
    closePopup();
  } finally {
    await client.disconnect();

    // Restore button state
    confirmBtn.innerHTML = originalText;
    confirmBtn.disabled = false;

    // Don't close popup here
    window.pendingTransaction = null;
  }
}

// Searched Addresses Management
async function updateSearchedAddressesList() {
  try {
    const searchedAddresses = await searchedAddressDB.getSearchedAddresses();
    displaySearchedAddresses(searchedAddresses);
  } catch (error) {
    console.error("Error loading searched addresses:", error);
  }
}

function displaySearchedAddresses(addresses) {
  // Check if we need to create the searched addresses container
  let container = document.getElementById("searchedAddressesContainer");

  if (!container && addresses.length > 0) {
    // Create the container at the end of the connectPage
    const connectPage = document.getElementById("connectPage");
    container = document.createElement("div");
    container.id = "searchedAddressesContainer";
    container.className = "card searched-addresses-card";
    connectPage.appendChild(container);
  }

  if (!container) return;

  if (addresses.length === 0) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  container.innerHTML = `
    <div class="searched-addresses-header">
      <h3><i class="fas fa-history"></i> Searched addresses</h3>
      <button onclick="clearAllSearchedAddresses()" class="btn-clear-all" title="Clear all">
        <i class="fas fa-trash"></i> Clear All
      </button>
    </div>
    <div class="searched-addresses-list">
      ${addresses
        .map((addr, index) => {
          // Check if this was converted from a private key
          const hasSourceInfo =
            addr.sourceInfo && addr.sourceInfo.originalAddress !== addr.address;

          return `
        <div class="searched-address-item ${
          hasSourceInfo ? "has-source-info" : ""
        }" data-index="${index}" data-current-type="${
            hasSourceInfo ? addr.sourceInfo.blockchain.toLowerCase() : "xrp"
          }">
          ${
            hasSourceInfo
              ? `
          <div class="address-toggle-section">
            <div class="address-toggle-group">
              <button onclick="toggleAddressType(${index}, '${addr.sourceInfo.blockchain.toLowerCase()}')" 
                      class="btn-toggle-address active" 
                      data-type="${addr.sourceInfo.blockchain.toLowerCase()}" 
                      title="Show ${addr.sourceInfo.blockchain} Address">
                ${addr.sourceInfo.blockchain}
              </button>
              <button onclick="toggleAddressType(${index}, 'xrp')" 
                      class="btn-toggle-address" 
                      data-type="xrp" 
                      title="Show XRP Address">
                XRP
              </button>
            </div>
          </div>
          <div class="address-content-wrapper">
            <div class="address-info">
              <div class="address-display">
                <div class="address-text" id="address-display-${index}" title="${
                  addr.sourceInfo.originalAddress
                }">
                  ${addr.sourceInfo.originalAddress}
                </div>
              </div>
            </div>
            <div class="address-actions">
              <button onclick="copyCurrentAddress(${index})" class="btn-copy-current" title="Copy Selected Address">
                <i class="fas fa-copy"></i> COPY
              </button>
              <button onclick="deleteSearchedAddress('${
                addr.address
              }')" class="btn-delete" title="Delete">
                Delete
              </button>
              <button onclick="recheckBalance('${
                addr.address
              }')" class="btn-check" title="Check balance">
                Check balance
              </button>
            </div>
          </div>
          `
              : `
          <div class="address-info">
            <div class="address-display">
              <div class="address-text" id="address-display-${index}" title="${addr.address}">
                ${addr.address}
              </div>
            </div>
          </div>
          <div class="address-actions">
            <button onclick="copyAddressToClipboard('${addr.address}')" class="btn-copy" title="Copy XRP Address">
              <i class="fas fa-copy"></i> COPY
            </button>
            <button onclick="deleteSearchedAddress('${addr.address}')" class="btn-delete" title="Delete">
              Delete
            </button>
            <button onclick="recheckBalance('${addr.address}')" class="btn-check" title="Check balance">
              Check balance
            </button>
          </div>
          `
          }
        </div>
      `;
        })
        .join("")}
    </div>
  `;
}

// toggle between address types in searched addresses
async function toggleAddressType(addressIndex, type) {
  try {
    // Get the searched addresses list
    const addresses = await searchedAddressDB.getSearchedAddresses();
    if (!addresses[addressIndex]) return;

    const addressItem = addresses[addressIndex];
    const container = document.querySelector(`[data-index="${addressIndex}"]`);
    if (!container) return;

    // Update toggle button states
    const toggleButtons = container.querySelectorAll(".btn-toggle-address");
    toggleButtons.forEach((btn) => btn.classList.remove("active"));

    const activeButton = container.querySelector(`[data-type="${type}"]`);
    if (activeButton) {
      activeButton.classList.add("active");
    }

    // Store the current selection in the container data
    container.setAttribute("data-current-type", type);

    // Update the displayed address text based on selection
    const addressDisplay = container.querySelector(
      `#address-display-${addressIndex}`
    );
    if (addressDisplay) {
      if (type === "xrp") {
        // Show XRP address
        addressDisplay.textContent = addressItem.address;
        addressDisplay.title = addressItem.address;
      } else {
        // Show original blockchain address (FLO/BTC)
        const originalAddress =
          addressItem.sourceInfo?.originalAddress || addressItem.address;
        addressDisplay.textContent = originalAddress;
        addressDisplay.title = originalAddress;
      }
    }
  } catch (error) {
    console.error("Error toggling address type:", error);
  }
}

// copy the currently selected address
async function copyCurrentAddress(addressIndex) {
  try {
    // Get the searched addresses list
    const addresses = await searchedAddressDB.getSearchedAddresses();
    if (!addresses[addressIndex]) return;

    const addressItem = addresses[addressIndex];
    const container = document.querySelector(`[data-index="${addressIndex}"]`);
    if (!container) return;

    // Get the current selection type
    const currentType = container.getAttribute("data-current-type") || "flo"; // Default to original blockchain

    let addressToCopy;
    let addressLabel;

    if (currentType === "xrp") {
      addressToCopy = addressItem.address;
      addressLabel = "XRP address";
    } else {
      addressToCopy =
        addressItem.sourceInfo?.originalAddress || addressItem.address;
      addressLabel = `${
        addressItem.sourceInfo?.blockchain || "Original"
      } address`;
    }

    await copyAddressToClipboard(addressToCopy, addressLabel);
  } catch (error) {
    console.error("Error copying current address:", error);
    notify("Failed to copy address", "error");
  }
}

async function deleteSearchedAddress(address) {
  try {
    await searchedAddressDB.deleteSearchedAddress(address);
    await updateSearchedAddressesList();
    notify("Address removed from history", "success");
  } catch (error) {
    console.error("Error deleting searched address:", error);
    notify("Failed to remove address", "error");
  }
}

async function clearAllSearchedAddresses() {
  try {
    await searchedAddressDB.clearAllSearchedAddresses();
    await updateSearchedAddressesList();
    notify("All searched addresses cleared", "success");
  } catch (error) {
    console.error("Error clearing searched addresses:", error);
    notify("Failed to clear addresses", "error");
  }
}

async function copyAddressToClipboard(address, label = "Address") {
  try {
    await navigator.clipboard.writeText(address);
    notify(`${label} copied to clipboard`, "success");
  } catch (error) {
    console.error("Error copying to clipboard:", error);
    notify("Failed to copy address", "error");
  }
}

async function recheckBalance(xrpAddress) {
  document.getElementById("checkAddress").value = xrpAddress;
  await checkBalanceAndTransactions();
}

// Transaction pagination and filtering
let allTransactions = [];
let filteredTransactions = [];
let currentPage = 1;
const transactionsPerPage = 10;
let currentFilter = "all";

function setTransactionFilter(filter) {
  currentFilter = filter;
  currentPage = 1;

  // Update filter button states
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.filter === filter) {
      btn.classList.add("active");
    }
  });

  // Filter transactions
  filterAndDisplayTransactions();
}

function filterAndDisplayTransactions() {
  // Try to get address from either input field
  let address = "";

  const checkInput = document.getElementById("checkAddress");

  if (checkInput && checkInput.value.trim()) {
    address = checkInput.value.trim();
  } else {
    filteredTransactions = [...allTransactions];
    displayTransactionsPage();
    updatePaginationControls();
    return;
  }

  // Filter transactions based on current filter
  switch (currentFilter) {
    case "received":
      filteredTransactions = allTransactions.filter(
        (tx) => tx.tx.Destination === address
      );
      break;
    case "sent":
      filteredTransactions = allTransactions.filter(
        (tx) => tx.tx.Account === address
      );
      break;
    default:
      filteredTransactions = [...allTransactions];
  }

  displayTransactionsPage();
  updatePaginationControls();
}

function displayTransactionsPage() {
  const startIndex = (currentPage - 1) * transactionsPerPage;
  const endIndex = startIndex + transactionsPerPage;
  const pageTransactions = filteredTransactions.slice(startIndex, endIndex);

  const txList = document.getElementById("txList");
  const address = document.getElementById("checkAddress").value.trim();

  if (pageTransactions.length === 0) {
    if (filteredTransactions.length === 0 && allTransactions.length > 0) {
      txList.innerHTML = `
        <div class="no-transactions">
          <i class="fas fa-filter"></i>
          <p>No ${
            currentFilter === "all" ? "" : currentFilter
          } transactions found for this filter.</p>
        </div>
      `;
    } else {
      txList.innerHTML = `
        <div class="no-transactions">
          <i class="fas fa-inbox"></i>
          <p>No transactions found for this address.</p>
        </div>
      `;
    }
    return;
  }

  txList.innerHTML = "";

  pageTransactions.forEach((tx) => {
    const t = tx.tx;
    const meta = tx.meta;
    const date = new Date((t.date + 946684800) * 1000); // Ripple epoch conversion

    // Determine transaction direction and type
    const isIncoming = t.Destination === address;
    let direction = isIncoming ? "Received" : "Sent";
    let directionIcon = isIncoming ? "fa-arrow-down" : "fa-arrow-up";
    let directionClass = isIncoming ? "incoming" : "outgoing";

    // Special handling for OfferCreate transactions
    if (t.TransactionType === "OfferCreate") {
      direction = "Offer Create";
      directionIcon = "fa-exchange-alt";
      directionClass = "offer";
    }

    // Get amount - handle different formats
    let amount = "0";
    let currency = "XRP";
    let issuer = "";

    // Special handling for OfferCreate transactions
    if (t.TransactionType === "OfferCreate") {
      // For OfferCreate, compute Buy/Sell lines: creator buys TakerPays, sells TakerGets
      let takerGetsAmount = "N/A";
      let takerGetsCurrency = "N/A";
      let takerPaysAmount = "N/A";
      let takerPaysCurrency = "N/A";

      // Handle TakerGets
      if (t.TakerGets) {
        if (typeof t.TakerGets === "string") {
          // XRP in drops
          takerGetsAmount = xrpl.dropsToXrp(t.TakerGets);
          takerGetsCurrency = "XRP";
        } else if (typeof t.TakerGets === "object") {
          // IOU
          takerGetsAmount = t.TakerGets.value;
          takerGetsCurrency = t.TakerGets.currency;
        }
      }

      // Handle TakerPays
      if (t.TakerPays) {
        if (typeof t.TakerPays === "string") {
          // XRP in drops
          takerPaysAmount = xrpl.dropsToXrp(t.TakerPays);
          takerPaysCurrency = "XRP";
        } else if (typeof t.TakerPays === "object") {
          // IOU
          takerPaysAmount = t.TakerPays.value;
          takerPaysCurrency = t.TakerPays.currency;
        }
      }

      // Display strings kept for backward compatibility (not used in markup)
      amount = `${takerPaysAmount} ${takerPaysCurrency} for ${takerGetsAmount} ${takerGetsCurrency}`;
      // Map for UI
      var offerBuyAmount = takerPaysAmount;
      var offerBuyCurrency = takerPaysCurrency;
      var offerSellAmount = takerGetsAmount;
      var offerSellCurrency = takerGetsCurrency;
    } else {
      // Handle currency objects (including "ren" currency)
      if (t.Amount && typeof t.Amount === "object") {
        if (t.Amount.currency === "ren") {
          amount = `${t.Amount.value}`;
        } else {
          amount = `${t.Amount.value} ${t.Amount.currency}`;
        }
        currency = t.Amount.currency;
        issuer = t.Amount.issuer || "";
      } else if (
        meta.delivered_amount &&
        typeof meta.delivered_amount === "string" &&
        !isNaN(Number(meta.delivered_amount))
      ) {
        amount = xrpl.dropsToXrp(meta.delivered_amount);
      } else if (
        t.Amount &&
        typeof t.Amount === "string" &&
        !isNaN(Number(t.Amount))
      ) {
        amount = xrpl.dropsToXrp(t.Amount);
      } else if (t.Amount && typeof t.Amount === "object") {
        // Handle other currency objects
        amount = t.Amount.value;
        currency = t.Amount.currency;
        issuer = t.Amount.issuer || "";
        amount = `${amount} ${currency}`;
      } else {
        amount = "N/A"; // Non-payment tx or unsupported format
      }
    }

    // Format date
    const formattedDate = date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // Transaction status
    const isSuccess = meta.TransactionResult === "tesSUCCESS";
    const statusText = isSuccess ? "Confirmed" : "Failed";
    const statusClass = isSuccess ? "success" : "failed";

    const div = document.createElement("div");
    div.className = `transaction-card ${directionClass}`;
    div.innerHTML = `
      <div class="tx-main">
        <div class="tx-icon">
          <i class="fas ${directionIcon}"></i>
        </div>
        <div class="tx-info">
          <div class="tx-header">
            <span class="tx-direction ${
              t.TransactionType === "OfferCreate" ? "offer-create" : ""
            }">${direction}</span>
            <span class="tx-date">${formattedDate}, ${formattedTime}</span>
          </div>
          ${
            t.TransactionType === "OfferCreate"
              ? `<div class="tx-offer-lines">
                   <div class="offer-line">
                     <span class="offer-label">Buy</span>
                     <span class="offer-value">${offerBuyAmount} ${offerBuyCurrency}</span>
                   </div>
                   <div class="offer-line">
                     <span class="offer-label">Sell</span>
                     <span class="offer-value">${offerSellAmount} ${offerSellCurrency}</span>
                   </div>
                 </div>`
              : `<div class="tx-amount ${directionClass}">
                   ${amount} ${
                  currency === "XRP" && t.TransactionType !== "OfferCreate"
                    ? "XRP"
                    : ""
                }
                 </div>`
          }
          <div class="tx-addresses">
            ${
              t.TransactionType === "OfferCreate"
                ? `<div class="tx-address-row">
                    <span class="address-label">Account:</span>
                    <span class="address-value">${t.Account}</span>
                  </div>`
                : `<div class="tx-address-row">
                    <span class="address-label">From:</span>
                    <span class="address-value">${t.Account}</span>
                  </div>
                  ${
                    currency === "REN" && issuer
                      ? `<div class="tx-address-row">
                          <span class="address-label">Issuer:</span>
                          <span class="address-value">${issuer}</span>
                        </div>`
                      : ""
                  }
                  <div class="tx-address-row">
                    <span class="address-label">To:</span>
                    <span class="address-value">${t.Destination || "N/A"}</span>
                  </div>`
            }
            <div class="tx-address-row">
              <span class="address-label">Tx:</span>
              <span class="hash-value">${t.hash}</span>
            </div>
          </div>
        </div>
        <div class="tx-status ${statusClass}">
          ${statusText}
        </div>
      </div>
    `;
    txList.appendChild(div);
  });
}

function updatePaginationControls() {
  const totalPages = Math.ceil(
    filteredTransactions.length / transactionsPerPage
  );
  const startIndex = (currentPage - 1) * transactionsPerPage + 1;
  const endIndex = Math.min(
    currentPage * transactionsPerPage,
    filteredTransactions.length
  );

  // Update pagination info
  document.getElementById(
    "paginationInfo"
  ).textContent = `Showing ${startIndex} - ${endIndex} of ${filteredTransactions.length} transactions`;

  // Update previous/next buttons
  document.getElementById("prevBtn").disabled = currentPage === 1;
  document.getElementById("nextBtn").disabled =
    currentPage === totalPages || totalPages === 0;

  // Update page numbers
  generatePageNumbers(totalPages);
}

function generatePageNumbers(totalPages) {
  const pageNumbers = document.getElementById("pageNumbers");
  pageNumbers.innerHTML = "";

  if (totalPages <= 1) return;

  // Calculate which page numbers to show
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);

  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }

  // Add first page and ellipsis if needed
  if (startPage > 1) {
    addPageNumber(1);
    if (startPage > 2) {
      const ellipsis = document.createElement("span");
      ellipsis.textContent = "...";
      ellipsis.className = "page-ellipsis";
      pageNumbers.appendChild(ellipsis);
    }
  }

  // Add page numbers
  for (let i = startPage; i <= endPage; i++) {
    addPageNumber(i);
  }

  // Add last page and ellipsis if needed
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement("span");
      ellipsis.textContent = "...";
      ellipsis.className = "page-ellipsis";
      pageNumbers.appendChild(ellipsis);
    }
    addPageNumber(totalPages);
  }
}

function addPageNumber(pageNum) {
  const pageNumbers = document.getElementById("pageNumbers");
  const pageBtn = document.createElement("button");
  pageBtn.className = `page-number ${pageNum === currentPage ? "active" : ""}`;
  pageBtn.textContent = pageNum;
  pageBtn.onclick = () => goToPage(pageNum);
  pageNumbers.appendChild(pageBtn);
}

function goToPage(page) {
  currentPage = page;
  displayTransactionsPage();
  updatePaginationControls();
}

function goToPreviousPage() {
  if (currentPage > 1) {
    goToPage(currentPage - 1);
  }
}

function goToNextPage() {
  const totalPages = Math.ceil(
    filteredTransactions.length / transactionsPerPage
  );
  if (currentPage < totalPages) {
    goToPage(currentPage + 1);
  }
}

//combines balance checking and transaction lookup
async function checkBalanceAndTransactions() {
  const addressInput = document.getElementById("checkAddress");
  const userInput = addressInput.value.trim();
  let actualXRPAddress = userInput;
  let sourceInfo = null;

  try {
    if (!userInput) {
      notify(
        "Please enter an XRP address, XRP seed, BTC private key, or FLO private key",
        "error"
      );
      return;
    }

    // If it's already an XRP address, use it directly
    if (
      userInput.startsWith("r") &&
      userInput.length >= 25 &&
      userInput.length <= 34
    ) {
      actualXRPAddress = userInput;
    }
    // Check if user is trying to enter BTC or FLO addresses (which we don't support)
    else if (
      userInput.startsWith("1") || // BTC Legacy address
      userInput.startsWith("3") || // BTC Script address
      userInput.startsWith("bc1") || // BTC Bech32 address
      userInput.startsWith("F") // FLO address
    ) {
      let addressType = "";
      if (
        userInput.startsWith("1") ||
        userInput.startsWith("3") ||
        userInput.startsWith("bc1")
      ) {
        addressType = "Bitcoin address";
      } else if (userInput.startsWith("F")) {
        addressType = "FLO address";
      }

      notify(
        `${addressType} detected. Please use private keys only, not addresses. Enter a Bitcoin private key (starting with 'L' or 'K'), FLO private key, or XRP address (starting with 'r').`,
        "error"
      );
      return;
    }
    // Detect if input is a private key/seed and convert to XRP address
    else if (!userInput.startsWith("r")) {
      try {
        // Check if it's an XRP seed first (starts with 's')
        if (userInput.startsWith("s") && userInput.length >= 25) {
          try {
            notify("Detected XRP seed - converting to XRP address...", "info");

            const rippleWallet = xrpl.Wallet.fromSeed(userInput);
            actualXRPAddress = rippleWallet.address;

            sourceInfo = {
              type: "XRP Seed",
              originalKey: userInput,
              originalAddress: actualXRPAddress,
              blockchain: "XRP",
            };

            notify(
              `Converted XRP seed to address: ${actualXRPAddress}`,
              "success"
            );
          } catch (seedError) {
            throw new Error("Invalid XRP seed format");
          }
        }
        // Check if it's a Bitcoin WIF format (starts with "L" or "K")
        else if (userInput.startsWith("L") || userInput.startsWith("K")) {
          notify(
            "Detected Bitcoin private key - converting to XRP address...",
            "info"
          );

          // Convert BTC WIF to XRP
          const xrpResult = convertWIFtoRippleWallet(userInput);
          actualXRPAddress = xrpResult.address;

          // Get BTC address for source info
          const btcResult = generateBTCFromPrivateKey(userInput);

          sourceInfo = {
            type: "Bitcoin Private Key",
            originalKey: userInput,
            originalAddress: btcResult ? btcResult.address : "N/A",
            blockchain: "BTC",
          };

          notify(
            `Converted Bitcoin key to XRP address: ${actualXRPAddress}`,
            "success"
          );
        }
        // FLO private key or other WIF format (but NOT XRP seeds)
        else {
          try {
            notify(
              "Detected FLO private key - converting to XRP address...",
              "info"
            );

            // convert as FLO WIF
            const xrpResult = convertWIFtoRippleWallet(userInput);
            actualXRPAddress = xrpResult.address;

            //  get FLO address for source info
            const floResult = generateFLOFromPrivateKey(userInput);

            sourceInfo = {
              type: "FLO Private Key",
              originalKey: userInput,
              originalAddress: floResult ? floResult.address : "N/A",
              blockchain: "FLO",
            };

            notify(
              `Converted FLO private key to XRP address: ${actualXRPAddress}`,
              "success"
            );
          } catch (conversionError) {
            throw new Error(
              "Invalid input. Please enter a valid XRP address (starting with 'r'),private key(BTC/FLO)."
            );
          }
        }
      } catch (error) {
        notify(`Invalid input: ${error.message}`, "error");
        return;
      }
    }
    // Handle invalid XRP address format
    else {
      notify(
        "Invalid XRP address format. XRP addresses should start with 'r' and be 25-34 characters long.",
        "error"
      );
      return;
    }

    // Validate the final XRP address format
    if (
      !actualXRPAddress.startsWith("r") ||
      actualXRPAddress.length < 25 ||
      actualXRPAddress.length > 34
    ) {
      notify("Invalid or unconvertible address format", "error");
      return;
    }

    // Show loading state
    const checkBtn = document.querySelector(
      '[onclick="checkBalanceAndTransactions()"]'
    );
    const originalText = checkBtn.innerHTML;
    checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    checkBtn.disabled = true;

    // Create XRPL client instance
    const client = new xrpl.Client("wss://s1.ripple.com/");

    try {
      await client.connect();

      // First, check balance
      try {
        const accountInfo = await client.request({
          command: "account_info",
          account: actualXRPAddress,
          ledger_index: "current",
        });

        const balance =
          parseFloat(accountInfo.result.account_data.Balance) / 1000000; // Convert drops to XRP

        // Update balance display
        document.getElementById(
          "displayBalance"
        ).textContent = `${balance.toLocaleString()} XRP`;
        document.getElementById("checkedAddress").textContent =
          actualXRPAddress;

        // Update URL for sharing
        const currentUrl = new URL(window.location);
        currentUrl.searchParams.set("address", actualXRPAddress);
        currentUrl.searchParams.delete("tx"); // Remove transaction param if exists
        window.history.pushState({}, "", currentUrl);

        // Save to IndexedDB with source information
        try {
          await searchedAddressDB.saveSearchedAddress(
            actualXRPAddress,
            balance.toLocaleString(),
            Date.now(),
            sourceInfo
          );
          await updateSearchedAddressesList();
        } catch (dbError) {
          console.warn("Failed to save address to IndexedDB:", dbError);
        }

        // Show balance info
        document.getElementById("balanceInfo").style.display = "block";
      } catch (error) {
        if (error.data && error.data.error === "actNotFound") {
          // Account not found (not activated)
          document.getElementById("displayBalance").textContent = "0 XRP";
          document.getElementById("checkedAddress").textContent =
            actualXRPAddress;

          // Update URL for sharing
          const currentUrl = new URL(window.location);
          currentUrl.searchParams.set("address", actualXRPAddress);
          currentUrl.searchParams.delete("tx"); // Remove transaction param if exists
          window.history.pushState({}, "", currentUrl);

          // Save to IndexedDB with source information
          try {
            await searchedAddressDB.saveSearchedAddress(
              actualXRPAddress,
              "0",
              Date.now(),
              sourceInfo
            );
            await updateSearchedAddressesList();
          } catch (dbError) {
            console.warn("Failed to save address to IndexedDB:", dbError);
          }

          // Show balance info
          document.getElementById("balanceInfo").style.display = "block";

          notify(
            "Account not found - Address not activated (needs 1 XRP minimum)",
            "warning"
          );
        } else {
          throw error;
        }
      }

      // Now lookup transactions
      try {
        const res = await client.request({
          command: "account_tx",
          account: actualXRPAddress,
          ledger_index_min: -1,
          ledger_index_max: -1,
          limit: 1000,
        });
        console.log(res);

        // Store all transactions
        allTransactions = res.result.transactions;

        // Reset pagination state
        currentPage = 1;
        currentFilter = "all";

        // Reset filter buttons
        document.querySelectorAll(".filter-btn").forEach((btn) => {
          btn.classList.remove("active");
          if (btn.dataset.filter === "all") {
            btn.classList.add("active");
          }
        });

        if (allTransactions.length === 0) {
          document.getElementById("txList").innerHTML =
            '<div class="no-transactions"><i class="fas fa-inbox"></i><p>No transactions found for this address.</p></div>';

          // Hide transaction controls and reset pagination
          document.getElementById("transactionControls").style.display = "none";

          // Reset pagination info
          document.getElementById("paginationInfo").textContent =
            "Showing 0 - 0 of 0 transactions";

          // Clear page numbers
          document.getElementById("pageNumbers").innerHTML = "";

          // Disable pagination buttons
          document.getElementById("prevBtn").disabled = true;
          document.getElementById("nextBtn").disabled = true;
        } else {
          // Show controls and display transactions
          document.getElementById("transactionControls").style.display =
            "block";
          filterAndDisplayTransactions();
        }

        //  transaction lookup address field value for filtering compatibility
        const lookupInput = document.getElementById("checkAddress");
        if (lookupInput) {
          lookupInput.value = actualXRPAddress;
        }

        // Show transaction section
        document.getElementById("transactionSection").style.display = "block";

        const sourceMessage = sourceInfo
          ? ` (converted from ${sourceInfo.blockchain} ${sourceInfo.type})`
          : "";
        notify(
          `Balance loaded${sourceMessage}. Found ${allTransactions.length} transactions`,
          "success"
        );
      } catch (transactionError) {
        console.warn("Failed to fetch transactions:", transactionError);
        document.getElementById("txList").innerHTML =
          '<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load transactions.</p></div>';

        // Still show transaction section even if transactions failed
        document.getElementById("transactionSection").style.display = "block";

        notify("Balance loaded, but failed to fetch transactions", "warning");
      }
    } finally {
      await client.disconnect();
      // Restore button state
      checkBtn.innerHTML = originalText;
      checkBtn.disabled = false;
    }
  } catch (error) {
    console.error("Error in checkBalanceAndTransactions:", error);
    notify(`Error: ${error.message}`, "error");
    // Restore button state on error
    const checkBtn = document.querySelector(
      '[onclick="checkBalanceAndTransactions()"]'
    );
    if (checkBtn) {
      checkBtn.innerHTML = '<i class="fas fa-search-dollar"></i> Check Balance';
      checkBtn.disabled = false;
    }
  }
}

// Retrieve specific cryptocurrency addresses from private key
async function retrieveXRPAddress() {
  const keyInput = document.getElementById("recoverKey");
  if (!keyInput || !keyInput.value.trim()) {
    notify("Please enter a private key or seed", "error");
    return;
  }

  // Show loading state
  const retrieveBtn = document.querySelector(
    '[onclick="retrieveXRPAddress()"]'
  );
  const originalText = retrieveBtn.innerHTML;
  retrieveBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> Retrieving...';
  retrieveBtn.disabled = true;

  try {
    const sourceKey = keyInput.value.trim();
    let walletResult;
    let sourceType;
    let sourceBlockchain = "XRP";
    let btcResult = null;
    let floResult = null;
    // Check if it's an XRP seed first (starts with 's')
    if (sourceKey.startsWith("s") && sourceKey.length >= 25) {
      try {
        sourceType = "XRP Seed";
        sourceBlockchain = "XRP";
        notify("Retrieving addresses from XRP seed...", "info");
        const rippleWallet = xrpl.Wallet.fromSeed(sourceKey);
        walletResult = {
          address: rippleWallet.address,
          publicKey: rippleWallet.publicKey,
          privateKey: rippleWallet.privateKey,
          seed: rippleWallet.seed,
        };
      } catch (seedError) {
        throw new Error("Invalid XRP seed format");
      }
    }
    // Check if it's a Bitcoin WIF format (starts with "L" or "K")
    else if (sourceKey.startsWith("L") || sourceKey.startsWith("K")) {
      if (typeof elliptic === "undefined") {
        throw new Error(
          "elliptic library not loaded. Please refresh the page."
        );
      }
      if (typeof bs58check === "undefined") {
        throw new Error(
          "bs58check library not loaded. Please refresh the page."
        );
      }

      sourceType = "Bitcoin WIF";
      sourceBlockchain = "Bitcoin";
      notify("Converting Bitcoin WIF to multi-blockchain addresses...", "info");
      walletResult = convertWIFtoRippleWallet(sourceKey);
      try {
        floResult = generateFLOFromPrivateKey(sourceKey);
      } catch (error) {
        console.warn("Could not generate FLO address:", error.message);
      }
      try {
        btcResult = generateBTCFromPrivateKey(sourceKey);
      } catch (error) {
        console.warn("Could not generate BTC address:", error.message);
      }
    } else {
      try {
        if (
          typeof elliptic === "undefined" ||
          typeof bs58check === "undefined"
        ) {
          throw new Error(
            "Required libraries not loaded. Please refresh the page."
          );
        }

        sourceType = "FLO/Other WIF";
        sourceBlockchain = "FLO";
        notify("Converting WIF key to multi-blockchain addresses...", "info");
        walletResult = convertWIFtoRippleWallet(sourceKey);
        try {
          floResult = generateFLOFromPrivateKey(sourceKey);
        } catch (error) {
          console.warn("Could not generate FLO address:", error.message);
        }
        try {
          btcResult = generateBTCFromPrivateKey(sourceKey);
        } catch (error) {
          console.warn("Could not generate BTC address:", error.message);
        }
      } catch (e) {
        throw new Error(
          `Unsupported key/seed format. Supported formats:
          • XRP Seed (s...)
          • Bitcoin WIF (L.../K...)
          • FLO WIF`
        );
      }
    }

    // Display the retrieved wallet information
    const outputDiv = document.getElementById("recoveryOutput");
    if (outputDiv) {
      outputDiv.innerHTML = `
        <div class="wallet-result">
          <h3><i class="fas fa-key"></i> Multi-Blockchain Addresses Retrieved</h3>
          <div class="wallet-details">
            <div class="detail-row">
              <label>Source:</label>
              <span>${sourceType} (${sourceBlockchain})</span>
            </div>
            
            <!-- XRP Section -->
            <div class="blockchain-section">
              <h4><i class="fas fa-coins" style="color: #23b469;"></i> Ripple (XRP)</h4>
              <div class="detail-row">
                <label>XRP Address:</label>
                <div class="value-container">
                  <code>${walletResult.address}</code>
                  <button onclick="copyToClipboard('${
                    walletResult.address
                  }')" class="btn-copy">
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
              </div>
              <div class="detail-row">
                <label>XRP Seed:</label>
                <div class="value-container">
                  <code>${walletResult.seed}</code>
                  <button onclick="copyToClipboard('${
                    walletResult.seed
                  }')" class="btn-copy">
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
              </div>
            </div>

            ${
              btcResult
                ? `
            <!-- BTC Section -->
            <div class="blockchain-section">
              <h4><i class="fab fa-bitcoin" style="color: #f2a900;"></i> Bitcoin (BTC)</h4>
              <div class="detail-row">
                <label>BTC Address:</label>
                <div class="value-container">
                  <code>${btcResult.address}</code>
                  <button onclick="copyToClipboard('${btcResult.address}')" class="btn-copy">
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
              </div>
              <div class="detail-row">
                <label>BTC Private Key:</label>
                <div class="value-container">
                  <code>${btcResult.privateKey}</code>
                  <button onclick="copyToClipboard('${btcResult.privateKey}')" class="btn-copy">
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
              </div>
            </div>
            `
                : ""
            }

            ${
              floResult
                ? `
            <!-- FLO Section -->
            <div class="blockchain-section">
              <h4><i class="fas fa-leaf" style="color: #00d4aa;"></i> FLO Chain</h4>
              <div class="detail-row">
                <label>FLO Address:</label>
                <div class="value-container">
                  <code>${floResult.address}</code>
                  <button onclick="copyToClipboard('${floResult.address}')" class="btn-copy">
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
              </div>
              <div class="detail-row">
                <label>FLO Private Key:</label>
                <div class="value-container">
                  <code>${floResult.privateKey}</code>
                  <button onclick="copyToClipboard('${floResult.privateKey}')" class="btn-copy">
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
              </div>
            </div>
            `
                : ""
            }

          </div>
          <div class="warning-message" style="margin-top: 1rem; padding: 0.75rem; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; color: #856404;">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Retrieved from ${sourceType}:</strong> ${
        sourceType === "XRP Seed"
          ? "These addresses were generated from your original XRP seed."
          : `These addresses are mathematically derived from your ${sourceType} using elliptic curve cryptography.`
      } Keep all private keys secure.
          </div>
        </div>
      `;
      outputDiv.style.display = "block";
    }

    const blockchainCount = 1 + (btcResult ? 1 : 0) + (floResult ? 1 : 0);
    notify(
      `${blockchainCount} blockchain addresses retrieved successfully from ${sourceType}!`,
      "success"
    );
  } catch (conversionError) {
    console.error("Key/seed conversion error:", conversionError);
    notify("Failed to retrieve address: " + conversionError.message, "error");
  } finally {
    // Restore button state
    const retrieveBtn = document.querySelector(
      '[onclick="retrieveXRPAddress()"]'
    );
    if (retrieveBtn) {
      retrieveBtn.innerHTML = '<i class="fas fa-coins"></i> Retrieve Addresses';
      retrieveBtn.disabled = false;
    }
  }
}

// Helper function for copying to clipboard
function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      notify("Copied to clipboard!", "success");
    })
    .catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      notify("Copied to clipboard!", "success");
    });
}

function generateBTCFromPrivateKey(privateKey) {
  try {
    if (typeof btcOperator === "undefined") {
      throw new Error("btcOperator library not available");
    }

    // Convert private key to WIF format if it's hex
    let wifKey = privateKey;
    if (/^[0-9a-fA-F]{64}$/.test(privateKey)) {
      wifKey = coinjs.privkey2wif(privateKey);
    }
    let btcPrivateKey = btcOperator.convert.wif(wifKey);
    let btcAddress;
    btcAddress = btcOperator.bech32Address(wifKey);

    return {
      address: btcAddress,
      privateKey: btcPrivateKey,
    };
  } catch (error) {
    console.warn("BTC generation error:", error.message);
    return null;
  }
}

// FLO address generation
function generateFLOFromPrivateKey(privateKey) {
  try {
    let flowif = privateKey;

    if (/^[0-9a-fA-F]{64}$/.test(privateKey)) {
      flowif = coinjs.privkey2wif(privateKey);
    }

    let floprivateKey = btcOperator.convert.wif(flowif, bitjs.priv);
    let floAddress = floCrypto.getFloID(floprivateKey);

    if (!floAddress) {
      throw new Error("No working FLO address generation method found");
    }

    return {
      address: floAddress,
      privateKey: floprivateKey, // Returns the format that actually works
    };
  } catch (error) {
    console.warn("FLO generation not available:", error.message);
    return null;
  }
}

// Switch between search types
function switchSearchType(type) {
  const balanceTab = document.getElementById("balanceTab");
  const transactionTab = document.getElementById("transactionTab");
  const balanceSearch = document.getElementById("balanceSearch");
  const transactionSearch = document.getElementById("transactionSearch");

  if (type === "balance") {
    balanceTab.classList.add("active");
    transactionTab.classList.remove("active");
    balanceSearch.style.display = "block";
    transactionSearch.style.display = "none";

    // Hide transaction details if visible
    document.getElementById("transactionDetails").style.display = "none";
  } else {
    transactionTab.classList.add("active");
    balanceTab.classList.remove("active");
    transactionSearch.style.display = "block";
    balanceSearch.style.display = "none";

    // Hide balance info if visible
    document.getElementById("balanceInfo").style.display = "none";
    document.getElementById("transactionSection").style.display = "none";
  }
}

// Check transaction details by hash
async function checkTransactionDetails() {
  const hashInput = document.getElementById("checkTransactionHash");
  const txHash = hashInput.value.trim();

  try {
    if (!txHash) {
      notify("Please enter a transaction hash", "error");
      return;
    }

    // Show loading state
    const checkBtn = document.querySelector(
      '[onclick="checkTransactionDetails()"]'
    );
    const originalText = checkBtn.innerHTML;
    checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    checkBtn.disabled = true;

    // Create XRPL client instance
    const client = new xrpl.Client("wss://s1.ripple.com/");

    try {
      await client.connect();

      // Get transaction details
      const txResponse = await client.request({
        command: "tx",
        transaction: txHash,
      });
      console.log(txResponse);

      if (txResponse.result) {
        displayTransactionDetails(txResponse.result);

        // Update URL for sharing
        const currentUrl = new URL(window.location);
        currentUrl.searchParams.delete("address");
        currentUrl.searchParams.set("tx", txHash);
        window.history.pushState({}, "", currentUrl);

        notify("Transaction details loaded successfully", "success");
      } else {
        notify("Transaction not found", "error");
      }
    } catch (error) {
      console.error("Transaction lookup error:", error);
      if (error.data && error.data.error === "txnNotFound") {
        notify(
          "Transaction not found. Please check the hash and try again.",
          "error"
        );
      } else {
        notify(
          "Failed to fetch transaction details: " + error.message,
          "error"
        );
      }
    } finally {
      await client.disconnect();
    }
  } catch (error) {
    console.error("Error in checkTransactionDetails:", error);
    notify("An error occurred while checking transaction details", "error");
  } finally {
    // Restore button state
    const checkBtn = document.querySelector(
      '[onclick="checkTransactionDetails()"]'
    );
    if (checkBtn) {
      checkBtn.innerHTML = '<i class="fas fa-search"></i> View Transaction';
      checkBtn.disabled = false;
    }
  }
}

// Display transaction details
function displayTransactionDetails(txData) {
  const detailsContainer = document.getElementById("transactionDetailsContent");
  // console.log(txData);
  // console.log(parseFloat(txData.Amount)/ 1000000);
  // console.log(parseFloat(txData.Fee)/ 1000000);

  const txType = txData.TransactionType || "Unknown";
  const account = txData.Account || "N/A";
  const destination = txData.Destination || "N/A";
  const fee = txData.Fee ? parseFloat(txData.Fee) / 1000000 + " XRP" : "N/A";
  const sequence = txData.Sequence || "N/A";
  const ledgerIndex = txData.ledger_index || "N/A";
  const hash = txData.hash || "N/A";
  const date = txData.date
    ? new Date((txData.date + 946684800) * 1000).toLocaleString()
    : "N/A";
  const validated = txData.validated ? "Validated" : "Not Validated";

  // Special handling for OfferCreate transactions
  let amountInfo = "";
  if (txType === "OfferCreate") {
    // Handle TakerGets/Pays and build Buy/Sell lines
    let takerGetsAmount = "N/A";
    let takerGetsCurrency = "N/A";
    if (txData.TakerGets) {
      if (typeof txData.TakerGets === "string") {
        // XRP in drops
        takerGetsAmount = xrpl.dropsToXrp(txData.TakerGets);
        takerGetsCurrency = "XRP";
      } else if (typeof txData.TakerGets === "object") {
        // IOU
        takerGetsAmount = txData.TakerGets.value;
        takerGetsCurrency = txData.TakerGets.currency;
      }
    }

    // Handle TakerPays
    let takerPaysAmount = "N/A";
    let takerPaysCurrency = "N/A";
    if (txData.TakerPays) {
      if (typeof txData.TakerPays === "string") {
        // XRP in drops
        takerPaysAmount = xrpl.dropsToXrp(txData.TakerPays);
        takerPaysCurrency = "XRP";
      } else if (typeof txData.TakerPays === "object") {
        // IOU
        takerPaysAmount = txData.TakerPays.value;
        takerPaysCurrency = txData.TakerPays.currency;
      }
    }

    amountInfo = `
      <div class="tx-detail-row">
        <span class="tx-detail-label"><i class="fas fa-arrow-circle-up"></i> Buy:</span>
        <span class="tx-detail-value amount">${takerPaysAmount} ${takerPaysCurrency}</span>
      </div>
      <div class="tx-detail-row">
        <span class="tx-detail-label"><i class="fas fa-arrow-circle-down"></i> Sell:</span>
        <span class="tx-detail-value amount">${takerGetsAmount} ${takerGetsCurrency}</span>
      </div>
    `;
  } else {
    // Handle regular payment transactions (XRP or IOU like REN)
    let amountStr = "N/A";
    let issuerStr = "";
    if (txData.Amount) {
      if (typeof txData.Amount === "string") {
        amountStr = parseFloat(txData.Amount) / 1000000 + " XRP";
      } else if (typeof txData.Amount === "object") {
        amountStr = `${txData.Amount.value} ${txData.Amount.currency}`;
        issuerStr = txData.Amount.issuer || "";
      }
    }

    amountInfo = `
      <div class="tx-detail-row">
        <span class="tx-detail-label">
          <i class="fas fa-coins"></i>
          Amount:
        </span>
        <span class="tx-detail-value amount">${amountStr}</span>
      </div>
      ${
        issuerStr
          ? `<div class="tx-detail-row">
               <span class="tx-detail-label">
                 <i class="fas fa-building"></i>
                 Issuer:
               </span>
               <span class="tx-detail-value">${issuerStr}</span>
             </div>`
          : ""
      }
    `;
  }

  detailsContainer.innerHTML = `
    <div class="tx-detail-card">
      <div class="tx-detail-row">
        <span class="tx-detail-label">
          <i class="fas fa-check-circle"></i>
          Status:
        </span>
        <span class="tx-detail-value success">${validated}</span>
      </div>
      <div class="tx-detail-row">
        <span class="tx-detail-label">
          <i class="fas fa-exchange-alt"></i>
          Type:
        </span>
        <span class="tx-detail-value">${txType}</span>
      </div>
      ${amountInfo}
      <div class="tx-detail-row">
        <span class="tx-detail-label">
          <i class="fas fa-receipt"></i>
          Fee:
        </span>
        <span class="tx-detail-value">${fee}</span>
      </div>
    </div>
    
    <div class="tx-detail-card">
      <div class="tx-detail-row">
        <span class="tx-detail-label">
          <i class="fas fa-user-minus"></i>
          From:
        </span>
        <span class="tx-detail-value">${account}</span>
      </div>
      ${
        destination !== "N/A" && txType !== "OfferCreate"
          ? `
      <div class="tx-detail-row">
        <span class="tx-detail-label">
          <i class="fas fa-user-plus"></i>
          To:
        </span>
        <span class="tx-detail-value">${destination}</span>
      </div>
      `
          : ""
      }
      <div class="tx-detail-row">
        <span class="tx-detail-label">
          <i class="fas fa-hashtag"></i>
          Hash:
        </span>
        <span class="tx-detail-value">${hash}</span>
      </div>
    </div>
    
    <div class="tx-detail-card">
      <div class="tx-detail-row">
        <span class="tx-detail-label">
          <i class="fas fa-layer-group"></i>
          Ledger:
        </span>
        <span class="tx-detail-value">${ledgerIndex}</span>
      </div>
      <div class="tx-detail-row">
        <span class="tx-detail-label">
          <i class="fas fa-sort-numeric-up"></i>
          Sequence:
        </span>
        <span class="tx-detail-value">${sequence}</span>
      </div>
      <div class="tx-detail-row">
        <span class="tx-detail-label">
          <i class="fas fa-clock"></i>
          Date:
        </span>
        <span class="tx-detail-value">${date}</span>
      </div>
    </div>
  `;

  document.getElementById("transactionDetails").style.display = "block";
}

// shareable balance link
function copyBalanceLink() {
  const address = document.getElementById("checkedAddress").textContent;
  if (address && address !== "-") {
    const currentUrl = new URL(window.location);
    currentUrl.searchParams.set("address", address);
    currentUrl.searchParams.delete("tx"); // Remove transaction param if exists

    navigator.clipboard
      .writeText(currentUrl.toString())
      .then(() => {
        notify("Balance link copied to clipboard!", "success");
      })
      .catch(() => {
        notify("Failed to copy link", "error");
      });
  } else {
    notify("No address available to share", "error");
  }
}

// shareable transaction link
function copyTransactionLink() {
  const currentUrl = new URL(window.location);
  const txHash = currentUrl.searchParams.get("tx");

  if (txHash) {
    navigator.clipboard
      .writeText(currentUrl.toString())
      .then(() => {
        notify("Transaction link copied to clipboard!", "success");
      })
      .catch(() => {
        notify("Failed to copy link", "error");
      });
  } else {
    notify("No transaction hash available to share", "error");
  }
}

// Handle URL parameters on page load
function handleUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const address = urlParams.get("address");
  const txHash = urlParams.get("tx");

  if (address) {
    // Auto-fill address and check balance
    document.getElementById("checkAddress").value = address;
    switchSearchType("balance");
    setTimeout(() => {
      checkBalanceAndTransactions();
    }, 500);
  } else if (txHash) {
    // Auto-fill transaction hash and check details
    document.getElementById("checkTransactionHash").value = txHash;
    switchSearchType("transaction");
    setTimeout(() => {
      checkTransactionDetails();
    }, 500);
  }
}

window.sendXRP = sendXRP;

window.retrieveXRPAddress = retrieveXRPAddress;
window.copyToClipboard = copyToClipboard;
window.getRippleAddress = getRippleAddress;
window.confirmSend = confirmSend;
window.closePopup = closePopup;
window.checkBalanceAndTransactions = checkBalanceAndTransactions;

window.switchSearchType = switchSearchType;
window.checkTransactionDetails = checkTransactionDetails;
window.copyBalanceLink = copyBalanceLink;
window.copyTransactionLink = copyTransactionLink;
window.handleUrlParameters = handleUrlParameters;

window.convertWIFtoRippleWallet = convertWIFtoRippleWallet;

// Multi-blockchain function exports
window.generateBTCFromPrivateKey = generateBTCFromPrivateKey;
window.generateFLOFromPrivateKey = generateFLOFromPrivateKey;

window.setTransactionFilter = setTransactionFilter;
window.goToPreviousPage = goToPreviousPage;
window.goToNextPage = goToNextPage;
// Input control functions
window.togglePasswordVisibility = togglePasswordVisibility;
window.clearInput = clearInput;
// Searched addresses functions
window.updateSearchedAddressesList = updateSearchedAddressesList;
window.deleteSearchedAddress = deleteSearchedAddress;
window.clearAllSearchedAddresses = clearAllSearchedAddresses;
window.copyAddressToClipboard = copyAddressToClipboard;
window.recheckBalance = recheckBalance;
window.toggleAddressType = toggleAddressType;
window.copyCurrentAddress = copyCurrentAddress;

document.addEventListener("DOMContentLoaded", () => {
  initializeInputControls();
  handleUrlParameters();
});
