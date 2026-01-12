# Hedera Web Wallet - Technical Documentation

## Overview

The Hedera Multi-Chain Wallet is a web-based cryptocurrency wallet that supports multiple blockchain networks including Hedera (HBAR), FLO, and Bitcoin (BTC). The wallet provides comprehensive functionality for address generation, transaction management, balance checking, and transaction history viewing with full EVM compatibility.

### Key Features
- **Multi-Chain Support**: HBAR (EVM), FLO, and BTC address generation from a single ECDSA private key
- **EVM Compatibility**: Full Hedera EVM address support with auto-account creation
- **Transaction History**: Paginated transaction viewing with filtering (All/Received/Sent)
- **Address Search**: Persistent search history with IndexedDB storage
- **URL Sharing**: Direct link sharing for addresses and transaction hashes
- **Real-Time Data**: Live balance updates and transaction status checking
- **Account ID Support**: Accept both EVM addresses (0x...) and Account IDs (0.0.xxxx)
- **Responsive Design**: Mobile-first responsive interface with dark/light theme

## Architecture

### System Architecture
```
┌────────────────────────────────────────────────────────────┐
│                    Frontend Layer                          │
├────────────────────────────────────────────────────────────┤
│  index.html  │  style.css  │  JavaScript Modules           │
├──────────────┼─────────────┼───────────────────────────────┤
│              │             │ • hederaCrypto.js             │
│              │             │ • hederaBlockchainAPI.js      │
│              │             │ • hederaSearchDB.js           │
│              │             │ • lib.hedera.js               │
└──────────────┴─────────────┴───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Storage Layer                              │
├─────────────────────────────────────────────────────────────┤
│  IndexedDB         │  LocalStorage   │  Session Storage     │
│  • Address History │ • Theme Prefs   │ • Temp Data          │
│  • Search Cache    │ • User Settings │ • Form State         │
│  • Multi-Chain     │                 │                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Blockchain Layer                             │
├─────────────────────────────────────────────────────────────┤
│  Hedera Network   │  FLO Network    │  Bitcoin Network      │
│  • HashScan API   │ • Address Gen   │ • Address Gen         │
│  • JSON-RPC       │ • Key Derivation│ • Key Derivation      │
│  • EVM Addresses  │ • ECDSA Keys    │ • ECDSA Keys          │
│  • Account IDs    │                 │                       │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Cryptographic Engine (`hederaCrypto.js`)

The cryptographic engine handles multi-chain address generation and ECDSA key management.

#### Key Functions
```javascript
// Generate multi-chain addresses from ECDSA private key
async generateMultiChain(privateKey = null)

// Derive Hedera EVM address from ECDSA key
deriveHederaAddress(privateKey)

// Create new random ECDSA wallet
generateNewID()

// Hash generation utilities
hashID(str)
tmpID()
```

#### Supported Private Key Formats
- **HBAR**: 64-character hexadecimal (ECDSA secp256k1 only)
- **FLO**: 64-character hexadecimal or WIF format
- **BTC**: 64-character hexadecimal or WIF format

**Important**: Only ECDSA (secp256k1) keys are supported for Hedera EVM compatibility. ED25519 keys are not supported.

### 2. Blockchain API Layer (`hederaBlockchainAPI.js`)

Handles all blockchain interactions, RPC communications, and HashScan API integration.

#### Core Functions
```javascript
// Balance retrieval (supports both EVM addresses and Account IDs)
async getBalance(address)

// Transaction history with pagination
async getTransactionHistory(accountId, options = {})

// Transaction by ID/Hash lookup
async getTransactionById(transactionId)

// Send HBAR transaction
async sendHBAR(privateKey, toAddress, amount)

// Address validation
validateAddress(address)

// Account ID to EVM address conversion
async getAccountInfo(accountId)

