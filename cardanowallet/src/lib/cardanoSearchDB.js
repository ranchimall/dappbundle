/**
 * IndexedDB for storing searched Cardano addresses
 */
class CardanoSearchDB {
  constructor() {
    this.dbName = "CardanoWalletDB";
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
    cardanoAddress,
    balance,
    timestamp = Date.now(),
    sourceInfo = null,
    addresses = null
  ) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(cardanoAddress);
      getRequest.onsuccess = () => {
        const existingRecord = getRequest.result;
        let finalSourceInfo = sourceInfo;
        let finalAddresses = addresses;
        
        if (existingRecord && existingRecord.sourceInfo && !sourceInfo) {
          finalSourceInfo = existingRecord.sourceInfo;
        } else if (
          existingRecord &&
          existingRecord.sourceInfo &&
          sourceInfo === null
        ) {
          finalSourceInfo = existingRecord.sourceInfo;
        }
        
        // Preserve existing addresses if not provided
        if (existingRecord && existingRecord.addresses && !addresses) {
          finalAddresses = existingRecord.addresses;
        }
        
        const data = {
          address: cardanoAddress,
          balance,
          timestamp,
          formattedBalance: `${balance} ADA`,
          sourceInfo: finalSourceInfo,
          addresses: finalAddresses, // Store BTC, FLO, ADA addresses
        };
        const putRequest = store.put(data);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async updateBalance(
    cardanoAddress,
    balance,
    timestamp = Date.now()
  ) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(cardanoAddress);
      getRequest.onsuccess = () => {
        const existingRecord = getRequest.result;
        
        if (!existingRecord) {
          // If doesn't exist, save as new with basic info
          const data = {
            address: cardanoAddress,
            balance,
            timestamp,
            formattedBalance: `${balance} ADA`,
            sourceInfo: 'address',
            addresses: null,
          };
          const putRequest = store.put(data);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          // Update only balance and timestamp, preserve everything else
          existingRecord.balance = balance;
          existingRecord.timestamp = timestamp;
          existingRecord.formattedBalance = `${balance} ADA`;
          
          const putRequest = store.put(existingRecord);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        }
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

  async deleteSearchedAddress(cardanoAddress) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(cardanoAddress);
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

export default CardanoSearchDB;
