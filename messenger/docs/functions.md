### This is a desciption of what we think are the functions that need some explaining in messenger.js and index.html It does not include explanations for Standard Operations functions for which you need to refer documentation of Standard Operations. It also does not include functions in messenger.js and index.html whose code is self evident. 

## `CheckDB()`

### Description:
This function initializes a database connection based on the configuration provided in `config.json`. It then retrieves data structure information from `data_structure.json` and calculates CRC checksums for each column specified in the data structure. The function then queries each database table specified in `Database.DB.listTable()` and calculates the total number of records and CRC checksums for each table. The results are logged using `console.table`. Any errors during the process are logged using `console.error`.

### Parameters:
None

### Return Type:
- **Promise\<boolean>**: A Promise that resolves to `true` if the database check is successful, and rejects with an error if there is any issue during the process.

### Usage:
```javascript
CheckDB()
    .then(_ => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
```

## `sendRaw(message, recipient, type, encrypt)`

### Description:
This function is at the heart of messenger application. This function sends raw application data messages to a recipient using Supernode Cloud. It allows for optional encryption of the message using the recipient's public key, if available.

### Parameters:
- **message (string)**: The raw message data to be sent.
- **recipient (string)**: The FLO address of the message recipient.
- **type (string)**: The type of the application data message being sent.
- **encrypt (boolean|null, optional)**: If `true`, the message will be encrypted using the recipient's public key. If `null` or `false`, the message will be sent unencrypted. Defaults to `null`.
- **comment (string, optional)**: An optional comment or additional information to be included with the message. Defaults to `undefined`.

### Return Type:
- **Promise\<object>**: A Promise that resolves to the result object from the `floCloudAPI.sendApplicationData()` method upon successful message transmission. Rejects with an error message if there is an issue during the process.

### Usage:
```javascript
sendRaw("Hello, recipient!", "recipient_address", "message_type", true, "Optional comment")
    .then(result => console.log("Message sent successfully:", result))
    .catch(error => console.error("Error sending message:", error));

```
## `initUserDB()`

### Description:
This function initializes the user database for a messenger application. It creates an initial object structure with empty data fields for messages, mails, marked items, chats, groups, encryption keys, blocked contacts, pipeline, friend requests sent and received, responses sent and received, additional data (`flodata`), appendix, user settings, and multisig labels. The function requires specific data, including `floGlobals.application`, `floCrypto`, and `user.id`, to construct the `user_db` variable, which is used as the unique identifier for the user's database. It then initializes the IndexedDB database using the `compactIDB.initDB()` method and sets the default database. Upon successful initialization, it resolves with a success message.

### Prerequisites:
- **floGlobals.application**: The application-specific identifier required for database construction must be available.
- **user.id**: The unique identifier for the user must be available, used in constructing the `user_db` variable.

### Return Type:
- **Promise\<string>**: A Promise that resolves with a success message when the user database initialization is completed successfully. Rejects with an error message if there is any issue during the process.

### Usage:
```javascript
initUserDB()
    .then(message => console.log(message))
    .catch(error => console.error(error));

```

## `messenger.sendMessage(message, receiver)`

Sends a message to the specified recipient via the `sendRaw` function, encrypts the message, and records the message data in the cloud.

### Parameters
- `message` (String): The message to be sent.
- `receiver` (String): The recipient's unique identifier (floID).

### Returns
A Promise that resolves to an object containing the message data and its vector clock.

### Example Usage

```javascript
messenger.sendMessage("Hello, World!", "recipientFloID")
    .then(response => {
        console.log("Message sent successfully:", response);
    })
    .catch(error => {
        console.error("Error sending message:", error);
    });

```

## `listRequests(obs, options = null)`

Retrieves a list of requests from the specified `obs` (objects) based on the provided filtering options.

### Parameters
- `obs` (Object): The objects from which to retrieve requests.
- `options` (Object, optional): An object containing filtering options.
  - `type` (String): Filters requests by type.
  - `floID` (String): Filters requests by floID.
  - `completed` (Boolean): Filters requests based on their completion status.

### Returns
A Promise that resolves to an object containing filtered requests based on the specified options.

### Example Usage

```javascript
listRequests(myObjects, { type: "sampleType", completed: true })
    .then(filteredRequests => {
        console.log("Filtered requests:", filteredRequests);
    })
    .catch(error => {
        console.error("Error filtering requests:", error);
    });

    messenger.list_request_sent = (options = null) => listRequests('request_sent', options);
    messenger.list_request_received = (options = null) => listRequests('request_received', options);
    messenger.list_response_sent = (options = null) => listRequests('response_sent', options);
    messenger.list_response_received = (options = null) => listRequests('response_received', options);


```

## `processData.direct()`

Processes incoming data for individual user mails and messages and updates the local database accordingly.

### Description
This function processes incoming data, decrypts messages if necessary, and updates the local database (`compactIDB`). It handles different types of incoming messages and actions, including regular messages, requests, responses, mails, group creation, key revocation, and pipeline creation.

### Parameters
- `unparsed` (Object): The incoming data to be processed.
- `newInbox` (Object): An object representing the updated inbox with categorized messages, requests, responses, mails, and more.

### Types of Messages Processed
- **MESSAGE**: Processed as a regular message. Stores the message data, encrypts the message, and updates the chats and messages databases.
- **REQUEST**: Processed as a request. Records the request data and updates the request database.
- **RESPONSE**: Processed as a response. Parses the response data, updates the response database, and marks the corresponding request as completed.
- **MAIL**: Processed as a mail. Parses mail data, encrypts the content, and updates the mails database.
- **CREATE_GROUP**: Processed for group creation. Verifies the group information, encrypts sensitive data, and updates the groups database. Requests the group inbox and adds the new group to the inbox.
- **REVOKE_KEY**: Processed for key revocation. Verifies sender credentials, revokes the group key, and updates the groups database. Adds the group to the key revocation list.
- **CREATE_PIPELINE**: Processed for pipeline creation. Encrypts sensitive data, updates the pipeline database, requests the pipeline inbox, and adds the pipeline to the inbox.

### Throws
- **"blocked-user"**: If the sender is blocked and the message type is not "REVOKE_KEY".

### Note
Ensure that the necessary functions (`floDapps.storePubKey`, `encrypt`, `addMark`, `requestGroupInbox`, `requestPipelineInbox`, etc.) and database (`compactIDB`) operations are correctly implemented for this function to work as expected.

## `requestDirectInbox()`

Requests and processes direct inbox data from the server, updating the local database and user interface accordingly.

### Description
This function establishes a connection to the server to fetch direct inbox data for the user. It processes the received data using the `processData.direct()` function and updates the local database (`compactIDB`) and user interface (UI) based on the categorized messages, requests, responses, mails, new group notifications, key revocations, and pipelines.

### Parameters
- None

### Returns
A Promise that resolves to a success message when the direct inbox data is successfully fetched and processed.

### Function Behavior
1. **Closes Existing Connection**: If there's an existing request connection (`directConnID`), it is closed to prepare for a new request.
2. **Fetches Data**: Requests application data from the server using `floCloudAPI.requestApplicationData` with the user ID and lower vector clock.
3. **Processes Data**: Processes the received data using the `processData.direct()` function, categorizing messages, requests, responses, mails, new group notifications, key revocations, and pipelines.
4. **Updates Local Database**: Updates the local database (`compactIDB`) with the latest received vector clock and stores it in the `appendix` table.
5. **Updates User Interface**: Passes the categorized data to the UI component for rendering.

### Throws
- **Error**: If there's an issue with the server request or data processing.

### Note
Ensure that the necessary functions (`processData.direct`, `floCloudAPI.requestApplicationData`, `compactIDB.writeData`, etc.) and components (UI) are correctly implemented and accessible for this function to work as expected.

## `getChatOrder(separate = false)`

Gets the order of chats, groups, and pipelines for the messenger application.

### Description
This function retrieves the order of chats, groups, and pipelines based on their last received messages' vector clocks. It can return separate arrays for direct chats, groups, and pipelines, or a combined array containing all of them, sorted in descending order of their last received messages.

### Parameters
- `separate` (Boolean, optional): If `true`, returns separate arrays for direct chats, groups, and pipelines. If `false` (default), returns a combined array.

### Returns
An array or an object with separate arrays based on the `separate` parameter:
- **When `separate` is `true`**:
  - `result.direct` (Array): An array of direct chat IDs, sorted by their last received messages' vector clocks.
  - `result.group` (Array): An array of group IDs, sorted by their last received messages' vector clocks.
  - `result.pipeline` (Array): An array of pipeline IDs, sorted by their last received messages' vector clocks.
- **When `separate` is `false`**:
  - An array containing IDs of direct chats, groups, and pipelines combined, sorted by their last received messages' vector clocks.

### Example Usage

```javascript
const chatOrder = getChatOrder(true);
console.log("Separate Chat Order:", chatOrder.direct, chatOrder.group, chatOrder.pipeline);

const combinedOrder = getChatOrder();
console.log("Combined Chat Order:", combinedOrder);
```
### Throws
None