// Utility functions
formatTimestamp(timestamp)
```

#### API Configuration
```javascript
const HASHSCAN_API = "https://mainnet.hashscan.io/api/v1";
const HEDERA_RPC = "https://mainnet.hashio.io/api";
```

### 3. Data Persistence (`hederaSearchDB.js`)

IndexedDB wrapper for persistent storage of searched addresses and multi-chain metadata.

#### Database Schema
```sql
-- Object Store: searchedAddresses
{
  id: number (Auto-increment Primary Key),
  hbarAddress: string (Indexed),
  btcAddress: string | null,
  floAddress: string | null,
  balance: number,
  formattedBalance: string,
  timestamp: number (Indexed),
  isFromPrivateKey: boolean
}
```

#### API Methods
```javascript
class SearchedAddressDB {
  async init()
  async saveSearchedAddress(hbarAddress, balance, timestamp, sourceInfo)
  async getSearchedAddresses()
  async deleteSearchedAddress(id)
  async clearAllSearchedAddresses()
}
```

## API Reference

### Wallet Generation

#### `generateWallet()`
Generates a new multi-chain wallet with random ECDSA private keys.

**Returns:** Promise resolving to wallet object
```javascript
{
  HBAR: { 
    address: string,        // Account ID (if available)
    evmAddress: string,     // EVM address (0x...)
    privateKey: string      // ECDSA private key
  },
  FLO: { address: string, privateKey: string },
  BTC: { address: string, privateKey: string }
}
```

### Address Recovery

#### `recoverWallet()`
Recovers wallet addresses from an existing ECDSA private key.

**Parameters:**
- `privateKey` (string): Valid ECDSA private key (64 hex chars or WIF)

**Validation:**
- Hex format: Exactly 64 hexadecimal characters
- WIF format: 51-52 Base58 characters
- Rejects ED25519 keys (cannot be distinguished, user must verify)

**Returns:** Promise resolving to wallet object (same structure as generateWallet)

### Transaction Management

#### `searchAddress()`
Loads balance and transaction history for a given address with smart pagination.

**Process Flow:**
1. Input validation (EVM address/Account ID/private key)
2. Address derivation (if private key provided)
3. Balance retrieval via HashScan API
4. Account ID resolution (for EVM addresses)
5. Transaction history fetching (10 transactions per page)
6. Pagination setup with next/previous links
7. UI updates and data persistence

**Supported Input Formats:**
- EVM Address: `0x...` (42 characters)
- Account ID: `0.0.xxxx`
- Private Key: 64 hex chars or WIF format

#### `sendHBAR()`
Prepares and broadcasts a transaction to the Hedera network.

**Parameters:**
- `privateKey` (string): Sender's ECDSA private key
- `recipientAddress` (string): Recipient's EVM address or Account ID
- `amount` (number): Amount in HBAR

**Process:**
```
Input Validation → Account ID Conversion (if needed) → Gas Estimation → 
User Confirmation → Transaction Signing → Broadcast → Receipt Verification
```

**Features:**
- Automatic Account ID to EVM address conversion
- Dynamic gas estimation using Web3 API
- Auto-account creation for new recipients
- Transaction confirmation modal with full details

### Search Functionality

#### `handleSearch()`
Unified search handler supporting both address and transaction hash lookup.

**Search Types:**
- `address`: Loads balance and transaction history
  - Supports: EVM addresses, Account IDs, Private keys
- `hash`: Retrieves transaction details from blockchain
  - Supports: Hex hashes (0x...), Transaction IDs (0.0.xxxx@seconds.nanos)

#### URL Parameter Support
- `?address=0x...` - Direct EVM address loading
- `?address=0.0.xxxx` - Direct Account ID loading
- `?hash=0x...` - Direct transaction hash loading
- `?txid=0.0.xxxx@...` - Direct transaction ID loading

**URL Updates:**
- URLs update even for inactive addresses (for sharing)
- Browser history properly managed for back/forward navigation
- Clean URL structure without sensitive data

## Transaction Features

### Transaction Filtering
Users can filter transaction history by type:
- **All Transactions**: Complete history
- **Received**: Incoming transfers only
- **Sent**: Outgoing transfers only

### Transaction Details
Each transaction displays:
- Transaction Hash (with copy button)
- Transaction ID
- Consensus Timestamp
- Result Status
- Transaction Type
- Charged Fee (in HBAR)
- Node Information
- Block Number
- Memo (if present)
- Transfer Details (all accounts involved)

### Success Modal
After successful transaction:
- **Transaction Hash**: Full hash with copy button
- **Amount Sent**: Exact amount in HBAR
- **From Address**: Full EVM address with copy button
- **To Address**: Full EVM address with copy button
- **Gas Used**: Actual gas consumed
- **Explorer Link**: Direct link to HashScan

## Security Features

### Private Key Handling
- **No Storage**: Private keys are never stored in any form
- **Memory Clearing**: Variables containing keys are nullified after use
- **Input Validation**: Strict ECDSA format validation before processing
- **Error Handling**: Secure error messages without key exposure
- **ECDSA Only**: Clear warnings that only ECDSA keys are accepted

### Transaction Security
- **Confirmation Modal**: User must confirm all transaction details
- **Balance Validation**: Prevents sending more than available balance
- **Gas Estimation**: Accurate gas cost calculation before sending
- **Error Details**: Clear error messages for failed transactions

## Performance Optimizations

### Smart Pagination
```javascript
// Initial load: Fetch 10 transactions
// Use HashScan API pagination links for next/previous
// Cache current page data for instant filtering
// Lazy load additional pages on demand

