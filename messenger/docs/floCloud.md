## ws_connect Function

The `ws_connect` function is used to establish a WebSocket connection to a specified supernode (`snID`). It performs checks to ensure that the supernode is in the list of available supernodes and is active before attempting to establish a connection.

### Parameters

- `snID` (string): The ID of the supernode to which the WebSocket connection will be established.

### Return Value

- Returns a Promise that resolves with the WebSocket connection object if the connection is successfully established, and rejects with an error message if the specified supernode is not in the list of available supernodes or is inactive.

### Example Usage

- In this example, the ws_connect function establishes a WebSocket connection to the specified supernode (snID). It checks if the supernode is available and active before attempting to establish the connection. Once the connection is established, the function resolves with the WebSocket connection object, allowing communication with the server in real-time.

```javascript
const snID = "exampleSnID";

ws_connect(snID)
  .then(wsConnection => {
    console.log("WebSocket connection established:", wsConnection);
    // You can now use wsConnection to send and receive messages.
  })
  .catch(error => {
    console.error("Error occurred during WebSocket connection:", error);
  });
```

## ws_activeConnect Function

The `ws_activeConnect` function is used to establish an active WebSocket connection to a supernode, handling failover by selecting the next or previous active supernode from the routing table (`kBucket`).

### Parameters

- `snID` (string): The ID of the supernode to which the WebSocket connection will be established. If the provided supernode is inactive, the function selects the next or previous active supernode based on the `reverse` parameter.
- `reverse` (boolean, optional): A flag indicating whether to select the previous active supernode (`true`) or the next active supernode (`false`). Default is `false`.

### Return Value

- Returns a Promise that resolves with the active WebSocket connection object if the connection is successfully established, and rejects with an error message if all supernodes are inactive or if all attempts to establish an active connection fail.

### Example Usage

- In this example, the ws_activeConnect function establishes an active WebSocket connection to the specified supernode (snID). If the specified supernode is inactive, it selects the next or previous active supernode based on the reverse parameter. The function handles failover by attempting to connect to the active supernodes in the routing table until a successful connection is established, allowing real-time communication with the server.

```javascript
const snID = "exampleSnID";

ws_activeConnect(snID)
  .then(wsConnection => {
    console.log("Active WebSocket connection established:", wsConnection);
    // You can now use wsConnection to send and receive messages in real-time.
  })
  .catch(error => {
    console.error("Error occurred during active WebSocket connection:", error);
  });

ws_activeConnect(snID, true) // To establish a connection to the previous active supernode
  .then(wsConnection => {
    console.log("Active WebSocket connection established:", wsConnection);
    // You can now use wsConnection to send and receive messages in real-time.
  })
  .catch(error => {
    console.error("Error occurred during active WebSocket connection:", error);
  });
```




## fetch_API Function

The `fetch_API` function is used to send an HTTP request to the specified supernode (`snID`). It allows making GET and POST requests and handles response validation.

### Parameters

- `snID` (string): The ID of the supernode to which the request will be sent.
- `data` (string or object): The data to be sent with the request. If it is a string, it is appended to the URL as query parameters for GET requests. If it is an object with `method` property set to `"POST"`, it is sent as the body for a POST request.

### Return Value

- Returns a Promise that resolves with the response object if the request is successful (HTTP status code 200 or 400 or 500), and rejects with an error message if the request fails.

### Example Usage

- In this example, the fetch_API function sends an HTTP request to the specified supernode (snID). It handles both GET and POST requests and provides flexibility in sending data with the request. The function validates the response and resolves or rejects the Promise based on the response status code.

```javascript
const snID = "exampleSnID";
const queryParams = "param1=value1&param2=value2";

fetch_API(snID, queryParams)
  .then(response => {
    console.log("GET request successful. Response:", response);
  })
  .catch(error => {
    console.error("Error occurred during the GET request:", error);
  });

const postData = {
  method: "POST",
  body: JSON.stringify({ key: "value" })
};

fetch_API(snID, postData)
  .then(response => {
    console.log("POST request successful. Response:", response);
  })
  .catch(error => {
    console.error("Error occurred during the POST request:", error);
  });
```

## fetch_ActiveAPI Function

The `fetch_ActiveAPI` function is used to send an HTTP request to an active supernode, handling failover by selecting the next or previous active supernode from the routing table (`kBucket`).

