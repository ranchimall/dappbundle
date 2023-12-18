## `fetch_retry(apicall, rm_node)`

This function makes a fetch API call to the specified endpoint (`apicall`) and retries the request if it fails. It removes a specific server node (`rm_node`) from the list of servers before making the request. It returns a promise that resolves with the response data if the request is successful and rejects with an error if the request fails.

### Parameters:

- **`apicall`** (string): The API endpoint to which the fetch request is made.
- **`rm_node`** (string): The server node to be removed from the list before making the request.

### Return Value:

A Promise that resolves with the response data if the request is successful, and rejects with an error if the request fails.

### Example Usage:

```javascript
const apiEndpoint = "example/api/endpoint";
const nodeToRemove = "exampleServerNode";

fetch_retry(apiEndpoint, nodeToRemove)
    .then(responseData => {
        console.log("API Response Data:", responseData);
        // Handle the response data here
    })
    .catch(error => {
        console.error("API Request Error:", error);
        // Handle API request errors here and implement retry logic if needed
    });
```

## `fetch_api(apicall, ic = true)`

This function makes a fetch API call to the specified endpoint (`apicall`) using the available server nodes. If the request fails, it automatically retries the request using a different server node from the list. It returns a promise that resolves with the response data if the request is successful and rejects with an error if the request fails.

### Parameters:

- **`apicall`** (string): The API endpoint to which the fetch request is made.
- **`ic`** (boolean, optional, default: `true`): If `true`, the function initializes the server list from the full server list before making the request. If set to `false`, the server list is not initialized, and the function uses the existing server list.

### Return Value:

A Promise that resolves with the response data if the request is successful, and rejects with an error if the request fails.

### Example Usage:

```javascript
const apiEndpoint = "example/api/endpoint";

fetch_api(apiEndpoint)
    .then(responseData => {
        console.log("API Response Data:", responseData);
        // Handle the response data here
    })
    .catch(error => {
        console.error("API Request Error:", error);
        // Handle API request errors here and implement retry logic if needed
    });
```

## `promisedAPI(apicall, query_params = undefined)`

This function serves as a wrapper around the `fetch_api` function, providing a convenient way to make API calls to the FLO blockchain. It returns a promise that resolves with the response data if the request is successful and rejects with an error if the request fails.

### Parameters:

- **`apicall`** (string): The API endpoint to which the fetch request is made.
- **`query_params`** (object, optional, default: `undefined`): An object containing query parameters to be appended to the API endpoint. If provided, these parameters are included in the API request.

### Return Value:

A Promise that resolves with the response data if the request is successful, and rejects with an error if the request fails.

### Example Usage:

```javascript
const apiEndpoint = "example/api/endpoint";
const queryParams = {
    param1: "value1",
    param2: "value2"
};

promisedAPI(apiEndpoint, queryParams)
    .then(responseData => {
        console.log("API Response Data:", responseData);
        // Handle the response data here
    })
    .catch(error => {
        console.error("API Request Error:", error);
        // Handle API request errors here and implement retry logic if needed
    });
```

## `getBalance(addr)`

This function retrieves the balance of a specified FLO blockchain address.

### Parameters:

- **`addr`** (string): The FLO blockchain address for which the balance needs to be retrieved.

### Return Value:

A Promise that resolves with the balance of the specified address if the request is successful, and rejects with an error if the request fails.

### Example Usage:

```javascript
const floAddress = "FLO1234567890abcdef"; // Replace with the target FLO blockchain address

getBalance(floAddress)
    .then(balance => {
        console.log("Address Balance:", balance);
        // Handle the balance data here
    })
    .catch(error => {
        console.error("Balance Retrieval Error:", error);
        // Handle errors in retrieving address balance here
    });
```

## `getScriptPubKey(address)`

This function generates the ScriptPubKey for a specified FLO blockchain address.

### Parameters:

- **`address`** (string): The FLO blockchain address for which the ScriptPubKey needs to be generated.

### Return Value:

A hexadecimal representation of the ScriptPubKey associated with the specified address.

### Example Usage:

```javascript
const floAddress = "FLO1234567890abcdef"; // Replace with the target FLO blockchain address

const scriptPubKey = getScriptPubKey(floAddress);
console.log("ScriptPubKey:", scriptPubKey);
// Use the generated ScriptPubKey in your application
```

## `getUTXOs(address)`

This function retrieves the Unspent Transaction Outputs (UTXOs) associated with a specified FLO blockchain address.

### Parameters:

- **`address`** (string): The FLO blockchain address for which UTXOs need to be retrieved.

### Return Value:

A Promise that resolves to an array of UTXO objects. Each UTXO object contains the following properties:
- **`txid`** (string): Transaction ID of the UTXO.
- **`vout`** (number): Output index of the UTXO transaction.
- **`amount`** (number): Amount of FLO tokens in the UTXO.
- **`confirmations`** (number): Number of confirmations for the UTXO transaction.
- **`scriptPubKey`** (string): Hexadecimal representation of the ScriptPubKey associated with the address.

### Example Usage:

- In this example, the getUTXOs function is used to retrieve the UTXOs associated with the specified FLO blockchain address. The function returns an array of UTXO objects, each containing relevant details about the unspent transaction output. These UTXOs can be used in transactions or for other purposes within your application.


```javascript
const floAddress = "FLO1234567890abcdef"; // Replace with the target FLO blockchain address

getUTXOs(floAddress)
    .then(utxos => {
        console.log("UTXOs:", utxos);
        // Process the retrieved UTXOs in your application
    })
    .catch(error => {
        console.error("Error:", error);
        // Handle errors if any
    });
```

## `createTx(senderAddr, receiverAddr, sendAmt, floData = '', strict_utxo = true)`

This function constructs a raw transaction for sending FLO tokens from one address to another on the FLO blockchain.

### Parameters:

- **`senderAddr`** (string): The sender's FLO blockchain address.
- **`receiverAddr`** (string): The recipient's FLO blockchain address.
- **`sendAmt`** (number): The amount of FLO tokens to be sent in the transaction.
- **`floData`** (string, optional): Additional data to be embedded in the transaction. Must contain printable ASCII characters only.
- **`strict_utxo`** (boolean, optional): If set to `true`, only confirmed UTXOs will be used in the transaction. Defaults to `true`.

### Return Value:

A Promise that resolves to the raw transaction object, or rejects with an error message if there are issues with the input parameters or insufficient balance.

