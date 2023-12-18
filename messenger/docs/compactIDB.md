## upgradeDB Function

The `upgradeDB` function is used to upgrade an IndexedDB database to a new version. It allows creating and deleting object stores and indexes during the upgrade process.

### Function Parameters

- **dbName**: The name of the IndexedDB database to be upgraded.
- **createList**: An object specifying the object stores to create and their options. Each key represents the object store name, and the corresponding value is an object with optional `options` for the object store and `indexes` for creating indexes.
- **deleteList**: An array containing the names of object stores to be deleted during the upgrade.

### Function Logic

1. **Getting Current Version:** Retrieves the current version of the IndexedDB database using the `getDBversion` function.

2. **Opening a New Database:** Opens a new version of the IndexedDB database (version + 1).

3. **Upgrade Logic:** Handles the upgrade process inside the `onupgradeneeded` event. It creates new object stores and indexes based on the provided `createList` and deletes specified object stores from `deleteList`.

4. **Success and Error Handling:** Resolves with a success message when the upgrade is completed successfully. Rejects with an error message if there's an error in opening the IndexedDB.

### Return Value

- Returns a Promise that resolves with a success message when the database upgrade is completed successfully.

### Example Usage

- In this example, the upgradeDB function is used to upgrade the 'exampleDB' IndexedDB. It creates new object stores ('users' and 'posts') with specified options and indexes, and it deletes the 'oldStore' object store.

```javascript
const dbName = 'exampleDB';
const createList = {
    'users': {
        options: { keyPath: 'id', autoIncrement: true },
        indexes: { 'username': 'username' }
    },
    'posts': {
        options: { keyPath: 'postId', autoIncrement: true },
        indexes: { 'author': 'authorId' }
    }
};
const deleteList = ['oldStore'];

upgradeDB(dbName, createList, deleteList)
    .then(result => console.log(result))
    .catch(error => console.error(error));
// Output: Database upgraded
```

## compactIDB.initDB Function

The `compactIDB.initDB` function is used to initialize an IndexedDB database with specified object stores. It checks the existing object stores in the database and creates new ones and deletes unwanted ones based on the provided `objectStores` parameter.

### Function Parameters

- **dbName**: The name of the IndexedDB database to be initialized.
- **objectStores**: An object specifying the object stores to be created. Each key represents the object store name, and the corresponding value is an object with optional `options` for the object store.

### Function Logic

1. **Opening Existing Database:** Opens the existing IndexedDB database specified by `dbName`.

2. **Object Store Handling:** Compares the existing object stores with the specified `objectStores`. It creates new object stores that are not present in the database and deletes object stores that are not specified in `objectStores`.

3. **Upgrade Process:** Uses the `upgradeDB` function to handle the upgrade process, creating new object stores and deleting unwanted object stores.

4. **Success and Error Handling:** Resolves with a success message when the database initialization is completed successfully. Rejects with an error message if there's an error in opening the IndexedDB.

### Return Value

- Returns a Promise that resolves with a success message when the database initialization is completed successfully.

### Example Usage

- In this example, the compactIDB.initDB function is used to initialize the 'exampleDB' IndexedDB. It creates new object stores ('users' and 'posts') with specified options and indexes.

```javascript
const dbName = 'exampleDB';
const objectStores = {
    'users': {
        options: { keyPath: 'id', autoIncrement: true },
        indexes: { 'username': 'username' }
    },
    'posts': {
        options: { keyPath: 'postId', autoIncrement: true },
        indexes: { 'author': 'authorId' }
    }
};

compactIDB.initDB(dbName, objectStores)
    .then(result => console.log(result))
    .catch(error => console.error(error));
// Output: Initiated IndexedDB
```

## compactIDB.openDB Function

The `compactIDB.openDB` function is used to open an IndexedDB database for performing database operations.

### Function Parameters

- **dbName** (Optional): The name of the IndexedDB database to open. If not provided, the default database specified during initialization is used.

### Function Logic

1. **Opening Database:** Attempts to open the specified IndexedDB database (`dbName`).

2. **Error Handling:** If there's an error in opening the database, the function rejects the promise with an error message indicating the failure.

3. **Upgradeneeded Event:** If an "upgradeneeded" event is triggered during the database opening process, the function closes the existing database, deletes the database using `deleteDB` function, and rejects the promise with a message indicating that the database was not found.

4. **Success Event:** If the database is successfully opened, the function resolves with the opened database object for performing further database operations.

### Return Value

- Returns a Promise that resolves with the opened IndexedDB database object or rejects with an error message if there's an issue opening the database.

### Example Usage