### Parameters

- `snID` (string): The ID of the supernode to which the request will be sent. If the provided supernode is inactive, the function selects the next or previous active supernode based on the `reverse` parameter.
- `data` (string or object): The data to be sent with the request.
- `reverse` (boolean, optional): A flag indicating whether to select the previous active supernode (`true`) or the next active supernode (`false`). Default is `false`.

### Return Value

- Returns a Promise that resolves with the response object if the request is successful, and rejects with an error message if all supernodes are inactive or if all attempts to fetch from active supernodes fail.

### Example Usage

- In this example, the fetch_ActiveAPI function sends an HTTP request to an active supernode (snID). If the specified supernode is inactive, it selects the next or previous active supernode based on the reverse parameter. The function handles failover by attempting to fetch from the active supernodes in the routing table until a successful response is received.

```javascript
const snID = "exampleSnID";
const queryParams = "param1=value1&param2=value2";

fetch_ActiveAPI(snID, queryParams)
  .then(response => {
    console.log("Request successful. Response:", response);
  })
  .catch(error => {
    console.error("Error occurred during the request:", error);
  });

const postData = {
  method: "POST",
  body: JSON.stringify({ key: "value" })
};

fetch_ActiveAPI(snID, postData, true)
  .then(response => {
    console.log("Request successful. Response:", response);
  })
  .catch(error => {
    console.error("Error occurred during the request:", error);
  });
```

## singleRequest Function

The `singleRequest` function is used to send a single HTTP request to the specified flo server (`floID`). It allows customization of the request method and data payload.

### Parameters

- `floID` (string): The ID of the flo server to which the request will be sent.
- `data_obj` (object): The data object to be sent with the request. It will be serialized to JSON for POST requests and URL parameters for other request methods.
- `method` (string, optional): The HTTP request method. Default is `"POST"`. Can be `"POST"` or any other valid HTTP method like `"GET"`, `"PUT"`, `"DELETE"`, etc.

### Return Value

- Returns a Promise that resolves with the JSON response body if the request is successful (HTTP status code 200), and rejects with an error message if the request fails.

### Example Usage
- In this example, the singleRequest function sends a single HTTP request to the cloud server. The request method and data payload are customizable

```javascript
const floID = "exampleFloID";
const dataObj = {
  key: "value",
  anotherKey: "anotherValue"
};

singleRequest(floID, dataObj, "POST")
  .then(response => {
    console.log("POST request successful. Response:", response);
  })
  .catch(error => {
    console.error("Error occurred during the request:", error);
  });
```


## liveRequest Function

The `liveRequest` function is used to make a live request to FLO cloud node using WebSockets. It takes the following parameters:

### Parameters

- `floID` (string): The ID of the flo server.
- `request` (object): An object containing filter criteria for the live request. It can have the following properties:
  - `status` (boolean, optional): If true, includes all data in the response. If false, filters the response based on other criteria.
  - `trackList` (array of strings, optional): An array of keys to include in the response when `status` is false.
  - `atVectorClock` (string, optional): Filters data with vector clock equal to the specified value.
  - `lowerVectorClock` (string, optional): Filters data with vector clock greater than or equal to the specified value.
  - `upperVectorClock` (string, optional): Filters data with vector clock less than or equal to the specified value.
  - `afterTime` (number, optional): Filters data with log_time greater than the specified value.
  - `application` (string, optional): Filters data with the specified application.
  - `receiverID` (string, optional): Filters data with the specified receiver ID or proxy ID.
  - `comment` (string, optional): Filters data with the specified comment.
  - `type` (string, optional): Filters data with the specified type.
  - `senderID` (array of strings, optional): Filters data with sender IDs included in the specified array.
  
- `callback` (function): A callback function to handle the response data and errors.

### Return Value

- Returns a Promise that resolves with a unique `randID` (string) representing the live request.

### Example Usage

- In this example, the liveRequest function connects to the specified flo server (floID), sends a live request with the provided filter criteria (request), and handles the response using the callback function.

```javascript
const floID = "exampleFloID";
const request = {
  status: true,
  application: "exampleApp",
  callback: function(data, error) {
    if (error) {
      console.error("Error occurred:", error);
    } else {
      console.log("Filtered data received:", data);
    }
  }
};

liveRequest(floID, request, callback)
  .then(randID => {
    console.log("Live request sent with ID:", randID);
  })
  .catch(error => {
    console.error("Error sending live request:", error);
  });
```


