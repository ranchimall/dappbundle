# # Polkadot Web Wallet - Technical Documentation

## Overview

The Polkadot Multi-Chain Wallet is a web-based cryptocurrency wallet that supports multiple blockchain networks including Polkadot (DOT), FLO, and Bitcoin (BTC). The wallet provides comprehensive functionality for address generation, transaction management, balance checking, and transaction history viewing with full Polkadot compatibility.

### Key Features
- **Multi-Chain Support**: DOT, FLO, and BTC address generation from a single private key
- **Substrate Compatibility**: Full Polkadot AssetHub support with Sr25519 cryptography
- **Transaction History**: Paginated transaction viewing with filtering (All/Received/Sent)
- **Address Search**: Persistent search history with LocalStorage
- **URL Sharing**: Direct link sharing for addresses and transaction hashes
- **Real-Time Data**: Live balance updates via Subscan API
- **Transaction Broadcasting**: Submit transactions directly to Polkadot AssetHub
- **Responsive Design**: Mobile-first responsive interface with dark/light theme

## Architecture

### System Architecture
```
┌────────────────────────────────────────────────────────────┐
│                    Frontend Layer                          │
├────────────────────────────────────────────────────────────┤
│  index.html  │  style.css  │  JavaScript Modules           │
├──────────────┼─────────────┼───────────────────────────────┤
│              │             │ • polkadotCrypto.js           │
│              │             │ • polkadotBlockchainAPI.js    │
│              │             │ • polkadotSearchDB.js         │
│              │             │ • lib.polkadot.js             │
└──────────────┴─────────────┴───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Storage Layer                              │
├─────────────────────────────────────────────────────────────┤
│  LocalStorage      │  Session Storage │  Browser Cache      │
│  • Search History  │  • Temp Data     │  • Theme Prefs      │
│  • Multi-Chain     │  • Form State    │                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Blockchain Layer                             │
├─────────────────────────────────────────────────────────────┤
│  Polkadot AssetHub │  FLO Network    │  Bitcoin Network     │
│  • Subscan API     │  • Address Gen  │  • Address Gen       │
│  • WebSocket RPC   │  • ECDSA Keys   │  • Bech32 Format     │
│  • Sr25519 Signing │                 │                      │
│  • SS58 Addresses  │                 │                      │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Cryptographic Engine (`polkadotCrypto.js`)

The cryptographic engine handles multi-chain address generation with both ECDSA and Sr25519 (Schnorrkel) cryptography.

#### Key Functions
```javascript
// Generate multi-chain addresses from private key
async generateMultiChain(inputWif = null)

// Sign Polkadot transaction using Sr25519
async signDot(txBytes, dotPrivateKey)

// Convert hex address to SS58 format
hexToSS58(hexAddress, prefix = 0)

// Generate new random wallet
generateNewID()

// Encoding utilities
base58Encode(bytes)
base58Decode(str)
blake2bHash(data, outlen = 64)
```

#### Supported Private Key Formats
- **DOT**: 64-character hexadecimal (generates Sr25519 keypair from seed)
- **FLO**: 64-character hexadecimal or WIF format (ECDSA)
- **BTC**: 64-character hexadecimal or WIF format (ECDSA)

**Important**: 
- Polkadot addresses use **Sr25519** (Schnorrkel) signature scheme
- BTC/FLO addresses use **ECDSA secp256k1**
- The same private key seed generates both types of keypairs
- SS58 encoding with prefix 0 (Polkadot mainnet)

#### Sr25519 Key Derivation
```javascript
// Convert hex private key to seed (32 bytes)
const seed = hexToBytes(privateKey).slice(0, 32);

// Generate Sr25519 keypair using Polkadot.js crypto
await polkadotUtilCrypto.cryptoWaitReady();
const keyPair = polkadotUtilCrypto.sr25519PairFromSeed(seed);

// Encode public key to SS58 Polkadot address
const address = polkadotUtilCrypto.encodeAddress(keyPair.publicKey, 0);
```

### 2. Blockchain API Layer (`polkadotBlockchainAPI.js`)

Handles all blockchain interactions, Subscan API integration, and WebSocket RPC communication.

#### Core Functions
```javascript
// Balance retrieval via Subscan API
async getBalance(address)

// Transaction history with pagination
async getTransactions(address, page = 0, limit = 20)

// Transaction by hash lookup
async getTransaction(hash)

// Build and sign transaction
async buildAndSignTransaction(txParams)

// Submit transaction to network
async submitTransaction(txData)

// Fee estimation
async estimateFee(sourceAddress, destinationAddress, amount)

// Check if account is active
async checkAccountActive(address)