```javascript
const dbName = 'myDatabase';

compactIDB.openDB(dbName)
    .then(database => {
        // Perform database operations using the 'database' object.
        console.log(`Successfully opened database: ${dbName}`);
    })
    .catch(error => {
        console.error(`Error opening database: ${error}`);
    });
// Output: Successfully opened database: myDatabase

// Opens the 'myDatabase' IndexedDB database and performs operations inside the 'then' block.
```

## compactIDB.deleteDB Function

The `compactIDB.deleteDB` function is used to delete an existing IndexedDB database.

### Function Parameters

- **dbName** (Optional): The name of the IndexedDB database to be deleted. If not provided, the default database specified during initialization is used.

### Function Logic

1. **Deleting Database:** Initiates a request to delete the specified IndexedDB database (`dbName`).

2. **Error Handling:** If there's an error during the deletion process, the function rejects the promise with an error message indicating the failure.

3. **Success Event:** If the database is successfully deleted, the function resolves with a success message indicating that the database was deleted successfully.

### Return Value

- Returns a Promise that resolves with a success message if the database is deleted successfully or rejects with an error message if there's an issue deleting the database.

### Example Usage

```javascript
const dbName = 'myDatabase';

compactIDB.deleteDB(dbName)
    .then(message => {
        console.log(message); // Output: Database deleted successfully
    })
    .catch(error => {
        console.error(`Error deleting database: ${error}`);
    });
// Output: Database deleted successfully

// Deletes the 'myDatabase' IndexedDB database and logs a success message if the deletion is successful.
```


## compactIDB.writeData Function

The `compactIDB.writeData` function is used to write data to a specified object store in the IndexedDB. It allows adding or updating data records in the specified object store.

### Function Parameters

- **obsName**: The name of the object store where the data will be written.
- **data**: The data to be written to the object store.
- **key** (Optional): The key to identify the data record. If provided, the function updates the existing record with the specified key. If not provided, a new record is added to the object store.
- **dbName** (Optional): The name of the IndexedDB database where the object store is located. If not provided, the default database specified during initialization is used.

### Function Logic

1. **Opening Database:** Opens the specified IndexedDB database (`dbName`).

2. **Transaction and Object Store:** Starts a read-write transaction on the specified object store (`obsName`).

3. **Writing Data:** Writes the provided `data` to the object store. If a `key` is provided, it updates the existing record; otherwise, it adds a new record.

4. **Success and Error Handling:** Resolves with a success message when the data writing is successful. Rejects with an error message if there's an error during the write operation.

### Return Value

- Returns a Promise that resolves with a success message when the data writing is completed successfully.

### Example Usage

```javascript
const obsName = 'users';
const data = { id: 1, name: 'John Doe', email: 'john@example.com' };

compactIDB.writeData(obsName, data, 1)
    .then(result => console.log(result))
    .catch(error => console.error(error));
// Output: Write data Successful

// Updating an existing record with key 1 in the 'users' object store.
```

## compactIDB.addData Function

The `compactIDB.addData` function is used to add new data records to a specified object store in the IndexedDB. It allows adding data records with unique keys, ensuring no duplicate records with the same key are added.

### Function Parameters

- **obsName**: The name of the object store where the data will be added.
- **data**: The data to be added to the object store.
- **key** (Optional): The key to identify the new data record. If provided and a record with the same key already exists, the function fails, ensuring the uniqueness of the key. If not provided, the function generates a unique key for the new record.
- **dbName** (Optional): The name of the IndexedDB database where the object store is located. If not provided, the default database specified during initialization is used.

### Function Logic

1. **Opening Database:** Opens the specified IndexedDB database (`dbName`).

2. **Transaction and Object Store:** Starts a read-write transaction on the specified object store (`obsName`).

3. **Adding Data:** Adds the provided `data` to the object store. If a `key` is provided and a record with the same key already exists, the add operation fails. If no `key` is provided, the function generates a unique key for the new record.

4. **Success and Error Handling:** Resolves with a success message when the data addition is successful. Rejects with an error message if there's an error during the add operation, such as attempting to add a duplicate record with an existing key.

### Return Value

- Returns a Promise that resolves with a success message when the data addition is completed successfully.

### Example Usage

```javascript
const obsName = 'users';
const data = { id: 2, name: 'Alice Smith', email: 'alice@example.com' };

compactIDB.addData(obsName, data, 2)
    .then(result => console.log(result))
    .catch(error => console.error(error));
// Output: Add data successful

// Adding a new record with key 2 to the 'users' object store.
```

## compactIDB.removeData Function

The `compactIDB.removeData` function is used to remove a data record from a specified object store in the IndexedDB based on its key.

### Function Parameters