## proxyID Function

The `proxyID` function is used to convert a given address into a proxy ID. It supports various address formats including legacy encoding, bech32 encoding, and public key hex format.

### Parameters

- `address` (string): The input address to be converted into a proxy ID.

### Return Value

- Returns a string representing the proxy ID derived from the input address.

### Address Formats Supported

- **Legacy Encoding (Base58)**
  - Addresses with lengths 33 or 34 characters are supported.
- **Bech32 Encoding**
  - Addresses with lengths 42 or 62 characters are supported.
- **Public Key Hex**
  - Addresses with length 66 characters are supported.

### Example Usage

- In this example, the proxyID function converts a legacy Bitcoin address into a proxy ID. The function automatically detects the input address format and converts it into the corresponding proxy ID format.

```javascript
const address = "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2";

const proxyID = util.proxyID(address);
console.log("Proxy ID:", proxyID);
```



## updateObject Function

The `updateObject` function is used to update an object in the `appObjects` data store based on the incoming dataset. It performs actions like resetting or updating the object based on the dataset's content.

### Parameters

- `objectName` (string): The name of the object to be updated.
- `dataSet` (object): The dataset containing the updates for the specified object.

### Functionality

- The function processes the dataset for the specified object and performs the following actions:
  - If the comment in the dataset is "RESET," the function resets the object with the data provided in the `message.reset` property.
  - If the comment in the dataset is "UPDATE," the function updates the object by merging the changes provided in the `message.diff` property using the `diff.merge` function.

### Example Usage

In this example, the updateObject function processes the dataSet and updates the specified object (exampleObject) based on the provided reset and diff actions. The function maintains the last version control (lastVC) and stores the updated object in the appObjects data store.


```javascript
const objectName = "exampleObject";
const dataSet = {
  "123": { type: "exampleObject", comment: "RESET", message: { reset: { key: "value" } } },
  "456": { type: "exampleObject", comment: "UPDATE", message: { diff: { updatedKey: "updatedValue" } } }
};

updateObject(objectName, dataSet);
```

### Note
- The diff.merge function and other related functions used in the implementation are assumed to be available in the scope where this function is used.


## storeGeneral Function

The `storeGeneral` function is used to store general data entries in the `generalData` data store. It updates the data store with the provided dataset for a specific foreign key (`fk`).

### Parameters

- `fk` (string): The foreign key indicating the category or type of the general data.
- `dataSet` (object): The dataset containing the general data entries to be stored.

### Functionality

- The function updates the `generalData` data store for the specified foreign key with the entries from the provided dataset.
- It checks the `log_time` property of each entry in the dataset and updates the `lastVC` (last version control) property for the specified foreign key with the maximum log time value among the entries.

### Example Usage

- In this example, the storeGeneral function updates the generalData data store for the specified foreign key (exampleForeignKey) with the provided dataset. It also updates the lastVC property with the maximum log time value from the entries in the dataset.

```javascript
const fk = "exampleForeignKey";
const dataSet = {
  "123": { log_time: 1633363200000, data: "Entry 1" },
  "124": { log_time: 1633363800000, data: "Entry 2" },
  // ... more data entries
};

storeGeneral(fk, dataSet);
```

### Note
Ensure that the necessary data structures and storage mechanisms, such as generalData and lastVC, are defined and available in the scope where this function is used.

## objectifier Function

The `objectifier` function is used to transform data from an array format into an object format. It takes an array of data objects as input and returns an object where the keys are taken from the `vectorClock` property of the input objects and the values are the input objects themselves with an additional property `message` that is decoded using the `decodeMessage` function.

### Parameters

- `data` (array or object): The input data to be transformed. If `data` is not an array, it will be converted into a single-element array before processing.

### Return Value

- Returns an object where keys are taken from the `vectorClock` property of the input objects, and the values are objects with the following properties:
  - `vectorClock` (string): The key used in the input data.
  - `message` (string): The decoded message obtained by applying the `decodeMessage` function to the `message` property of the input data.

### Example Usage

