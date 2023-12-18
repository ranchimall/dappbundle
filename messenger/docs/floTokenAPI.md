## `fetch_api(apicall)`

This utility function performs a fetch request to the specified API endpoint using the provided `apicall`. It returns a promise that resolves with the parsed JSON response if the request is successful, and rejects with the response object or an error if the request fails.

### Parameters:

- **`apicall`** (string): The API endpoint to be called.

### Return Value:

A Promise that resolves with the parsed JSON response if the request is successful, and rejects with the response object or an error if the request fails.

### Example Usage:

```javascript
const apiEndpoint = "exampleEndpoint";
fetch_api(apiEndpoint)
    .then(data => {
        console.log("API Response:", data);
        // Handle the API response data here
    })
    .catch(error => {
        console.error("API Error:", error);
        // Handle API errors here
    });
```

## `getBalance(floID, token = DEFAULT.currency)`

This function retrieves the balance of the specified FLO address (`floID`) for the given `token`. It returns a promise that resolves with the balance value if the request is successful, and rejects with an error if the request fails.

### Parameters:

- **`floID`** (string): The FLO address for which the balance needs to be retrieved.
- **`token`** (string, optional): The token for which the balance is retrieved. Defaults to `DEFAULT.currency`.

### Return Value:

A Promise that resolves with the balance value if the request is successful, and rejects with an error if the request fails.

### Example Usage:

```javascript
const floID = "exampleFLOAddress";
const token = "exampleToken";

getBalance(floID, token)
    .then(balance => {
        console.log("Balance:", balance);
        // Handle the balance data here
    })
    .catch(error => {
        console.error("Balance Retrieval Error:", error);
        // Handle balance retrieval errors here
    });
```

## `getTx(txID)`

This function retrieves transaction details for the specified transaction ID (`txID`). It returns a promise that resolves with the transaction details if the request is successful and rejects with an error if the request fails.

### Parameters:

- **`txID`** (string): The unique identifier of the transaction for which details are retrieved.

### Return Value:

A Promise that resolves with the transaction details if the request is successful, and rejects with an error if the request fails.

### Example Usage:

```javascript
const txID = "exampleTxID";

getTx(txID)
    .then(transactionDetails => {
        console.log("Transaction Details:", transactionDetails);
        // Handle the transaction details here
    })
    .catch(error => {
        console.error("Transaction Retrieval Error:", error);
        // Handle transaction retrieval errors here
    });
```




## `tokenAPI.sendToken(privKey, amount, receiverID, message = "", token = DEFAULT.currency, options = {})`

This function allows sending a specified amount of tokens from the sender to a receiver. It takes the following parameters:

- **`privKey`** (string): Private key of the sender.
- **`amount`** (number): Amount of tokens to be sent.
- **`receiverID`** (string): FLO ID of the receiver.
- **`message`** (string, optional): Additional message to attach to the transaction (default is an empty string).
- **`token`** (string, optional): Token type to be sent (default is `DEFAULT.currency`).
- **`options`** (object, optional): Additional options for the transaction (default is an empty object).

### Parameters:

- **`privKey`** (string): Private key of the sender.
- **`amount`** (number): Amount of tokens to be sent.
- **`receiverID`** (string): FLO ID of the receiver.
- **`message`** (string, optional): Additional message to attach to the transaction (default is an empty string).
- **`token`** (string, optional): Token type to be sent (default is `DEFAULT.currency`).
- **`options`** (object, optional): Additional options for the transaction (default is an empty object).

### Return Value:

A Promise that resolves to the transaction ID (txid) if the transaction is successful. If there are any errors, the Promise is rejected with an error message.

### Example Usage:

```javascript
const privKey = "senderPrivateKey";
const amount = 100;
const receiverID = "receiverFLOID";
const message = "Payment for services";
const token = "exampleToken";
const options = { fee: 0.1, someOption: "value" };

tokenAPI.sendToken(privKey, amount, receiverID, message, token, options)
    .then(txid => {
        console.log("Transaction ID:", txid);
    })
    .catch(error => {
        console.error("Error:", error);
    });
```

## `sendTokens_raw(privKey, receiverID, token, amount, utxo, vout, scriptPubKey)`

This function is a low-level utility used to send tokens from a specific Unspent Transaction Output (UTXO) to a receiver. It takes the following parameters:

- **`privKey`** (string): Private key of the sender.
- **`receiverID`** (string): FLO ID of the receiver.
- **`token`** (string): Token type to be sent.
- **`amount`** (number): Amount of tokens to be sent.
- **`utxo`** (string): UTXO (Unspent Transaction Output) hash.
- **`vout`** (number): Vout (index) of the UTXO in the transaction.
- **`scriptPubKey`** (string): Script Public Key associated with the UTXO.

### Parameters:

- **`privKey`** (string): Private key of the sender.
- **`receiverID`** (string): FLO ID of the receiver.
- **`token`** (string): Token type to be sent.
- **`amount`** (number): Amount of tokens to be sent.
- **`utxo`** (string): UTXO (Unspent Transaction Output) hash.
- **`vout`** (number): Vout (index) of the UTXO in the transaction.
- **`scriptPubKey`** (string): Script Public Key associated with the UTXO.