### Note
Ensure that the necessary data structures (_loaded.chats, _loaded.groups, _loaded.pipeline, _loaded.appendix) are correctly populated for this function to provide accurate results.
```javascript
const chatOrder = getChatOrder(true);
console.log("Separate Chat Order:", chatOrder.direct, chatOrder.group, chatOrder.pipeline);

const combinedOrder = getChatOrder();
console.log("Combined Chat Order:", combinedOrder);
```

## `loadDataFromIDB(defaultList = true)`

Loads data from IndexedDB (IDB) and decrypts it if necessary, returning the processed data.

### Description
This function reads specified data from IndexedDB (`compactIDB`) and decrypts the content using the AES key if present. It handles different data categories, such as messages, mails, groups, keys, pipeline, blocked users, and appendix data.

### Parameters
- `defaultList` (Boolean, optional): If `true`, loads default data categories including mails, marked messages, groups, pipeline, chats, blocked users, and appendix. If `false`, loads additional categories including individual messages, mails, marked messages, chats, groups, group keys, pipeline, blocked users, and appendix. Default is `true`.

### Returns
A Promise that resolves to an object containing the loaded and processed data.

### Function Behavior
1. **Determine Data Categories**: Based on `defaultList` parameter, selects the appropriate data categories to load from IndexedDB.
2. **Decrypt Data (if AES Key exists)**: If an AES key is found in the data, decrypts messages, mails, group keys, pipeline, and other sensitive content using the AES key.
3. **Handle Missing AES Key**: If the AES key is not found and there are existing mails, generates a new AES key, encrypts it with the user's public key, and stores it in the appendix.
4. **Resolve or Reject Promise**: Resolves the promise with the processed data if successful. Rejects the promise with an error message if any issues occur during data loading or decryption.

### Throws
- **"Corrupted AES Key"**: If the AES key is corrupted or cannot decrypt the data.
- **"AES Key not Found"**: If the AES key is not found, and there are existing mails in the data.

### Note
Ensure that the necessary functions (`floCrypto.randString`, `floCrypto.encryptData`, `decrypt`, etc.) and the IndexedDB (`compactIDB`) operations are correctly implemented for this function to work as expected.

## `messenger.backupData()`

Creates a backup of user data including contacts, public keys, and encrypted application data.

### Description
This function generates a backup of user-specific data from IndexedDB (`compactIDB`) and additional global data (contacts and public keys) stored in `floGlobals`. The backup data is encrypted and signed before being returned as a downloadable Blob object.

### Returns
A Promise that resolves to a Blob containing the encrypted and signed backup data in JSON format.

### Function Behavior
1. **Load Data**: Calls `loadDataFromIDB(false)` to load user-specific data from IndexedDB, excluding default categories.
2. **Prepare Backup Object**: Removes the AES key from the data, adds global contacts and public keys, and encodes the data to Base64.
3. **Encrypt Data**: Encrypts the prepared data using the user's encryption function (`floDapps.user.encipher`).
4. **Sign Data**: Signs the encrypted data using the user's signing function (`floDapps.user.sign`).
5. **Create Blob**: Creates a Blob object containing the signed JSON data.
6. **Resolve Promise**: Resolves the promise with the generated Blob.

### Throws
- Any error encountered during data loading, encryption, or signing process.

### Note
Ensure that the necessary functions (`loadDataFromIDB`, `floDapps.user.encipher`, `floDapps.user.sign`, etc.) and IndexedDB (`compactIDB`) operations are correctly implemented for this function to generate a valid backup.

## `messenger.parseBackup(blob)`

Parses and verifies the integrity of a backup file, decrypting and returning the original data.

### Description
This function takes a Blob or File object representing a backup file and performs the following steps: verifies the signature, validates the user ID and public key, decrypts the data, and parses the decoded data. If successful, the original user data is returned.

### Parameters
- `blob` (Blob or File): The backup file as a Blob or File object.

### Returns
A Promise that resolves to the parsed and decrypted user data from the backup.

### Function Behavior
1. **Check Blob Type**: Verifies if the input is a valid Blob or File object.
2. **Read Blob Content**: Reads the content of the Blob using a FileReader.
3. **Verify Signature**: Verifies the signature of the Blob data using the public key included in the Blob.
4. **Validate User ID and Public Key**: Ensures the user ID and public key in the Blob match the current user's credentials.
5. **Decrypt Data**: Decrypts the encrypted data using the user's decryption function (`floDapps.user.decipher`).
6. **Decode Data**: Decodes the decrypted data from Base64 and parses it into a JSON object.
7. **Resolve Promise**: Resolves the promise with the parsed user data if all steps are successful.

### Throws
- **"Corrupted Backup file: Signature verification failed"**: If the signature verification fails.
- **"Invalid Backup file: Incorrect floID"**: If the user ID or public key in the backup file does not match the current user's credentials.
- **"Corrupted Backup file: Decryption failed"**: If the decryption process fails.
- **"Corrupted Backup file: Parse failed"**: If parsing the decrypted data fails.

### Note
Ensure that the necessary functions (`floCrypto.verifySign`, `floDapps.user.decipher`, etc.) are correctly implemented for this function to successfully verify, decrypt, and parse the backup file.

## `messenger.restoreData(arg)`

Restores user data from a backup, encrypts the messages, and updates IndexedDB (`compactIDB`) with the restored data.

### Description
This function restores user data from a backup (Blob or File object), decrypts it, encrypts the messages, and updates the appropriate IndexedDB categories (`contacts`, `pubKeys`, `messages`, `mails`, `chats`, `groups`, `gkeys`, `pipeline`, `blocked`, and `appendix`) with the restored and processed data. It selectively updates data based on the latest received vector clocks.

### Parameters
- `arg` (Blob, File, or Object): The backup data as a Blob, File, or parsed Object.

### Returns
A Promise that resolves to a success message if the restoration is successful.

### Function Behavior
1. **Determine Input Type**: Checks if the input is a Blob or File object. If it's an Object, skips the parsing step.
2. **Parse Backup Data**: Parses the backup data using `parseBackup` function, decrypting and verifying the data.
3. **Encrypt Messages and Sensitive Data**: Encrypts the messages, mail contents, group keys, and pipeline keys in the restored data.
4. **Selective Update**: Compares the vector clocks of restored data with the current state of `compactIDB` and selectively updates data in IndexedDB.
5. **Update Contacts and Public Keys**: Updates contacts and public keys stored in `floGlobals` if they are not present in the restored data.
6. **Write Data to IndexedDB**: Writes the updated data to the appropriate categories in IndexedDB.
7. **Resolve Promise**: Resolves the promise with a success message if the restoration and data update are successful.

### Throws
- **"Restore Failed: Unable to write to IDB"**: If there is an error while updating data in IndexedDB.
- Any error encountered during data processing, encryption, or verification.

### Note
Ensure that the necessary functions (`parseBackup`, `floDapps.storeContact`, `floDapps.storePubKey`, `compactIDB.writeData`, etc.) and IndexedDB (`compactIDB`) operations are correctly implemented for this function to successfully restore and update the data.

## `messenger.clearUserData()`

Clears all user-related data, including IndexedDB databases and credentials, ensuring a clean slate.

### Description
This function clears all user-specific data stored in IndexedDB, removes the last transaction details, and clears user credentials, providing a fresh start for the user. It performs a series of operations to ensure the removal of user data and related artifacts.

### Returns
A Promise that resolves to a success message if the user data is cleared successfully.

### Function Behavior
1. **Generate User FloID**: Computes the FLO blockchain identifier (FloID) for the current user.
2. **Create Promises Array**: Forms an array of promises for clearing user data, including IndexedDB databases and credentials.
    - **CompactIDB Delete**: Deletes the specific IndexedDB database associated with the user (`${floGlobals.application}_${user_floID}`).
    - **CompactIDB Remove Last Tx**: Removes the last transaction details associated with the user and application.
    - **FloDapps Clear Credentials**: Clears user credentials and any associated authentication tokens.
3. **Execute Promises**: Executes all promises concurrently using `Promise.all`.
4. **Resolve Promise**: Resolves the promise with a success message if the clearing process is successful.

### Throws
- Any error encountered during the clearing process, including errors from IndexedDB deletion or credential clearing.

### Note
Ensure that the necessary functions (`compactIDB.deleteDB`, `compactIDB.removeData`, `floDapps.clearCredentials`, etc.) and IndexedDB (`compactIDB`) operations are correctly implemented for this function to successfully clear user data.

## `messenger.createGroup(groupname, description = '')`

Creates a new group, generates group keys, and stores group information in IndexedDB.

### Description
This function creates a new group with the given `groupname` and optional `description`. It generates unique group identifiers, administers encryption keys, and adds the group information to IndexedDB categories (`groups` and `gkeys`). The function ensures data integrity and encryption for the newly created group.

### Parameters
- `groupname` (String): The name of the group to be created.
- `description` (String, optional): A description of the group (default is an empty string).

### Returns
A Promise that resolves to the group information object if the group creation is successful.

