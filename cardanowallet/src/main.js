import { Buffer } from "buffer";
import CardanoAPI from "./lib/cardanoBlockchainAPI.js";
import CardanoSearchDB from "./lib/cardanoSearchDB.js";

window.Buffer = Buffer;


const cardanoAPI = new CardanoAPI('2b5b7753-64ae-42b4-bf28-bbeee0d42e49');

// Initialize Search History Database
const searchDB = new CardanoSearchDB();
searchDB.init().catch(err => console.error('[SearchDB] Init error:', err));

let currentWallet = null;
let currentAddress = null;
let currentPage = 1;
const PAGE_LIMIT = 10;
let eventListenersInitialized = false;

// Validation Utilities
const validators = {
  isCardanoAddress: (address) => {
    if (!address || typeof address !== 'string') return false;
    return address.startsWith('addr1') && address.length >= 50;
  },

  isPrivateKey: (privateKey) => {
    if (!privateKey || typeof privateKey !== 'string') return false;
    privateKey = privateKey.trim();
    
    // 64 hex chars (32 bytes)
    if (/^[a-fA-F0-9]{64}$/.test(privateKey)) return true;
    
    // With 0x prefix
    if (/^0x[a-fA-F0-9]{64}$/.test(privateKey)) return true;
    
    // WIF format (Bitcoin/FLO style)
    if (/^[5KLR][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(privateKey)) return true;
    
    // Cardano Root Key (256 hex chars = 128 bytes)
    if (/^[a-fA-F0-9]{256}$/.test(privateKey)) return true;
    
    return false;
  },

  isValidAmount: (amount) => {
    if (!amount || amount === '') return false;
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num <= 1000000000;
  },

  sanitizeInput: (input) => {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/[<>'"]/g, '');
  }
};

// Initialize on DOM load
async function initApp() {
  try {
    initializeTheme();
    initializeNavigation();
    initializeEventListeners();
    hideLoadingScreen();
  } catch (error) {
    console.error('Initialization error:', error);
    showNotification('Application initialization failed. Please refresh the page.', 'error');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function hideLoadingScreen() {
  setTimeout(() => {
    const loadingScreen = document.getElementById('loadingScreen');
    if (!loadingScreen) return;
    
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500);
  }, 1000);
}

// Theme Management
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
  const icon = document.querySelector('#themeToggle i');
  icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
});

// Navigation
function initializeNavigation() {
  const navLinks = document.querySelectorAll('.nav-link, .nav-btn');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const sidebar = document.getElementById('sidebar');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.getAttribute('data-page');
      showPage(page);
      
      navLinks.forEach(l => l.classList.remove('active'));
      document.querySelectorAll(`.nav-link[data-page="${page}"], .nav-btn[data-page="${page}"]`)
        .forEach(l => l.classList.add('active'));
      
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
    });
  });

  sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
  });
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.add('hidden');
  });
  
  document.getElementById(pageId + 'Page').classList.remove('hidden');
}

/**
 * Navigate to Transactions page and view transaction details
 * @param {string} txHash - Transaction hash to search for
 */
function viewTransactionDetails(txHash) {
  // Navigate to transactions page
  showPage('transactions');
  
  // Update navigation active state
  document.querySelectorAll('.nav-link, .nav-btn').forEach(link => {
    link.classList.remove('active');
    if (link.dataset.page === 'transactions') {
      link.classList.add('active');
    }
  });
  
  // Set search type to hash
  const hashRadio = document.querySelector('input[name="searchType"][value="hash"]');
  if (hashRadio) {
    hashRadio.checked = true;
    
    // Trigger the handleSearchTypeChange event
    const event = new Event('change');
    hashRadio.dispatchEvent(event);
  }
  
  // Set the transaction hash in the search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = txHash;
  }
  
  // Trigger the search after a short delay
  setTimeout(() => {
    if (window.searchTransactions) {
      window.searchTransactions();
    }
  }, 100);
}

function initializeEventListeners() {
  if (eventListenersInitialized) return;
  eventListenersInitialized = true;
  
  // Generate wallet buttons

  document.getElementById('generateBtn').addEventListener('click', handleGenerate);

  // Send form
  document.getElementById('sendForm').addEventListener('submit', handleSendSubmission);
  
  // Send Private Key Input Listener for Balance
  const sendKeyInput = document.getElementById('sendPrivateKey');
  if (sendKeyInput) {
    sendKeyInput.addEventListener('blur', handleSenderKeyUpdate);
    sendKeyInput.addEventListener('paste', () => setTimeout(handleSenderKeyUpdate, 100));
  }

  // Search Type Selection
  const searchTypeInputs = document.querySelectorAll('input[name="searchType"]');
  searchTypeInputs.forEach(input => {
    input.addEventListener('change', handleSearchTypeChange);
  });

  // Transaction search
  document.getElementById('searchBtn').addEventListener('click', searchTransactions);
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchTransactions();
  });

  // Transaction filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all buttons
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      // Add active to clicked button
      btn.classList.add('active');
      // Re-run search with current page (this will apply the filter)
      searchTransactions(currentPage);
    });
  });

  // Recover wallet buttons

  document.getElementById('recoverBtn').addEventListener('click', handleRecoverPrivateKey);
  
  // Modal Close Listeners
  const modal = document.getElementById('confirmModal');
  const closeModal = document.getElementById('closeModal');
  const cancelBtn = document.getElementById('cancelTxBtn');
  
  if (closeModal) closeModal.onclick = () => modal.style.display = "none";
  if (cancelBtn) cancelBtn.onclick = () => modal.style.display = "none";
  window.onclick = (event) => {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  }
}