### Example Usage:

- In this example, the createTx function is used to construct a raw transaction for sending a specified amount of FLO tokens from the sender's address to the recipient's address. Additional data (if provided) is embedded in the transaction. The function performs validations and constructs the transaction using appropriate UTXOs.

```javascript
const senderAddress = "FLOSenderAddress"; // Replace with the sender's FLO address
const receiverAddress = "FLOReceiverAddress"; // Replace with the recipient's FLO address
const amountToSend = 10; // Amount of FLO tokens to send
const additionalData = "Hello, FLO!"; // Optional additional data to be included in the transaction

createTx(senderAddress, receiverAddress, amountToSend, additionalData)
    .then(rawTransaction => {
        console.log("Raw Transaction:", rawTransaction);
        // Broadcast the raw transaction to the FLO network using appropriate methods
    })
    .catch(error => {
        console.error("Error:", error);
        // Handle errors if any
    });
```


## `floBlockchainAPI.sendTx(senderAddr, receiverAddr, sendAmt, privKey, floData = '', strict_utxo = true)`

This function constructs, signs, and broadcasts a FLO blockchain transaction from the sender's address to the recipient's address with a specified amount of FLO tokens. It also allows embedding optional additional data in the transaction.

### Parameters:

- **`senderAddr`** (string): The sender's FLO blockchain address.
- **`receiverAddr`** (string): The recipient's FLO blockchain address.
- **`sendAmt`** (number): The amount of FLO tokens to be sent in the transaction.
- **`privKey`** (string): The sender's private key for signing the transaction.
- **`floData`** (string, optional): Additional data to be embedded in the transaction. Must contain printable ASCII characters only.
- **`strict_utxo`** (boolean, optional): If set to `true`, only confirmed UTXOs will be used in the transaction. Defaults to `true`.

### Return Value:

A Promise that resolves to the transaction ID (txid) once the transaction is successfully broadcasted, or rejects with an error message if there are issues with the input parameters or the transaction broadcast fails.

### Example Usage:

- In this example, the floBlockchainAPI.sendTx function is used to create, sign, and broadcast a FLO transaction from the specified sender address to the recipient address. Additional data (if provided) is embedded in the transaction. The function performs validations, constructs the transaction, signs it with the provided private key, and then broadcasts it to the FLO network.

```javascript
const senderAddress = "FLOSenderAddress"; // Replace with the sender's FLO address
const receiverAddress = "FLOReceiverAddress"; // Replace with the recipient's FLO address
const amountToSend = 10; // Amount of FLO tokens to send
const privatekey = "SenderPrivateKey"; // Sender's private key for signing the transaction
const additionalData = "Hello, FLO!"; // Optional additional data to be included in the transaction

floBlockchainAPI.sendTx(senderAddress, receiverAddress, amountToSend, privatekey, additionalData)
    .then(txid => {
        console.log("Transaction ID:", txid);
        // Handle the successful transaction broadcast, if needed
    })
    .catch(error => {
        console.error("Error:", error);
        // Handle errors if any
    });
```

## `floBlockchainAPI.writeData(senderAddr, data, privKey, receiverAddr = DEFAULT.receiverID, options = {})`

This function writes data into the FLO blockchain by creating a transaction with the specified data and embedding it into the blockchain. It allows customization of transaction parameters and additional options.

### Parameters:

- **`senderAddr`** (string): The sender's FLO blockchain address.
- **`data`** (string or object): The data to be written into the blockchain. It can be a string or an object, which will be automatically converted to a JSON string.
- **`privKey`** (string): The sender's private key for signing the transaction.
- **`receiverAddr`** (string, optional): The recipient's FLO blockchain address. Defaults to `DEFAULT.receiverID`.
- **`options`** (object, optional): Additional options for the transaction.
  - **`strict_utxo`** (boolean, optional): If set to `false`, unconfirmed UTXOs will be considered for the transaction. Defaults to `true`.
  - **`sendAmt`** (number, optional): The amount of FLO tokens to be sent in the transaction. Defaults to `DEFAULT.sendAmt`.

### Return Value:

A Promise that resolves to the transaction ID (txid) once the transaction is successfully broadcasted, or rejects with an error message if there are issues with the input parameters or the transaction broadcast fails.

### Example Usage:

- In this example, the floBlockchainAPI.writeData function is used to create a transaction containing the specified data and writes it into the FLO blockchain. The sender's address, data, and private key are provided as parameters. Additional options such as recipient address, UTXO strictness, and send amount can be customized if needed.

```javascript
const senderAddress = "FLOSenderAddress"; // Replace with the sender's FLO address
const dataToSend = "Hello, FLO Blockchain!"; // Data to be written into the blockchain
const privatekey = "SenderPrivateKey"; // Sender's private key for signing the transaction

floBlockchainAPI.writeData(senderAddress, dataToSend, privatekey)
    .then(txid => {
        console.log("Transaction ID:", txid);
        // Handle the successful transaction broadcast, if needed
    })
    .catch(error => {
        console.error("Error:", error);
        // Handle errors if any
    });
```

## `floBlockchainAPI.mergeUTXOs(floID, privKey, floData = '')`

This function merges all UTXOs of a given FLO address into a single UTXO and creates a transaction with the specified data, if provided, embedding it into the blockchain. It consolidates multiple UTXOs into one for efficient transaction management.

### Parameters:

- **`floID`** (string): The FLO blockchain address whose UTXOs need to be merged.
- **`privKey`** (string): The private key corresponding to the `floID` address for signing the transaction.
- **`floData`** (string, optional): The data to be embedded into the blockchain. Only printable ASCII characters are allowed. Defaults to an empty string.

### Return Value:

A Promise that resolves to the transaction ID (txid) once the merge transaction is successfully broadcasted, or rejects with an error message if there are issues with the input parameters or the transaction broadcast fails.

### Example Usage:

- In this example, the floBlockchainAPI.mergeUTXOs function is used to merge all UTXOs of the specified FLO address into a single UTXO. The FLO address, corresponding private key, and optional data to be embedded into the blockchain are provided as parameters. The function consolidates the UTXOs and creates a transaction, embedding the data if provided, and broadcasts it into the FLO blockchain.