### Function Behavior
1. **Validate Group Name**: Checks if `groupname` is provided; if not, rejects the promise with "Invalid Group Name" error.
2. **Generate Group Identifiers**: Generates a unique group FloID and public-private key pair.
3. **Create Group Information**: Forms an object containing essential group information, including group ID, public key, admin ID, name, description, creation timestamp, and member list.
4. **Create Group Hash**: Constructs a hash from specific group properties (`groupID`, `created`, `admin`) and signs it with the group's private key, ensuring data integrity.
5. **Generate Encryption Key**: Generates a random encryption key (`eKey`) for group messages.
6. **Store Data in IndexedDB**: Adds the group information to `groups` and the encrypted private key to `gkeys` in IndexedDB.
7. **Update Loaded Groups**: Adds the group information to the local loaded groups (`_loaded.groups`).
8. **Request Group Inbox**: Initiates the request for the group's inbox messages.
9. **Resolve Promise**: Resolves the promise with the created group information object if the creation process is successful.

### Throws
- **"Invalid Group Name"**: If `groupname` is not provided or empty.
- Any error encountered during IndexedDB data storage or group creation process.

### Note
Ensure that the necessary functions (`floCrypto.generateNewID`, `floCrypto.signData`, `encrypt`, `compactIDB.addData`, etc.) and IndexedDB (`compactIDB`) operations are correctly implemented for this function to successfully create and store group information.

## `messenger.createGroup(groupname, description = '')`

Creates a new group, generates group keys, and stores group information in IndexedDB.

### Description
This function creates a new group with the given `groupname` and optional `description`. It generates unique group identifiers, administers encryption keys, and adds the group information to IndexedDB categories (`groups` and `gkeys`). The function ensures data integrity and encryption for the newly created group.

### Parameters
- `groupname` (String): The name of the group to be created.
- `description` (String, optional): A description of the group (default is an empty string).

### Returns
A Promise that resolves to the group information object if the group creation is successful.

### Function Behavior
1. **Validate Group Name**: Checks if `groupname` is provided; if not, rejects the promise with "Invalid Group Name" error.
2. **Generate Group Identifiers**: Generates a unique group FloID and public-private key pair.
3. **Create Group Information**: Forms an object containing essential group information, including group ID, public key, admin ID, name, description, creation timestamp, and member list.
4. **Create Group Hash**: Constructs a hash from specific group properties (`groupID`, `created`, `admin`) and signs it with the group's private key, ensuring data integrity.
5. **Generate Encryption Key**: Generates a random encryption key (`eKey`) for group messages.
6. **Store Data in IndexedDB**: Adds the group information to `groups` and the encrypted private key to `gkeys` in IndexedDB.
7. **Update Loaded Groups**: Adds the group information to the local loaded groups (`_loaded.groups`).
8. **Request Group Inbox**: Initiates the request for the group's inbox messages.
9. **Resolve Promise**: Resolves the promise with the created group information object if the creation process is successful.

### Throws
- **"Invalid Group Name"**: If `groupname` is not provided or empty.
- Any error encountered during IndexedDB data storage or group creation process.

### Note
Ensure that the necessary functions (`floCrypto.generateNewID`, `floCrypto.signData`, `encrypt`, `compactIDB.addData`, etc.) and IndexedDB (`compactIDB`) operations are correctly implemented for this function to successfully create and store group information.

## `messenger.addGroupMembers(groupID, newMem, note = undefined)`

Adds new members to an existing group, ensuring valid addresses and pubKeys.

### Description
This function allows the group admin to add new members (`newMem`) to an existing group identified by `groupID`. It validates the provided member addresses and pubKeys, sends group information to the new members for approval, and updates the group with the approved members. The function handles errors for invalid addresses, unavailable pubKeys, and unauthorized access.

### Parameters
- `groupID` (String): The unique ID of the group to which new members will be added.
- `newMem` (Array or String): An array of FLO addresses or a single FLO address string representing the new members to be added.
- `note` (String, optional): An optional note or message associated with the addition of new members.

### Returns
A Promise that resolves to a success message if the new members are added successfully.

### Function Behavior
1. **Validate Member Data**: Checks if `newMem` is an array of strings or a single string; if not, converts it to an array. Validates each member address:
    - Checks for valid FLO addresses and available pubKeys. Separates invalid members into two arrays (`imem1` for invalid FLO addresses and `imem2` for FLO addresses with missing pubKeys).
2. **Access Control**: Ensures that the user invoking the function is the group admin. If not, rejects the promise with "Access denied: Admin only!" error.
3. **Encrypt Group Info**: Encrypts the JSON representation of the group (`groupInfo`) using the group's encryption key (`k`).
4. **Send Group Info to New Members**: Sends the encrypted group information to each new member asynchronously using `sendRaw`. Collects the results into `success` and `failed` arrays based on the success of the operation.
5. **Encrypt and Send Approval Message**: Encrypts the approved new member list (`success.join("|")`) using the group's encryption key and sends it to the group.
6. **Resolve Promise**: Resolves the promise with a success message indicating the added members if the process is successful.

### Throws
- **"Invalid Members(floIDs)"**: If any member address in `newMem` is not a valid FLO address.
- **"Invalid Members (pubKey not available)"**: If any member address in `newMem` does not have an available public key.
- **"Access denied: Admin only!"**: If the invoking user is not the admin of the specified group.
- Any error encountered during the member addition process.

### Note
Ensure that the necessary functions (`floCrypto.validateAddr`, `floGlobals.pubKeys`, `sendRaw`, `encrypt`, etc.) and group data (`_loaded.groups[groupID]`) are correctly implemented for this function to successfully add new members to the group.

## `messenger.rmGroupMembers(groupID, rmMem, note = undefined)`

Removes members from an existing group, ensuring valid members and admin access.

### Description
This function allows the group admin to remove specified members (`rmMem`) from an existing group identified by `groupID`. It validates the provided members, sends a removal request to the group, revokes access for the removed members, and updates the group membership. The function handles errors for invalid members, unauthorized access, and any issues during the removal process.

### Parameters
- `groupID` (String): The unique ID of the group from which members will be removed.
- `rmMem` (Array or String): An array of FLO addresses or a single FLO address string representing the members to be removed.
- `note` (String, optional): An optional note or message associated with the member removal.

### Returns
A Promise that resolves to a success message if the members are removed successfully.

### Function Behavior
1. **Validate Member Data**: Checks if `rmMem` is an array of strings or a single string; if not, converts it to an array. Filters invalid members (`imem`) not present in the group.
2. **Access Control**: Ensures that the user invoking the function is the group admin. If not, rejects the promise with "Access denied: Admin only!" error.
3. **Encrypt and Send Removal Request**: Encrypts the list of members to be removed (`rmMem.join("|")`) using the group's encryption key and sends it as a removal request to the group using `sendRaw`.
4. **Update Group Membership**: Removes the specified members from the group's `members` array.
5. **Revoke Access for Removed Members**: Calls `revokeKey(groupID)` to revoke access for the removed members.
6. **Resolve Promise**: Resolves the promise with a success message indicating the removed members if the process is successful.

### Throws
- **"Invalid members"**: If any member in `rmMem` is not present in the group.
- **"Access denied: Admin only!"**: If the invoking user is not the admin of the specified group.
- Any error encountered during the member removal process.

### Note
Ensure that the necessary functions (`floCrypto.validateAddr`, `sendRaw`, `encrypt`, `revokeKey`, etc.) and group data (`_loaded.groups[groupID]`) are correctly implemented for this function to successfully remove members from the group.

## `messenger.disableGroup(groupID)`

Disables a specified group and closes the corresponding connection.

### Description
This function allows the user to disable a specific group identified by `groupID`. Disabling a group marks it as inactive and also encrypts the group's encryption key (`eKey`). Additionally, it closes the active request connection associated with the group (`groupConnID[groupID]`). The function handles group disabling, encryption of the encryption key, and resolves with a success message or rejects with an error message in case of failure.

### Parameters
- `groupID` (String): The unique ID of the group to be disabled.

### Returns
A Promise that resolves with a success message indicating the successful disabling of the group and closure of the connection.

### Function Behavior
1. **Validation**: Checks if the specified group (`_loaded.groups[groupID]`) exists. If not, rejects with an error message ("Group not found").
2. **Disabling Group**: Marks the group as disabled by setting the `disabled` property to `true`.
3. **Encryption**: Encrypts the group's encryption key (`eKey`) to enhance security before storing it in the local database.
4. **Database Update**: Writes the updated group information to the local database (`compactIDB.writeData("groups", groupInfo, groupID)`).
5. **Connection Closure**: Closes the active request connection associated with the group (`floCloudAPI.closeRequest(groupConnID[groupID])`).
6. **Resolution**: Resolves the promise with a success message ("Group disabled") upon successful disabling and closure of the connection.
7. **Rejection**: Rejects the promise with an error message in case of any errors during validation, encryption, database update, or connection closure.

### Throws
- "Group not found": If the specified group does not exist.
- "Group already disabled": If the specified group is already disabled.
- Any error encountered during encryption, database update, or connection closure.

### Note
Ensure that the specified group (`_loaded.groups[groupID]`) exists and has an active connection (`groupConnID[groupID]`) before disabling it.