// Address normalization (hex to SS58)
normalizeAddress(address)
```

#### API Configuration
```javascript
const SUBSCAN_API = "https://assethub-polkadot.api.subscan.io";
const NETWORK = "assethub-polkadot";
const RPC_ENDPOINT = "wss://polkadot-asset-hub-rpc.polkadot.io";
```

#### Transaction Submission Flow
```javascript
1. Build transaction parameters
   ↓
2. Create Sr25519 keypair from seed
   ↓
3. Connect to WebSocket RPC endpoint
   ↓
4. Create transfer extrinsic (balances.transferAllowDeath)
   ↓
5. Sign transaction with Sr25519
   ↓
6. Submit via signAndSend
   ↓
7. Wait for finalization
   ↓
8. Return transaction hash and status
```

### 3. Data Persistence (`polkadotSearchDB.js`)

LocalStorage wrapper for persistent storage of searched addresses and multi-chain metadata.

#### Storage Schema
```javascript
// LocalStorage Key: "recentSearches"
{
  address: string (Polkadot SS58),
  balance: number,
  timestamp: number,
  date: string (ISO),
  btcAddress: string | null,
  floAddress: string | null,
  isFromPrivateKey: boolean
}
```

#### API Methods
```javascript
class PolkadotSearchDB {
  saveSearch(address, balance, sourceInfo = null)
  getSearches()
  getSearch(address)
  deleteSearch(address)
  clearAll()
  getRecentSearches(limit = null)
  updateBalance(address, newBalance)
}
```

#### Storage Limits
- **Maximum Searches**: 10 (configurable)
- **Storage Type**: LocalStorage (persistent)
- **Data Size**: ~5KB per 10 searches

## API Reference

### Wallet Generation

#### `generateWallet()`
Generates a new multi-chain wallet with random private keys.

**Returns:** Promise resolving to wallet object
```javascript
{
  DOT: { 
    address: string,        // SS58 Polkadot address (Sr25519)
    privateKey: string      // 64-char hex seed
  },
  FLO: { 
    address: string,        // P2PKH FLO address
    privateKey: string      // WIF format
  },
  BTC: { 
    address: string,        // Bech32 Bitcoin address
    privateKey: string      // WIF format
  }
}
```

**Example:**
```javascript
const wallet = await generateWallet();
console.log(wallet.DOT.address); 
// "15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5"
```

### Address Recovery

#### `recoverWallet()`
Recovers wallet addresses from an existing private key.

**Parameters:**
- `privateKey` (string): Valid private key (64 hex chars or WIF)

**Validation:**
- Hex format: Exactly 64 hexadecimal characters
- WIF format: 51-52 Base58 characters
- Rejects transaction IDs and addresses

**Returns:** Promise resolving to wallet object (same structure as generateWallet)

**Key Derivation:**
```javascript
// From hex private key
const seed = hexToBytes(privateKey).slice(0, 32);

// BTC/FLO: ECDSA secp256k1 from full private key
// DOT: Sr25519 from 32-byte seed

const keypairDOT = sr25519PairFromSeed(seed);
const addressDOT = encodeAddress(keypairDOT.publicKey, 0);
```

### Transaction Management

#### `searchDotAddress()`
Loads balance and transaction history for a given address with smart pagination.

**Process Flow:**
1. Input validation (SS58 address or private key)
2. Address derivation (if private key provided)
3. Balance retrieval via Subscan API
4. Transaction history fetching (20 transactions per page)
5. Display transactions with filtering options
6. Save to search history
7. Update URL parameters

**Supported Input Formats:**
- SS58 Address: `15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5`
- Hex Private Key: 64 hex characters
- WIF Private Key: 51-52 Base58 characters

#### `sendDot()`
Prepares and broadcasts a transaction to Polkadot AssetHub.

**Parameters:**
- `privateKey` (string): Sender's private key (hex or WIF)
- `recipientAddress` (string): Recipient's SS58 address
- `amount` (number): Amount in DOT

**Process:**
```
Input Validation → Address Derivation → Balance Check → 
Fee Estimation → Recipient Validation → User Confirmation → 
Transaction Building → Sr25519 Signing → RPC Submission → 
Finalization Wait → Receipt
```

**Features:**
- Automatic fee estimation using RPC
- Account activation check (minimum 0.01 DOT for new accounts)
- Balance validation including fees
- Transaction confirmation modal with full details
- WebSocket connection to AssetHub RPC

**Transaction Structure:**
```javascript
{
  sourceAddress: "15oF...",      // Sender SS58 address
  destinationAddress: "1Hb...",  // Recipient SS58 address
  amountInPlanck: 1000000000,    // Amount in smallest unit (10^10 planck = 1 DOT)
  nonce: 123,                     // Account nonce
  signature: Uint8Array,          // Sr25519 signature
  blockHash: "0x...",            // Recent block hash
}
```

### Search Functionality

#### `handleSearch()`
Unified search handler supporting both address and transaction hash lookup.

**Search Types:**
- `address`: Loads balance and transaction history
  - Supports: SS58 addresses, Hex private keys, WIF private keys
- `hash`: Retrieves transaction details from Subscan
  - Supports: Extrinsic hashes (0x...)

**Search Type Toggle:**
```javascript
// User selects via radio buttons
<input type="radio" name="searchType" value="address" checked />
<input type="radio" name="searchType" value="hash" />