```javascript
const floID = "FLOAddressToMergeUTXOs"; // Replace with the FLO address to merge UTXOs
const privatekey = "PrivateKey"; // Private key corresponding to the FLO address

floBlockchainAPI.mergeUTXOs(floID, privatekey, "Merged UTXOs data")
    .then(txid => {
        console.log("Merge Transaction ID:", txid);
        // Handle the successful merge transaction, if needed
    })
    .catch(error => {
        console.error("Error:", error);
        // Handle errors if any
    });
```

## `floBlockchainAPI.splitUTXOs(floID, privKey, count, floData = '')`

This function splits sufficient UTXOs of a given FLO address into multiple UTXOs for parallel sending. It creates transactions to split the UTXOs and embeds the specified data into the blockchain if provided.

### Parameters:

- **`floID`** (string): The FLO blockchain address whose UTXOs need to be split.
- **`privKey`** (string): The private key corresponding to the `floID` address for signing the split transactions.
- **`count`** (number): The number of UTXOs to split into.
- **`floData`** (string, optional): The data to be embedded into the blockchain. Only printable ASCII characters are allowed. Defaults to an empty string.

### Return Value:

A Promise that resolves to the transaction ID (txid) once the split transactions are successfully broadcasted, or rejects with an error message if there are issues with the input parameters or the transaction broadcast fails.

### Example Usage:

- In this example, the floBlockchainAPI.splitUTXOs function is used to split the UTXOs of the specified FLO address into the specified number of UTXOs. The FLO address, corresponding private key, the number of UTXOs to split into, and optional data to be embedded into the blockchain are provided as parameters. The function splits the UTXOs, creates transactions, embeds the data if provided, and broadcasts them into the FLO blockchain.

```javascript
const floID = "FLOAddressToSplitUTXOs"; // Replace with the FLO address to split UTXOs
const privatekey = "PrivateKey"; // Private key corresponding to the FLO address
const splitCount = 5; // Number of UTXOs to split into

floBlockchainAPI.splitUTXOs(floID, privatekey, splitCount, "Split UTXOs data")
    .then(txid => {
        console.log("Split Transaction ID:", txid);
        // Handle the successful split transactions, if needed
    })
    .catch(error => {
        console.error("Error:", error);
        // Handle errors if any
    });
```

## `floBlockchainAPI.writeDataMultiple(senderPrivKeys, data, receivers = [DEFAULT.receiverID], options = {})`

This function allows multiple senders to split and send FLO data to multiple receivers. It takes an array of sender private keys, a single piece of data (string or JSON object), an array of receiver addresses, and additional options if needed.

### Parameters:

- **`senderPrivKeys`** (array of strings): An array of private keys corresponding to the sender addresses.
- **`data`** (string or object): The data to be sent and embedded into the blockchain. It can be a string or a JSON object.
- **`receivers`** (array of strings, optional): An array of FLO addresses representing the receivers. Defaults to `[DEFAULT.receiverID]`.
- **`options`** (object, optional): Additional options for the transaction. It can include:
  - **`sendAmt`** (number): The amount of FLO to be sent from each sender to each receiver. Defaults to `DEFAULT.sendAmt`.
  - **`preserveRatio`** (boolean): If `true`, the specified `sendAmt` will be divided equally among receivers. If `false`, each sender will send the specified `sendAmt` to each receiver. Defaults to `true`.

### Return Value:

A Promise that resolves to the transaction ID (txid) once the transactions are successfully broadcasted, or rejects with an error message if there are issues with the input parameters or the transaction broadcast fails.

### Example Usage:

- In this example, the floBlockchainAPI.writeDataMultiple function is used to send the specified data from multiple senders to multiple receivers. It allows customization of the send amount and division of the amount among receivers based on the preserveRatio option. The function broadcasts the transactions into the FLO blockchain.

```javascript
const senderPrivKeys = ["PrivateKey1", "PrivateKey2", "PrivateKey3"]; // Array of sender private keys
const receivers = ["ReceiverAddress1", "ReceiverAddress2"]; // Array of receiver addresses
const data = { message: "Hello, World!" }; // Data to be sent (can be a string or object)
const options = {
    sendAmt: 0.1, // Amount of FLO to be sent from each sender to each receiver
    preserveRatio: false // Divide the specified sendAmt equally among receivers
};

floBlockchainAPI.writeDataMultiple(senderPrivKeys, data, receivers, options)
    .then(txid => {
        console.log("Transaction ID:", txid);
        // Handle the successful broadcast of transactions, if needed
    })
    .catch(error => {
        console.error("Error:", error);
        // Handle errors if any
    });
```

## `floBlockchainAPI.sendTxMultiple(senderPrivKeys, receivers, floData = '')`

This function allows multiple senders to send FLO tokens to multiple receivers. It takes an array of sender private keys (or an object with private keys and corresponding send amounts), an object containing receiver addresses and corresponding receive amounts, and an optional FLO data string to embed in the transactions.

### Parameters:

- **`senderPrivKeys`** (array or object): An array of sender private keys or an object where keys are sender addresses and values are send amounts.
- **`receivers`** (object): An object where keys are receiver addresses and values are receive amounts.
- **`floData`** (string, optional): The FLO data to be embedded in the transactions. Only printable ASCII characters are allowed.

### Return Value:

A Promise that resolves to the transaction ID (txid) once the transactions are successfully broadcasted, or rejects with an error message if there are issues with the input parameters or the transaction broadcast fails.

### Example Usage:

#### Example 1: Using an Array of Sender Private Keys

```javascript
const senderPrivKeys = ["PrivateKey1", "PrivateKey2", "PrivateKey3"]; // Array of sender private keys
const receivers = {
    "ReceiverAddress1": 0.1,
    "ReceiverAddress2": 0.2
}; // Object with receiver addresses and corresponding receive amounts
const floData = "Hello, FLO!"; // Optional FLO data

floBlockchainAPI.sendTxMultiple(senderPrivKeys, receivers, floData)
    .then(txid => {
        console.log("Transaction ID:", txid);
        // Handle the successful broadcast of transactions, if needed
    })
    .catch(error => {
        console.error("Error:", error);
        // Handle errors if any
    });
```

#### Example 2: Using an Object of Sender Private Keys and Send Amounts