```javascript
const inputData = [
  { vectorClock: "12345", message: "Encoded Message 1" },
  { vectorClock: "67890", message: "Encoded Message 2" }
];

const transformedData = objectifier(inputData);
console.log(transformedData);


/*
Output
{
  "12345": { vectorClock: "12345", message: "Decoded Message 1" },
  "67890": { vectorClock: "67890", message: "Decoded Message 2" }
}
*/
```


## setStatus Function

The `setStatus` function is used to set the online status for a user specified by their `user_id` on the floCloud platform. It takes an options object as input, allowing customization of the request parameters.

### Parameters

- `options` (object, optional): An object containing the following properties:
  - `callback` (function, optional): A callback function to handle the response data and errors. If not provided, the default callback function is used.
  - `application` (string, optional): The application name associated with the status update. If not provided, the default application name is used.
  - `refID` (string, optional): The reference ID used for the live request. If not provided, the default admin ID is used.

### Return Value

- Returns a Promise that resolves with the result of the live request upon success.

### Example Usage

- In this example, the setStatus function sets the online status for the user specified by user.id on the floCloud platform. The function allows customization of the request parameters through the options object and provides a callback function to handle the response data and errors.

```javascript
const options = {
  callback: function(data, error) {
    if (error) {
      console.error("Error occurred:", error);
    } else {
      console.log("Status update successful:", data);
    }
  },
  application: "MyApp",
  refID: "admin123"
};

floCloudAPI.setStatus(options)
  .then(result => {
    console.log("Status set successfully:", result);
  })
  .catch(error => {
    console.error("Error setting status:", error);
  });
```

## requestStatus Function

The `requestStatus` function is used to request the status of one or more `floID`s specified in the `trackList`. It sends a live request to obtain the status of the specified `floID`s and returns the response.

### Parameters

- `trackList` (string or array of strings): The `floID`(s) for which the status will be requested. Can be a single `floID` or an array of multiple `floID`s.
- `options` (object, optional): An object containing the following properties:
  - `callback` (function, optional): A callback function to handle the response data and errors. If not provided, the default callback function is used.
  - `application` (string, optional): The application name associated with the status request. If not provided, the default application name is used.
  - `refID` (string, optional): The reference ID used for the live request. If not provided, the default admin ID is used.

### Return Value

- Returns a Promise that resolves with the response data containing the status of the specified `floID`(s) upon success.

### Example Usage

- In this example, the requestStatus function sends a live request to obtain the status of the floID(s) specified in the trackList. The function allows customization of the request parameters through the options object and provides a callback function to handle the response data and errors.

```javascript
const trackList = ["floID1", "floID2", "floID3"];
const options = {
  callback: function(data, error) {
    if (error) {
      console.error("Error occurred:", error);
    } else {
      console.log("Status data received:", data);
    }
  },
  application: "MyApp",
  refID: "admin123"
};

floCloudAPI.requestStatus(trackList, options)
  .then(statusData => {
    console.log("Status request successful:", statusData);
  })
  .catch(error => {
    console.error("Error sending status request:", error);
  });
```

## sendApplicationData Function

The `sendApplicationData` function is used to send application-specific data messages to a receiver identified by their `receiverID`. It allows customization of the message content, type, receiver ID, application name, and additional comments.

### Parameters

- `message` (string): The application-specific message to be sent.
- `type` (string): The type of the application data.
- `options` (object, optional): An object containing the following properties:
  - `receiverID` (string, optional): The ID of the receiver for the application data message. If not provided, the default admin ID is used.
  - `application` (string, optional): The application name associated with the data message. If not provided, the default application name is used.
  - `comment` (string, optional): Additional comments or notes associated with the data message.

### Return Value

- Returns a Promise that resolves with the response data upon successful delivery of the application data message.

### Example Usage

- In this example, the sendApplicationData function sends an application-specific data message with the specified content, type, receiver ID, application name, and additional comments. The function allows customization of the message parameters through the options object and resolves with the response data upon successful delivery of the message.

```javascript
const message = "Hello, this is an application data message.";
const type = "text";
const options = {
  receiverID: "receiverUserID",
  application: "MyApp",
  comment: "Optional comment for the message."
};

floCloudAPI.sendApplicationData(message, type, options)
  .then(response => {
    console.log("Application data message sent successfully:", response);
  })
  .catch(error => {
    console.error("Error occurred while sending application data message:", error);
  });
```

## requestApplicationData Function

