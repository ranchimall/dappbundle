

# RanchiMall Stellar Web Wallet - Technical Documentation

## Overview

The RanchiMall Stellar Web Wallet is a multi-chain web-based wallet focused on Stellar (XLM) with seamless integration for FLO and Bitcoin (BTC). It enables address generation, transaction management, balance checking, and transaction history viewing for Stellar, while supporting multi-chain address and key management.

### Key Features

- **Multi-Chain Support**: Generate and manage XLM, FLO, and BTC addresses from a single wallet
- **Cross-Chain Private Key Integration**: Send XLM using Stellar, FLO, or Bitcoin private keys
- **Transaction History**: Paginated viewing and filtering (All/Received/Sent) for Stellar transactions
- **Address Search**: Persistent search history with IndexedDB storage
- **URL Sharing**: Direct link sharing for Stellar addresses and transaction hashes
- **Real-Time Data**: Live XLM balance updates and transaction status checking
- **Responsive Design**: Mobile-first responsive interface with dark/light theme

## Architecture

### System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Frontend Layer                          │
├────────────────────────────────────────────────────────────┤
│  index.html  │  style.css  │  JavaScript Modules           │
├──────────────┼─────────────┼───────────────────────────────┤
│              │             │ • stellarCrypto.js            │
│              │             │ • stellarBlockchainAPI.js     │
│              │             │ • stellarSearchDB.js          │
│              │             │ • lib.stellar.js              │
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
│  Stellar Network  │  FLO Network    │  Bitcoin Network      │
│  • Horizon API    │ • Address Gen   │ • Address Gen         │
│                   │ • Key Derivation│ • Key Derivation      │
│                   │ • ECDSA Keys    │ • ECDSA Keys          │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Cryptographic Engine (`stellarCrypto.js`)

Handles multi-chain address generation and private key management for Stellar, FLO, and BTC.

#### Key Functions

```javascript
// Generate multi-chain addresses from a private key
// Returns BTC, FLO, and XLM addresses with their private keys
async generateMultiChain(privateKey = null)

// Sign Stellar transaction with private key
// Returns signature for transaction
async signXlm(txBytes, xlmPrivateKey)
```

#### Supported Private Key Formats

- **Stellar**: 56-character base32 (StrKey) or 64-character hex (ED25519)
- **FLO**: 64-character hex or WIF format
- **BTC**: 64-character hex or WIF format

**Important**: Only compatible key types are supported for cross-chain operations. (ED25519 for Stellar, ECDSA for FLO/BTC)

### 2. Blockchain API Layer (`stellarBlockchainAPI.js`)

Handles all Stellar blockchain interactions via Horizon API, and supports multi-chain address and key management.

#### Core Functions

```javascript
// Balance retrieval (Stellar address)
async getBalance(address)

// Transaction history with pagination
async getTransactions(address, options = {})

// Transaction by hash lookup
async getTransaction(txHash)

// Build and sign transaction
async buildAndSignTransaction(params)

// Submit signed transaction to network
async submitTransaction(transactionXDR)

// Get transaction parameters (fees, network info)
async getTransactionParams(sourceAddress)

// Address validation
isValidAddress(address)
isValidSecret(secret)

// Utility functions
formatXLM(amount)
parseXLM(xlm)
isInitialized()
```

#### API Configuration

```javascript
const HORIZON_API = "https://horizon.stellar.org";
```

### 3. Data Persistence (`stellarSearchDB.js`)

IndexedDB wrapper for persistent storage of searched Stellar addresses and multi-chain metadata.

#### Database Schema

```sql
-- Object Store: searchedAddresses
{
	id: number (Auto-increment Primary Key),
	xlmAddress: string (Indexed),
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
	async saveSearchedAddress(xlmAddress, balance, timestamp, sourceInfo)
	async getSearchedAddresses()
	async deleteSearchedAddress(id)
	async clearAllSearchedAddresses()
}
```

## API Reference

### Wallet Generation

#### `generateWallet()`

Generates a new multi-chain wallet with random private keys for Stellar, FLO, and BTC.

**Returns:** Promise resolving to wallet object

```javascript
{
	XLM: {
		address: string,        // Stellar address
		privateKey: string     // Private key (StrKey or hex)
	},
	FLO: { address: string, privateKey: string },
	BTC: { address: string, privateKey: string }
}
```

### Address Recovery

#### `recoverWallet()`

Recovers wallet addresses from an existing private key (Stellar, FLO, or BTC).

**Parameters:**

- `privateKey` (string): Valid private key (format depends on chain)

**Validation:**

- Stellar: 56-char base32 or 64-char hex
- FLO/BTC: 64-char hex or WIF

**Returns:** Promise resolving to wallet object (same structure as generateWallet)

### Transaction Management

#### `getBalance(address)`

Retrieves balance and account information for a Stellar address.