```javascript
const senderPrivKeys = {
    "PrivateKey1": 0.1,
    "PrivateKey2": 0.2,
    "PrivateKey3": 0.3
}; // Object with sender addresses as keys and corresponding send amounts as values
const receivers = {
    "ReceiverAddress1": 0.1,
    "ReceiverAddress2": 0.2
}; // Object with receiver addresses and corresponding receive amounts
const floData = "Hello, FLO!"; // Optional FLO data

floBlockchainAPI.sendTxMultiple(senderPrivKeys, receivers, floData)
    .then(txid => {
        console.log("Transaction ID:", txid);
        // Handle the successful broadcast of transactions, if needed
    })
    .catch(error => {
        console.error("Error:", error);
        // Handle errors if any
    });
```

## `createMultisigTx(redeemScript, receivers, amounts, floData = '', strict_utxo = true)`

This function creates a multisig transaction, allowing multiple receivers to receive specified amounts of FLO tokens. It takes a redeem script, an array of receiver addresses, an array of corresponding receive amounts, optional FLO data, and a strict UTXO flag as input.

### Parameters:

- **`redeemScript`** (string): The redeem script associated with the multisig address.
- **`receivers`** (array): An array of receiver addresses where FLO tokens will be sent.
- **`amounts`** (array): An array of corresponding receive amounts for each receiver address.
- **`floData`** (string, optional): The FLO data to be embedded in the transactions. Only printable ASCII characters are allowed.
- **`strict_utxo`** (boolean, optional): A flag indicating whether to use only confirmed UTXOs for the transaction (default is `true`).

### Return Value:

A Promise that resolves to the constructed transaction object once the transaction data is successfully created, or rejects with an error message if there are issues with the input parameters or the UTXO validation fails.

### Example Usage:

- In this example, the createMultisigTx function is used to construct a multisig transaction with specified receiver addresses, corresponding amounts, optional FLO data, and a redeem script. The resulting transaction object can be further processed or signed before broadcasting.

```javascript
const redeemScript = "redeemScriptHere"; // Replace with the actual redeem script
const receivers = ["ReceiverAddress1", "ReceiverAddress2"];
const amounts = [0.1, 0.2]; // Amounts corresponding to the receivers
const floData = "Hello, FLO!"; // Optional FLO data

createMultisigTx(redeemScript, receivers, amounts, floData)
    .then(transaction => {
        console.log("Constructed Transaction Object:", transaction);
        // Handle the constructed transaction object, if needed
    })
    .catch(error => {
        console.error("Error:", error);
        // Handle errors if any
    });
```

## `sendMultisigTx(redeemScript, privateKeys, receivers, amounts, floData = '', strict_utxo = true)`

This function is part of the `floBlockchainAPI` and facilitates the creation and sending of multisig transactions on the FLO blockchain. It takes a redeem script, an array of private keys corresponding to the multisig address, an array of receiver addresses, an array of corresponding receive amounts, optional FLO data, and a strict UTXO flag as input.

### Parameters:

- **`redeemScript`** (string): The redeem script associated with the multisig address.
- **`privateKeys`** (array): An array of private keys corresponding to the multisig address. The number of private keys must meet the requirements specified in the redeem script.
- **`receivers`** (array): An array of receiver addresses where FLO tokens will be sent.
- **`amounts`** (array): An array of corresponding receive amounts for each receiver address.
- **`floData`** (string, optional): The FLO data to be embedded in the transactions. Only printable ASCII characters are allowed.
- **`strict_utxo`** (boolean, optional): A flag indicating whether to use only confirmed UTXOs for the transaction (default is `true`).

### Return Value:

A Promise that resolves to the transaction ID (txid) once the multisig transaction is successfully broadcasted, or rejects with an error message if there are issues with the input parameters, private keys, or the UTXO validation fails.

### Example Usage:

- In this example, the sendMultisigTx function is used to create and send a multisig transaction with specified private keys, receiver addresses, corresponding amounts, optional FLO data, and a redeem script. The resulting transaction ID (txid) can be used for further reference or verification.

```javascript
const redeemScript = "redeemScriptHere"; // Replace with the actual redeem script
const privateKeys = ["PrivateKey1", "PrivateKey2", "PrivateKey3"]; // Private keys corresponding to the multisig address
const receivers = ["ReceiverAddress1", "ReceiverAddress2"];
const amounts = [0.1, 0.2]; // Amounts corresponding to the receivers
const floData = "Hello, FLO!"; // Optional FLO data

floBlockchainAPI.sendMultisigTx(redeemScript, privateKeys, receivers, amounts, floData)
    .then(txid => {
        console.log("Multisig Transaction Sent! TXID:", txid);
        // Handle the transaction ID (txid), if needed
    })
    .catch(error => {
        console.error("Error:", error);
        // Handle errors if any
    });
```

## `writeMultisigData(redeemScript, data, privatekeys, receiverAddr = DEFAULT.receiverID, options = {})`

This function is part of the `floBlockchainAPI` and allows you to write data to the FLO blockchain using a multisig transaction. It takes a redeem script, data to be written, an array of private keys corresponding to the multisig address, an optional receiver address (defaulting to `DEFAULT.receiverID`), and additional options such as strict UTXO and send amount.

### Parameters:

- **`redeemScript`** (string): The redeem script associated with the multisig address.
- **`data`** (string): The data to be written to the blockchain.
- **`privatekeys`** (array): An array of private keys corresponding to the multisig address.
- **`receiverAddr`** (string, optional): The receiver address where FLO tokens will be sent. Defaults to `DEFAULT.receiverID`.
- **`options`** (object, optional): Additional options for the transaction, such as `strict_utxo` (boolean) and `sendAmt` (number).

### Return Value:

A Promise that resolves to the transaction ID (txid) once the multisig transaction with the specified data is successfully broadcasted, or rejects with an error message if there are issues with the input parameters or the transaction cannot be created or broadcasted.

### Example Usage:

- In this example, the sendMultisigTx function is used to create and send a multisig transaction with specified private keys, receiver addresses, corresponding amounts, optional FLO data, and a redeem script. The resulting transaction ID (txid) can be used for further reference or verification.

```javascript
const redeemScript = "redeemScriptHere"; // Replace with the actual redeem script
const data = "Your data to be written to the blockchain";
const privatekeys = ["PrivateKey1", "PrivateKey2", "PrivateKey3"]; // Private keys corresponding to the multisig address
const receiverAddr = "ReceiverAddress"; // Optional receiver address (default is DEFAULT.receiverID)
const options = {
    strict_utxo: true, // Optional: Use only confirmed UTXOs (default is true)
    sendAmt: 0.1 // Optional: Amount of FLO tokens to be sent (default is DEFAULT.sendAmt)
};

floBlockchainAPI.writeMultisigData(redeemScript, data, privatekeys, receiverAddr, options)
    .then(txid => {
        console.log("Multisig Data Written to Blockchain! TXID:", txid);
        // Handle the transaction ID (txid), if needed
    })
    .catch(error => {
        console.error("Error:", error);
        // Handle errors if any
    });
```