// Wallet Generation from BTC/FLO Key
async function handleGenerate() {
  const outputDiv = document.getElementById('walletOutput');
  const generateBtn = document.getElementById('generateBtn');
  
  if (generateBtn.disabled) return;
  
  generateBtn.disabled = true;
  generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
  
  outputDiv.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i></div>';

  try {
    const wallet = await window.cardanoCrypto.generateWallet();
    
    if (!wallet || !wallet.Cardano) {
      throw new Error('Failed to generate address - please try again');
    }

    currentWallet = wallet;

    const html = `
      <div class="wallet-generated-success">
        <div class="success-icon">
          <i class="fas fa-check"></i>
        </div>
        <div class="success-message">
          <h3>Address Generated Successfully!</h3>
          <p>Your multi-chain address has been created.</p>
        </div>
      </div>
      
      ${displayCardanoWallet(wallet.Cardano, wallet.originalKey || wallet.extractedKey)}
      ${wallet.BTC ? displayBlockchain('Bitcoin', 'fab fa-bitcoin', wallet.BTC) : ''}
      ${wallet.FLO ? displayBlockchain('FLO', 'fas fa-leaf', wallet.FLO) : ''}
    `;

    outputDiv.innerHTML = html;
    showNotification('Address generated successfully!', 'success');
  } catch (error) {
    console.error('Error generating address:', error);
    outputDiv.innerHTML = displayError('Failed to generate address', error.message);
    showNotification('Failed to generate address', 'error');
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML = '<i class="fas fa-wallet"></i> Generate';
  }
}



// Recover from Private Key
async function handleRecoverPrivateKey() {
  const privateKeyInput = document.getElementById('recoverPrivateKey');
  const privateKey = validators.sanitizeInput(privateKeyInput.value.trim());
  const outputDiv = document.getElementById('recoverOutput');
  const recoverBtn = document.getElementById('recoverBtn');
  
  privateKeyInput.classList.remove('error');
  
  if (!privateKey) {
    privateKeyInput.classList.add('error');
    showNotification('Please enter a private key', 'error');
    return;
  }

  if (!validators.isPrivateKey(privateKey)) {
    privateKeyInput.classList.add('error');
    showNotification('Invalid private key format', 'error');
    return;
  }

  if (recoverBtn.disabled) return;

  recoverBtn.disabled = true;
  recoverBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Recovering...';
  
  outputDiv.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i></div>';

  try {
    const wallet = await window.cardanoCrypto.importFromKey(privateKey);
    
    if (!wallet || !wallet.Cardano) {
      throw new Error('Failed to recover address');
    }

    currentWallet = wallet;

    const html = `
      <div class="wallet-generated-success">
        <div class="success-icon">
          <i class="fas fa-check"></i>
        </div>
        <div class="success-message">
          <h3>Address Recovered Successfully!</h3>
          <p>Your Address has been restored from private key.</p>
        </div>
      </div>
      
      ${displayCardanoWallet(wallet.Cardano, wallet.originalKey || wallet.extractedKey)}
      ${wallet.BTC ? displayBlockchain('Bitcoin', 'fab fa-bitcoin', wallet.BTC) : ''}
      ${wallet.FLO ? displayBlockchain('FLO', 'fas fa-leaf', wallet.FLO) : ''}
    `;

    outputDiv.innerHTML = html;
    showNotification('Address recovered successfully!', 'success');
  } catch (error) {
    console.error('Error recovering wallet:', error);
    privateKeyInput.classList.add('error');
    outputDiv.innerHTML = displayError('Recovery Failed', error.message);
    showNotification('Failed to recover address', 'error');
  } finally {
    recoverBtn.disabled = false;
    recoverBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Recover from Private Key';
  }
}


// Handle Sender Key Update (Show Balance)
async function handleSenderKeyUpdate() {
  const keyInput = document.getElementById('sendPrivateKey');
  const balanceDisplay = document.getElementById('balanceDisplay');
  const availableBalance = document.getElementById('availableBalance');
  const senderAddressEl = document.getElementById('senderAddress');
  
  const key = validators.sanitizeInput(keyInput.value.trim());
  
  if (!key) {
    balanceDisplay.style.display = 'none';
    return;
  }
  
  if (!validators.isPrivateKey(key)) {
    return;
  }

  try {
    // Show loading state
    balanceDisplay.style.display = 'block';
    availableBalance.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    senderAddressEl.textContent = 'Deriving address...';
    
    // Recover wallet from key (handles ADA/BTC/FLO)
    const wallet = await window.cardanoCrypto.importFromKey(key);
    
    if (!wallet || !wallet.Cardano) {
      throw new Error('Could not derive Cardano wallet');
    }
    
    const address = wallet.Cardano.address;
    senderAddressEl.textContent = address;
    
    // Fetch balance
    const balance = await cardanoAPI.getBalance(address);
    const balanceAda = (Number(BigInt(balance)) / 1000000).toFixed(6);
    
    availableBalance.innerHTML = `${balanceAda} <span class="currency">ADA</span>`;
    
  } catch (error) {
    console.error('Error fetching sender balance:', error);
    availableBalance.innerHTML = '<span style="color: var(--error-color)">Error</span>';
    senderAddressEl.textContent = 'Error deriving address';
  }
}

