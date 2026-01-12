# Algorand Web Wallet - Technical Documentation

## Overview

The Algorand Multi-Chain Wallet is a web-based cryptocurrency wallet that supports multiple blockchain networks including Algorand (ALGO), FLO, and Bitcoin (BTC). The wallet provides comprehensive functionality for address generation, transaction management, balance checking, and transaction history viewing.

### Key Features
- **Multi-Chain Support**: ALGO, FLO, and BTC address generation from a single private key
- **Transaction History**: Paginated transaction viewing with smart caching
- **Address Search**: Persistent search history with IndexedDB storage
- **URL Sharing**: Direct link sharing for addresses and transaction hashes
- **Real-Time Data**: Live balance updates and transaction status checking
- **Responsive Design**: Mobile-first responsive interface
- **Transaction Filtering**: Filter transactions by All, Received, or Sent
- **Minimum Balance Validation**: Ensures Algorand minimum balance requirements are met


## Architecture

### System Architecture
```
┌────────────────────────────────────────────────────────────┐
│                    Frontend Layer                          │
├────────────────────────────────────────────────────────────┤
│  index.html  │  style.css  │  JavaScript Modules           │
├──────────────┼─────────────┼───────────────────────────────┤
│              │             │ • algoCrypto.js               │
│              │             │ • algoBlockchainAPI.js        │
│              │             │ • algoSearchDB.js             │
│              │             │ • lib.algo.js                 │
└──────────────┴─────────────┴───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Storage Layer                              │
├─────────────────────────────────────────────────────────────┤
│  IndexedDB         │  LocalStorage   │  Session Storage     │
│  • Address History │ • Theme Prefs   │ • Temp Data          │
│  • Search Cache    │ • User Settings │ • Form State         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Blockchain Layer                             │
├─────────────────────────────────────────────────────────────┤
│  ALGO Network     │  FLO Network    │  Bitcoin Network      │
│  • Algod API      │ • Address Gen   │ • Address Gen         │
│  • Indexer API    │ • Key Derivation│ • Key Derivation      │
│  • Transaction    │                 │                       │
│  • Balance Query  │                 │                       │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Cryptographic Engine (`algoCrypto.js`)

The cryptographic engine handles multi-chain address generation and key management using Ed25519 for Algorand.

#### Key Functions
```javascript
// Generate multi-chain addresses from private key
async generateMultiChain(inputWif = null)

// Build Algorand payment transaction
buildPaymentTx(params)

// Sign Algorand transaction
signAlgo(txBytes, algoPrivateKey)

// Create complete signed transaction
createSignedPaymentTx(params, privateKey)

// Hash generation utilities
hashID(str)
tmpID()
```

#### Supported Private Key Formats
- **ALGO**: 64-character hexadecimal (Ed25519 seed)
- **FLO**: Base58 format starting with 'R'
- **BTC**: WIF format starting with 'K' or 'L'

#### Algorand Address Generation
Algorand addresses are generated using Ed25519 cryptography:
1. Generate 32-byte seed (or use provided private key)
2. Derive Ed25519 public key from seed
3. Hash public key with SHA-512/256
4. Append 4-byte checksum
5. Encode to Base32 (58 characters)


### 2. Blockchain API Layer (`algoBlockchainAPI.js`)

Handles all blockchain interactions with Algorand network using public RPC endpoints.

#### Core Functions
```javascript
// Balance retrieval
async getBalance(address)

// Transaction history with pagination
async getTransactions(address, options = {})

// Transaction parameters for sending
async getTransactionParams()

// Send signed transaction
async sendTransaction(signedTxnBytes)

// Wait for transaction confirmation
async waitForConfirmation(txId, timeout = 10)

// Get single transaction by ID
async getTransaction(txId)

// Utility functions
formatAlgo(microAlgos)
parseAlgo(algo)
```

#### RPC Configuration
```javascript
const ALGOD_URL = 'https://mainnet-api.4160.nodely.dev';
const INDEXER_URL = 'https://mainnet-idx.4160.nodely.dev';
```

#### API Response Structure
```javascript
// Balance Response
{
  address: string,
  balance: number,           // in microAlgos
  balanceAlgo: number,       // in ALGO
  minBalance: number,        // minimum required balance
  pendingRewards: number,
  rewards: number,
  status: string,
  totalAppsOptedIn: number,
  totalAssetsOptedIn: number
}