The `requestApplicationData` function is a versatile method used to request data from the supernode cloud. It allows customization of the request parameters including the type of data, receiver and sender IDs, application name, vector clocks, timestamp, and request method.

### Parameters

- `type` (string): The type of data to be requested.
- `options` (object, optional): An object containing the following properties:
  - `receiverID` (string, optional): The ID of the receiver for the data request. If not provided, the default admin ID is used.
  - `senderID` (string, optional): The ID of the sender for the data request. If not provided, it's set to `undefined`.
  - `application` (string, optional): The application name associated with the data request. If not provided, the default application name is used.
  - `comment` (string, optional): Additional comments or notes for the data request. If not provided, it's set to `undefined`.
  - `lowerVectorClock` (string, optional): The lower boundary for vector clock filtering. If not provided, it's set to `undefined`.
  - `upperVectorClock` (string, optional): The upper boundary for vector clock filtering. If not provided, it's set to `undefined`.
  - `atVectorClock` (string, optional): The specific vector clock at which the data is requested. If not provided, it's set to `undefined`.
  - `afterTime` (number, optional): Request data after the specified timestamp. If not provided, it's set to `undefined`.
  - `mostRecent` (boolean, optional): If set to `true`, requests the most recent data. If not provided, it's set to `undefined`.
  - `method` (string, optional): The HTTP request method. Default is `"GET"`. Can be `"GET"` or `"POST"`.

### Return Value

- Returns a Promise that resolves with the response data upon successful retrieval of the requested data.

### Example Usage

- In this example, the requestApplicationData function sends a customizable data request to the supernode cloud. It allows flexibility in specifying request parameters, including vector clocks, timestamps, and request method. The function resolves with the response data upon successful retrieval of the requested data.

```javascript
const type = "exampleData";
const options = {
  receiverID: "receiverUserID",
  senderID: "senderUserID",
  application: "MyApp",
  comment: "Optional comment for the request.",
  lowerVectorClock: "123",
  upperVectorClock: "456",
  atVectorClock: "789",
  afterTime: 1633363200000,
  mostRecent: true,
  method: "POST",
  callback: function(data, error) {
    if (error) {
      console.error("Error occurred:", error);
    } else {
      console.log("Data received:", data);
    }
  }
};

floCloudAPI.requestApplicationData(type, options)
  .then(response => {
    console.log("Data request successful:", response);
  })
  .catch(error => {
    console.error("Error sending data request:", error);
  });
```

## editApplicationData Function

The `editApplicationData` function is used by the sender to edit the comment of specific data in the supernode cloud identified by its `vectorClock`. It retrieves the data, verifies the sender's identity, edits the comment, and updates the data in the supernode cloud.

### Parameters

- `vectorClock` (string): The vector clock of the data to be edited.
- `comment_edit` (string): The edited comment to be applied to the data.
- `options` (object, optional): An object containing the following properties:
  - `receiverID` (string, optional): The ID of the receiver for the edited data. If not provided, the default admin ID is used.

### Return Value

- Returns a Promise that resolves with the response data upon successful editing of the data comment.

### Example Usage

- In this example, the editApplicationData function allows the sender to edit the comment of specific data identified by its vectorClock. The function verifies the sender's identity and ensures that only the sender can edit the comment. Upon successful editing, the function resolves with the response data.

```javascript
const vectorClock = "exampleVectorClock123";
const editedComment = "This is the edited comment for the data.";
const options = {
  receiverID: "receiverUserID"
};

floCloudAPI.editApplicationData(vectorClock, editedComment, options)
  .then(response => {
    console.log("Data comment edited successfully:", response);
  })
  .catch(error => {
    console.error("Error editing data comment:", error);
  });
```

## tagApplicationData Function

The `tagApplicationData` function is used by subAdmins to tag specific data in the supernode cloud identified by its `vectorClock`. It allows subAdmins to add tags to the data for organizational purposes.

### Parameters

- `vectorClock` (string): The vector clock of the data to be tagged.
- `tag` (string): The tag to be applied to the data.
- `options` (object, optional): An object containing the following properties:
  - `receiverID` (string, optional): The ID of the receiver for the tagged data. If not provided, the default admin ID is used.

### Return Value

- Returns a Promise that resolves with the response data upon successful tagging of the data.

### Example Usage