// JavaScript switches between search modes
function switchSearchType(type) {
  currentSearchType = type === "txhash" ? "hash" : "address";
  // Toggle UI sections
}
```

#### URL Parameter Support
- `?address=15oF4uV...` - Direct address loading
- `?tx=0x...` - Direct transaction hash loading

**URL Updates:**
- URLs update for sharing and bookmarking
- Browser history properly managed for back/forward navigation
- Clean URL structure without sensitive data (addresses only, not keys)

## Transaction Features

### Transaction Filtering
Users can filter transaction history by type:
- **All Transactions**: Complete history (default)
- **Received**: Incoming transfers only (`type === "received"`)
- **Sent**: Outgoing transfers only (`type === "sent"`)

**Implementation:**
```javascript
function filterTransactions(type) {
  currentTxFilter = type;
  
  // Filter from all transactions
  const filtered = allTransactions.filter(tx => {
    if (type === "all") return true;
    return tx.type === type;
  });
  
  // Update display
  displayFilteredTransactions(filtered);
}
```

### Transaction Details
Each transaction displays:
- **Transaction Hash**: Full extrinsic hash with copy button
- **From/To**: SS58 addresses with copy functionality
- **Amount**: Transfer amount in DOT (converted from planck)
- **Fee**: Network fee in DOT
- **Block Number**: Block height
- **Timestamp**: Human-readable date/time
- **Status**: Success/Failed indicator
- **Module/Method**: Call module and function name
- **Extrinsic Index**: Position in block

**Transaction Object Structure:**
```javascript
{
  id: "0x1234...",              // Hash
  hash: "0x1234...",            // Extrinsic hash
  from: "15oF...",              // Sender SS58
  to: "1Hb...",                 // Recipient SS58
  amount: 1.5,                  // Amount in DOT
  amountDot: 1.5,               // Same as amount
  fee: 0.0165,                  // Fee in DOT
  feeDot: 0.0165,               // Same as fee
  block: 123456,                // Block number
  timestamp: 1678901234,        // Unix timestamp
  success: true,                // Status
  type: "sent",                 // "sent" or "received"
  module: "Balances",           // Call module
  method: "transferAllowDeath", // Call method
  asset_symbol: "DOT",          // Asset
  extrinsicIndex: "123456-2"    // Block-index
}
```

### Success Modal
After successful transaction:
- **Transaction ID**: Full hash with copy button
- **Amount Sent**: Exact amount in DOT
- **To Address**: Truncated recipient with copy
- **Fee**: Actual fee paid
- **Explorer Link**: Direct link to Subscan

**Explorer URL Format:**
```
https://assethub-polkadot.subscan.io/extrinsic/{hash}
```

## Security Features

### Private Key Handling
- **No Storage**: Private keys are never stored in LocalStorage or any persistent storage
- **Memory Clearing**: Variables containing keys are nullified after use
- **In-Memory Only**: Keys exist only during transaction signing
- **Input Validation**: Strict format validation before processing
- **Error Handling**: Secure error messages without key exposure

**Key Security Workflow:**
```javascript
async function sendDot() {
  let privateKey = getPrivateKeyInput();
  
  try {
    // Use key for signing
    const signedTx = await signTransaction(privateKey);
    await submitTransaction(signedTx);
  } finally {
    // Clear from memory
    privateKey = null;
    clearInputField('send-privatekey');
  }
}
```

### Transaction Security
- **Confirmation Modal**: User must confirm all transaction details
- **Balance Validation**: Prevents sending more than available balance including fees
- **Fee Display**: Clear fee breakdown before sending
- **Account Activation**: Enforces minimum balance for inactive recipients (0.01 DOT)
- **Network Verification**: Waits for finalization before showing success
- **Error Details**: Clear error messages for failed transactions

**Fee Structure:**
```javascript
// Estimated typical fees on AssetHub
{
  transferFee: 0.0165 DOT,       // Standard transfer
  activationMin: 0.01 DOT,       // Existential deposit
  total: amount + transferFee    // Total needed in wallet
}
```

## Performance Optimizations

### Smart Pagination
```javascript
// Initial load: Fetch 20 transactions per page
// Subscan API handles server-side pagination
const transactionsPerPage = 20;

