class SearchedAddressDB {
  constructor() {
    this.dbName = "TonWalletDB";
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
    tonAddress,
    balance,
    timestamp = Date.now(),
    sourceInfo = null
  ) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(tonAddress);
      getRequest.onsuccess = () => {
        const existingRecord = getRequest.result;
        let finalSourceInfo = sourceInfo;
        if (existingRecord && existingRecord.sourceInfo && !sourceInfo) {
          finalSourceInfo = existingRecord.sourceInfo;
        } else if (
          existingRecord &&
          existingRecord.sourceInfo &&
          sourceInfo === null
        ) {
          finalSourceInfo = existingRecord.sourceInfo;
        }
        const data = {
          address: tonAddress,
          balance,
          timestamp,
          formattedBalance: `${balance} TON`,
          sourceInfo: finalSourceInfo,
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

  async deleteSearchedAddress(tonAddress) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(tonAddress);
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