## `deserializeTx(tx)`

This function allows you to deserialize a transaction from its hexadecimal representation or from a transaction object. It validates the input and returns a transaction object that can be further processed.

### Parameters:

- **`tx`** (string | array | object): The input transaction data. It can be either a hexadecimal string representing the transaction, an array containing the transaction data, or a transaction object.

### Return Value:

Returns a deserialized transaction object.

### Throws:

- Throws an error with the message "Invalid transaction hex" if the input transaction data is a string (hexadecimal representation) and cannot be deserialized.
- Throws an error with the message "Invalid transaction object" if the input transaction data is not a valid hexadecimal string, array, or transaction object.

### Example Usage:

```javascript
const serializedTxHex = "0100000001..."; // Replace with the actual transaction hex
const serializedTxArray = [0, 1, 2, ...]; // Replace with the actual transaction array
const transactionObject = { /* Replace with the actual transaction object */ };

try {
    const deserializedTxFromHex = deserializeTx(serializedTxHex);
    console.log("Deserialized Transaction from Hex:", deserializedTxFromHex);

    const deserializedTxFromArray = deserializeTx(serializedTxArray);
    console.log("Deserialized Transaction from Array:", deserializedTxFromArray);

    const deserializedTxFromObject = deserializeTx(transactionObject);
    console.log("Deserialized Transaction from Object:", deserializedTxFromObject);
} catch (error) {
    console.error("Error:", error);
    // Handle errors if any
}
```

## `floBlockchainAPI.signTx(tx, privateKey, sighashtype = 1)`

This function allows you to sign a transaction with the provided private key and signature hash type. It takes a transaction object (or its hexadecimal representation), a private key, and an optional signature hash type. It returns the signed transaction in its hexadecimal form.

### Parameters:

- **`tx`** (string | array | object): The transaction to be signed. It can be either a hexadecimal string representing the transaction, an array containing the transaction data, or a transaction object.
- **`privateKey`** (string): The private key used for signing the transaction.
- **`sighashtype`** (number, optional, default: 1): The signature hash type. It specifies the way the transaction data is hashed. The default value is 1, indicating SIGHASH_ALL.

### Return Value:

Returns the signed transaction in its hexadecimal form.

### Throws:

- Throws an error with the message "Invalid Private key" if the provided private key is not valid.

### Example Usage:

- In this example, the signTx function is used to sign an unsigned transaction represented as a hexadecimal string. You can modify the unsignedTxHex and privateKey variables with actual transaction data and private key to test the function.

```javascript
const unsignedTxHex = "0100000001..."; // Replace with the actual unsigned transaction hex
const privateKey = "privateKey"; // Replace with the actual private key

try {
    const signedTxHex = floBlockchainAPI.signTx(unsignedTxHex, privateKey);
    console.log("Signed Transaction Hex:", signedTxHex);
} catch (error) {
    console.error("Error:", error);
    // Handle errors if any
}
```

## `floBlockchainAPI.checkSigned(tx, bool = true)`

This function allows you to check if a transaction is signed correctly. It takes a transaction object (or its hexadecimal representation) and an optional boolean parameter. If the boolean parameter is set to `true` (default), it returns a boolean indicating whether the transaction is fully signed. If set to `false`, it returns an array containing information about the signing status for each input.

### Parameters:

- **`tx`** (string | array | object): The transaction to be checked. It can be either a hexadecimal string representing the transaction, an array containing the transaction data, or a transaction object.
- **`bool`** (boolean, optional, default: `true`): A boolean parameter indicating whether to return a boolean result (`true` for fully signed, `false` otherwise) or an array containing signing status information for each input.

### Return Value:

- If `bool` is `true` (default), returns `true` if the transaction is fully signed, and `false` otherwise.
- If `bool` is `false`, returns an array containing signing status information for each input. For inputs that require multisig, it includes an object with the properties `{ s: <signed_count>, r: <required_signatures>, t: <total_pubkeys> }`. For regular inputs, it includes `true` if signed and `false` otherwise.

### Throws:

- Throws an error with the message "signaturesRequired is more than publicKeys" if the number of required signatures is greater than the total number of public keys in a multisig input.

### Example Usage:

- In this example, the checkSigned function is used to check if a signed transaction represented as a hexadecimal string is fully signed. The isFullySigned variable contains a boolean indicating whether the transaction is fully signed, and the signingStatus variable contains an array with signing status information for each input. You can modify the signedTxHex variable with an actual signed transaction hex to test the function.

```javascript
const signedTxHex = "0100000001..."; // Replace with the actual signed transaction hex

try {
    const isFullySigned = floBlockchainAPI.checkSigned(signedTxHex);
    console.log("Is Fully Signed:", isFullySigned);
    
    const signingStatus = floBlockchainAPI.checkSigned(signedTxHex, false);
    console.log("Signing Status for Each Input:", signingStatus);
} catch (error) {
    console.error("Error:", error);
    // Handle errors if any
}
```

## `floBlockchainAPI.checkIfSameTx(tx1, tx2)`

This function allows you to compare two transactions to check if they are the same. It takes two transaction objects (or their hexadecimal representations) and returns a boolean indicating whether the transactions are identical in terms of inputs, outputs, and floData.

### Parameters:

- **`tx1`** (string | array | object): The first transaction to be compared. It can be either a hexadecimal string representing the transaction, an array containing the transaction data, or a transaction object.
- **`tx2`** (string | array | object): The second transaction to be compared. It can be either a hexadecimal string representing the transaction, an array containing the transaction data, or a transaction object.

### Return Value:

- Returns `true` if the two transactions are identical in terms of inputs, outputs, and floData. Returns `false` otherwise.

### Example Usage:

- In this example, the checkIfSameTx function is used to compare two transactions represented as hexadecimal strings. The areSameTransactions variable contains a boolean indicating whether the two transactions are identical in terms of inputs, outputs, and floData.