const historyData = await polkadotAPI.getTransactions(
  address, 
  page,           // Current page (0-indexed)
  transactionsPerPage
);

// Client-side filtering (no re-fetch)
const filtered = allTransactions.filter(tx => 
  filterType === "all" || tx.type === filterType
);
```

### Caching Strategy
- **Transaction Cache**: Store current page in `allTransactions` array
- **Balance Cache**: Store in LocalStorage search history
- **Filter Cache**: Client-side filtering without API calls
- **Multi-Chain Data**: Store BTC/FLO addresses with DOT searches

### UI Optimizations
- **Lazy Loading**: Progressive content loading
- **Debounced Inputs**: 300ms debounce on private key input
- **Responsive Images**: SVG icons and logos
- **CSS Grid/Flexbox**: Efficient layout rendering
- **Theme Persistence**: LocalStorage for theme preferences
- **Loading States**: Clear spinners for all async operations
- **Conditional Rendering**: Hide/show sections instead of destroying DOM

### API Optimization
- **Minimal Requests**: Batch data where possible
- **Error Handling**: Graceful fallbacks for API failures
- **WebSocket Reuse**: Single connection for transaction submission
- **Rate Limiting**: Respect Subscan API limits
- **Pagination**: Server-side pagination for large datasets

**API Rate Limits (Subscan):**
- Free tier: 5 requests/second
- Default API key included (visible in source)
- Get your own key at: https://support.subscan.io/

## Error Handling

### Address Validation Errors
```javascript
// Invalid format
"⚠️ Please enter a Polkadot address or private key"

// Invalid private key
"⚠️ Invalid private key format. Please enter a valid private key (hex or WIF)"

// Transaction ID mistaken for key
"⚠️ This looks like a transaction ID, not a private key."

// WIF checksum failure
"Invalid WIF key: checksum mismatch"
```

### Transaction Errors
```javascript
// Insufficient balance
"❌ Insufficient balance. You have X DOT but need Y DOT (including Z DOT fee)"

// Inactive account with low amount
"⚠️ Recipient account is not active. Minimum 0.01 DOT required to activate"

// Network errors
"❌ Failed: {error.message}"

// RPC connection errors
"Polkadot API not loaded! Please refresh the page."

// Transaction timeout
"Transaction timeout" (after 60 seconds)
```

### Search Errors
```javascript
// Empty input
"⚠️ Please enter a Polkadot address or private key"

// Invalid transaction hash
"⚠️ Please enter a transaction hash"

// API errors
"❌ Error: {error.message}"

// Transaction not found
"Transaction not found"

// Balance API error
"Failed to fetch balance"
```

### Subscan API Errors
```javascript
// API key missing (transaction history)
"Transaction history temporarily unavailable. Subscan API requires an API key."

// Network error
"Error loading transactions"

// Invalid response
"Failed to fetch transactions"
```

## File Structure
```
polkadot-wallet/
├── index.html                 # Main application (SPA)
├── style.css                  # Stylesheet (responsive design)
├── polkadotCrypto.js         # Cryptographic functions (Sr25519, ECDSA)
├── polkadotBlockchainAPI.js  # Blockchain integration (Subscan, RPC)
├── polkadotSearchDB.js       # Data persistence (LocalStorage)
├── lib.polkadot.js           # External libraries bundle
├── polkadot-api-bundle.js    # Polkadot.js API bundle
├── README.md                 # This file
└── polkadot_favicon.svg      # Application icon
```

## Dependencies

### External Libraries (via lib.polkadot.js)
- **Bitcoin.js**: ECDSA key generation for BTC/FLO
- **Coinjs**: Bitcoin address utilities (Bech32)
- **Bitjs**: FLO address generation
- **Crypto-js**: SHA256 hashing

### External Libraries (via polkadot-api-bundle.js)
- **@polkadot/util-crypto**: Sr25519 keypair generation and signing
- **@polkadot/util**: Utility functions (hex conversion, encoding)
- **@polkadot/api**: WebSocket RPC provider, transaction building
- **@polkadot/keyring**: SS58 address encoding

### APIs
- **Subscan API**: Balance, transaction history, transaction lookup
  - Endpoint: `https://assethub-polkadot.api.subscan.io`
  - Network: `assethub-polkadot`
  
- **Polkadot AssetHub RPC**: Transaction submission, fee estimation
  - WebSocket: `wss://polkadot-asset-hub-rpc.polkadot.io`
  - Protocol: JSON-RPC 2.0

