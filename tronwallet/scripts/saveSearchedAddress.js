// IndexedDB for storing searched addresses
class SearchedAddressDB {
  constructor() {
    this.dbName = "TronWalletDB";
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

      // check if this address already exists
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
          address, // Tron address
          balance,
          timestamp,
          formattedBalance: `${balance} TRX`,
          sourceInfo: finalSourceInfo, //original blockchain info if converted from private key
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

const searchedAddressDB = new SearchedAddressDB();

async function displaySearchedAddresses(addresses) {
  let container = document.getElementById("searchedAddressesContainer");
  const transactionSection = document.getElementById("transactionSection");

  if (!container && addresses.length > 0) {
    container = document.createElement("div");
    container.id = "searchedAddressesContainer";
    container.className = "card searched-addresses-card";

    if (transactionSection && transactionSection.parentNode) {
      const nextSibling = transactionSection.nextSibling;
      transactionSection.parentNode.insertBefore(container, nextSibling);
    } else {
      const transactionsPage = document.getElementById("transactionsPage");
      if (transactionsPage) {
        transactionsPage.appendChild(container);
      }
    }
  }

  if (!container) return;

  if (addresses.length === 0) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  container.innerHTML = `
    <div class="searched-addresses-header">
      <h3><i class="fas fa-history"></i> Searched Addresses</h3>
      <button onclick="clearAllSearchedAddresses()" class="btn-clear-all" title="Clear all">
        <i class="fas fa-trash"></i> Clear All
      </button>
    </div>
    <div class="searched-addresses-list">
      ${addresses
        .map((addr, index) => {
          // Check if this was converted from a private key from another blockchain (BTC/FLO)
          const hasSourceInfo = addr.sourceInfo && addr.sourceInfo.originalKey;

          return `
        <div class="searched-address-item ${
          hasSourceInfo ? "has-source-info" : ""
        }" data-index="${index}" data-current-type="${
            hasSourceInfo ? addr.sourceInfo.blockchain.toLowerCase() : "tron"
          }">
          ${
            hasSourceInfo
              ? `
          <div class="address-toggle-section">
            <div class="address-toggle-group">
              <button onclick="toggleAddressType(${index}, '${addr.sourceInfo.blockchain.toLowerCase()}')" 
                      class="btn-toggle-address active" 
                      data-type="${addr.sourceInfo.blockchain.toLowerCase()}" 
                      title="Show ${addr.sourceInfo.blockchain} Private Key">
                ${addr.sourceInfo.blockchain}
              </button>
              <button onclick="toggleAddressType(${index}, 'tron')" 
                      class="btn-toggle-address" 
                      data-type="tron" 
                      title="Show Tron Address">
                TRON
              </button>
            </div>
          </div>
          <div class="address-content-wrapper">
            <div class="address-info">
              
              <div class="address-display">
                <div class="address-text" id="address-display-${index}" title="${
                  addr.sourceInfo.originalKey
                }">
                  ${addr.sourceInfo.originalKey}
                </div>
              </div>
            </div>
            <div class="address-actions">
              <button onclick="copyCurrentAddress(${index})" class="btn-copy-current" title="Copy Selected Value">
                <i class="fas fa-copy"></i> COPY
              </button>
              <button onclick="deleteSearchedAddress('${
                addr.address
              }')" class="btn-delete" title="Delete">
                <i class="fas fa-trash"></i>
              </button>
              <button onclick="checkBalanceForAddress('${
                addr.address
              }')" class="btn-check" title="Check balance">
                 Check Balance
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
            <button onclick="copyAddressToClipboard('${addr.address}')" class="btn-copy" title="Copy Tron Address">
              <i class="fas fa-copy"></i> COPY
            </button>
            <button onclick="deleteSearchedAddress('${addr.address}')" class="btn-delete" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
            <button onclick="checkBalanceForAddress('${addr.address}')" class="btn-check" title="Check balance">
               Check Balance
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

// Toggle between address types in searched addresses
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
      if (type === "tron") {
        // Tron address
        addressDisplay.textContent = addressItem.address;
        addressDisplay.title = addressItem.address;
      } else {
        // Show original blockchain private key (FLO/BTC)
        const originalKey =
          addressItem.sourceInfo?.originalKey || addressItem.address;
        addressDisplay.textContent = originalKey;
        addressDisplay.title = originalKey;
      }
    }
  } catch (error) {
    console.error("Error toggling address type:", error);
  }
}

// Copy the currently selected address
async function copyCurrentAddress(addressIndex) {
  try {
    // Get the searched addresses list
    const addresses = await searchedAddressDB.getSearchedAddresses();
    if (!addresses[addressIndex]) return;

    const addressItem = addresses[addressIndex];
    const container = document.querySelector(`[data-index="${addressIndex}"]`);
    if (!container) return;

    // Get the current selection type
    const currentType = container.getAttribute("data-current-type") || "tron";

    let valueToCopy;
    let valueLabel;

    if (currentType === "tron") {
      valueToCopy = addressItem.address;
      valueLabel = "Tron address";
    } else {
      // Copy the private key for non-Tron selection
      valueToCopy = addressItem.sourceInfo?.originalKey || addressItem.address;
      valueLabel = `${
        addressItem.sourceInfo?.blockchain || "Original"
      } private key`;
    }

    await copyAddressToClipboard(valueToCopy, valueLabel);
  } catch (error) {
    console.error("Error copying current value:", error);
    notify("Failed to copy value", "error");
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

function checkBalanceForAddress(address) {
  document.getElementById("balanceAddr").value = address;
  setSearchType("balance");
  runBalanceCheck();
}

async function updateSearchedAddressesList() {
  try {
    const searchedAddresses = await searchedAddressDB.getSearchedAddresses();
    displaySearchedAddresses(searchedAddresses);
  } catch (error) {
    console.error("Error loading searched addresses:", error);
  }
}

// Initialize the searched addresses list when the script loads
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await updateSearchedAddressesList();
  } catch (error) {
    console.error("Failed to initialize searched addresses:", error);
  }
});