## `processData.group(groupID)`

Processes incoming group-specific data and updates the local database accordingly.

### Description
This function processes incoming group-specific data and decrypts messages if necessary. It updates the local database (`compactIDB`) based on the type of incoming data, including group messages, member additions, description updates, member removals, and group name changes. The function handles different types of group-related actions, decrypts messages using the appropriate encryption key (`eKey`), and updates the local database and inbox accordingly.

### Parameters
- `groupID` (String): The unique ID of the group to which the incoming data belongs.

### Returns
A function that takes `unparsed` data and `newInbox` object as parameters. It processes the data, updates the local database, and returns a boolean value indicating whether there were changes in group information (`true` if there were changes, `false` otherwise).

### Function Behavior
1. **Validation**: Checks if the sender (`unparsed.senderID`) is a member of the specified group (`_loaded.groups[groupID].members`). If not, ignores the incoming data.
2. **Public Key Storage**: Stores the sender's public key (`unparsed.pubKey`) if not stored already using `floDapps.storePubKey`.
3. **Data Preparation**: Prepares a `data` object containing essential information such as timestamp (`time`), sender (`sender`), and group ID (`groupID`).
4. **Encryption Key Retrieval**: Retrieves the appropriate encryption key (`eKey`) for decryption based on the group's expiry keys (`expiredKeys[groupID]`). If expiry keys exist, decrypts messages using the corresponding key.
5. **Message Decryption**: Decrypts incoming messages (`unparsed.message`) using the retrieved or default encryption key (`k`).
6. **Info Change Detection**: Detects changes in group information, such as member additions, description updates, member removals, or group name changes. Sets `infoChange` to `true` if there were changes; otherwise, sets it to `false`.
7. **Database Update**: Writes the processed data (`data`) to the local database (`compactIDB.addData("messages", Object.assign({}, data), `${groupID}|${vc}`)`).
8. **Inbox Update**: Updates the `newInbox` object with the processed data (`newInbox.messages[vc] = data`).
9. **Unread Marking**: Marks the group as unread if the sender is not the current user.
10. **Returns**: Returns `infoChange`, indicating whether there were changes in group information.

### Throws
- No specific exceptions are thrown from this function. Errors are typically handled within the function logic and returned as `infoChange` value.

### Note
Ensure that the sender is a valid member of the group before processing the incoming data.

## `requestGroupInbox(groupID, _async = true)`

Requests group-specific data from the server and updates the local group inbox accordingly.

### Description
This function establishes a connection with the server to receive group-specific data. It processes incoming data using the `processData.group` function, updates the local group inbox, and writes relevant information to the local database (`compactIDB`). The function handles group messages, member additions, description updates, member removals, and group name changes.

### Parameters
- `groupID` (String): The unique ID of the group for which the data is requested.
- `_async` (Boolean, Default: `true`): A flag indicating whether to request data asynchronously (`true`) or synchronously (`false`). When set to `false`, the function returns a promise.

### Returns
- If `_async` is `true`, the function establishes a connection with the server and returns `undefined`.
- If `_async` is `false`, the function returns a promise that resolves with a success message if the connection is established successfully. Otherwise, it rejects with an error message.

### Function Behavior
1. **Connection Closure**: Closes any existing request connection for the specified `groupID` (if any) using `floCloudAPI.closeRequest`.
2. **Data Processing**: Defines a `parseData` function using `processData.group(groupID)`.
3. **Callback Function**: Defines a `callbackFn` function that processes incoming data, updates the local group inbox (`newInbox`), and writes relevant information to the local database (`compactIDB`). If there are changes in group information (`infoChange` is `true`), updates the group information in the local database.
4. **Connection Request**: Requests group-specific data from the server using `floCloudAPI.requestApplicationData`.
5. **Asynchronous Mode**: If `_async` is `true`, establishes the connection asynchronously and stores the connection ID (`conn_id`) in `groupConnID[groupID]`.
6. **Synchronous Mode**: If `_async` is `false`, returns a promise that resolves with a success message if the connection is established successfully. Otherwise, it rejects with an error message.

### Throws
- No specific exceptions are thrown from this function. Errors are typically logged to the console.

### Note
Ensure that the `groupID` provided is valid, and the user has appropriate permissions to access the group's data.

## `messenger.init()`

Initializes the messenger application, loading user data, and establishing connections for direct messages, group messages, and pipeline data.

### Description
This function sets up the messenger application by initializing the user's local database, loading data from IndexedDB, and requesting necessary data from the cloud and blockchain. It prepares the application state, loads chat and mail data, and establishes connections for receiving direct messages, group messages, and pipeline updates.

### Function Behavior
1. **User Database Initialization**: Initializes the user's local database using the `initUserDB` function.
2. **Data Loading**: Loads data from IndexedDB using the `loadDataFromIDB` function. Updates the `_loaded` object with the loaded data for chats, mails, groups, pipeline, marked items, and blocked users.
3. **UI Rendering**: Calls UI rendering functions to display chat order, mails, and marked items.
4. **Data Requests**: Requests data from the cloud for direct messages and from groups and pipelines. Initiates connections for incoming messages and updates.
5. **Blockchain Data Loading**: Loads additional data from the blockchain using the `loadDataFromBlockchain` function.
6. **Promise Handling**: Resolves the promise if the initialization is successful, providing a success message. Rejects the promise if there are errors during the initialization process.

### Throws
- This function may throw errors if there are issues with initializing the user's database, loading data from IndexedDB, establishing connections, or loading data from the blockchain. Specific error messages will be provided in the rejection of the returned promise.

### Note
Ensure that the user has proper permissions and access to the required data sources (IndexedDB, cloud server, and blockchain) for successful initialization.

## `messenger.loadDataFromBlockchain()`

Loads additional data from the blockchain to supplement the user's local database.

### Description
This function retrieves data related to the messenger application from the FLO blockchain. It queries the blockchain for relevant transactions, processes the data, and updates the local IndexedDB. This ensures that the messenger application has the latest information from the blockchain.

### Function Behavior
1. **User Identification**: Converts the user's ID to a valid FLO address (`user_floID`) using `floCrypto.toFloID()`. If the user ID is invalid, the function rejects the promise.
2. **Query Preparation**: Prepares query options for reading data from the blockchain, including the application pattern and transaction tracking.
3. **Blockchain Data Retrieval**: Utilizes the FLO blockchain API (`floBlockchainAPI.readData()`) to fetch relevant data associated with the user's address.
4. **Data Processing and Storage**: Processes retrieved transactions, extracting application-specific data, and stores it in the local IndexedDB under the `flodata` table. Each transaction's content is stored along with its timestamp and transaction ID.
5. **Last Transaction Update**: Updates the `lastTx` entry in the local database, ensuring subsequent requests fetch only new transactions.
6. **Promise Handling**: Resolves the promise with `true` upon successful data retrieval and storage. Rejects the promise if there are errors during the process.

### Throws
- This function may throw errors if there are issues with querying the blockchain or writing data to IndexedDB. Specific error messages will be provided in the rejection of the returned promise.

### Note
Ensure that the user's address is valid and accessible on the FLO blockchain for successful data retrieval.

## `MultiSig.createAddress(pubKeys: string[], minRequired: number)`

Creates a multi-signature (multisig) Bitcoin address using the specified public keys and minimum required signatures.

### Description
This function generates a multisig Bitcoin address by combining multiple public keys and setting a minimum required number of signatures for transactions. Multisig addresses enhance security by requiring authorization from multiple parties to access the funds associated with the address.

### Parameters
- `pubKeys` (Array of Strings): An array of public keys (in hexadecimal format) belonging to the co-owners of the multisig address.
- `minRequired` (Number): The minimum number of signatures required to authorize a transaction from the multisig address.

### Function Behavior
1. **Public Key Validation**: Validates each public key provided in the `pubKeys` array. If any key is invalid, the function rejects the promise with an error message.
2. **Private Key Retrieval**: Retrieves the user's private key asynchronously.
3. **Multisig Address Creation**: Utilizes the `btcOperator.multiSigAddress()` function to create a multisig address based on the provided public keys and minimum required signatures.
4. **Blockchain Transaction**: Writes the multisig address information to the FLO blockchain, associating it with the provided public keys.
5. **Local Storage**: Stores the multisig address data locally in the `flodata` table of IndexedDB for future reference.
6. **Promise Handling**: Resolves the promise with the generated multisig Bitcoin address upon successful creation. Rejects the promise with an error message if any step encounters issues.

### Throws
- This function may throw errors if there are problems with public key validation, multisig address creation, blockchain transaction writing, or data storage. Specific error messages will be provided in the rejection of the returned promise.

### Note
- Ensure that the provided public keys are valid and accessible for creating a multisig address.
- The multisig address generated by this function requires at least `minRequired` signatures from the specified public keys to authorize transactions.

## `MultiSig.listAddress()`

Lists all valid multi-signature (multisig) Bitcoin addresses associated with the user.

### Description
This function retrieves and validates multisig Bitcoin addresses stored in the local IndexedDB database. It checks the validity of each multisig address and ensures that the user is a part of the multisig group.

