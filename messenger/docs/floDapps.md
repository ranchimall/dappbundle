## readSupernodeListFromAPI Function

The `readSupernodeListFromAPI` function is a startup function used to fetch and update the list of supernodes from the Flo blockchain API. It reads supernode data from the blockchain, processes the data, and updates the list of supernodes stored in the local database.

### Function Logic

1. Checks if cloud functionality is enabled for the application. If not, it resolves with "No cloud for this app".
2. Reads the last transaction count or transaction ID from the local database for the cloud storage.
3. Fetches supernode data from the Flo blockchain using the specified query options.
4. Compares the fetched data with the local list of supernodes, updating or removing nodes as necessary.
5. Writes the updated supernode list and the last transaction information to the local database.
6. Initializes the `floCloudAPI` with the updated supernode list.

### Return Value

- Returns a Promise that resolves with a success message upon successful loading and initialization of the supernode list.

### Example Usage

- This function is typically called during the startup process of the application to ensure that the local list of supernodes is up-to-date.

- In this example, the readSupernodeListFromAPI function updates the local list of supernodes based on the data fetched from the Flo blockchain. It resolves with a success message after successfully loading and initializing the supernode list.

```javascript
startUpFunctions.push(function readSupernodeListFromAPI() {
    // Function logic as described above
    // ...
    return new Promise((resolve, reject) => {
        // Resolving or rejecting based on success or error
        // ...
    });
});
```

## readAppConfigFromAPI Function

The `readAppConfigFromAPI` function is a startup function used to fetch and update the application configuration from the Flo blockchain API. It reads application configuration data from the blockchain, processes the data, and updates the local database with sub-admins, trusted IDs, and settings.

### Function Logic

1. Checks if application configuration functionality is enabled for the application. If not, it resolves with "No configs for this app".
2. Reads the last transaction count or transaction ID for the specified application and admin ID from the local database.
3. Fetches application configuration data from the Flo blockchain using the specified query options.
4. Processes the fetched data, updating sub-admins, trusted IDs, and settings in the local database.
5. Resolves with a success message after successfully reading the app configuration from the blockchain.

### Return Value

- Returns a Promise that resolves with a success message upon successful reading and updating of the application configuration.

### Example Usage

- This function is typically called during the startup process of the application to ensure that the local application configuration is synchronized with the data on the blockchain.

- In this example, the readAppConfigFromAPI function updates the local application configuration based on the data fetched from the Flo blockchain. It resolves with a success message after successfully reading and updating the application configuration.

```javascript
startUpFunctions.push(function readAppConfigFromAPI() {
    // Function logic as described above
    // ...
    return new Promise((resolve, reject) => {
        // Resolving or rejecting based on success or error
        // ...
    });
});
```

## loadDataFromAppIDB Function

The `loadDataFromAppIDB` function is a startup function used to load data from the IndexedDB (IDB) storage of the application. It reads specific data sets (`appObjects`, `generalData`, and `lastVC`) from the local IndexedDB and stores them in the respective global variables of the `floGlobals` object.

### Function Logic

1. Checks if cloud functionality is enabled for the application. If not, it resolves with "No cloud for this app".
2. Defines an array `loadData` containing the names of the data sets to be loaded from IndexedDB (`appObjects`, `generalData`, `lastVC`).
3. Iterates through the `loadData` array and creates an array of promises to read all data from each data set in IndexedDB.
4. Uses `Promise.all` to wait for all data reading operations to complete.
5. Assigns the retrieved data to the respective properties of the `floGlobals` object.
6. Resolves with a success message after successfully loading data from IndexedDB.

### Return Value

- Returns a Promise that resolves with a success message upon successful loading of data from IndexedDB.

### Example Usage

- This function is typically called during the startup process of the application to load essential data sets from the local IndexedDB storage.
- In this example, the loadDataFromAppIDB function loads specific data sets from the IndexedDB storage and assigns them to global variables within the floGlobals object. It resolves with a success message after successfully loading the data.

```javascript
startUpFunctions.push(function loadDataFromAppIDB() {
    // Function logic as described above
    // ...
    return new Promise((resolve, reject) => {
        // Resolving or rejecting based on success or error
        // ...
    });
});
```

## callStartUpFunction Function

The `callStartUpFunction` function is a utility function used for executing startup functions sequentially. It takes an index `i` as an argument, which represents the index of the startup function to be executed. This function returns a Promise that resolves when the specified startup function is successfully executed or rejects if there is an error during execution.

### Function Parameters

- **i**: Index of the startup function to be executed.

### Function Logic

1. Takes an index `i` as an argument representing the index of the startup function to be executed.
2. Executes the startup function at the specified index.
3. If the startup function execution is successful, it increments the `callStartUpFunction.completed` counter and logs the result as a successful startup function execution.
4. If the startup function encounters an error, it increments the `callStartUpFunction.failed` counter and logs the error message as a failed startup function execution.
5. Returns a Promise that resolves with `true` when the startup function is successfully executed and rejects with `false` if there is an error during execution.