// Send Transaction
async function handleSendSubmission(e) {
  e.preventDefault();
  
  const sendBtn = document.getElementById('sendBtn');
  const recipientInput = document.getElementById('recipientAddress');
  const amountInput = document.getElementById('sendAmount');
  
  const recipient = validators.sanitizeInput(recipientInput.value);
  const amount = validators.sanitizeInput(amountInput.value);
  
  if (!validators.isCardanoAddress(recipient)) {
    showNotification('Invalid recipient address', 'error');
    return;
  }
  
  if (!validators.isValidAmount(amount)) {
    showNotification('Invalid amount', 'error');
    return;
  }
  
 

  if (sendBtn.disabled) return;
  
  // UI Loading State
  const originalBtnText = sendBtn.innerHTML;
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
  
  try {
    // Get Private Key and Derive Wallet
    const keyInput = document.getElementById('sendPrivateKey');
    const privateKey = validators.sanitizeInput(keyInput.value.trim());
    
    let senderWallet;
    
    if (privateKey) {
      // Derive from input key
      senderWallet = await window.cardanoCrypto.importFromKey(privateKey);
    } else if (currentWallet) {
      // Fallback to currentWallet
      senderWallet = currentWallet;
    } else {
      throw new Error('Please enter a private key');
    }

    if (!senderWallet || !senderWallet.Cardano) {
      throw new Error('Invalid wallet derived from private key');
    }

    let senderPrivKeyHex = senderWallet.Cardano.spendingPrivateKeyHex;
    
    if (!senderPrivKeyHex && senderWallet.Cardano.rootKey) {
      // Derive if not directly available
      senderPrivKeyHex = await window.cardanoCrypto.getSpendPrivateKey(senderWallet.Cardano.rootKey);
    }
    
    if (!senderPrivKeyHex) {
      throw new Error('Could not retrieve spending key');
    }
    
    const senderAddress = senderWallet.Cardano.address;

    // Convert amount to Lovelace
    const amountLovelace = BigInt(Math.floor(parseFloat(amount) * 1000000)).toString();
    
    // Estimate Fee and Confirm
    const feeEstimate = await cardanoAPI.estimateFee(
      senderAddress,
      recipient,
      amountLovelace
    );

    if (!feeEstimate.success) {
      throw new Error(`Fee estimation failed: ${feeEstimate.error}`);
    }

    // Check for sufficient balance
    if (parseFloat(feeEstimate.balanceAda) < parseFloat(feeEstimate.totalCostAda)) {
      throw new Error(`Insufficient balance. You have ${feeEstimate.balanceAda} ADA but need ${feeEstimate.totalCostAda} ADA (including fees).`);
    }

    // Show custom confirmation modal
    const confirmed = await showConfirmationModal({
      amount: feeEstimate.amountAda,
      fee: feeEstimate.feeAda,
      total: feeEstimate.totalCostAda,
      recipient: recipient
    });

    if (!confirmed) {
      showNotification('Transaction cancelled', 'info');
      return;
    }

    // Send Transaction
    const confirmBtn = document.getElementById('confirmTxBtn');
    if (confirmBtn) confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    const result = await cardanoAPI.sendAda(
      senderPrivKeyHex,
      senderAddress,
      recipient,
      amountLovelace
    );
    
    // Close modal
    document.getElementById('confirmModal').style.display = 'none';
    if (confirmBtn) confirmBtn.innerHTML = '<i class="fas fa-check"></i> Confirm & Send';
    
    // Success
    showNotification(`Transaction sent! Hash: ${result.txId}`, 'success');
    
    // Display success details in the output area
    const sendOutput = document.getElementById('sendOutput');
    if (sendOutput) {
      sendOutput.innerHTML = `
        <div class="wallet-generated-success">
          <div class="success-icon">
            <i class="fas fa-check"></i>
          </div>
          <div class="success-message">
            <h3>Transaction Successful!</h3>
            <p>Your transaction has been broadcast to the network.</p>
            <div style="margin-top: 10px;">
              <strong>Transaction Hash:</strong>
              <div style="font-family: monospace; word-break: break-all; background: rgba(255,255,255,0.1); padding: 5px; border-radius: 4px; margin-top: 5px;">
                ${result.txId}
                <button class="btn-icon" style="width: 24px; height: 24px; font-size: 12px; display: inline-flex;" onclick="copyToClipboard('${result.txId}')">
                  <i class="fas fa-copy"></i>
                </button>
              </div>
            </div>
            <p style="margin-top: 10px; font-size: 0.9em;">
              <a href="#" onclick="viewTransactionDetails('${result.txId}'); return false;" style="color: white; text-decoration: underline;">
                View Transaction Details
              </a>
            </p>
          </div>
        </div>
      `;
    }
    
    recipientInput.value = '';
    amountInput.value = '';
    
    // Refresh history if on transactions page
    if (document.getElementById('transactionsPage').classList.contains('hidden') === false) {
      searchTransactions();
    }
    
  } catch (error) {
    console.error('Send failed:', error);
    
    // Close modal if open
    const modal = document.getElementById('confirmModal');
    if (modal) modal.style.display = 'none';
    
    const confirmBtn = document.getElementById('confirmTxBtn');
    if (confirmBtn) confirmBtn.innerHTML = '<i class="fas fa-check"></i> Confirm & Send';
    
    showNotification(`Send failed: ${error.message}`, 'error');
    
    // Display error details in the output area
    const sendOutput = document.getElementById('sendOutput');
    if (sendOutput) {
      sendOutput.innerHTML = `
        <div class="wallet-generated-error">
          <div class="error-icon">
            <i class="fas fa-exclamation-circle"></i>
          </div>
          <div class="error-message">
            <h3>Transaction Failed</h3>
            <p>Your transaction could not be sent to the network.</p>
            <div style="margin-top: 10px;">
              <strong>Error Details:</strong>
              <div style="font-family: monospace; word-break: break-word; background: rgba(255,255,255,0.1); padding: 10px; border-radius: 4px; margin-top: 5px; font-size: 0.9em; max-height: 200px; overflow-y: auto;">
                ${error.message}
              </div>
            </div>
            <p style="margin-top: 10px; font-size: 0.9em; color: rgba(255,255,255,0.8);">
              Please check the error message above and try again. Common issues include insufficient balance, invalid address, or network connectivity problems.
            </p>
          </div>
        </div>
      `;
    }
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = originalBtnText;
  }
}