- In this example, the tagApplicationData function allows subAdmins to tag specific data identified by its vectorClock. SubAdmins can add tags to the data for organizational purposes. The function ensures that only subAdmins have access to tagging data, and upon successful tagging, it resolves with the response data.

```javascript
const vectorClock = "exampleVectorClock123";
const tag = "important";

floCloudAPI.tagApplicationData(vectorClock, tag)
  .then(response => {
    console.log("Data tagged successfully:", response);
  })
  .catch(error => {
    console.error("Error tagging data:", error);
  });
```

## noteApplicationData Function

The `noteApplicationData` function allows users (receivers) and subAdmins (if the receiver is the `adminID`) to add notes to specific data in the supernode cloud identified by its `vectorClock`.

### Parameters

- `vectorClock` (string): The vector clock of the data to be noted.
- `note` (string): The note to be added to the data.
- `options` (object, optional): An object containing the following properties:
  - `receiverID` (string, optional): The ID of the receiver for the noted data. If not provided, the default admin ID is used.

### Return Value

- Returns a Promise that resolves with the response data upon successful noting of the data.

### Example Usage

- In this example, the noteApplicationData function allows users and subAdmins to add notes to specific data identified by its vectorClock in the supernode cloud. The function ensures that only the receiver and subAdmins (if the receiver is the adminID) can add notes to the data. Upon successful noting, it resolves with the response data.

```javascript
const vectorClock = "exampleVectorClock123";
const note = "This is a note for the data.";

floCloudAPI.noteApplicationData(vectorClock, note)
  .then(response => {
    console.log("Data noted successfully:", response);
  })
  .catch(error => {
    console.error("Error adding note to data:", error);
  });
```

## sendGeneralData Function

The `sendGeneralData` function is used to send general data messages to the supernode cloud. It allows customization of the data content, type, encryption, and other options before sending.

### Parameters

- `message` (object or string): The general data to be sent. It can be an object or a string.
- `type` (string): The type of the general data.
- `options` (object, optional): An object containing the following properties:
  - `encrypt` (boolean or string, optional): If `true`, the `message` will be encrypted using the default encryption key. If a string is provided, it will be used as the encryption key. If not provided or `false`, no encryption will be applied.

### Return Value

- Returns a Promise that resolves with the response data upon successful sending of the general data message.

### Example Usage

- In this example, the sendGeneralData function sends a general data message with the specified content and type to the supernode cloud. The function allows customization of the encryption option through the options object. Upon successful sending, it resolves with the response data.

```javascript
const message = {
  key: "value"
};
const type = "exampleType";
const options = {
  encrypt: true // Encrypt the message using the default encryption key
};

floCloudAPI.sendGeneralData(message, type, options)
  .then(response => {
    console.log("General data sent successfully:", response);
  })
  .catch(error => {
    console.error("Error sending general data:", error);
  });
```

## requestGeneralData Function

The `requestGeneralData` function is used to request general data of a specific type from the supernode cloud. It allows customization of the request parameters including the data type, filtering options, and callback function for data storage and handling.

### Parameters

- `type` (string): The type of general data to be requested.
- `options` (object, optional): An object containing the following properties:
  - `receiverID` (string, optional): The ID of the receiver for the data request. If not provided, the default admin ID is used.
  - `senderID` (string, optional): The ID of the sender for the data request. If not provided, it's set to `undefined`.
  - `application` (string, optional): The application name associated with the data request. If not provided, the default application name is used.
  - `comment` (string, optional): Additional comments or notes for the data request. If not provided, it's set to `undefined`.
  - `lowerVectorClock` (string, optional): The lower boundary for vector clock filtering. If not provided, it's set to `undefined`.
  - `upperVectorClock` (string, optional): The upper boundary for vector clock filtering. If not provided, it's set to `undefined`.
  - `atVectorClock` (string, optional): The specific vector clock at which the data is requested. If not provided, it's set to `undefined`.
  - `afterTime` (number, optional): Request data after the specified timestamp. If not provided, it's set to the last stored vector clock for the specified data type.
  - `mostRecent` (boolean, optional): If set to `true`, requests the most recent data. If not provided, it's set to `undefined`.
  - `callback` (function, optional): A callback function to handle the response data and errors. If provided, the function stores the data and then calls the callback. If not provided, the data is directly resolved.