### Return Value

- Returns a Promise that resolves with `true` if the startup function is executed successfully and rejects with `false` if there is an error during execution.

### Example Usage

- The `callStartUpFunction` function is typically used in a loop to sequentially execute multiple startup functions.
- In this example, the callStartUpFunction function is used to execute startup functions sequentially and handle success and error cases for each function execution.

```javascript
const callStartUpFunction = i => new Promise((resolve, reject) => {
    startUpFunctions[i]().then(result => {
        callStartUpFunction.completed += 1;
        startUpLog(true, `${result}\nCompleted ${callStartUpFunction.completed}/${callStartUpFunction.total} Startup functions`)
        resolve(true)
    }).catch(error => {
        callStartUpFunction.failed += 1;
        startUpLog(false, `${error}\nFailed ${callStartUpFunction.failed}/${callStartUpFunction.total} Startup functions`)
        reject(false)
    })
});
```

## midStartUp Function

The `midStartUp` function is a utility function used for executing a middle-stage startup function. It checks if the `_midFunction` variable contains a function reference. If `_midFunction` is a function, it executes `_midFunction()`, and the function resolves with a success message. If `_midFunction` is not a function, the function resolves with a message indicating that there is no middle-stage startup function.

### Function Logic

1. Checks if `_midFunction` is a function.
2. If `_midFunction` is a function, it executes `_midFunction()` and resolves with a success message.
3. If `_midFunction` is not a function, it resolves with a message indicating that there is no middle-stage startup function.

### Return Value

- Returns a Promise that resolves with a success message if the middle-stage startup function is executed successfully.
- Returns a Promise that resolves with a message indicating that there is no middle-stage startup function if `_midFunction` is not a function.

### Example Usage

- The `midStartUp` function is typically used to execute a specific function during the middle stage of the application startup process.

```javascript
const midStartUp = () => new Promise((res, rej) => {
    if (_midFunction instanceof Function) {
        _midFunction()
            .then(r => res("Mid startup function completed"))
            .catch(e => rej("Mid startup function failed"))
    } else
        res("No mid startup function")
});
```

## floDapps.launchStartUp Function

The `floDapps.launchStartUp` function is a central startup function responsible for initializing and launching various components of the application. It ensures the setup of the IndexedDB, executes a series of startup functions, and handles the initialization of user-related databases and credentials.

### Function Logic

1. **IndexedDB Initialization:** The function initializes the IndexedDB for the application.

2. **Startup Functions Execution:** Executes a list of startup functions (`startUpFunctions`) using the `callStartUpFunction` function. It logs the progress of the startup functions, indicating completion or failure.

3. **Middle-Stage Startup:** Executes the `midStartUp` function, if available. This function typically handles middle-stage startup tasks.

4. **User Database and Credentials:** Calls `getCredentials` to retrieve user credentials, initializes the user database using `initUserDB`, and loads user data using `loadUserDB`.

5. **Promise Handling:** The function uses promises to manage the asynchronous tasks and resolves with a success message if all tasks are completed successfully. If any task fails, it rejects with an error message.

### Return Value

- Returns a Promise that resolves with a success message when the entire startup process is finished successfully.
- Returns a Promise that rejects with an error message if any part of the startup process fails.

### Example Usage

```javascript
floDapps.launchStartUp()
    .then(result => {
        console.log(result); // Output: 'App Startup finished successful'
        // Further application logic after successful startup
    })
    .catch(error => {
        console.error(error); // Output: 'App Startup failed'
        // Handle error and provide user feedback
    });
```

## floDapps.manageAppConfig Function

The `floDapps.manageAppConfig` function allows the administrator to manage the application configuration. It enables adding or removing sub-administrators and updating application-specific settings.

### Function Parameters

- **adminPrivKey**: Private key of the administrator for authentication.
- **addList**: An array of FloIDs to be added as sub-administrators. (Optional)
- **rmList**: An array of FloIDs to be removed from sub-administrators. (Optional)
- **settings**: An object containing application-specific settings. (Optional)

### Function Logic

1. **Parameter Validation:** Validates the input parameters. If no changes are provided (addList, rmList, or settings), the function rejects with a message indicating no configuration change.

2. **FloData Preparation:** Prepares the `floData` object containing the application configuration changes, including added sub-administrators, removed sub-administrators, and updated settings.

3. **Admin Privilege Check:** Checks if the provided `adminPrivKey` matches the default admin ID (`DEFAULT.adminID`). If not, it rejects with an "Access Denied" error.

4. **Blockchain Data Writing:** Uses `floBlockchainAPI.writeData` to write the updated `floData` to the Flo blockchain. Resolves with a success message and the transaction result if successful. Rejects with an error message if the write operation fails.

