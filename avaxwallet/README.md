# Avax Web Wallet - Technical Documentation


## Overview

The Avalanche Multi-Chain Wallet is a web-based cryptocurrency wallet that supports multiple blockchain networks including Avalanche (AVAX), FLO, and Bitcoin (BTC). The wallet provides comprehensive functionality for address generation, transaction management, balance checking, and transaction history viewing.

### Key Features
- **Multi-Chain Support**: AVAX, FLO, and BTC address generation from a single private key
- **Transaction History**: Paginated transaction viewing with smart caching
- **Address Search**: Persistent search history with IndexedDB storage
- **URL Sharing**: Direct link sharing for addresses and transaction hashes
- **Real-Time Data**: Live balance updates and transaction status checking
- **Responsive Design**: Mobile-first responsive interface


## Architecture

### System Architecture
```
┌────────────────────────────────────────────────────────────┐
│                    Frontend Layer                          │
├────────────────────────────────────────────────────────────┤
│  index.html  │  style.css  │  JavaScript Modules           │
├──────────────┼─────────────┼───────────────────────────────┤
│              │             │ • avaxCrypto.js               │
│              │             │ • avaxBlockchainAPI.js        │
│              │             │ • avaxSearchDB.js             │
│              │             │ • lib.avax.js                 │
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
│  AVAX C-Chain     │  FLO Network    │  Bitcoin Network      │
│  • RPC Endpoints  │ • Address Gen   │ • Address Gen         │
│  • Transaction    │ • Key Derivation│ • Key Derivation      │
│  • Balance Query  │                 │                       │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Cryptographic Engine (`avaxCrypto.js`)

The cryptographic engine handles multi-chain address generation and key management.

#### Key Functions
```javascript
// Generate multi-chain addresses from private key
async generateMultiChain(privateKey = null)

// Create new random wallet
generateNewID()

// Hash generation utilities
hashID(str)
tmpID()
```

#### Supported Private Key Formats
- **AVAX**: 64-character hexadecimal
- **FLO**: Base58 format starting with 'R'
- **BTC**: WIF format starting with 'K', or 'L'


### 2. Blockchain API Layer (`avaxBlockchainAPI.js`)

Handles all blockchain interactions and RPC communications.

#### Core Functions
```javascript
// Balance retrieval
async getBalanceRPC(address)

// Transaction history with pagination
async fetchAvalancheTxHistory(address, page, limit)

// Transaction preparation for sending
async prepareAvalancheTransaction(privateKey, to, amount)

// Utility functions
weiToAvax(weiAmount)
formatTransactionTime(timestamp)
```

#### RPC Configuration
```javascript
const RPC_ENDPOINTS = "https://go.getblock.io/.../ext/bc/C/rpc";
```

### 3. Data Persistence (`avaxSearchDB.js`)

IndexedDB wrapper for persistent storage of searched addresses and metadata.

#### Database Schema
```sql
-- Object Store: searchedAddresses
{
  address: string (Primary Key),
  balance: number,
  timestamp: number (Indexed),
  sourceInfo: {
    originalPrivateKey: string,
    originalAddress: string,
    blockchain: string,
    derivedAvaxAddress: string
  } | null
}
```

#### API Methods
```javascript
class SearchedAddressDB {
  async init()
  async saveSearchedAddress(address, balance, timestamp, sourceInfo)
  async getSearchedAddresses()
  async deleteSearchedAddress(address)
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
  AVAX: { address: string, privateKey: string },
  FLO: { address: string, privateKey: string },
  BTC: { address: string, privateKey: string }
}
```

### Address Recovery

#### `recoverWallet()`
Recovers wallet addresses from an existing private key.

**Parameters:**
- `privateKey` (string): Valid AVAX/FLO/BTC private key

**Returns:** Promise resolving to wallet object (same structure as generateWallet)

### Transaction Management

#### `loadTransactions()`
Loads transaction history for a given address with smart pagination.

**Process Flow:**
1. Input validation (address/private key)
2. Address derivation (if private key provided)
3. Balance retrieval
4. Transaction history fetching (50 transactions initially)
5. Pagination setup (3-5 pages based on transaction count)
6. UI updates and data persistence

#### `sendTransaction()`
Prepares and broadcasts a transaction to the Avalanche network.

**Parameters:**
- `privateKey` (string): Sender's private key
- `recipientAddress` (string): Recipient's AVAX address
- `amount` (string): Amount in AVAX

**Process:**
```
Input Validation → Gas Estimation → User Confirmation → Transaction Signing → Broadcast
```

### Search Functionality

#### `handleSearch()`
Unified search handler supporting both address and transaction hash lookup.

**Search Types:**
- `address`: Loads balance and transaction history
- `hash`: Retrieves transaction details from blockchain

#### URL Parameter Support
- `?address=0x...` - Direct address loading
- `?hash=0x...` - Direct transaction hash loading



## Security Features

### Private Key Handling
- **No Storage**: Private keys are never stored in any form
- **Memory Clearing**: Variables containing keys are nullified after use
- **Input Validation**: Strict format validation before processing
- **Error Handling**: Secure error messages without key exposure

### URL Security
- **Address-Only URLs**: Only public addresses included in shareable URLs
- **No Private Data**: Private keys never included in URL parameters
- **State Management**: Secure browser history handling

## Performance Optimizations

### Smart Pagination
```javascript
// Initial load: Fetch 50 transactions
// Analyze count to determine pages (3-5)
// Cache data for instant navigation
// Lazy load additional pages on demand

const isFirstLoad = currentPage === 1 && allTransactions.length === 0;
const fetchCount = isFirstLoad ? 50 : 10;
```

### Caching Strategy
- **Transaction Cache**: Store 50+ transactions for fast pagination
- **Balance Cache**: Cache balance data in IndexedDB
- **Address History**: Persistent search history with timestamps

### UI Optimizations
- **Lazy Loading**: Progressive content loading
- **Debounced Inputs**: Prevent excessive API calls
- **Responsive Images**: Optimized for mobile devices
- **CSS Grid/Flexbox**: Efficient layout rendering


### File Structure
```
avalanche-wallet/
├── index.html              # Main application
├── style.css              # Stylesheet
├── avaxCrypto.js          # Cryptographic functions
├── avaxBlockchainAPI.js   # Blockchain integration
├── avaxSearchDB.js        # Data persistence
├── lib.avax.js            # External libraries
```