// Search Transactions
async function searchTransactions(page = 1) {
  if (typeof page !== 'number') page = 1;

  const searchBtn = document.getElementById('searchBtn');
  
  // Prevent concurrent searches
  if (searchBtn.disabled) return;
  
  const originalBtnContent = searchBtn.innerHTML;
  searchBtn.disabled = true;
  searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {

  const searchTypeInput = document.querySelector('input[name="searchType"]:checked');
  const searchType = searchTypeInput ? searchTypeInput.value : 'address';
  const searchInput = document.getElementById('searchInput');
  // Use wallet address only if searching by address
  const query = searchInput.value.trim() || (searchType === 'address' ? currentWallet?.Cardano?.address : '');
  
  if (!query) {
    showNotification('Please enter a value to search', 'error');
    return;
  }

  const txList = document.getElementById('transactionList');
  const filterSection = document.getElementById('transactionFilterSection');
  const paginationSection = document.getElementById('paginationSection');
  const balanceSection = document.getElementById('transactionBalance');
  const addressDisplay = document.getElementById('transactionAddressDisplay');
  const displayedAddress = document.getElementById('displayedAddress');
  const adaBalance = document.getElementById('adaBalance');
  const searchedAddressesSection = document.getElementById('searchedAddressesSection');

  // Handle Hash Search
  if (searchType === 'hash') {
    if (!/^[0-9a-fA-F]{64}$/.test(query)) {
      showNotification('Invalid transaction hash format', 'error');
      return;
    }

    // Update URL for sharing
    if (window.updateURL) {
      window.updateURL('tx', query);
    }

    balanceSection.style.display = 'none';
    filterSection.style.display = 'none';
    paginationSection.style.display = 'none';
    if (searchedAddressesSection) searchedAddressesSection.style.display = 'none';
    
    txList.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
      const tx = await cardanoAPI.getTransaction(query);
      
      if (!tx) {
        txList.innerHTML = '<div class="no-transactions">Transaction not found.</div>';
        return;
      }

      // Determine transaction status and styling
      const status = tx.status || 'confirmed';
      const statusLabel = tx.statusLabel || 'Confirmed';
      const statusColor = tx.statusColor || '#28a745';
      const statusIcon = status === 'confirmed' ? 'fa-check-circle' :
                         status === 'pending' ? 'fa-clock' : 'fa-exclamation-circle';

      const date = tx.timestamp ? new Date(typeof tx.timestamp === 'string' ? tx.timestamp : tx.timestamp * 1000).toLocaleString() : 'Pending...';
      const fees = tx.fees ? (Number(tx.fees) / 1000000).toFixed(6) : 'N/A';
      
      // Calculate amounts
      const totalOutput = tx.outputs ? tx.outputs.reduce((acc, out) => acc + BigInt(out.value), 0n) : 0n;
      const totalOutputAda = (Number(totalOutput) / 1000000).toFixed(6);
      
      // Get first output amount
      const firstOutput = tx.outputs && tx.outputs.length > 0 ? tx.outputs[0] : null;
      const firstOutputAda = firstOutput ? (Number(BigInt(firstOutput.value)) / 1000000).toFixed(6) : '0.000000';
      
      // Get From/To (first ones for simplicity)
      let fromAddr = tx.inputs && tx.inputs.length > 0 ? tx.inputs[0].address : 'Unknown';
      let toAddr = firstOutput ? firstOutput.address : 'Unknown';
      
      // Convert hex to bech32
      if (fromAddr !== 'Unknown') fromAddr = cardanoAPI.hexToAddress(fromAddr);
      if (toAddr !== 'Unknown') toAddr = cardanoAPI.hexToAddress(toAddr);

      // Handle pending/failed transactions with message
      const messageHTML = tx.message ? `
        <div style="background: rgba(255,193,7,0.1); border-left: 3px solid ${statusColor}; padding: 12px; border-radius: 6px; margin-bottom: 1rem;">
          <div style="display: flex; align-items: start; gap: 10px;">
            <i class="fas fa-info-circle" style="color: ${statusColor}; margin-top: 2px;"></i>
            <div style="flex: 1; font-size: 0.9em; line-height: 1.5;">${tx.message}</div>
          </div>
        </div>
      ` : '';

      txList.innerHTML = `
        <div class="transaction-card">
          ${messageHTML}
          <div class="tx-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1rem;">
            <div class="tx-left">
              <div class="tx-icon"><i class="fas fa-file-alt"></i></div>
              <div class="tx-main-info">
                <h4 class="tx-direction-label">Transaction Details</h4>
                <div class="tx-amount">${firstOutputAda} ADA</div>
              </div>
            </div>
            <div class="tx-right">
              <span class="tx-date">${date}</span>
              <div class="tx-status" style="background: ${statusColor}20; color: ${statusColor};">
                <i class="fas ${statusIcon}"></i> ${statusLabel}
              </div>
            </div>
          </div>
          
          <div class="tx-details" style="border-top: none; padding-top: 0;">
            <div class="tx-detail-row">
              <span class="tx-label">Transaction Hash:</span>
              <span class="tx-value tx-hash" onclick="copyToClipboard('${tx.hash}')" title="Click to copy">${tx.hash}</span>
            </div>
            <div class="tx-detail-row">
              <span class="tx-label">From:</span>
              <span class="tx-value full-address" onclick="copyToClipboard('${fromAddr}')" title="Click to copy">${fromAddr}</span>
            </div>
            <div class="tx-detail-row">
              <span class="tx-label">To (Primary):</span>
              <span class="tx-value full-address" onclick="copyToClipboard('${toAddr}')" title="Click to copy">${toAddr}</span>
            </div>
            <div class="tx-detail-row">
              <span class="tx-label">Amount Sent:</span>
              <span class="tx-value">${firstOutputAda} ADA</span>
            </div>
            <div class="tx-detail-row">
              <span class="tx-label">Total Output:</span>
              <span class="tx-value">${totalOutputAda} ADA <span style="font-size: 0.8em; color: rgba(255,255,255,0.6);"></span></span>
            </div>
            <div class="tx-detail-row">
              <span class="tx-label">Gas Used:</span>
              <span class="tx-value">${fees} ADA</span>
            </div>
            <div class="tx-detail-row">
              <span class="tx-label">Status:</span>
              <span class="tx-value">
                <div class="tx-status" style="display:inline-flex; background: ${statusColor}20; color: ${statusColor};">
                  <i class="fas ${statusIcon}"></i> ${statusLabel}
                </div>
              </span>
            </div>
             <div class="tx-detail-row">
              <span class="tx-label">Coin Type:</span>
              <span class="tx-value">Cardano (ADA)</span>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      txList.innerHTML = `<div class="no-transactions">Error: ${error.message}</div>`;
    }
    return;
  }

  // Address Search Logic
  let address = query;
  let sourceType = 'address'; 
  let walletData = null; // Store full wallet data if derived from key

  // Check if input is a private key and derive address if so
  if (!validators.isCardanoAddress(address)) {
    if (validators.isPrivateKey(address)) {
      try {
        showNotification('Deriving address from private key...', 'info');
        // Import wallet from key to get the address
        const wallet = await window.cardanoCrypto.importFromKey(address);
        
        if (wallet && wallet.Cardano && wallet.Cardano.address) {
          address = wallet.Cardano.address;
          walletData = wallet; 
          
          // Determine the specific key type based on which addresses are available
          if (wallet.BTC && wallet.FLO) {
            sourceType = 'btc-flo-key'; // Has both BTC and FLO
          } else if (wallet.BTC) {
            sourceType = 'btc-key'; // BTC only
          } else if (wallet.FLO) {
            sourceType = 'flo-key'; // FLO only
          } else {
            sourceType = 'ada-key'; // Cardano only
          }
          
          showNotification('Address derived successfully', 'success');
          
        } else {
          throw new Error('Could not derive Cardano address from key');
        }
      } catch (error) {
        console.error('Key derivation failed:', error);
        showNotification('Failed to derive address from private key: ' + error.message, 'error');
        return;
      }
    } else {
      showNotification('Invalid Cardano address or private key format', 'error');
      return;
    }
  }

  // Update URL for sharing (after deriving address if needed)
  if (window.updateURL) {
    window.updateURL('address', address);
  }

  currentPage = page;

  filterSection.style.display = 'block';
  balanceSection.style.display = 'block';
  addressDisplay.style.display = 'block';
  displayedAddress.textContent = address;
  
  txList.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i></div>';

  try {
    // Fetch balance
    const balance = await cardanoAPI.getBalance(address);
    const balanceAda = (Number(BigInt(balance)) / 1000000).toFixed(6);
    adaBalance.innerHTML = `${balanceAda} <span class="currency">ADA</span>`;

    // Save to search history
    try {
      // Prepare addresses object if wallet data exists
      const walletAddresses = walletData ? {
        BTC: walletData.BTC?.address || null,
        FLO: walletData.FLO?.address || null,
        Cardano: walletData.Cardano?.address || address
      } : null;
      
      // Only save if we have new data (from private key) or it's a new address
      if (walletData || sourceType !== 'address') {
        await searchDB.saveSearchedAddress(address, balanceAda, Date.now(), sourceType, walletAddresses);
      } else {
        // Just update the balance and timestamp without changing sourceType/addresses
        await searchDB.updateBalance(address, balanceAda, Date.now());
      }
      
      await loadSearchedAddresses();
    } catch (dbError) {
      console.error('[SearchDB] Error saving address:', dbError);
    }

    // Fetch history
    const history = await cardanoAPI.getHistory(address, currentPage, PAGE_LIMIT);
    
    if (!history || history.length === 0) {
      txList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <i class="fas fa-inbox"></i>
          </div>
          <h3>No Transactions Yet</h3>
          <p>This address has no transaction history.</p>
        </div>
      `;
      paginationSection.style.display = 'none';
      return;
    }

    const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
    const filteredHistory = history.filter(tx => {
      const isIncoming = BigInt(tx.netAmount) > 0n;
      if (activeFilter === 'received') return isIncoming;
      if (activeFilter === 'sent') return !isIncoming;
      return true;
    });

    if (filteredHistory.length === 0) {
      txList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <i class="fas fa-filter"></i>
          </div>
          <h3>No Matching Transactions</h3>
          <p>No transactions match the selected filter.</p>
        </div>
      `;
      return;
    }

    // Render transactions
    txList.innerHTML = filteredHistory.map(tx => {
      const isIncoming = BigInt(tx.netAmount) > 0n;
      const amountAda = (Math.abs(Number(BigInt(tx.netAmount).toString())) / 1000000).toFixed(6);
      let date = 'Unknown Date';
      if (tx.timestamp) {
        const timestamp = typeof tx.timestamp === 'string' ? tx.timestamp : tx.timestamp * 1000;
        date = new Date(timestamp).toLocaleString();
      }
      
      // Determine From/To addresses
      let fromAddr = isIncoming ? (tx.inputs[0]?.address || 'Unknown') : address;
      let toAddr = isIncoming ? address : (tx.outputs[0]?.address || 'Multiple Outputs');
      
      // Convert hex to bech32 if needed
      if (fromAddr !== 'Unknown') fromAddr = cardanoAPI.hexToAddress(fromAddr);
      if (toAddr !== 'Multiple Outputs') toAddr = cardanoAPI.hexToAddress(toAddr);

      return `
        <div class="transaction-card ${isIncoming ? 'incoming' : 'outgoing'}">
          <div class="tx-header">
            <div class="tx-left">
              <div class="tx-icon">
                <i class="fas fa-${isIncoming ? 'arrow-down' : 'arrow-up'}"></i>
              </div>
              <div class="tx-main-info">
                <h4 class="tx-direction-label">${isIncoming ? 'Received' : 'Sent'}</h4>
                <div class="tx-amount ${isIncoming ? 'incoming' : 'outgoing'}">
                  ${isIncoming ? '+' : '-'}${amountAda} ADA
                </div>
              </div>
            </div>
            <div class="tx-right">
              <span class="tx-date">${date}</span>
              <div class="tx-status confirmed">
                <i class="fas fa-check-circle"></i> Confirmed
              </div>
            </div>
          </div>
          <div class="tx-details">
            <div class="tx-detail-row">
              <span class="tx-label">Hash:</span>
              <span class="tx-value tx-hash" onclick="copyToClipboard('${tx.txHash}')" title="Click to copy">${tx.txHash}</span>
            </div>
            <div class="tx-detail-row">
              <span class="tx-label">From:</span>
              <span class="tx-value full-address" onclick="copyToClipboard('${fromAddr}')" title="Click to copy">${fromAddr}</span>
            </div>
            <div class="tx-detail-row">
              <span class="tx-label">To:</span>
              <span class="tx-value full-address" onclick="copyToClipboard('${toAddr}')" title="Click to copy">${toAddr}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Update Pagination
    updatePagination(history.length);

  } catch (error) {
    console.error('Error fetching transactions:', error);
    const txList = document.getElementById('transactionList');
    if (txList) txList.innerHTML = displayError('Failed to fetch transactions', error.message);
    }
  } finally {
    searchBtn.disabled = false;
    searchBtn.innerHTML = originalBtnContent;
  }
}