```javascript
const tx1Hex = "0100000001..."; // Replace with the actual hexadecimal representation of the first transaction
const tx2Hex = "0100000001..."; // Replace with the actual hexadecimal representation of the second transaction

const areSameTransactions = floBlockchainAPI.checkIfSameTx(tx1Hex, tx2Hex);
console.log("Are the Transactions the Same?", areSameTransactions);
```

## `floBlockchainAPI.transactionID(tx)`

This function calculates the transaction ID (TxID) for a given transaction. It takes a transaction object (or its hexadecimal representation) and returns the corresponding transaction ID.

### Parameters:

- **`tx`** (string | array | object): The transaction for which the TxID needs to be calculated. It can be either a hexadecimal string representing the transaction, an array containing the transaction data, or a transaction object.

### Return Value:

- Returns the transaction ID (TxID) as a hexadecimal string.

### Example Usage:

- In this example, the transactionID function is used to calculate the transaction ID (TxID) for a given transaction represented as a hexadecimal string. The txid variable contains the resulting transaction ID as a hexadecimal string.

```javascript
const txHex = "0100000001..."; // Replace with the actual hexadecimal representation of the transaction

const txid = floBlockchainAPI.transactionID(txHex);
console.log("Transaction ID:", txid);
```


## `getTxOutput(txid, index)`

This function retrieves a specific transaction output (vout) from a given transaction by its transaction ID (TxID) and index.

### Parameters:

- **`txid`** (string): The transaction ID (TxID) of the transaction from which to retrieve the output.
- **`index`** (number): The index of the output in the transaction's vout array.

### Return Value:

- Returns a Promise that resolves with the specific transaction output (vout) object.

### Example Usage:

- In this example, the getTxOutput function is used to retrieve the transaction output at index 0 from the transaction with the specified txid. The function returns a Promise, and the resolved output object contains details about the specific transaction output.

```javascript
const txid = "1234567890abcdef"; // Replace with the actual transaction ID
const outputIndex = 0; // Replace with the desired output index

getTxOutput(txid, outputIndex)
    .then(output => {
        console.log("Transaction Output:", output);
    })
    .catch(error => {
        console.error("Error:", error);
    });
```

# `getOutputAddress(outscript)`

The `getOutputAddress` function generates a FLO (or Bitcoin) address from a given output script.

## Parameters:

- **`outscript`** (Array): An array representing the output script.

## Return Value:

- Returns a FLO (or Bitcoin) address as a string.

## Example Usage:

- In this function, the input outscript is expected to be an array representing the output script of a transaction output. Depending on the script type (legacy or multisig), it processes the script bytes and version to create the address. The function then returns the generated FLO (or Bitcoin) address as a string.

```javascript
const outscript = [118, 169, 20, ...]; // Replace with the actual output script

const address = getOutputAddress(outscript);
console.log("Generated Address:", address);
```

# `floBlockchainAPI.parseTransaction(tx)`

The `parseTransaction` function parses a FLO transaction, extracting inputs, outputs, total amounts, fees, and FLO data.

## Parameters:

- **`tx`** (String or Array): The serialized transaction in hexadecimal format or as an array of transaction bytes.

## Return Value:

- Returns a Promise that resolves to an object containing parsed transaction details:
  - **`inputs`** (Array): An array of objects representing transaction inputs with properties `address` (input address) and `value` (input value).
  - **`outputs`** (Array): An array of objects representing transaction outputs with properties `address` (output address) and `value` (output value).
  - **`total_input`** (Number): Total value of inputs in FLO.
  - **`total_output`** (Number): Total value of outputs in FLO.
  - **`fee`** (Number): Transaction fee in FLO.
  - **`floData`** (String): FLO data included in the transaction.
  
## Example Usage:

- In this function, you provide the tx parameter, which can be either a hexadecimal string or an array of transaction bytes. The function then resolves with an object containing detailed information about the parsed transaction, including inputs, outputs, total amounts, fees, and FLO data.

```javascript
const txHex = '0123456789abcdef...'; // Replace with the actual transaction hex string

floBlockchainAPI.parseTransaction(txHex)
    .then(parsedTx => {
        console.log("Parsed Transaction Details:");
        console.log("Inputs:", parsedTx.inputs);
        console.log("Outputs:", parsedTx.outputs);
        console.log("Total Input:", parsedTx.total_input, "FLO");
        console.log("Total Output:", parsedTx.total_output, "FLO");
        console.log("Transaction Fee:", parsedTx.fee, "FLO");
        console.log("FLO Data:", parsedTx.floData);
    })
    .catch(error => {
        console.error("Error:", error);
    });
```

# `floBlockchainAPI.broadcastTx(signedTxHash)`

The `broadcastTx` function broadcasts a signed FLO transaction to the blockchain using the API.

## Parameters:

- **`signedTxHash`** (String): The signed FLO transaction hash in hexadecimal format.

## Return Value:

- Returns a Promise that resolves to the broadcasted transaction ID if successful.

## Example Usage:

- In this function, you provide the signedTxHash parameter, which is the hexadecimal representation of the signed FLO transaction. The function then broadcasts the transaction to the FLO blockchain using the API endpoint. If successful, it resolves with the transaction ID.

```javascript
const signedTxHash = '0123456789abcdef...'; // Replace with the actual signed transaction hash

floBlockchainAPI.broadcastTx(signedTxHash)
    .then(txid => {
        console.log("Transaction successfully broadcasted! Transaction ID:", txid);
    })
    .catch(error => {
        console.error("Error:", error);
    });
```

# `floBlockchainAPI.getTx(txid)`

The `getTx` function retrieves information about a specific FLO transaction using its transaction ID (txid).

## Parameters:

- **`txid`** (String): The transaction ID (txid) of the FLO transaction to retrieve information about.

## Return Value:

- Returns a Promise that resolves to the transaction information if the transaction with the provided txid exists.

## Example Usage:

```javascript
const txid = '0123456789abcdef...'; // Replace with the actual transaction ID

floBlockchainAPI.getTx(txid)
    .then(transactionInfo => {
        console.log("Transaction Information:", transactionInfo);
    })
    .catch(error => {
        console.error("Error:", error);
    });
```

# `floBlockchainAPI.waitForConfirmation(txid, max_retry = -1, retry_timeout = 20)`

The `waitForConfirmation` function waits for a FLO transaction to be confirmed on the blockchain. It checks the confirmation status of the transaction at regular intervals until it gets confirmed or until the maximum retry limit is reached.