### Return Value

- Returns a Promise that resolves with the response data upon successful retrieval of the requested general data.

### Example Usage

- In this example, the requestGeneralData function sends a customizable data request to the supernode cloud. It allows flexibility in specifying request parameters, including vector clocks, timestamps, and callback function for data storage and handling. The function resolves with the response data upon successful retrieval of the requested general data.

```javascript
const type = "exampleType";
const options = {
  receiverID: "receiverUserID",
  senderID: "senderUserID",
  application: "MyApp",
  comment: "Optional comment for the request.",
  lowerVectorClock: "123",
  upperVectorClock: "456",
  atVectorClock: "789",
  afterTime: 1633363200000,
  mostRecent: true,
  callback: function(data, error) {
    if (error) {
      console.error("Error occurred:", error);
    } else {
      console.log("Data received:", data);
    }
  }
};

floCloudAPI.requestGeneralData(type, options)
  .then(response => {
    console.log("General data request successful:", response);
  })
  .catch(error => {
    console.error("Error sending general data request:", error);
  });
```

## requestObjectData Function

The `requestObjectData` function is used to request data of a specific object type from the supernode cloud. It allows customization of the request parameters including the object name, filtering options, and callback function for data storage and handling.

### Parameters

- `objectName` (string): The name of the object data to be requested.
- `options` (object, optional): An object containing the following properties:
  - `lowerVectorClock` (string, optional): The lower boundary for vector clock filtering. If not provided, it's set to the last stored vector clock for the specified object data type plus 1.
  - `senderID` (string or array, optional): The sender ID(s) for filtering the data. If not provided, it's set to `null`. If provided, only data from the specified sender(s) will be requested.
  - `mostRecent` (boolean, optional): If set to `true`, requests the most recent data. If not provided, it's set to `true`.
  - `comment` (string, optional): The comment to be applied to the request. If provided, it's set to `'RESET'`.
  - `callback` (function, optional): A callback function to handle the response data and errors. If provided, the function stores the data and then calls the callback. If not provided, the data is directly resolved.

### Return Value

- Returns a Promise that resolves with the response data upon successful retrieval of the requested object data.

### Example Usage

- In this example, the requestObjectData function sends a customizable data request for a specific object type to the supernode cloud. It allows flexibility in specifying request parameters, including vector clocks, sender IDs, and callback function for data storage and handling. The function resolves with the response data upon successful retrieval of the requested object data.

```javascript
const objectName = "exampleObject";
const options = {
  lowerVectorClock: "123",
  senderID: "senderUserID",
  mostRecent: true,
  callback: function(data, error) {
    if (error) {
      console.error("Error occurred:", error);
    } else {
      console.log("Data received:", data);
    }
  }
};

floCloudAPI.requestObjectData(objectName, options)
  .then(response => {
    console.log("Object data request successful:", response);
  })
  .catch(error => {
    console.error("Error sending object data request:", error);
  });
```

## closeRequest Function

The `closeRequest` function is used to close an active request connection to the supernode cloud identified by its `requestID`.

### Parameters

- `requestID` (string): The unique identifier of the request connection to be closed.

### Return Value

- Returns a Promise that resolves with a success message upon successful closure of the request connection.

### Example Usage

- In this example, the closeRequest function closes an active request connection to the supernode cloud based on the provided requestID. Upon successful closure, it resolves with a success message. If the request connection is not found, it rejects with an error message.

```javascript
const requestID = "exampleRequestID";

floCloudAPI.closeRequest(requestID)
  .then(response => {
    console.log("Request connection closed successfully:", response);
  })
  .catch(error => {
    console.error("Error closing request connection:", error);
  });
```

## resetObjectData Function

The `resetObjectData` function is used to reset or initialize an object and send it to the supernode cloud. It sends a reset message containing the initial state of the specified object to the cloud for synchronization.

### Parameters

- `objectName` (string): The name of the object to be reset and sent to the cloud.
- `options` (object, optional): An object containing the following properties:
  - `comment` (string, optional): The comment to be applied to the reset operation. If provided, it's set to `'RESET'`.

### Return Value

- Returns a Promise that resolves with the response data upon successful reset and synchronization of the object data.

### Example Usage