function updatePagination(resultCount) {
  const paginationSection = document.getElementById('paginationSection');
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  const pageInfo = document.getElementById('paginationInfo');
  
  paginationSection.style.display = 'flex';
  
  // Update info text
  const start = (currentPage - 1) * PAGE_LIMIT + 1;
  const end = start + resultCount - 1;
  pageInfo.textContent = `Showing ${start}-${end} transactions`;
  
  // Update buttons
  prevBtn.disabled = currentPage === 1;
  // If we got fewer results than limit, we're on the last page
  nextBtn.disabled = resultCount < PAGE_LIMIT;
  
  prevBtn.onclick = () => searchTransactions(currentPage - 1);
  nextBtn.onclick = () => searchTransactions(currentPage + 1);
}

// Initialize Filter Buttons
document.addEventListener('DOMContentLoaded', () => {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all
      filterBtns.forEach(b => b.classList.remove('active'));
      // Add active class to clicked
      btn.classList.add('active');
      // Reload transactions with new filter
      searchTransactions(1);
    });
  });
});

// Display Functions


function displayCardanoWallet(cardano, masterKey) {
  return `
    <div class="blockchain-section">
      <div class="blockchain-header">
        <h4 style="color: white;"> <span style="font-size: 1.5rem;">₳</span> Cardano (ADA)</h4>
        <span class="blockchain-badge primary">Primary</span>
      </div>
      <div class="detail-row">
        <label>Address:</label>
        <div class="value-container">
          <code>${cardano.address}</code>
          <button class="btn-icon" onclick="copyToClipboard('${cardano.address}')">
            <i class="fas fa-copy"></i>
          </button>
        </div>
      </div>
      ${cardano.stakeAddress ? `
      <div class="detail-row">
        <label>Stake Address:</label>
        <div class="value-container">
          <code>${cardano.stakeAddress}</code>
          <button class="btn-icon" onclick="copyToClipboard('${cardano.stakeAddress}')">
            <i class="fas fa-copy"></i>
          </button>
        </div>
      </div>` : ''}
      ${masterKey ? `
      <div class="detail-row">
        <label>Private Key:</label>
        <div class="value-container">
          <code style="font-size: 0.85rem;">${masterKey}</code>
          <button class="btn-icon" onclick="copyToClipboard('${masterKey}')">
            <i class="fas fa-copy"></i>
          </button>
        </div>
      </div>` : ''}
      <div class="detail-row">
        <label>Spend Key:</label>
        <div class="value-container">
          <code>${cardano.spendKeyBech32}</code>
          <button class="btn-icon" onclick="copyToClipboard('${cardano.spendKeyBech32}')">
            <i class="fas fa-copy"></i>
          </button>
        </div>
      </div>
      <div class="detail-row">
        <label>Stake Key:</label>
        <div class="value-container">
          <code>${cardano.stakeKeyBech32}</code>
          <button class="btn-icon" onclick="copyToClipboard('${cardano.stakeKeyBech32}')">
            <i class="fas fa-copy"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

function displayBlockchain(name, icon, data) {
  return `
    <div class="blockchain-section">
      <div class="blockchain-header">
        <h4 style="color: white;"><i class="${icon}"></i> ${name}</h4>
        <span class="blockchain-badge secondary">Secondary</span>
      </div>
      <div class="detail-row">
        <label>Address:</label>
        <div class="value-container">
          <code>${data.address}</code>
          <button class="btn-icon" onclick="copyToClipboard('${data.address}')">
            <i class="fas fa-copy"></i>
          </button>
        </div>
      </div>
      <div class="detail-row">
        <label>Private Key:</label>
        <div class="value-container">
          <code>${data.privateKey}</code>
          <button class="btn-icon" onclick="copyToClipboard('${data.privateKey}')">
            <i class="fas fa-copy"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

function displayError(title, message) {
  return `
    <div class="error-state">
      <div class="error-icon">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <div class="error-message">
        <h3>${title}</h3>
        <p>${validators.sanitizeInput(message)}</p>
      </div>
    </div>
  `;
}

// Utility Functions
window.togglePasswordVisibility = function(inputId) {
  const input = document.getElementById(inputId);
  const icon = input.nextElementSibling.querySelector('i');

  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fas fa-eye';
  }
};