### Return Value

- Returns a Promise that resolves with an array containing the success message ("Updated App Configuration") and the transaction result from the blockchain write operation.
- Returns a Promise that rejects with an error message if any of the following conditions are met:
  - No configuration change is provided.
  - The provided `adminPrivKey` does not match the default admin ID (`DEFAULT.adminID`).

### Example Usage

```javascript
const adminPrivKey = 'your_admin_private_key';
const addList = ['sub_admin_floID_1', 'sub_admin_floID_2'];
const rmList = ['sub_admin_floID_3'];
const settings = {
    key: 'value',
    // additional application-specific settings
};

floDapps.manageAppConfig(adminPrivKey, addList, rmList, settings)
    .then(result => {
        console.log(result[0]); // Output: 'Updated App Configuration'
        console.log(result[1]); // Output: Transaction result from blockchain write operation
        // Further application logic after successful configuration update
    })
    .catch(error => {
        console.error(error); // Output: Error message if configuration update fails
        // Handle error and provide user feedback
    });
```

## floDapps.manageAppTrustedIDs Function

The `floDapps.manageAppTrustedIDs` function allows the administrator to manage trusted IDs for the application. It enables adding or removing trusted IDs.

### Function Parameters

- **adminPrivKey**: Private key of the administrator for authentication.
- **addList**: An array of FloIDs to be added as trusted IDs. (Optional)
- **rmList**: An array of FloIDs to be removed from trusted IDs. (Optional)

### Function Logic

1. **Parameter Validation:** Validates the input parameters. If no changes are provided (addList or rmList), the function rejects with a message indicating no change in the list.

2. **FloData Preparation:** Prepares the `floData` object containing the trusted ID changes, including added trusted IDs and removed trusted IDs.

3. **Admin Privilege Check:** Checks if the provided `adminPrivKey` matches the default admin ID (`DEFAULT.adminID`). If not, it rejects with an "Access Denied" error.

4. **Blockchain Data Writing:** Uses `floBlockchainAPI.writeData` to write the updated `floData` to the Flo blockchain. Resolves with a success message and the transaction result if successful. Rejects with an error message if the write operation fails.

### Return Value

- Returns a Promise that resolves with an array containing the success message ("Updated App Configuration") and the transaction result from the blockchain write operation.
- Returns a Promise that rejects with an error message if no change is provided in the list or if the provided `adminPrivKey` does not match the default admin ID (`DEFAULT.adminID`).

### Example Usage

```javascript
const adminPrivKey = 'your_admin_private_key';
const addList = ['trusted_floID_1', 'trusted_floID_2'];
const rmList = ['trusted_floID_3'];

floDapps.manageAppTrustedIDs(adminPrivKey, addList, rmList)
    .then(result => {
        console.log(result[0]); // Output: 'Updated App Configuration'
        console.log(result[1]); // Output: Transaction result from blockchain write operation
        // Further application logic after successful trusted IDs update
    })
    .catch(error => {
        console.error(error); // Output: Error message if trusted IDs update fails
        // Handle error and provide user feedback
    });
```

## floDapps.getNextGeneralData Function

The `floDapps.getNextGeneralData` function allows retrieving the next set of general data based on the specified type and vector clock. It filters the data based on the provided type, vector clock, and optional comment.

### Function Parameters

- **type**: The type of general data to retrieve.
- **vectorClock**: The vector clock to start filtering the data from. If not provided, it defaults to the stored vector clock or '0'.
- **options**: An optional object containing additional filtering options.
  - **comment**: Optional. If provided, filters the data based on the specified comment.
  - **decrypt**: Optional. Decryption key for decrypting encrypted data. If `true`, it uses the user's private key for decryption.

### Function Logic

1. **Filtering by Type and Vector Clock:** Retrieves general data of the specified type and greater vector clocks than the provided vector clock.

2. **Filtering by Comment (Optional):** If the `comment` option is provided, further filters the data based on the specified comment.

3. **Data Decryption (Optional):** If the `decrypt` option is provided, decrypts the data using the specified decryption key. If `true`, it uses the user's private key for decryption.

4. **Updating Stored Vector Clock:** Updates the stored vector clock for the specified type with the latest vector clock from the retrieved data.

5. **Return Filtered Data:** Returns the filtered general data as an object.

### Return Value

- Returns an object containing the filtered general data based on the specified type, vector clock, comment, and decryption key.

### Example Usage

- In this example, floDapps.getNextGeneralData is used to retrieve and filter the next set of general data for the specified type, vector clock, comment, and decryption key.

```javascript
const type = 'exampleType';
const vectorClock = '12345';
const options = {
    comment: 'exampleComment',
    decrypt: true
};

const filteredData = floDapps.getNextGeneralData(type, vectorClock, options);
console.log(filteredData);
// Output: Filtered general data based on the specified type, vector clock, comment, and decryption key
```