// Transaction Response
{
  transactions: Array,
  nextToken: string | null,
  hasMore: boolean
}
```


### 3. Data Persistence (`algoSearchDB.js`)

IndexedDB wrapper for persistent storage of searched addresses and metadata.

#### Database Schema
```sql
-- Object Store: searchedAddresses
{
  id: number (Primary Key, Auto-increment),
  algoAddress: string (Indexed),
  btcAddress: string | null,
  floAddress: string | null,
  balance: number,
  timestamp: number (Indexed),
  formattedBalance: string,
  isFromPrivateKey: boolean
}
```

#### API Methods
```javascript
class SearchedAddressDB {
  async init()
  async saveSearchedAddress(algoAddress, balance, timestamp, sourceInfo)
  async getSearchedAddresses()
  async deleteSearchedAddress(id)
  async clearAllSearchedAddresses()
}
```


## API Reference

### Wallet Generation

#### `generateWallet()`
Generates a new multi-chain wallet with random private keys.

**Returns:** Promise resolving to wallet object
```javascript
{
  ALGO: { address: string, privateKey: string },
  FLO: { address: string, privateKey: string },
  BTC: { address: string, privateKey: string }
}
```

**Example:**
```javascript
const wallet = await algoCrypto.generateMultiChain();
console.log(wallet.ALGO.address); // "ABCD...XYZ" (58 chars)
console.log(wallet.ALGO.privateKey); // 64-char hex
```

### Address Recovery

#### `recoverWallet()`
Recovers wallet addresses from an existing private key.

**Parameters:**
- `privateKey` (string): Valid ALGO/FLO/BTC private key

**Validation:**
- Hex keys: 64 or 128 characters (0-9, a-f, A-F)
- WIF keys: 51-52 characters (Base58)
- Rejects: Algorand addresses, transaction IDs, invalid formats

**Returns:** Promise resolving to wallet object (same structure as generateWallet)

**Example:**
```javascript
const wallet = await algoCrypto.generateMultiChain(privateKey);
```

### Transaction Management

#### `searchAlgoAddress()`
Loads balance and transaction history for a given address or private key.

**Process Flow:**
1. Input validation (address/private key)
2. Address derivation (if private key provided)
3. Balance retrieval with minimum balance check
4. Transaction history fetching (10 transactions per page)
5. Pagination setup with next token
6. UI updates and data persistence

**Supported Inputs:**
- Algorand address (58 characters, Base32)
- Private key (hex or WIF format)

#### `sendAlgo()`
Prepares and broadcasts a transaction to the Algorand network.

**Parameters:**
- `privateKey` (string): Sender's private key
- `recipientAddress` (string): Recipient's ALGO address (58 chars)
- `amount` (string): Amount in ALGO

**Process:**
```
Input Validation → Balance Check → Minimum Balance Validation → 
User Confirmation → Transaction Building → Signing → Broadcast → 
Confirmation Wait
```

**Validation Checks:**
1. Private key format validation
2. Recipient address format (58 characters)
3. Amount validation (positive number)
4. Sufficient balance check
5. Minimum balance requirement (account must retain minBalance + fee)

**Example:**
```javascript
// Minimum balance validation
const remainingBalance = currentBalance - amountMicroAlgos - fee;
if (remainingBalance < minBalance) {
  throw new Error(`Insufficient balance. Account must maintain minimum balance of ${minBalance / 1000000} ALGO`);
}
```

### Search Functionality

#### `handleSearch()`
Unified search handler supporting both address and transaction hash lookup.

**Search Types:**
- `address`: Loads balance and transaction history
- `hash`: Retrieves transaction details from blockchain

**URL Parameter Support:**
- `?address=ABCD...XYZ` - Direct address loading
- `?hash=TXID...` - Direct transaction hash loading

#### Transaction Filtering

**Filter Types:**
- `all`: Show all transactions
- `received`: Show only incoming transactions
- `sent`: Show only outgoing transactions

**Implementation:**
```javascript
function filterTransactions(type) {
  currentTxFilter = type;
  currentPage = 1; // Reset to first page
  displayCurrentPage();
}
```


## Transaction Structure

### Algorand Transaction Format
```javascript
{
  from: string,           // Sender address
  to: string,             // Recipient address
  amount: number,         // Amount in microAlgos
  fee: number,            // Fee in microAlgos
  firstRound: number,     // First valid round
  lastRound: number,      // Last valid round
  genesisID: string,      // Network genesis ID
  genesisHash: string,    // Network genesis hash (Base64)
  note: Uint8Array        // Optional note (max 1KB)
}
```

### MessagePack Encoding
Algorand uses MessagePack encoding for transactions:
```javascript
// Encoding process
1. Build transaction object
2. Encode with MessagePack
3. Prepend "TX" prefix for signing
4. Sign with Ed25519
5. Create signed transaction envelope
6. Encode for broadcasting
```


## Security Features

### Private Key Handling
- **No Storage**: Private keys are never stored in any form
- **Memory Clearing**: Variables containing keys are nullified after use
- **Input Validation**: Strict format validation before processing
- **Error Handling**: Secure error messages without key exposure
- **Local Processing**: All cryptographic operations happen client-side

### URL Security
- **Address-Only URLs**: Only public addresses included in shareable URLs
- **No Private Data**: Private keys never included in URL parameters
- **State Management**: Secure browser history handling

### Transaction Security
- **Confirmation Modal**: User must confirm transaction details before sending
- **Balance Validation**: Ensures sufficient balance including fees
- **Minimum Balance Check**: Prevents account from going below minimum
- **Network Validation**: Verifies transaction parameters from network


## Performance Optimizations

### Smart Pagination
```javascript
// Initial load: Fetch 10 transactions
// Use nextToken for subsequent pages
// Cache data for instant navigation
// Lazy load additional pages on demand