window.clearInput = function(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.value = '';
    input.classList.remove('error', 'success', 'warning');
    input.focus();
  }
};

window.copyToClipboard = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    showNotification('Copied to clipboard!', 'success');
  }).catch(() => {
    showNotification('Failed to copy', 'error');
  });
};

function showNotification(message, type = 'info') {
  const drawer = document.getElementById('notificationDrawer');
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;
  
  drawer.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 4000);
}

// Mobile responsive adjustments
function handleResize() {
  if (window.innerWidth > 768) {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
  }
}

window.addEventListener('resize', handleResize);
handleResize();

window.searchTransactions = searchTransactions;
window.copyToClipboard = copyToClipboard;
window.togglePasswordVisibility = togglePasswordVisibility;
window.clearInput = clearInput;
window.viewTransactionDetails = viewTransactionDetails;

// Handle Search Type Change
function handleSearchTypeChange(e) {
  const type = e.target.value;
  const addressLabel = document.getElementById('addressSearchType');
  const hashLabel = document.getElementById('hashSearchType');
  const searchInput = document.getElementById('searchInput');
  const inputLabel = document.querySelector('label[for="searchInput"]');
  const inputHelp = document.querySelector('.form-text');
  
  // Clear previous results
  const balanceSection = document.getElementById('transactionBalance');
  const filterSection = document.getElementById('transactionFilterSection');
  const txList = document.getElementById('transactionList'); 
  const paginationSection = document.getElementById('paginationSection');
  
  if (balanceSection) balanceSection.style.display = 'none';
  if (filterSection) filterSection.style.display = 'none';
  if (paginationSection) paginationSection.style.display = 'none';
  
  // Check if transactionList exists, otherwise try transactionResults
  const resultsContainer = document.getElementById('transactionList') || document.getElementById('transactionResults');
  if (resultsContainer) resultsContainer.innerHTML = '';

  // Clear input
  searchInput.value = '';
  
  if (type === 'address') {
    addressLabel.classList.add('active');
    hashLabel.classList.remove('active');
    searchInput.placeholder = 'Enter ADA address or private key (BTC/FLO/ADA)';
    if (inputLabel) inputLabel.textContent = 'ADA Address or Private Key';
    if (inputHelp) inputHelp.textContent = 'Enter ADA address or ADA/FLO/BTC private key to view transactions';
    
    // Show searched addresses section for address search
    loadSearchedAddresses();
  } else {
    hashLabel.classList.add('active');
    addressLabel.classList.remove('active');
    searchInput.placeholder = 'Enter Transaction Hash';
    if (inputLabel) inputLabel.textContent = 'Transaction Hash';
    if (inputHelp) inputHelp.textContent = 'Enter a transaction hash to view its details';
    
    // Hide searched addresses section for hash search
    const searchedAddressesSection = document.getElementById('searchedAddressesSection');
    if (searchedAddressesSection) searchedAddressesSection.style.display = 'none';
  }
}