### Function Behavior
1. **Database Query**: Searches the local IndexedDB database (`flodata` table) for multisig addresses stored under the `TYPE_BTC_MULTISIG` key.
2. **Address Validation**: Validates each retrieved multisig address by decoding its redeem script and ensuring it meets the necessary criteria:
    - It is a multisig address.
    - The user's public key is part of the multisig group.
    - The number of required signatures is valid.
3. **Data Extraction**: Extracts relevant information about the valid multisig addresses, including the redeem script, associated public keys, minimum required signatures, timestamp, and transaction ID.
4. **Result Formatting**: Constructs an object where the keys are valid multisig Bitcoin addresses, and the values are objects containing detailed information about each address.
5. **Promise Handling**: Resolves the promise with the object containing valid multisig addresses upon successful retrieval. Rejects the promise with an error message if any issues occur during the process.

### Returns
- A Promise that resolves with an object where the keys are valid multisig Bitcoin addresses, and the values are objects containing detailed information about each address.

### Throws
- This function may throw errors if there are problems with database querying, address validation, or data extraction. Specific error messages will be provided in the rejection of the returned promise.

### Note
- Ensure that the multisig addresses stored in the local database are accurate and valid.
- This function is designed to provide information about multisig addresses associated with the user for user-specific use cases or display purposes.

## `MultiSig.createTx_BTC(address, redeemScript, receivers, amounts, fee = null, options = {})`

Creates a multi-signature (multisig) Bitcoin transaction and sends it to the specified receivers.

### Description
This function generates a multisig Bitcoin transaction for a given multisig address (`address`) and its corresponding redeem script (`redeemScript`). It specifies the receivers of the transaction and the respective amounts to be sent to each receiver. Additionally, it allows for setting a custom transaction fee (`fee`) and additional transaction options (`options`).

### Parameters
- `address`: Multisig Bitcoin address for the transaction.
- `redeemScript`: Redeem script corresponding to the multisig address.
- `receivers`: An array of recipient addresses to receive BTC from the transaction.
- `amounts`: An array specifying the amounts of BTC to be sent to each corresponding receiver address.
- `fee` (optional): Custom transaction fee (in BTC) to be included in the transaction. If not provided, the default fee will be calculated.
- `options` (optional): Additional options for the transaction (if any).

### Function Behavior
1. **Address Validation**: Validates the provided sender `address` and its `redeemScript` to ensure it is a valid multisig address and the user is a part of the multisig group.
2. **Transaction Creation**: Creates a multisig Bitcoin transaction with the specified receivers, amounts, and optional transaction fee using the `btcOperator.createMultiSigTx` function.
3. **Transaction Signing**: Signs the created transaction with the user's private key.
4. **Pipeline Creation**: Creates a pipeline for secure communication using the `createPipeline` function. The encrypted transaction hex is sent through this pipeline.
5. **Transaction Encryption**: Encrypts the signed transaction hex with the pipeline encryption key.
6. **Transaction Transmission**: Sends the encrypted transaction to the network using the `sendRaw` function with the "TRANSACTION" type.
7. **Promise Handling**: Resolves the promise with the ID of the created pipeline upon successful transmission. Rejects the promise with an error message if any issues occur during the process.

### Returns
- A Promise that resolves with the ID of the created pipeline for secure communication.

### Throws
- This function may throw errors if the provided address or redeem script is invalid, transaction creation or signing fails, or there are issues with pipeline creation or transaction transmission. Specific error messages will be provided in the rejection of the returned promise.

### Note
- Ensure that the provided address, redeem script, receivers, and amounts are accurate and valid.
- This function is designed for creating and sending multisig Bitcoin transactions securely.
- Properly handle the resolved pipeline ID for any future communication or retrieval of transaction status.

## `MultiSig.signTx_BTC(pipeID)`

Signs a multisig Bitcoin transaction and broadcasts it to the network.

### Description
This function signs a multisig Bitcoin transaction received through the specified pipeline (`pipeID`) and broadcasts the signed transaction to the Bitcoin network. It ensures the transaction is properly signed before broadcasting it.

### Parameters
- `pipeID`: ID of the pipeline containing the unsigned multisig Bitcoin transaction.

### Function Behavior
1. **Pipeline Validation**: Validates the provided `pipeID` to ensure it corresponds to a BTC-multisig pipeline and is active.
2. **Transaction Retrieval**: Retrieves the latest unsigned multisig transaction hex from the specified pipeline.
3. **Transaction Signing**: Signs the retrieved transaction hex using the user's private key.
4. **Transaction Encryption**: Encrypts the signed transaction hex with the pipeline encryption key.
5. **Transaction Broadcasting**: Broadcasts the signed transaction to the Bitcoin network using the `btcOperator.broadcastTx` function.
6. **Broadcast Confirmation**: Sends a confirmation message containing the broadcasted transaction ID back through the pipeline.
7. **Promise Handling**: Resolves the promise with an object containing the signed transaction hex (`tx_hex`) and its corresponding transaction ID (`txid`) upon successful broadcasting. Rejects the promise with an error message if any issues occur during the process.

### Returns
- A Promise that resolves with an object containing the signed transaction hex (`tx_hex`) and its corresponding transaction ID (`txid`).

### Throws
- This function may throw errors if the provided `pipeID` is invalid, the pipeline is not a BTC-multisig pipeline, the transaction signing fails, or there are issues with broadcasting the transaction. Specific error messages will be provided in the rejection of the returned promise.

### Note
- Ensure that the provided `pipeID` corresponds to a valid BTC-multisig pipeline with an unsigned transaction.
- Properly handle the resolved object containing the signed transaction hex and its corresponding transaction ID for further reference or confirmation.
- Monitor the Bitcoin network for the transaction's confirmation after broadcasting.

## `MultiSig.createTx_FLO(address, redeemScript, receivers, amounts, floData = '', options = {})`

Creates and signs a multisig FLO transaction and sends it through the pipeline.

### Description
This function creates a multisig FLO transaction, signs it with the user's private key, and sends the signed transaction through the specified pipeline. It ensures the transaction is properly signed before sending it.

### Parameters
- `address`: Multisig FLO address in the format `ADDRESS@NETWORK` (e.g., `F7DGuKp8ZrZah8K3QEVDSXKo9Pm6EVDqQ4@florincoin`)
- `redeemScript`: Redeem script corresponding to the multisig address.
- `receivers`: Array of recipient addresses.
- `amounts`: Array of corresponding amounts to be sent to the receivers.
- `floData` (optional): Additional data to be included in the FLO transaction. Default is an empty string.
- `options` (optional): Additional options for transaction creation. Default is an empty object.

### Function Behavior
1. **Address Validation**: Validates the provided `address` to ensure it is a valid multisig FLO address.
2. **Redeem Script Decoding**: Decodes the provided `redeemScript` to verify its validity and obtain necessary information.
3. **User Validation**: Checks if the user's public key is part of the multisig group defined in the `redeemScript`.
4. **Transaction Creation**: Creates a multisig FLO transaction using `floBlockchainAPI.createMultisigTx`.
5. **Transaction Signing**: Signs the created transaction using the user's private key.
6. **Pipeline Creation**: Creates a pipeline with the specified co-owners and sends the signed transaction through it.
7. **Transaction Encryption**: Encrypts the signed transaction with the pipeline encryption key.
8. **Transaction Sending**: Sends the encrypted transaction through the pipeline.
9. **Promise Handling**: Resolves the promise with the ID of the created pipeline upon successful transaction sending. Rejects the promise with an error message if any issues occur during the process.

### Returns
- A Promise that resolves with the ID of the created pipeline where the signed multisig FLO transaction is sent.

### Throws
- This function may throw errors if the provided `address` is invalid, the `redeemScript` is incorrect, the user's public key is not part of the multisig group, or there are issues with transaction creation, signing, or sending. Specific error messages will be provided in the rejection of the returned promise.

### Note
- Ensure that the provided `address` and `redeemScript` correspond to a valid multisig FLO address and its redeem script.
- Handle the resolved pipeline ID for further reference or confirmation.
- Monitor the FLO network for the transaction's confirmation after sending.

## `MultiSig.signTx_FLO(pipeID)`

Signs and broadcasts a multisig FLO transaction through the specified pipeline.

### Description
This function signs the latest multisig FLO transaction in the specified pipeline with the user's private key and broadcasts it to the FLO network. It ensures the transaction is properly signed and broadcasted before resolving the promise.

### Parameters
- `pipeID`: ID of the pipeline where the multisig FLO transaction is stored.