### Return Value:

A Promise that resolves to an array containing the receiver's FLO ID and the transaction ID (txid) if the transaction is successful. If there are any errors, the Promise is rejected with an array containing the receiver's FLO ID and the error message.

### Example Usage:

```javascript
const privKey = "senderPrivateKey";
const receiverID = "receiverFLOID";
const token = "exampleToken";
const amount = 100;
const utxo = "utxoHash";
const vout = 0;
const scriptPubKey = "scriptPublicKey";

sendTokens_raw(privKey, receiverID, token, amount, utxo, vout, scriptPubKey)
    .then(([receiver, txid]) => {
        console.log(`Tokens sent to ${receiver}. Transaction ID: ${txid}`);
    })
    .catch(([receiver, error]) => {
        console.error(`Failed to send tokens to ${receiver}. Error: ${error}`);
    });
```

## `tokenAPI.bulkTransferTokens(sender, privKey, token, receivers)`

This function facilitates bulk token transfers from a sender to multiple receivers. It takes the following parameters:

- **`sender`** (string): FLO ID of the sender.
- **`privKey`** (string): Private key corresponding to the sender's FLO ID.
- **`token`** (string): Token type to be transferred.
- **`receivers`** (object): An object containing receiver addresses as keys and the corresponding token amounts as values.

### Parameters:

- **`sender`** (string): FLO ID of the sender.
- **`privKey`** (string): Private key corresponding to the sender's FLO ID.
- **`token`** (string): Token type to be transferred.
- **`receivers`** (object): An object representing receivers and their corresponding token amounts. The format of the object should be `{ receiver1: amount1, receiver2: amount2, ... }`.

### Return Value:

A Promise that resolves to an object containing successful transactions and any failed transactions. The resolved object has the following format:

```javascript
{
    success: {
        receiver1: txid1,
        receiver2: txid2,
        // ... other successful transactions
    },
    failed: {
        receiverX: "error message",
        // ... other failed transactions
    }
}
// If the function encounters any invalid inputs or errors during the process, it rejects the Promise with an error message.
```

### Example Usage
```javascript
const sender = "senderFLOID";
const privKey = "senderPrivateKey";
const token = "exampleToken";
const receivers = {
    "receiver1FLOID": 100,
    "receiver2FLOID": 200,
    // ... other receivers and amounts
};

tokenAPI.bulkTransferTokens(sender, privKey, token, receivers)
    .then(result => {
        console.log("Successful Transactions:", result.success);
        console.log("Failed Transactions:", result.failed);
    })
    .catch(error => {
        console.error("Error:", error);
    });
```


## `tokenAPI.getAllTxs(floID, token = DEFAULT.currency)`

This function retrieves all transactions associated with a specific FLO ID and token. It takes the following parameters:

- **`floID`** (string): FLO ID for which transactions need to be retrieved.
- **`token`** (string, optional): Token type for which transactions need to be retrieved. Defaults to the DEFAULT currency.

### Parameters:

- **`floID`** (string): FLO ID for which transactions need to be retrieved.
- **`token`** (string, optional): Token type for which transactions need to be retrieved. Defaults to the DEFAULT currency.

### Return Value:

A Promise that resolves to the result of the API call, containing the transactions associated with the specified FLO ID and token.

### Example Usage:

```javascript
const floID = "exampleFLOID";
const token = "exampleToken";

tokenAPI.getAllTxs(floID, token)
    .then(transactions => {
        console.log("All transactions for FLO ID:", floID);
        console.log(transactions);
    })
    .catch(error => {
        console.error("Error fetching transactions:", error);
    });
```

## `util.parseTxData(txData)`

This utility function parses transaction data and extracts relevant information such as sender, receiver, parsed FLO data, and timestamp.

### Parameters:

- **`txData`** (object): Transaction data object to be parsed.

### Return Value:

An object containing the parsed transaction data with the following properties:

- **`sender`** (string): Address of the sender.
- **`receiver`** (string): Address of the receiver.
- **`parsedFloData`** (object): Parsed FLO data extracted from the transaction.
- **`time`** (number): Timestamp of the transaction in Unix epoch format.

### Example Usage:

- In this example, the util.parseTxData function is used to parse the provided txData object. It extracts sender, receiver, parsed FLO data, and the transaction timestamp. The function returns an object containing the parsed data for further processing or display.

```javascript
const txData = {
    parsedFloData: {
        key1: "value1",
        key2: "value2"
        // ...other parsed FLO data fields
    },
    transactionDetails: {
        vin: [{ addr: "senderAddress" }],
        vout: [{ scriptPubKey: { addresses: ["receiverAddress"] } }],
        time: 1633442400 // Unix timestamp
        // ...other transaction details
    }
};

const parsedData = util.parseTxData(txData);
console.log(parsedData);
```