const options = {
  limit: 10,
  next: txNextToken,
  txType: currentTxFilter === 'all' ? null : 'pay'
};
```

### Caching Strategy
- **Transaction Cache**: Store transactions with next token for pagination
- **Balance Cache**: Cache balance data in IndexedDB
- **Address History**: Persistent search history with timestamps
- **Recent Searches**: Quick access to last 10 searched addresses

### UI Optimizations
- **Lazy Loading**: Progressive content loading
- **Loading States**: Visual feedback during API calls
- **Debounced Inputs**: Prevent excessive API calls
- **Responsive Images**: Optimized for mobile devices
- **CSS Grid/Flexbox**: Efficient layout rendering


## Error Handling

### Common Errors and Solutions

#### 1. Balance Below Minimum
```javascript
Error: "balance below min"
Solution: Account must maintain minimum balance (typically 0.1 ALGO)
Implementation: Validate remainingBalance >= minBalance before sending
```

#### 2. Invalid Address Format
```javascript
Error: "Invalid address format"
Solution: Algorand addresses must be exactly 58 characters (Base32)
Validation: /^[A-Z2-7]{58}$/.test(address)
```

#### 3. Transaction Not Found
```javascript
Error: "Transaction not found: 404"
Solution: Transaction may not be indexed yet or invalid hash
Wait: 4-8 seconds for transaction to be indexed
```

#### 4. Insufficient Balance
```javascript
Error: "Insufficient balance"
Solution: Account balance must cover amount + fee + minimum balance
Formula: balance >= amount + fee + minBalance
```


## Network Information

### Algorand Mainnet
- **Block Time**: ~4 seconds
- **Minimum Fee**: 0.001 ALGO (1000 microAlgos)
- **Minimum Balance**: 0.1 ALGO (100,000 microAlgos)
- **Address Format**: Base32, 58 characters
- **Transaction ID**: Base32, 52 characters

### API Endpoints
```javascript
// Algod API (node operations)
https://mainnet-api.4160.nodely.dev

// Indexer API (historical data)
https://mainnet-idx.4160.nodely.dev

// Explorer
https://algoexplorer.io
```


## File Structure
```
algorand-wallet/
├── index.html              # Main application
├── style.css              # Stylesheet
├── algoCrypto.js          # Cryptographic functions
├── algoBlockchainAPI.js   # Blockchain integration
├── algoSearchDB.js        # Data persistence
├── lib.algo.js            # External libraries (Bitcoin.js)
├── algo_favicon.png       # Favicon
└── README.md              # This file
```


## Dependencies

### External Libraries
```html
<!-- Ed25519 cryptography -->
<script src="https://cdn.jsdelivr.net/npm/tweetnacl@1.0.3/nacl.min.js"></script>

<!-- SHA-512/256 hashing -->
<script src="https://cdn.jsdelivr.net/npm/js-sha512@0.8.0/build/sha512.min.js"></script>

<!-- Bitcoin.js for BTC/FLO support -->
<script src="lib.algo.js"></script>

<!-- Font Awesome icons -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

<!-- Inter font -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```