### Function Behavior
1. **Pipeline Model Validation**: Checks if the specified pipeline's model is `TYPE_FLO_MULTISIG`. If not, rejects the promise with an error message.
2. **Pipeline Availability Check**: Verifies if the specified pipeline is not disabled. If it is disabled, rejects the promise with an error message.
3. **Latest Transaction Retrieval**: Retrieves the latest multisig FLO transaction from the specified pipeline.
4. **Transaction Signing**: Signs the latest transaction with the user's private key using `floBlockchainAPI.signTx`.
5. **Transaction Encryption**: Encrypts the signed transaction with the pipeline's encryption key.
6. **Transaction Sending**: Sends the encrypted transaction through the specified pipeline with the type `"TRANSACTION"`.
7. **Transaction Broadcasting**: Broadcasts the signed transaction to the FLO network using `floBlockchainAPI.broadcastTx`.
8. **Broadcasted Transaction Encryption**: Encrypts the broadcasted transaction ID with the pipeline's encryption key.
9. **Broadcasted Transaction Sending**: Sends the encrypted transaction ID through the pipeline with the type `"BROADCAST"`.
10. **Promise Handling**: Resolves the promise with an object containing the signed transaction's hexadecimal representation (`tx_hex`) and its corresponding transaction ID (`txid`) upon successful broadcasting. Rejects the promise with an error message if any issues occur during the signing, sending, or broadcasting process.

### Returns
- A Promise that resolves with an object containing the signed transaction's hexadecimal representation (`tx_hex`) and its corresponding transaction ID (`txid`).

### Throws
- This function may throw errors if the specified pipeline's model is incorrect, the pipeline is disabled, there are issues with transaction signing, encryption, sending, or broadcasting. Specific error messages will be provided in the rejection of the returned promise.

### Note
- Handle the resolved object containing `tx_hex` and `txid` for further reference or confirmation.
- Monitor the FLO network for the transaction's confirmation after broadcasting.
- Use the resolved `txid` to track the transaction's status on the FLO blockchain.

## `createPipeline(model, members, ekeySize = 16, pubkeys = null)`

Creates a new pipeline for communication among specified members.

### Description
This function creates a new communication pipeline with the specified model and members. It generates a unique ID for the pipeline and sends the pipeline information to the members. The pipeline can be optionally encrypted with a specified encryption key (eKey) and can include public keys for each member for secure communication.

### Parameters
- `model`: The type of communication model for the pipeline.
- `members`: An array of FLO addresses representing the members of the pipeline.
- `ekeySize`: Optional. The size of the encryption key (eKey) in characters. Default is 16.
- `pubkeys`: Optional. An array of public keys corresponding to the members. Each public key must match the respective member's FLO address. Default is `null`.

### Function Behavior
1. **Pubkey Validation (Optional)**: Validates the provided public keys if `pubkeys` parameter is not `null`. Ensures that the length of `pubkeys` matches the length of `members`. Rejects the promise with an error message if any validation fails.
2. **Member Validation**: Validates the FLO addresses in the `members` array. Rejects the promise with an error message if any FLO address is invalid.
3. **Pipeline Creation**: Generates a unique ID for the pipeline and creates a pipeline object with `id`, `model`, and `members`. If `ekeySize` is provided, generates an encryption key (eKey) and adds it to the pipeline object.
4. **Pipeline Information Sending**: Sends the pipeline information (stringified JSON) to each member using the type `"CREATE_PIPELINE"`.
5. **Pipeline Storage**: Stores the pipeline object in local memory and IndexedDB.
6. **Pipeline Inbox Request**: Requests the inbox for the created pipeline using `requestPipelineInbox`.
7. **Promise Handling**: Resolves the promise with the created pipeline object upon successful creation. Rejects the promise with an error message if any issues occur during the creation, member validation, or information sending process.

### Returns
- A Promise that resolves with the created pipeline object, which includes `id`, `model`, `members`, and optionally `eKey`.

### Throws
- This function may throw errors if the provided members are invalid, if public key validation fails, or if there are issues with information sending or storage. Specific error messages will be provided in the rejection of the returned promise.

## `requestPipelineInbox(pipeID, model, _async = true)`

Requests the inbox for a specific communication pipeline.

### Description
This function establishes a connection with the cloud service to retrieve messages and updates for a particular communication pipeline identified by `pipeID`. The function provides real-time updates by using a callback function to handle incoming data. It also supports asynchronous and synchronous operation based on the `_async` parameter.

### Parameters
- `pipeID`: The unique ID of the communication pipeline for which the inbox is requested.
- `model`: The communication model associated with the pipeline (e.g., "TYPE_A", "TYPE_B").
- `_async`: Optional. A boolean parameter indicating whether the function should operate asynchronously. Default is `true`.

### Function Behavior
1. **Connection Closure**: If there is an existing request connection for the specified `pipeID`, it is closed to ensure a fresh connection.
2. **Data Parsing**: The function utilizes the `processData.pipeline[model](pipeID)` function to parse the incoming data. It processes the received data using a callback function.
3. **Message Handling**: For each received message, it checks if the message is intended for the specified `pipeID`. If so, it updates the inbox, marks messages as read, and stores the last received vector clock.
4. **Data Storage**: The last received vector clock is stored in the local appendix to keep track of the latest received message.
5. **UI Update**: The function updates the user interface by rendering the received messages in the appropriate communication pipeline section.
6. **Connection Establishment**: The function establishes a connection with the cloud service using `floCloudAPI.requestApplicationData()`.
7. **Asynchronous Operation**: If `_async` is `true` (default), the function operates asynchronously by setting up the connection and resolves with the connection ID. If `_async` is `false`, the function operates synchronously and returns a Promise that resolves with a success message upon connection establishment.

### Returns (Asynchronous Mode)
- A Promise that resolves with the connection ID upon successful establishment of the connection.

### Returns (Synchronous Mode)
- A Promise that resolves with a success message indicating the successful connection establishment.

### Throws
- This function may throw errors if there are issues with closing existing connections, parsing data, or establishing new connections. Specific error messages will be provided in the rejection of the returned promise.

## `disablePipeline(pipeID)`

Disables a communication pipeline, preventing further message exchanges.

### Description
This function disables a specific communication pipeline identified by `pipeID`. Disabling a pipeline restricts any further message transmissions or receptions within that pipeline.

### Parameters
- `pipeID`: The unique ID of the communication pipeline to be disabled.

### Function Behavior
1. **Pipeline Validation**: The function first checks if the specified `pipeID` exists in the loaded pipelines.
2. **Disable Check**: If the pipeline is already disabled, the function resolves immediately with a message indicating that the pipeline is already disabled.
3. **Encryption**: The function encrypts the pipeline's encryption key (`eKey`) for secure storage before updating the pipeline information.
4. **Data Update**: The disabled status of the pipeline is set to `true`, and the updated pipeline information (including the encrypted `eKey`) is written to the local database using `compactIDB.writeData()`.
5. **Connection Closure**: The function closes the request connection associated with the specified `pipeID` to terminate any ongoing communication.
6. **Connection Deletion**: The connection ID associated with the `pipeID` is removed from the `pipeConnID` object to prevent future interactions with the disabled pipeline.
7. **Success Resolution**: The function resolves with a success message indicating that the specified pipeline has been disabled.

### Returns
- A Promise that resolves with a success message indicating the successful disabling of the specified pipeline.

### Throws
- This function may throw errors if there are issues with validating the pipeline, encrypting data, closing connections, or updating the local database. Specific error messages will be provided in the rejection of the returned promise.

## `sendPipelineMessage(message, pipeID)`

Sends a message through the specified communication pipeline.

### Description
This function sends a text `message` through the communication pipeline identified by `pipeID`.

### Parameters
- `message`: The text message to be sent through the pipeline.
- `pipeID`: The unique ID of the communication pipeline through which the message will be sent.

### Function Behavior
1. **Encryption Check**: If the communication pipeline (`pipeID`) has an encryption key (`eKey`) associated with it, the provided `message` is encrypted using this key for secure transmission.
2. **Message Transmission**: The encrypted (or plain) message is sent using the `sendRaw` function, specifying the `pipeID` as the receiver and the message type as "MESSAGE".
3. **Success Resolution**: If the message is successfully sent, the function resolves with a success message indicating the successful transmission of the message through the specified pipeline.

### Returns
- A Promise that resolves with a success message indicating the successful transmission of the message through the specified communication pipeline.

### Throws
- This function may throw errors if there are issues with message encryption, sending the message, or other communication-related problems. Specific error messages will be provided in the rejection of the returned promise.

## `processData.pipeline[TYPE_BTC_MULTISIG]`

This function processes incoming data for the BTC multisig communication pipeline (`pipeID`). It handles different message types and updates the local inbox accordingly.

### Parameters:
- `pipeID`: Unique identifier of the BTC multisig communication pipeline.

### Function Behavior:

1. **Member Verification**:
   - Checks if the sender of the incoming message is a valid member of the specified BTC multisig pipeline. If not, the function returns, ignoring the message.

2. **Data Preparation**:
   - `data`: Object to store message information (including `time`, `sender`, `pipeID`, and specific properties).
   - `vc`: Stores the vector clock of the incoming message.
   - `k`: Retrieves the encryption key (`eKey`) associated with the pipeline for decrypting the incoming message.

3. **Message Decryption**:
   - For "TRANSACTION" messages: Decrypts the encrypted transaction hex (`tx_hex`) and stores it in `data`.
   - For "BROADCAST" messages: Decrypts the received transaction ID (`txid`) and compares it with the locally stored initial transaction hex. If consistent, the pipeline is disabled.
   - For "MESSAGE" messages: Decrypts the encrypted message and stores it in `data`.