- **obsName**: The name of the object store from which the data record will be removed.
- **key**: The key of the data record that needs to be removed from the object store.
- **dbName** (Optional): The name of the IndexedDB database where the object store is located. If not provided, the default database specified during initialization is used.

### Function Logic

1. **Opening Database:** Opens the specified IndexedDB database (`dbName`).

2. **Transaction and Object Store:** Starts a read-write transaction on the specified object store (`obsName`).

3. **Removing Data:** Removes the data record with the provided `key` from the object store.

4. **Success and Error Handling:** Resolves with a success message, including the removed key, when the removal is successful. Rejects with an error message if there's an error during the delete operation, such as attempting to remove a non-existent record.

### Return Value

- Returns a Promise that resolves with a success message, including the removed key, when the removal is completed successfully.

### Example Usage

- In this example, the compactIDB.removeData function is used to remove the data record with key 2 from the 'users' object store in the IndexedDB.

```javascript
const obsName = 'users';
const key = 2;

compactIDB.removeData(obsName, key)
    .then(result => console.log(result))
    .catch(error => console.error(error));
// Output: Removed Data 2

// Removes the data record with key 2 from the 'users' object store.
```

## compactIDB.clearData Function

The `compactIDB.clearData` function is used to clear all data records from a specified object store in the IndexedDB.

### Function Parameters

- **obsName**: The name of the object store from which all data records will be cleared.
- **dbName** (Optional): The name of the IndexedDB database where the object store is located. If not provided, the default database specified during initialization is used.

### Function Logic

1. **Opening Database:** Opens the specified IndexedDB database (`dbName`).

2. **Transaction and Object Store:** Starts a read-write transaction on the specified object store (`obsName`).

3. **Clearing Data:** Removes all data records from the object store, effectively clearing it.

4. **Success and Error Handling:** Resolves with a success message when the clear operation is successful. Rejects with an error message if there's an error during the clear operation.

### Return Value

- Returns a Promise that resolves with a success message when the clear operation is completed successfully.

### Example Usage

```javascript
const obsName = 'users';

compactIDB.clearData(obsName)
    .then(result => console.log(result))
    .catch(error => console.error(error));
// Output: Clear data Successful

// Clears all data records from the 'users' object store.
```

## compactIDB.readData Function

The `compactIDB.readData` function is used to read a specific data record from an object store in the IndexedDB.

### Function Parameters

- **obsName**: The name of the object store from which the data record will be read.
- **key**: The key of the specific data record to be retrieved from the object store.
- **dbName** (Optional): The name of the IndexedDB database where the object store is located. If not provided, the default database specified during initialization is used.

### Function Logic

1. **Opening Database:** Opens the specified IndexedDB database (`dbName`).

2. **Transaction and Object Store:** Starts a read-only transaction on the specified object store (`obsName`).

3. **Reading Data:** Retrieves the data record corresponding to the provided key from the object store.

4. **Success and Error Handling:** Resolves with the retrieved data record when the read operation is successful. Rejects with an error message if there's an error during the read operation.

### Return Value

- Returns a Promise that resolves with the retrieved data record when the read operation is completed successfully.

### Example Usage

```javascript
const obsName = 'users';
const userID = 123;

compactIDB.readData(obsName, userID)
    .then(data => console.log(data))
    .catch(error => console.error(error));
// Output: { id: 123, name: 'John Doe', ... }

// Retrieves the data record with the key 123 from the 'users' object store.
```

## compactIDB.readAllData Function

The `compactIDB.readAllData` function is used to retrieve all data records from an object store in the IndexedDB.

### Function Parameters

- **obsName**: The name of the object store from which all data records will be retrieved.
- **dbName** (Optional): The name of the IndexedDB database where the object store is located. If not provided, the default database specified during initialization is used.

### Function Logic

1. **Opening Database:** Opens the specified IndexedDB database (`dbName`).

2. **Transaction and Object Store:** Starts a read-only transaction on the specified object store (`obsName`).

3. **Reading All Data:** Iterates over the object store using a cursor and collects all data records into a temporary result object.

4. **Success and Error Handling:** Resolves with the temporary result object containing all data records when the read operation is successful. Rejects with an error message if there's an error during the read operation.

### Return Value

- Returns a Promise that resolves with an object containing all retrieved data records when the read operation is completed successfully.

### Example Usage

```javascript
const obsName = 'users';

compactIDB.readAllData(obsName)
    .then(data => console.log(data))
    .catch(error => console.error(error));
// Output: { 123: { id: 123, name: 'John Doe', ... }, 124: { id: 124, name: 'Jane Smith', ... }, ... }

// Retrieves all data records from the 'users' object store and logs the result.
```