- In this example, the resetObjectData function resets the specified object to its initial state and sends the reset message to the supernode cloud for synchronization. The function allows customization through the options object, including adding a comment to the reset operation. Upon successful reset and synchronization, it resolves with the response data.

```javascript
const objectName = "exampleObject";
const options = {
  comment: "Resetting object to initial state."
};

floCloudAPI.resetObjectData(objectName, options)
  .then(response => {
    console.log("Object data reset and synchronized successfully:", response);
  })
  .catch(error => {
    console.error("Error resetting object data:", error);
  });
```

## updateObjectData Function

The `updateObjectData` function is used to update the differential changes of an object and send them to the supernode cloud. It computes the difference between the last committed state and the current state of the specified object and sends the update message to the cloud for synchronization.

### Parameters

- `objectName` (string): The name of the object whose differential changes need to be sent to the cloud.
- `options` (object, optional): An object containing the following properties:
  - `comment` (string, optional): The comment to be applied to the update operation. If provided, it's set to `'UPDATE'`.

### Return Value

- Returns a Promise that resolves with the response data upon successful update and synchronization of the object's differential changes.

### Example Usage

- In this example, the updateObjectData function computes the differential changes of the specified object and sends the update message to the supernode cloud for synchronization. The function allows customization through the options object, including adding a comment to the update operation. Upon successful update and synchronization, it resolves with the response data.

```javascript
const objectName = "exampleObject";
const options = {
  comment: "Updating object with differential changes."
};

floCloudAPI.updateObjectData(objectName, options)
  .then(response => {
    console.log("Object data updated and synchronized successfully:", response);
  })
  .catch(error => {
    console.error("Error updating object data:", error);
  });
```

## uploadFile Function

The `uploadFile` function is used to upload a file to the supernode cloud. It accepts a file blob or instance of File/Blob, processes the file content, and sends it to the cloud for storage.

### Parameters

- `fileBlob` (File/Blob): The File or Blob instance representing the file to be uploaded.
- `type` (string): The type of data to be associated with the uploaded file.
- `options` (object, optional): An object containing the following properties:
  - `encrypt` (boolean or string, optional): If `true`, encrypts the file data using the default encryption key. If a string is provided, it uses the specified encryption key. If not provided, the file data is not encrypted.

### Return Value

- Returns a Promise that resolves with an object containing vectorClock, receiverID, type, and application upon successful upload of the file.

### Example Usage
- In this example, the uploadFile function uploads a file to the supernode cloud. It accepts a file blob or instance of File/Blob, processes the file content, and sends it to the cloud for storage. The function allows customization through the options object, including encryption of the file data. Upon successful upload, it resolves with an object containing vectorClock, receiverID, type, and application.

```javascript
const fileBlob = new Blob(["File content"], { type: "text/plain" });
const type = "fileData";
const options = {
  encrypt: true
};

floCloudAPI.uploadFile(fileBlob, type, options)
  .then(response => {
    console.log("File uploaded successfully:", response);
  })
  .catch(error => {
    console.error("Error uploading file:", error);
  });
```

## downloadFile Function

The `downloadFile` function is used to download a file from the supernode cloud based on its vectorClock. It retrieves the file data, decrypts it if necessary, and reconstructs the file for download.

### Parameters

- `vectorClock` (string): The vectorClock of the file to be downloaded.
- `options` (object, optional): An object containing the following properties:
  - `type` (string, optional): The type of the data to be downloaded. If not provided, it uses the default type.
  - `decrypt` (boolean or string, optional): If `true`, decrypts the file data using the default decryption key. If a string is provided, it uses the specified decryption key. If not provided, and the file data is encrypted, it rejects the download request.
  
### Return Value

- Returns a Promise that resolves with an object containing the downloaded File instance upon successful download.

### Example Usage

- In this example, the downloadFile function downloads a file from the supernode cloud based on its vectorClock. It allows customization through the options object, including specifying the data type and providing a decryption key if the file data is encrypted. Upon successful download, it resolves with an object containing the downloaded File instance.

```javascript
const vectorClock = "exampleVectorClock";
const options = {
  type: "fileData",
  decrypt: true
};

floCloudAPI.downloadFile(vectorClock, options)
  .then(response => {
    console.log("File downloaded successfully:", response);
    // Use response.file to access the downloaded file instance
  })
  .catch(error => {
    console.error("Error downloading file:", error);
  });
```