## Parameters:

- **`txid`** (String): The transaction ID (txid) of the FLO transaction to wait for confirmation.
- **`max_retry`** (Optional, Number): The maximum number of times to retry checking for confirmation. Set to `-1` for infinite retries (default: `-1`).
- **`retry_timeout`** (Optional, Number): The time interval (in seconds) between each confirmation check attempt (default: `20` seconds).

## Return Value:

- Returns a Promise that resolves to the confirmed transaction object when the transaction is confirmed.
- Rejects the Promise with an error message if the transaction is not found or if the maximum retry limit is reached.

## Example Usage:

- This function is useful for scenarios where developers need to wait for a transaction to be confirmed before proceeding with subsequent actions. It provides a way to handle waiting for transactions asynchronously, allowing for more efficient and responsive application behavior.

```javascript
const txid = '0123456789abcdef...'; // Replace with the actual transaction ID

floBlockchainAPI.waitForConfirmation(txid, 10, 30)
    .then(confirmedTx => {
        console.log("Transaction Confirmed:", confirmedTx);
    })
    .catch(error => {
        console.error("Error:", error);
    });
```

# `floBlockchainAPI.readTxs(addr, options = {})`

The `readTxs` function retrieves a list of FLO transactions associated with a specific address.

## Parameters:

- **`addr`** (String): The FLO address for which transactions are to be retrieved.
- **`options`** (Object, Optional): Additional options for customizing the transaction retrieval.
  - **`page`** (Number, Optional): The page number for paginated results (default: `1`).
  - **`pageSize`** (Number, Optional): The number of transactions per page (default: `10`).
  - **`confirmed`** (Boolean, Optional): If set to `true`, retrieves only confirmed transactions (default: `false`).

## Return Value:

- Returns a Promise that resolves to an object containing transaction details associated with the given address.
  - **`txs`** (Array): An array of transaction objects containing details such as transaction ID, inputs, outputs, etc.
  - **`totalItems`** (Number): Total number of transactions associated with the address.
  - **`totalPages`** (Number): Total number of pages based on the given `pageSize`.

## Example Usage:

```javascript
const address = 'FLO_ADDRESS'; // Replace with the actual FLO address

floBlockchainAPI.readTxs(address, { page: 1, pageSize: 10, confirmed: true })
    .then(transactionDetails => {
        console.log("Transactions for Address:", transactionDetails.txs);
        console.log("Total Transactions:", transactionDetails.totalItems);
        console.log("Total Pages:", transactionDetails.totalPages);
    })
    .catch(error => {
        console.error("Error:", error);
    });
```

# `readAllTxs_oldSupport(addr, options, ignoreOld = 0, cacheTotal = 0)`

The `readAllTxs_oldSupport` function retrieves all FLO transactions associated with a specific address with backward compatibility for `floBlockchainAPI` versions prior to `v2.5.6`.

## Parameters:

- **`addr`** (String): The FLO address for which transactions are to be retrieved.
- **`options`** (Object): Additional options for customizing the transaction retrieval.
  - **`page`** (Number, Optional): The page number for paginated results (default: `1`).
  - **`pageSize`** (Number, Optional): The number of transactions per page (default: `10`).
  - **`confirmed`** (Boolean, Optional): If set to `true`, retrieves only confirmed transactions (default: `false`).
- **`ignoreOld`** (Number, Optional): Number of old transactions to ignore from the beginning of the result set (default: `0`).
- **`cacheTotal`** (Number, Optional): Total number of transactions already cached from previous calls (default: `0`).

## Return Value:

- Returns a Promise that resolves to an array of transaction objects containing details such as transaction ID, inputs, outputs, etc.

## Example Usage:

-This function provides backward compatibility for versions of floBlockchainAPI prior to v2.5.6. It retrieves all FLO transactions associated with a specific address while allowing developers to ignore a specified number of old transactions from the beginning of the result set.

```javascript
const address = 'FLO_ADDRESS'; // Replace with the actual FLO address

const options = {
    page: 1,
    pageSize: 10,
    confirmed: true
};

const ignoreOld = 5; // Ignore 5 old transactions from the beginning of the result set

readAllTxs_oldSupport(address, options, ignoreOld)
    .then(transactions => {
        console.log("All Transactions (Ignoring 5 Old Transactions):", transactions);
    })
    .catch(error => {
        console.error("Error:", error);
    });
```

# `readAllTxs_new(addr, options, lastItem)`

The `readAllTxs_new` function retrieves FLO transactions associated with a specific address starting from the most recent transactions up to a specified `lastItem`.

## Parameters:

- **`addr`** (String): The FLO address for which transactions are to be retrieved.
- **`options`** (Object): Additional options for customizing the transaction retrieval.
  - **`page`** (Number, Optional): The page number for paginated results (default: `1`).
  - **`pageSize`** (Number, Optional): The number of transactions per page (default: `10`).
  - **`confirmed`** (Boolean, Optional): If set to `true`, retrieves only confirmed transactions (default: `false`).
- **`lastItem`** (String, Optional): The transaction ID of the last known transaction. The retrieval will start from this transaction onward.

## Return Value:

- Returns a Promise that resolves to an array of transaction objects containing details such as transaction ID, inputs, outputs, etc.

## Example Usage:

- This function retrieves FLO transactions associated with a specific address starting from the most recent transactions up to a specified lastItem. Developers can provide the ID of the last known transaction, and the function will fetch transactions from that point onward.

```javascript
const address = 'FLO_ADDRESS'; // Replace with the actual FLO address

const options = {
    page: 1,
    pageSize: 10,
    confirmed: true
};

const lastItemTxID = 'LAST_TXID'; // Replace with the actual transaction ID of the last known transaction

readAllTxs_new(address, options, lastItemTxID)
    .then(transactions => {
        console.log("Transactions Starting from Last Known Item:", transactions);
    })
    .catch(error => {
        console.error("Error:", error);
    });
```

# `floBlockchainAPI.readAllTxs(addr, options)`

The `readAllTxs` function retrieves all FLO transactions associated with a specific address, with the newest transactions appearing first.

## Parameters:

