# Cardano Web Wallet - Technical Documentation


## Overview

The Cardano Multi-Chain Wallet is a web-based cryptocurrency wallet that supports multiple blockchain networks including Cardano (ADA), FLO, and Bitcoin (BTC). The wallet provides comprehensive functionality for address generation, transaction management, balance checking, and transaction history viewing with a focus on Cardano blockchain integration.

### Key Features
- **Multi-Chain Support**: ADA, FLO, and BTC address generation from a single private key
- **Transaction History**: Paginated transaction viewing with smart caching and filtering
- **Address Search**: Persistent search history with IndexedDB storage
- **URL Sharing**: Direct link sharing for addresses and transaction hashes
- **Real-Time Data**: Live balance updates and transaction status checking
- **Responsive Design**: Mobile-first responsive interface with dark/light theme support
- **CIP-1852 Compliance**: Standard Cardano derivation path for wallet compatibility


## Architecture

### System Architecture
```
┌────────────────────────────────────────────────────────────┐
│                    Frontend Layer                          │
├────────────────────────────────────────────────────────────┤
│  index.html  │  style.css  │  JavaScript Modules           │
├──────────────┼─────────────┼───────────────────────────────┤
│              │             │ • cardanoCrypto.js            │
│              │             │ • cardanoBlockchainAPI.js     │
│              │             │ • cardanoSearchDB.js          │
│              │             │ • main.js                     │
│              │             │ • lib.cardano.js              │
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
│  Cardano Mainnet  │  FLO Network    │  Bitcoin Network      │
│  • Ogmios RPC     │ • Address Gen   │ • Address Gen         │
│  • CardanoScan API│ • Key Derivation│ • Key Derivation      │
│  • UTXO Query     │                 │                       │
│  • Transaction    │                 │                       │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Cryptographic Engine (`cardanoCrypto.js`)

The cryptographic engine handles multi-chain address generation and key management using CIP-1852 derivation standards.

#### Key Functions
```javascript
// Generate multi-chain addresses from private key
async generateWallet()

// Import from BTC/FLO private key or ADA Root Key
async importFromKey(input)

// Import from BTC/FLO and generate ADA Root Key
async importFromBtcFlo(key)

// Import from ADA Root Key (128-byte hex)
async importFromRootKey(rootKeyHex)

// Get spend private key for transaction signing
async getSpendPrivateKey(rootKeyHex)
```

#### Supported Private Key Formats
- **ADA Root Key**: 256-character hexadecimal (128 bytes)
- **BTC/FLO**: WIF format (51-52 characters, Base58 encoded)
- **Hex Private Key**: 64-character hexadecimal (32 bytes)

#### Derivation Path
The wallet uses the **CIP-1852** standard derivation path:
- **Spending Key**: `m/1852'/1815'/0'/0/0`
- **Staking Key**: `m/1852'/1815'/0'/2/0`

This ensures compatibility with other Cardano wallets like Daedalus, Yoroi, and Nami.

#### Address Generation Process
```
BTC/FLO Private Key (32 bytes)
         ↓
Extended Key (64 bytes) - Duplicate private key
         ↓
SHA-512 Hash → Second Half (64 bytes)
         ↓
ADA Root Key (128 bytes) - Combine extended key + hash
         ↓
CIP-1852 Derivation → Spend Key + Stake Key
         ↓
Blake2b-256 Hashing → Payment Hash + Stake Hash
         ↓
Bech32 Encoding → Cardano Address (addr1...)
```


### 2. Blockchain API Layer (`cardanoBlockchainAPI.js`)

Handles all blockchain interactions using dual API architecture for optimal performance and reliability.

#### API Architecture
- **Ogmios RPC**: UTXO queries, protocol parameters, transaction submission
- **CardanoScan API**: Balance queries, transaction history, transaction details

#### Core Functions
```javascript
// Balance retrieval (CardanoScan)
async getBalance(address)

// Transaction history with pagination (CardanoScan)
async getHistory(address, pageNo, limit, order)

// Transaction details by hash (CardanoScan)
async getTransaction(hash)

// UTXO retrieval (Ogmios)
async getUtxos(address)

// Protocol parameters (Ogmios)
async getProtocolParameters()

// Current blockchain slot (Ogmios)
async getCurrentSlot()

// Fee estimation
async estimateFee(senderAddress, recipientAddress, amountLovelace)

// Send ADA transaction
async sendAda(senderPrivKeyHex, senderAddress, recipientAddress, amountLovelace)
```