// Confirmation Modal Helper
function showConfirmationModal(details) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const confirmBtn = document.getElementById('confirmTxBtn');
    const cancelBtn = document.getElementById('cancelTxBtn');
    const closeBtn = document.getElementById('closeModal');
    
    // Populate details
    document.getElementById('confirmAmount').textContent = `${details.amount} ADA`;
    document.getElementById('confirmFee').textContent = `${details.fee} ADA`;
    document.getElementById('confirmTotal').textContent = `${details.total} ADA`;
    document.getElementById('confirmRecipient').textContent = details.recipient;
    
    // Show modal
    modal.style.display = 'block';
    
    // Define handlers
    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };
    
    const handleCancel = () => {
      cleanup();
      modal.style.display = 'none';
      resolve(false);
    };
    
    const cleanup = () => {
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      closeBtn.removeEventListener('click', handleCancel);
    };
    
    // Attach listeners
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    closeBtn.addEventListener('click', handleCancel);
  });
}

/**
 * Load and display searched addresses history
 */
async function loadSearchedAddresses() {
  try {
    const addresses = await searchDB.getSearchedAddresses();
    
    // Check if we're in address search mode
    const searchTypeInput = document.querySelector('input[name="searchType"]:checked');
    const searchType = searchTypeInput ? searchTypeInput.value : 'address';
    
    // Only show if in address search mode
    if (searchType === 'address') {
      displaySearchedAddresses(addresses);
    } else {
      // Hide if in hash search mode
      const section = document.getElementById('searchedAddressesSection');
      if (section) section.style.display = 'none';
    }
  } catch (error) {
    console.error('[SearchDB] Error loading addresses:', error);
  }
}

/**
 * Display searched addresses in the UI
 */