- **`addr`** (String): The FLO address for which transactions are to be retrieved.
- **`options`** (Object, Optional): Additional options for customizing the transaction retrieval.
  - **`ignoreOld`** (Number, Optional): Number of old transactions to ignore from the beginning of the transaction history (backward compatibility with floBlockchainAPI versions prior to v2.5.6).
  - **`after`** (String, Optional): The transaction ID of the last known transaction. The retrieval will start from this transaction onward.
  - **`page`** (Number, Optional): The page number for paginated results (default: `1`).
  - **`pageSize`** (Number, Optional): The number of transactions per page (default: `10`).
  - **`confirmed`** (Boolean, Optional): If set to `true`, retrieves only confirmed transactions (default: `false`).

## Return Value:

- Returns a Promise that resolves to an object containing:
  - **`lastItem`** (String): The transaction ID of the last known transaction.
  - **`items`** (Array): An array of transaction objects containing details such as transaction ID, inputs, outputs, etc.

## Example Usage:

-This function retrieves all FLO transactions associated with a specific address, allowing developers to specify various options such as ignoring old transactions, starting from a specific transaction ID, and pagination.

```javascript
const address = 'FLO_ADDRESS'; // Replace with the actual FLO address

const options = {
    page: 1,
    pageSize: 10,
    confirmed: true
};

// For backward compatibility (floBlockchainAPI < v2.5.6)
// const options = {
//     ignoreOld: 5
// };

// For starting from a specific transaction ID
// const options = {
//     after: 'LAST_TXID'
// };

floBlockchainAPI.readAllTxs(address, options)
    .then(result => {
        console.log("Last Known Transaction ID:", result.lastItem);
        console.log("Transactions:", result.items);
    })
    .catch(error => {
        console.error("Error:", error);
    });
```


# `floBlockchainAPI.readData(addr, options)`

The `readData` function retrieves FLO transactions associated with a specific address, with optional filtering options.

## Parameters:

- **`addr`** (String): The FLO address for which transactions are to be retrieved.
- **`options`** (Object, Optional): Additional options for customizing the transaction retrieval.
  - **`confirmed`** (Boolean, Optional): If set to `true`, retrieves only confirmed transactions (default: `true`).
  - **`after`** (String, Optional): The transaction ID of the last known transaction. The retrieval will start from this transaction onward.
  - **`ignoreOld`** (Number, Optional): Number of old transactions to ignore from the beginning of the transaction history.
  - **`sentOnly`** (Boolean, Optional): If set to `true`, retrieves only transactions sent from the specified address.
  - **`receivedOnly`** (Boolean, Optional): If set to `true`, retrieves only transactions received by the specified address.
  - **`senders`** (Array or String, Optional): Array of sender addresses to filter transactions.
  - **`receivers`** (Array or String, Optional): Array of receiver addresses to filter transactions.
  - **`pattern`** (String, Optional): JSON key pattern to filter transactions containing specific keys.
  - **`filter`** (Function, Optional): Custom function to further filter transactions based on the FLO data.
  - **`tx`** (Boolean, Optional): If set to `true`, returns detailed transaction objects (default: `false`).

## Return Value:

- Returns a Promise that resolves to an object containing:
  - **`lastItem`** (String): The transaction ID of the last known transaction.
  - **`items`** (Array, Optional): An array of transaction objects or FLO data strings based on the `tx` option.

## Example Usage:

```javascript
const address = 'FLO_ADDRESS'; // Replace with the actual FLO address

const options = {
    confirmed: true,
    after: 'LAST_TXID',
    sentOnly: true,
    senders: ['SENDER_ADDRESS'],
    receivers: ['RECEIVER_ADDRESS'],
    pattern: 'KEY_PATTERN',
    filter: (floData) => {
        // Custom filter logic, return true to include the transaction
        return floData.includes('FILTER_TEXT');
    },
    tx: true
};

floBlockchainAPI.readData(address, options)
    .then(result => {
        console.log("Last Known Transaction ID:", result.lastItem);
        console.log("Transactions:", result.items);
    })
    .catch(error => {
        console.error("Error:", error);
    });
```

# `floBlockchainAPI.getLatestData(addr, caseFn, options)`

The `getLatestData` function retrieves the latest confirmed FLO transaction data associated with a specific address based on a provided validation function (`caseFn`).

## Parameters:

- **`addr`** (String): The FLO address for which transactions are to be retrieved.
- **`caseFn`** (Function): A validation function that takes FLO data as input and returns a boolean value (`true` for valid, `false` for invalid).
- **`options`** (Object, Optional): Additional options for customizing the transaction retrieval.
  - **`confirmed`** (Boolean, Optional): If set to `true`, retrieves only confirmed transactions (default: `true`).
  - **`page`** (Number, Optional): The page number of transactions to retrieve (default: `1`).
  - **`after`** (String, Optional): The transaction ID of the last known transaction. The retrieval will start from this transaction onward.
  - **`sentOnly`** (Boolean, Optional): If set to `true`, retrieves only transactions sent from the specified address.
  - **`receivedOnly`** (Boolean, Optional): If set to `true`, retrieves only transactions received by the specified address.
  - **`senders`** (Array or String, Optional): Array of sender addresses to filter transactions.
  - **`receivers`** (Array or String, Optional): Array of receiver addresses to filter transactions.
  - **`tx`** (Boolean, Optional): If set to `true`, returns detailed transaction object (default: `false`).

## Return Value:

- Returns a Promise that resolves to an object containing:
  - **`lastItem`** (String): The transaction ID of the last known transaction that matches the validation function.
  - **`item`** (Object, Optional): Detailed transaction object if `tx` option is set to `true`.
  - **`data`** (String, Optional): FLO data that matches the validation function.

## Example Usage:

```javascript
const address = 'FLO_ADDRESS'; // Replace with the actual FLO address

const validationFunction = (floData) => {
    // Custom validation logic, return true for valid data, false otherwise
    return floData.includes('VALIDATION_TEXT');
};

const options = {
    confirmed: true,
    page: 1,
    after: 'LAST_TXID',
    sentOnly: true,
    senders: ['SENDER_ADDRESS'],
    receivers: ['RECEIVER_ADDRESS'],
    tx: true
};

floBlockchainAPI.getLatestData(address, validationFunction, options)
    .then(result => {
        console.log("Last Valid Transaction ID:", result.lastItem);
        console.log("Transaction Data:", result.data);
        // If tx option is set to true
        // console.log("Transaction Object:", result.item);
    })
    .catch(error => {
        console.error("Error:", error);
    });
```