**Returns:**
```javascript
{
  address: string,
  balance: number,
  balanceXlm: number,
  sequence: string,
  subentryCount: number,
  minBalance: number,
  balances: array,  // All balances including assets
  signers: array,
  flags: object,
  thresholds: object
}
```

#### `getTransactions(address, options)`

Retrieves transaction history with pagination support.

**Parameters:**
- `address` (string): Stellar address
- `options` (object): { limit, cursor, order }

**Returns:**
```javascript
{
  transactions: array,
  nextToken: string,
  hasMore: boolean,
  cursor: string
}
```

#### `buildAndSignTransaction(params)`

Builds and signs a transaction using Stellar SDK.

**Parameters:**
```javascript
{
  sourceAddress: string,
  destinationAddress: string,
  amount: number,
  secretKey: string,
  memo: string (optional)
}
```

**Returns:**
```javascript
{
  transaction: object,
  xdr: string,
  hash: string,
  destinationExists: boolean,
  fee: number
}
```

**Features:**
- Automatic account creation for new addresses (requires min 1 XLM)
- Dynamic fee estimation from network
- Memo support
- Automatic operation selection (payment vs create_account)

### Search Functionality

#### `handleSearch()`

Unified search handler supporting both Stellar address and transaction hash lookup.

**Search Types:**

- `address`: Loads balance and transaction history
  - Supports: Stellar addresses, Private keys
- `hash`: Retrieves transaction details from Stellar blockchain
  - Supports: Transaction hashes

#### URL Parameter Support

- `?address=G...` - Direct Stellar address loading
- `?hash=...` - Direct transaction hash loading

**URL Updates:**

- URLs update even for inactive addresses (for sharing)
- Browser history properly managed for back/forward navigation
- Clean URL structure without sensitive data

### Transaction Features

#### Transaction Filtering

Users can filter Stellar transaction history by type:

- **All Transactions**: Complete history
- **Received**: Incoming transfers only
- **Sent**: Outgoing transfers only

#### Transaction Details

Each Stellar transaction displays:

- Transaction Hash (with copy button)
- Ledger Sequence
- Timestamp
- Result Status
- Transaction Type
- Fee Charged (in XLM)
- Memo (if present)
- Transfer Details (all accounts involved)

#### Success Modal

After successful transaction:

- **Transaction Hash**: Full hash with copy button
- **Amount Sent**: Exact amount in XLM
- **From Address**: Full Stellar address with copy button
- **To Address**: Full Stellar address with copy button
- **Fee Used**: Actual fee charged
- **Explorer Link**: Direct link to Stellar Expert

## Security Features

### Private Key Handling

- **No Storage**: Private keys are never stored in any form
- **Memory Clearing**: Variables containing keys are nullified after use
- **Input Validation**: Strict format validation before processing
- **Error Handling**: Secure error messages without key exposure

### Transaction Security

- **Confirmation Modal**: User must confirm all transaction details
- **Balance Validation**: Prevents sending more than available balance
- **Fee Estimation**: Accurate fee calculation before sending
- **Error Details**: Clear error messages for failed transactions

## Performance Optimizations

### Smart Pagination

```javascript
// Initial load: Fetch 10 transactions
// Use Horizon API pagination links for next/previous
// Cache current page data for instant filtering
// Lazy load additional pages on demand

const transactionsPerPage = 10;
const historyData = await stellarAPI.getTransactions(address, {
  limit: transactionsPerPage,
  order: 'desc'  // newest first
});
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
- **Pagination**: Efficient data fetching with Horizon links

## Error Handling

### Address Validation Errors

```javascript
// Invalid format
"⚠️ Invalid address or private key format"

// Inactive account
"Address is inactive" (displayed in balance field)

// Invalid private key
"⚠️ Invalid private key format. Expected 56-char base32 or 64-char hex/WIF."
```

### Transaction Errors

```javascript
// Insufficient balance
showErrorModal("Insufficient Balance", message, detailedBreakdown);

// Fee estimation failed
("⚠️ Could not calculate exact fee, using estimate");

// Network errors
"❌ Error: " + error.message;
```

### Search Errors

```javascript
// Empty input
"⚠️ Please enter an address or private key";

// Invalid transaction hash
"⚠️ Invalid transaction hash format";

// API errors
"❌ Error: " + error.message;
```

## File Structure

```
stellarwallet/
├── index.html                 # Main application
├── style.css                  # Stylesheet
├── stellarCrypto.js           # Cryptographic functions
├── stellarBlockchainAPI.js    # Blockchain integration (Horizon)
├── stellarSearchDB.js         # Data persistence (IndexedDB)
├── lib.stellar.js             # External libraries
├── stellar_favicon.svg        # Application icon
└── README.md                  # This file
```

## Dependencies

### External Libraries (via lib.stellar.js)

- **Crypto Libraries**: Key generation and signing
- **Base58/Base32**: Address encoding/decoding
- **SHA256/RIPEMD160**: Hash functions for address derivation

### APIs

- **Stellar Horizon API**: Transaction history, balance, account info

---