4. **Data Storage**:
   - Adds processed message data to the local database under the `messages` collection, using `pipeID|vc` as the unique identifier.
   - If the message contains an encrypted message, it is decrypted and stored back in the `data` object.

5. **Inbox Update**:
   - Adds the processed message data to the `newInbox` object, updating the local inbox for the specified BTC multisig pipeline.

**Note**:
- The function performs various checks and processes different message types, ensuring secure transmission and consistent handling of transactions and messages within the BTC multisig pipeline.

## `processData.pipeline[TYPE_FLO_MULTISIG]`

This function processes incoming data for the FLO multisig communication pipeline (`pipeID`). It handles different message types and updates the local inbox accordingly.

#### Parameters:
- `pipeID`: Unique identifier of the FLO multisig communication pipeline.

#### Function Behavior:

1. **Member Verification**:
   - Checks if the sender of the incoming message is a valid member of the specified FLO multisig pipeline. If not, the function returns, ignoring the message.

2. **Data Preparation**:
   - `data`: Object to store message information (including `time`, `sender`, `pipeID`, and specific properties).
   - `vc`: Stores the vector clock of the incoming message.
   - `k`: Retrieves the encryption key (`eKey`) associated with the pipeline for decrypting the incoming message.

3. **Message Decryption**:
   - For "TRANSACTION" messages: Decrypts the encrypted transaction hex (`tx_hex`) and stores it in `data`.
   - For "BROADCAST" messages: Decrypts the received transaction ID (`txid`) and compares it with the locally stored initial and final transaction hexes. If consistent, and the transaction ID matches, the pipeline is disabled.
   - For "MESSAGE" messages: Decrypts the encrypted message and stores it in `data`.

4. **Data Storage**:
   - Adds processed message data to the local database under the `messages` collection, using `pipeID|vc` as the unique identifier.
   - If the message contains an encrypted message, it is decrypted and stored back in the `data` object.

5. **Inbox Update**:
   - Adds the processed message data to the `newInbox` object, updating the local inbox for the specified FLO multisig pipeline.

#### Notes:
- The function performs various checks and processes different message types, ensuring secure transmission and consistent handling of transactions and messages within the FLO multisig pipeline.
- The function also compares initial and final transaction hexes and verifies the transaction ID to ensure the integrity of broadcasted transactions. If all checks pass, the pipeline is disabled.


### `onLoadStartUp()`

The `onLoadStartUp` function initializes the application upon startup. It handles various tasks such as setting up UI elements, loading data, and initializing the messenger functionality.

#### Usage

```javascript
onLoadStartUp();
```

### Description
This function performs the following steps:
- Route to Loading Page: Redirects the user to the loading page and removes the hidden class from the body element.
- Set Custom Private Key Input: Configures a custom private key input handler for user sign-in.
- Append Emoji Picker Styles: Appends styles for the emoji picker to the shadow root of the emoji picker element.
- Launch Startup Sequence: Invokes the startup functions using floDapps.launchStartUp(). This includes setting user IDs, rendering UI elements, initializing messenger functionalities, and checking for available background images.
- Error Handling: Catches and handles errors that might occur during the startup process. Displays appropriate notifications for specific error cases.

### Related Functions
- `routeTo(page, options)`: Handles client-side navigation to different pages within the application.
- `getSignedIn()`: Handles the user sign-in process.
- `setBgImage()`: Checks for and sets the background image for the application interface.
- `messenger.init()`: Initializes the messenger functionality and renders chat messages and other UI elements.


## `routeTo(targetPage, options = {})`

This JavaScript function, routeTo(targetPage, options = {}), is an asynchronous function that is used for handling client-side navigation in a web application. It takes two parameters: targetPage, which represents the page to navigate to, and an optional options object with various configuration settings. The function performs different actions based on the specified targetPage and updates the application state and UI accordingly. 

### Function Signature
```javascript
async function routeTo(targetPage, options = {}) {
    // function body
}
```

### Parameters
- `targetPage`: A string representing the page to navigate to.
- `options`: An object containing configuration settings. In the function, only the firstLoad property is extracted from this object.

### Function Logic
- Page Identification: The function first checks the targetPage. If it's an empty string, it determines the appropriate pageId based on the user's status (if the user is logged in, it sets pageId to 'chat_page'; otherwise, it sets it to 'landing').

- Parsing Target Page: If targetPage is not empty, the function checks if it contains a slash (/). If it does, it splits the targetPage into parts (pageId, subPageId1, and subPageId2). If there is no slash, pageId is set to targetPage.

- Validation and State Updates: The function validates the pageId and updates the application state (appState.currentPage) accordingly. Depending on the pageId, different actions are taken:

1. For 'sign_in' page, it focuses on a specific input field.
2. For 'sign_up' page, it generates keys.
3. For 'chat_page', it handles various cases related to chat messages and notifications.
4. For 'mail_page', it handles different mailbox sections.
5. For 'settings', it shows specific panels based on subpage identifiers.
6. For other pages, no specific actions are taken.

- Navigation and UI Updates: The function updates the browser history (history.replaceState) and animates UI elements based on the page transitions. It also handles the visibility of different UI components based on the current page.

- Intersection Observer: There is an IntersectionObserver named indicatorObserver that observes elements and performs animations based on their visibility in the viewport.

### Notes:
- The function uses asynchronous code (await keyword) for handling certain tasks, indicating that it can perform asynchronous operations.
- The function relies on various utility functions (getRef, createElement, showChildElement, etc.) These functions are assumed to be part of the application's codebase and are used for DOM manipulation and UI interactions.


## `class LazyLoader`
This class is designed to efficiently handle lazy loading of elements in a web application, meaning it loads elements (such as images or other content) only when they become visible to the user. Let me break down the class and its functionality step by step:


### Class Properties:
- container: Represents the HTML element inside which the lazy-loaded content will be placed.
- elementsToRender: A function or an array representing the elements to be lazy-loaded.
- renderFn: A function responsible for rendering individual elements.
- options: An object containing optional configuration settings like batchSize, freshRender, bottomFirst, and onEnd.

### Class Methods:
- init(): Initializes the lazy loading functionality. It sets up IntersectionObserver and MutationObserver to handle element visibility and DOM changes.
- update(elementsToRender): Updates the array of elements to be lazy-loaded.
- render(options): Renders the elements based on visibility or user scrolling. It calculates the visible range of elements and renders them.
- clear(): Disconnects the IntersectionObserver and MutationObserver and clears the container's content.
- reset(): Resets the LazyLoader by reinitializing the array of elements and rendering them.

### Class Workflow:
- Initialization (init()): When init() is called, the class sets up an IntersectionObserver to detect when elements come into view and a MutationObserver to watch for changes in the DOM. These observers work together to handle lazy loading efficiently.

- Updating Elements (update(elementsToRender)): The update() method allows dynamically updating the elements that need to be lazy-loaded. It takes a new set of elements and updates the internal array.

- Rendering Elements (render(options)): The render() method calculates the range of elements to render based on scrolling or visibility. It then calls the provided renderFn for each element in the calculated range, creating the DOM elements and appending them inside the specified container. If the lazy loading is triggered due to scrolling, it adjusts the scroll position to ensure smooth loading.

- Clearing (clear()): The clear() method disconnects the observers and clears the content of the specified container. It's useful when you want to remove the lazy-loaded content from the DOM.

- Resetting (reset()): The reset() method resets the LazyLoader by reinitializing the array of elements and rendering them again from scratch.

## `getRef(elementId)`
This JavaScript function, getRef(elementId), is a custom utility function designed to improve the efficiency of accessing DOM elements by their IDs. It provides a way to cache references to DOM elements and reuse them, reducing the number of times the actual DOM is queried.

### Parameters:
`elementId:` The ID of the DOM element that you want to retrieve.

### Function Logic:
- The function checks if the `elementId` is present in the `domRefs` object. `domRefs` is an external object that serves as a cache for DOM elements.
- If the `elementId` is not present in `domRefs`, a new entry is created for it. This entry contains a count property initialized to 1 (indicating that the element has been accessed once) and a ref property initialized to null.
- If the `elementId` is already in `domRefs`, the function checks the count property:
- If the count is less than 3, it means the element has been accessed less than 3 times. In this case, the count is incremented, and the function returns the element obtained through `document.getElementById(elementId)`.
- If the count is 3 or more, it means the element has been accessed 3 or more times. In this case, the function checks if the ref property is null. If ref is null, it means the DOM element reference hasn't been cached yet. The function then retrieves the element using `document.getElementById(elementId)`, assigns it to `domRefs[elementId].ref`, and returns the cached reference. I
- If ref is not null, it directly returns the cached reference without querying the DOM again.

### Caching Mechanism:
- The function caches DOM element references in the domRefs object to avoid redundant DOM queries. This caching mechanism helps improve the performance of the application, especially in cases where the same element is accessed multiple times.
### Usage Example:
- Instead of using `document.getElementById(elementId)` directly in the code, developers can use `getRef(elementId)` to access the DOM elements. The function takes care of efficient element retrieval and caching.