#### RPC Configuration
```javascript
// Ogmios JSON-RPC endpoint (GetBlock)
const rpcUrl = "https://go.getblock.io/.../ext/bc/C/rpc";

// CardanoScan API
const cardanoscanBaseUrl = "https://api.cardanoscan.io/api/v1";
```

#### Transaction Building Process
```
1. Fetch UTXOs (Ogmios)
2. Fetch Protocol Parameters (Ogmios)
3. Get Current Slot for TTL (Ogmios)
4. Select Inputs (Coin Selection)
5. Build Transaction Body
6. Calculate Fees (Linear Fee Formula)
7. Add Change Output
8. Sign Transaction (Ed25519)
9. Submit to Network (Ogmios)
```

#### Fee Calculation
Cardano uses a linear fee formula:
```
fee = a × size + b

Where:
- a = minFeeCoefficient (typically 44)
- b = minFeeConstant (typically 155,381 lovelace)
- size = transaction size in bytes
```


### 3. Data Persistence (`cardanoSearchDB.js`)

IndexedDB wrapper for persistent storage of searched addresses and metadata.

#### Database Schema
```javascript
// Database: CardanoWalletDB
// Object Store: searchedAddresses
{
  address: string (Primary Key),           // Cardano address
  balance: number,                         // Balance in ADA
  timestamp: number (Indexed),             // Last updated timestamp
  formattedBalance: string,                // "X.XXXXXX ADA"
  sourceInfo: string | null,               // 'address', 'btc-key', 'flo-key', etc.
  addresses: {                             // Multi-chain addresses
    BTC: { address, privateKey },
    FLO: { address, privateKey },
    Cardano: { address, rootKey, ... }
  } | null
}
```

#### API Methods
```javascript
class CardanoSearchDB {
  async init()
  async saveSearchedAddress(cardanoAddress, balance, timestamp, sourceInfo, addresses)
  async updateBalance(cardanoAddress, balance, timestamp)
  async getSearchedAddresses()
  async deleteSearchedAddress(cardanoAddress)
  async clearAllSearchedAddresses()
}
```


### 4. Main Application (`main.js`)

Central controller managing UI interactions, wallet operations, and transaction flows.

#### Key Features
- **Wallet Generation**: Create new multi-chain wallets
- **Wallet Recovery**: Restore from private keys
- **Transaction Management**: Send ADA with fee estimation
- **Search Functionality**: Address and transaction hash lookup
- **URL Parameter Support**: Direct linking to addresses/transactions
- **Theme Management**: Dark/light mode with persistence
- **Input Validation**: Comprehensive validation for all inputs


## API Reference

### Wallet Generation

#### `generateWallet()`
Generates a new multi-chain wallet with random private keys.

**Returns:** Promise resolving to wallet object
```javascript
{
  BTC: { address: string, privateKey: string },
  FLO: { address: string, privateKey: string },
  Cardano: { 
    address: string,              // Bech32 address (addr1...)
    rootKey: string,              // 128-byte hex
    spendKeyBech32: string,       // Bech32 encoded spend key
    stakeKeyBech32: string        // Bech32 encoded stake key
  },
  cardanoRootKey: string,         // 128-byte hex (for backup)
  originalKey: string             // 32-byte hex (original BTC/FLO key)
}
```

### Address Recovery

#### `importFromKey(input)`
Recovers wallet addresses from an existing private key.

**Parameters:**
- `input` (string): Valid ADA Root Key (256 hex), BTC/FLO WIF, or hex private key

**Returns:** Promise resolving to wallet object (same structure as generateWallet)

**Auto-Detection:**
- 256 hex chars → ADA Root Key import
- 51-52 chars Base58 → BTC/FLO WIF import
- 64 hex chars → Hex private key import

### Transaction Management

#### `searchTransactions(page)`
Loads transaction history for a given address with smart pagination and filtering.

**Process Flow:**
1. Input validation (address/private key/transaction hash)
2. Address derivation (if private key provided)
3. Balance retrieval (CardanoScan API)
4. Transaction history fetching (paginated, 10 per page)
5. Filter application (All/Received/Sent)
6. Pagination setup
7. UI updates and data persistence