function displaySearchedAddresses(addresses) {
  const section = document.getElementById('searchedAddressesSection');
  const list = document.getElementById('searchedAddressesList');
  
  if (!addresses || addresses.length === 0) {
    section.style.display = 'none';
    return;
  }
  
  section.style.display = 'block';
  
  list.innerHTML = addresses.map((item, index) => {
    // Determine which toggle buttons to show based on source type
    let toggleButtons = '';
    const sourceInfo = item.sourceInfo || 'address';
    const itemAddresses = item.addresses || {};
    
    // Default to showing Cardano address
    const displayAddress = item.address;
    
    if (sourceInfo === 'btc-flo-key' && itemAddresses.BTC && itemAddresses.FLO) {
      // Has both BTC and FLO - show all three
      toggleButtons = `
        <div class="chain-toggles">
          <button class="chain-toggle" onclick="event.stopPropagation(); switchChainDisplay(${index}, 'BTC')">BTC</button>
          <button class="chain-toggle" onclick="event.stopPropagation(); switchChainDisplay(${index}, 'FLO')">FLO</button>
          <button class="chain-toggle active" onclick="event.stopPropagation(); switchChainDisplay(${index}, 'ADA')">ADA</button>
        </div>
      `;
    } else if ((sourceInfo === 'btc-key' || sourceInfo === 'btc-flo-key') && itemAddresses.BTC) {
      // BTC key - show BTC and ADA only
      toggleButtons = `
        <div class="chain-toggles">
          <button class="chain-toggle" onclick="event.stopPropagation(); switchChainDisplay(${index}, 'BTC')">BTC</button>
          <button class="chain-toggle active" onclick="event.stopPropagation(); switchChainDisplay(${index}, 'ADA')">ADA</button>
        </div>
      `;
    } else if ((sourceInfo === 'flo-key' || sourceInfo === 'btc-flo-key') && itemAddresses.FLO && !itemAddresses.BTC) {
      // FLO key - show FLO and ADA only
      toggleButtons = `
        <div class="chain-toggles">
          <button class="chain-toggle" onclick="event.stopPropagation(); switchChainDisplay(${index}, 'FLO')">FLO</button>
          <button class="chain-toggle active" onclick="event.stopPropagation(); switchChainDisplay(${index}, 'ADA')">ADA</button>
        </div>
      `;
    } else if (sourceInfo === 'ada-key') {
      // Cardano-only private key - show only ADA
      toggleButtons = `
        <div class="chain-toggles">
          <button class="chain-toggle active">ADA</button>
        </div>
      `;
    } else {
      // Direct ADA address - show only ADA
      toggleButtons = `
        <div class="chain-toggles">
          <button class="chain-toggle active">ADA</button>
        </div>
      `;
    }
    
    return `
      <div class="searched-address-item" onclick="loadSearchedAddress('${item.address}')" data-index="${index}">
        ${toggleButtons}
        <div class="searched-address-info">
          <div class="searched-address-value" data-chain="ADA">${displayAddress.substring(0, 20)}...${displayAddress.substring(displayAddress.length - 10)}</div>
          <div class="searched-address-meta">
            <span class="searched-address-balance">${item.formattedBalance || item.balance + ' ADA'}</span>
            <span>&bull;</span>
            <span>${new Date(item.timestamp).toLocaleDateString()}</span>
          </div>
        </div>
        <div class="searched-address-actions">
          <button class="btn-icon-sm" onclick="event.stopPropagation(); copyToClipboard('${item.address}')" title="Copy address">
            <i class="fas fa-copy"></i>
          </button>
          <button class="btn-icon-sm" onclick="event.stopPropagation(); loadSearchedAddress('${item.address}')" title="Refresh">
            <i class="fas fa-sync-alt"></i>
          </button>
          <button class="btn-icon-sm delete" onclick="event.stopPropagation(); deleteSearchedAddress('${item.address}')" title="Remove from history">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
        <!-- Hidden data -->
        <div style="display:none;" class="chain-data" 
             data-btc="${itemAddresses.BTC || ''}" 
             data-flo="${itemAddresses.FLO || ''}" 
             data-ada="${item.address}">
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Load a searched address (triggered when clicking on history item)
 */
async function loadSearchedAddress(address) {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = address;
    await searchTransactions();
  }
}

/**
 * Delete a single searched address from history
 */
async function deleteSearchedAddress(address) {
  try {
    await searchDB.deleteSearchedAddress(address);
    await loadSearchedAddresses();
    showNotification('Address removed from history', 'success');
  } catch (error) {
    console.error('[SearchDB] Error deleting address:', error);
    showNotification('Failed to remove address', 'error');
  }
}

/**
 * Switch between different chain addresses (BTC/FLO/ADA)
 */
function switchChainDisplay(itemIndex, chain) {
  const item = document.querySelector(`.searched-address-item[data-index="${itemIndex}"]`);
  if (!item) return;
  
  const chainData = item.querySelector('.chain-data');
  const addressValue = item.querySelector('.searched-address-value');
  const toggleButtons = item.querySelectorAll('.chain-toggle');
  
  if (!chainData || !addressValue) return;
  
  // Get the address for the selected chain
  let newAddress = '';
  if (chain === 'BTC') {
    newAddress = chainData.dataset.btc;
  } else if (chain === 'FLO') {
    newAddress = chainData.dataset.flo;
  } else { // ADA
    newAddress = chainData.dataset.ada;
  }
  
  if (!newAddress) {
    showNotification(`${chain} address not available`, 'error');
    return;
  }
  
  // Update the displayed address
  const truncated = `${newAddress.substring(0, 20)}...${newAddress.substring(newAddress.length - 10)}`;
  addressValue.textContent = truncated;
  addressValue.dataset.chain = chain;
  
  // Update button styles
  toggleButtons.forEach(btn => {
    if (btn.textContent === chain) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Update the copy button to copy the currently displayed address
  const copyBtn = item.querySelector('.btn-icon-sm[title="Copy address"]');
  if (copyBtn) {
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      copyToClipboard(newAddress);
    };
  }
}

/**
 * Clear all searched addresses history
 */
async function clearSearchHistory() {
  if (!confirm('Are you sure you want to clear all searched addresses history?')) {
    return;
  }
  
  try {
    await searchDB.clearAllSearchedAddresses();
    await loadSearchedAddresses();
    showNotification('Search history cleared', 'success');
  } catch (error) {
    console.error('[SearchDB] Error clearing history:', error);
    showNotification('Failed to clear history', 'error');
  }
}

window.loadSearchedAddress = loadSearchedAddress;
window.deleteSearchedAddress = deleteSearchedAddress;
window.clearSearchHistory = clearSearchHistory;
window.switchChainDisplay = switchChainDisplay;

// Load searched addresses when transactions page is shown
document.addEventListener('DOMContentLoaded', () => {
  loadSearchedAddresses();
  
  // Reload when switching to transactions page
  const transactionsNavLinks = document.querySelectorAll('[data-page="transactions"]');
  transactionsNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      setTimeout(() => loadSearchedAddresses(), 100);
    });
  });
});

/**
 * Updates the browser URL with search parameters
 * @param {string} type - 'address' or 'tx'
 * @param {string} value - The address or transaction hash
 */
function updateURL(type, value) {
  if (!value) return;
  
  const url = new URL(window.location);
  
  // Clear all search params first
  url.searchParams.delete('address');
  url.searchParams.delete('tx');
  
  // Set the new parameter
  url.searchParams.set(type, value);
  
  // Update URL without reloading the page
  window.history.pushState({}, '', url);
  
  console.log("[DeepLink] URL updated: " + type + "=" + value.substring(0, 10) + "...");
}

/**
 * Clears search parameters from URL
 */
function clearURL() {
  const url = new URL(window.location);
  url.searchParams.delete('address');
  url.searchParams.delete('tx');
  window.history.pushState({}, '', url);
}

/**
 * Loads data from URL parameters on page load
 */
function loadFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check for address parameter
  const address = urlParams.get('address');
  const txHash = urlParams.get('tx');
  
  if (address || txHash) {
    console.log("[DeepLink] Loading from URL parameters...");
    
    // Navigate to transactions page first
    const transactionsPage = document.getElementById('transactionsPage');
    if (transactionsPage) {
      // Hide all pages
      document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
      // Show transactions page
      transactionsPage.classList.remove('hidden');
      
      // Update navigation
      document.querySelectorAll('.nav-link, .nav-btn').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === 'transactions') {
          link.classList.add('active');
        }
      });
    }
    
    // Set search type and populate input
    const searchInput = document.getElementById('searchInput');
    
    if (txHash) {
      console.log("[DeepLink] Loading transaction: " + txHash.substring(0, 10) + "...");
      
      // Set to hash search mode
      const hashRadio = document.querySelector('input[name="searchType"][value="hash"]');
      if (hashRadio) {
        hashRadio.checked = true;
        // Trigger visual update for radio buttons
        document.querySelectorAll('.radio-button-container').forEach(container => {
          container.classList.remove('active');
        });
        hashRadio.closest('.radio-button-container').classList.add('active');
        
        if (searchInput) {
          searchInput.placeholder = 'Enter Transaction Hash';
        }
      }
      
      // Populate input and trigger search
      if (searchInput) {
        searchInput.value = txHash;
      }
      
      setTimeout(() => {
        if (window.searchTransactions) {
          window.searchTransactions();
        }
      }, 100);
      
    } else if (address) {
      console.log("[DeepLink] Loading address: " + address.substring(0, 10) + "...");
      
      // Set to address search mode
      const addressRadio = document.querySelector('input[name="searchType"][value="address"]');
      if (addressRadio) {
        addressRadio.checked = true;
        // Trigger visual update for radio buttons
        document.querySelectorAll('.radio-button-container').forEach(container => {
          container.classList.remove('active');
        });
        addressRadio.closest('.radio-button-container').classList.add('active');
        
        if (searchInput) {
          searchInput.placeholder = 'Enter ADA address or ADA/FLO/BTC private key';
        }
      }
      
      // Populate input and trigger search
      if (searchInput) {
        searchInput.value = address;
      }
      
      setTimeout(() => {
        if (window.searchTransactions) {
          window.searchTransactions();
        }
      }, 100);
    }
  }
}

window.updateURL = updateURL;
window.clearURL = clearURL;
window.searchTransactions = searchTransactions;

// Function to process URL parameters
function processURLParams() {
  setTimeout(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('address') || urlParams.get('tx')) {
        loadFromURL();
      }
    } catch (error) {
      console.error('[DeepLink] Error processing URL parameters:', error);
    }
  }, 1000);
}

// Check if page is already loaded 
if (document.readyState === 'complete') {
  processURLParams();
} else {
  window.addEventListener('load', processURLParams);
}