const transactionsPerPage = 10;
const historyData = await hederaAPI.getTransactionHistory(
  accountId, 
  { limit: transactionsPerPage }
);
```

### Caching Strategy
- **Transaction Cache**: Store current page transactions for filtering
- **Balance Cache**: Cache balance data in IndexedDB
- **Address History**: Persistent search history with timestamps
- **Multi-Chain Data**: Store BTC/FLO addresses for private key searches

### UI Optimizations
- **Lazy Loading**: Progressive content loading
- **Debounced Inputs**: 500ms debounce on address derivation
- **Responsive Images**: Optimized for mobile devices
- **CSS Grid/Flexbox**: Efficient layout rendering
- **Theme Persistence**: LocalStorage for theme preferences
- **Loading States**: Clear spinners for all async operations

### API Optimization
- **Batch Requests**: Minimize API calls where possible
- **Error Handling**: Graceful fallbacks for API failures
- **Rate Limiting**: Respect API rate limits
- **Pagination**: Efficient data fetching with HashScan links

## Error Handling

### Address Validation Errors
```javascript
// Invalid format
"⚠️ Invalid address or private key format"

// Inactive account
"Address is inactive" (displayed in balance field)

// Invalid private key
"⚠️ Invalid private key format. Expected 64-char hex or WIF format."
```

### Transaction Errors
```javascript
// Insufficient balance
showErrorModal('Insufficient Balance', message, detailedBreakdown)

// Gas estimation failed
"⚠️ Could not calculate exact gas fee, using estimate"

// Network errors
"❌ Error: " + error.message
```

### Search Errors
```javascript
// Empty input
"⚠️ Please enter an address or private key"

// Invalid transaction hash
"⚠️ Invalid transaction hash format"

// API errors
"❌ Error: " + error.message
```

## File Structure
```
hedera-wallet/
├── index.html                 # Main application
├── style.css                  # Stylesheet
├── hederaCrypto.js           # Cryptographic functions (ECDSA)
├── hederaBlockchainAPI.js    # Blockchain integration (HashScan + RPC)
├── hederaSearchDB.js         # Data persistence (IndexedDB)
├── lib.hedera.js             # External libraries (crypto, Web3)
├── README.md                 # This file
└── hedera_favicon.png        # Application icon
```

## Dependencies

### External Libraries (via lib.hedera.js)
- **Crypto Libraries**: ECDSA key generation and signing
- **Web3.js**: Ethereum-compatible RPC interactions
- **Base58**: Address encoding/decoding
- **SHA256/RIPEMD160**: Hash functions for address derivation

### APIs
- **HashScan API**: Transaction history, balance, account info
- **Hedera JSON-RPC**: Gas estimation, transaction broadcasting
- **Web3 Provider**: `https://mainnet.hashio.io/api`