**Supported Filters:**
- **All**: Show all transactions
- **Received**: Only incoming transactions (positive netAmount)
- **Sent**: Only outgoing transactions (negative netAmount)

#### `sendAda()`
Prepares and broadcasts a transaction to the Cardano network.

**Parameters:**
- `senderPrivKeyHex` (string): Sender's private key (64-byte hex)
- `senderAddress` (string): Sender's Cardano address
- `recipientAddress` (string): Recipient's Cardano address
- `amountLovelace` (string): Amount in Lovelace (1 ADA = 1,000,000 Lovelace)

**Process:**
```
Input Validation → Fee Estimation → User Confirmation → 
UTXO Selection → Transaction Building → Signing → Broadcast
```

**Validations:**
- Minimum UTXO value check (~1 ADA)
- Sufficient balance verification
- Address format validation
- TTL (Time-To-Live) calculation (2 hours from current slot)

### Search Functionality

#### `handleSearch()`
Unified search handler supporting both address and transaction hash lookup.

**Search Types:**
- `address`: Loads balance and transaction history
- `hash`: Retrieves transaction details from blockchain

**Input Auto-Detection:**
- Cardano address: `addr1...` (50+ characters)
- Private key: 64/256 hex, or WIF format
- Transaction hash: 64 hex characters

#### URL Parameter Support
- `?address=addr1...` - Direct address loading
- `?hash=0x...` - Direct transaction hash loading


## Security Features

### Private Key Handling
- **No Storage**: Private keys are never stored in any form (localStorage, IndexedDB, etc.)
- **Memory Clearing**: Variables containing keys are nullified after use
- **Input Validation**: Strict format validation before processing
- **Error Handling**: Secure error messages without key exposure
- **Local Processing**: All cryptographic operations happen client-side

### URL Security
- **Address-Only URLs**: Only public addresses included in shareable URLs
- **No Private Data**: Private keys never included in URL parameters
- **State Management**: Secure browser history handling

### Transaction Security
- **Confirmation Modal**: User must confirm all transaction details
- **Fee Display**: Clear display of network fees before sending
- **Irreversibility Warning**: Users are warned that transactions cannot be reversed
- **Balance Verification**: Ensures sufficient funds before broadcasting


## Performance Optimizations

### Smart Pagination
```javascript
// Initial load: Fetch 10 transactions per page
// Navigate between pages with cached data
// Filter transactions client-side for instant response

const PAGE_LIMIT = 10;
const transactions = await getHistory(address, currentPage, PAGE_LIMIT);
```

### Caching Strategy
- **Transaction Cache**: Store transaction data for fast pagination
- **Balance Cache**: Cache balance data in IndexedDB with timestamps
- **Address History**: Persistent search history with last updated time
- **Protocol Parameters**: Cache protocol params to reduce RPC calls

### UI Optimizations
- **Lazy Loading**: Progressive content loading
- **Debounced Inputs**: Prevent excessive API calls
- **Responsive Images**: Optimized for mobile devices
- **CSS Grid/Flexbox**: Efficient layout rendering
- **Loading States**: Clear feedback during async operations


## File Structure
```
cardano-wallet/
├── index.html                          # Main application HTML
├── lib.cardano.js                      # External libraries (Bitcoin.js, Cardano libs)
├── vite.config.js                      # Vite build configuration
├── package.json                        # Dependencies
├── src/
│   ├── main.js                         # Main application controller
│   ├── style.css                       # Application styles
│   └── lib/
│       ├── cardanoCrypto.js            # Cryptographic functions
│       ├── cardanoBlockchainAPI.js     # Blockchain integration
│       └── cardanoSearchDB.js          # Data persistence
├── public/                             # Static assets
└── dist/                               # Production build output
```


## Dependencies

### Core Libraries
- **@emurgo/cardano-serialization-lib-browser**: Transaction building and signing
- **cardano-crypto.js**: Key derivation and cryptographic operations
- **bech32**: Address encoding/decoding
- **buffer**: Node.js Buffer polyfill for browser

### Build Tools
- **Vite**: Fast build tool and dev server
- **@vitejs/plugin-node-polyfills**: Node.js polyfills for browser