## `debounce(callback, wait)`

Debouncing is a technique used in web development to ensure that time-consuming tasks (such as API requests or UI updates) are executed only after the user has finished making changes, rather than triggering the task every time an event fires.

### Function Parameters:

- **callback**: The function that needs to be executed after the user finishes making changes. This function is passed as the first parameter to `debounce`.
- **wait**: The number of milliseconds to wait after the last invocation of the debounced function before executing `callback`.

### Function Logic:

#### Initialization:

The `debounce` function returns an anonymous function that takes any number of arguments `(...args)`.

#### Timeout Management:

1. **Clear Existing Timeout**:
   - When the debounced function is called, it first clears any existing timeout by calling `window.clearTimeout(timeoutId)`. This ensures that the execution of the debounced function is reset every time the debounced function is called within the specified `wait` period.

2. **Set New Timeout**:
   - Then, it sets a new timeout using `window.setTimeout(() => { /* callback execution */ }, wait)`. This new timeout will only execute after `wait` milliseconds have passed since the last invocation of the debounced function.

3. **Callback Execution**:
   - Inside the timeout function, the original `callback` function is executed using `callback.apply(null, args)`, where `args` contains the arguments passed to the debounced function.

### Usage Example:

```javascript
const debouncedFunction = debounce((arg) => {
    console.log(`Debounced function called with argument: ${arg}`);
}, 1000);

debouncedFunction("First call"); // This will not execute immediately
debouncedFunction("Second call"); // This will not execute immediately
// After 1000ms (1 second), the debounced function will execute with the last provided argument ("Second call")
```

## `getLastMessage(floID)`

The `getLastMessage` function is an asynchronous function that retrieves the last message from a conversation specified by the provided `floID`.

### Function Signature

```javascript
function getLastMessage(floID: string): Promise<Object>
````
### Parameters
`floID`: A string representing the unique identifier of the conversation (chat or group) from which to retrieve the last message.
### Returns
A Promise that resolves to an object containing information about the last message in the specified conversation. The object has the following properties:

- message: The content of the last message.
- time: The timestamp of the last message.
- sender: The sender's ID of the last message.
- category: The category of the last message (e.g., 'sent', 'received').
- lastText: A formatted string representing the last message for display purposes.

### Function Logic
The function determines the type of conversation (chat or group) based on the provided floID.
- It retrieves the last message from the conversation using messenger.getChat(floID).
- If the conversation is a group and the last message has a timestamp of 0, it means the group was just created. In this case, the group creation time is used as the last message time.
- The function formats the last message for display purposes, adding sender information (or 'You' for sent messages) and handling blocked conversations appropriately.
- The formatted last message object is returned in the resolved Promise.

## `delegate` Function Explanation

The `delegate` function is a utility function in JavaScript used to implement event delegation. Event delegation is a technique where a single event listener is attached to a common ancestor element of multiple child elements. Instead of attaching event listeners to each child element individually, event delegation allows you to handle events for all child elements in a more efficient manner. When an event occurs, it bubbles up from the target element to the ancestor element, where the event listener is placed. The `delegate` function facilitates this pattern.

### Function Parameters:
- `el`: The common ancestor element to which the event listener is attached.
- `event`: The type of event (e.g., "click", "mouseover", etc.) to listen for.
- `selector`: A CSS selector string specifying the child elements for which the event should be delegated.
- `fn`: The callback function to be executed when the event occurs on a matching child element.

### Function Logic:
1. The `delegate` function takes in the ancestor element `el`, the event type `event`, the CSS selector `selector` for child elements, and the callback function `fn`.

2. It attaches an event listener to the ancestor element (`el`) for the specified event type (`event`).

3. When the event occurs on any descendant element of `el`, the event object (`e`) is passed to the event listener function.

4. Inside the event listener function, `e.target` represents the element on which the event actually occurred. The `closest` method is used to find the closest ancestor of the target element that matches the specified `selector`.

5. If a matching ancestor element is found (`potentialTarget`), the `delegateTarget` property is added to the event object (`e`). This property refers to the ancestor element that matches the specified selector.

6. The callback function `fn` is then executed in the context of the ancestor element (`this`). The event object (`e`) is passed to the callback function, allowing you to handle the event on the matching child element.

## `getFloIdType` Function

The `getFloIdType` function is used to determine the type of a given FLO ID in the context of the messenger application. It checks whether the provided FLO ID belongs to a group, a pipeline, or if it is a plain individual FLO ID.

### Function Parameters:
- `floID`: The FLO ID for which the type needs to be determined.

### Return Value:
- `'group'`: If the provided FLO ID belongs to a group.
- `'pipeline'`: If the provided FLO ID belongs to a pipeline.
- `'plain'`: If the provided FLO ID is an individual, not associated with a group or pipeline.

### Function Logic:
1. The `getFloIdType` function takes in a `floID` as a parameter.

2. It checks if the `floID` exists in the `messenger.groups` object. If it does, the function determines that the `floID` belongs to a group and returns `'group'`.

3. If the `floID` is not found in `messenger.groups`, the function checks if it exists in the `messenger.pipeline` object. If found, it indicates that the `floID` belongs to a pipeline and returns `'pipeline'`.

4. If the `floID` is not found in either `messenger.groups` or `messenger.pipeline`, the function concludes that it is a plain individual FLO ID and returns `'plain'`.

## `renderDirectUI(data)`

The JavaScript function `renderDirectUI(data)` is designed to handle the rendering of direct messages and mails in a user interface. This function plays a crucial role in updating the UI and providing notifications to the user based on new messages and mails, ensuring a responsive and interactive user experience.

### Parameters
- `data`: An object containing messages and mails data to be rendered in the UI.

### Function Logic
1. **New Message Notifications:**
   - If there are new messages in the `data.messages` object and the last visited page is not 'chat_page', it updates the document title to indicate the presence of new messages and adds a notification badge to the 'chat_page_button'.
  
2. **New Mail Notifications:**
   - If there are new mails in the `data.mails` object and the last visited page is not 'mail_page', it updates the document title to indicate the presence of new mails and adds a notification badge to the 'mail_page_button'.

3. **Notification Panel Updates:**
   - It queries the server for uncompleted requests (`messenger.list_request_received({ completed: false })`) and updates the notification badge on the 'notification_panel_button' based on the number of pending requests.

4. **Message UI and Mail List Rendering:**
   - It calls the `updateMessageUI(data.messages)` function to update the UI with new messages.
   - It calls the `renderMailList(data.mails, true)` function to render the mail list, passing `true` as a parameter to indicate that these are new mails.

### Usage Example:
```javascript
// Example usage of the renderDirectUI function
const data = {
    messages: { /* ... */ }, // New messages data
    mails: { /* ... */ }      // New mails data
};
renderDirectUI(data);
```

## `renderMailList(mails, markUnread = true)`

The JavaScript function `renderMailList(mails, markUnread = true)` is responsible for rendering mail items into the user interface. This function dynamically updates the mail interface, ensuring that mails are displayed in the inbox and sent mail categories.

### Parameters
- `mails`: An object containing mail data to be rendered in the UI.
- `markUnread` (optional, default: `true`): A boolean indicating whether unread mails should be marked.

### Function Logic
1. **Initialization:**
   - It initializes two DocumentFragments, `inboxMails` and `sentMails`, to store the rendered mail items for inbox and sent mail categories respectively.
   - Variables `inboxCount` and `sentCount` are initialized to keep track of the number of unread mails in each category.

2. **Mail Iteration and Rendering:**
   - It iterates through the provided `mails` object and extracts mail details such as sender (`from`), receiver (`to`), subject, time, and content.
   - Depending on whether the mail is sent by the user or received by the user, it renders the mail card using the `render.mailCard()` function. If `markUnread` is `true`, it increments the corresponding unread mail count.
   - If there are replies (`prev` property), it removes the previous mail card from the rendering to avoid duplicates.

3. **Notification Badges:**
   - It updates notification badges on the mail type selector based on the number of unread mails. If the current mail type selector is 'inbox', it adds the unread count to the 'sent' category badge, and vice versa.

4. **Rendering into UI:**
   - It prepends the rendered inbox mails into the `inbox_mail_container` and sent mails into the `sent_mail_container` in the UI.

## `getChatCard(floID)`

This function retrieves the chat card element based on the given FloID (or Bitcoin address) from the chats list.

#### Parameters

- `floID` (string): The FloID or Bitcoin address for which the chat card needs to be retrieved.

#### Returns

- Returns the chat card element associated with the provided FloID or Bitcoin address. If no matching chat card is found, it returns `null`.

#### Function logic
- The floID parameter is first converted to a FloID using floCrypto.toFloID(floID).
- The Bitcoin address corresponding to the FloID is obtained using btcOperator.convert.legacy2bech(floID).
- The function queries the chats list using the getRef('chats_list') function.
- It searches for an element with the attribute data-flo-address set to the provided FloID or Bitcoin address.
- If a matching element is found, it is returned. Otherwise, null is returned indicating no matching chat card was found.