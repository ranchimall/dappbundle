# encryptData Function Documentation

The `encryptData` function takes two parameters: `data` (string) and `receiverPublicKeyHex` (string). It encrypts the given data using AES encryption algorithm with a shared key derived from the sender's private key and receiver's public key. The function returns an object with two properties: `secret` (the encrypted data) and `senderPublicKeyString` (the sender's public key string).

## Parameters
- **data** (String): The data to be encrypted.
- **receiverPublicKeyHex** (String): The hexadecimal representation of the receiver's public key.

## Return Value
An object containing the following properties:
- **secret** (String): The encrypted data.
- **senderPublicKeyString** (String): The sender's public key string.

## Example Usage
```javascript
const data = "Hello, World!";
const receiverPublicKeyHex = "receiver_public_key_hex_here";

const encryptedData = floCrypto.encryptData(data, receiverPublicKeyHex);
console.log("Encrypted Data:", encryptedData.secret);
console.log("Sender's Public Key:", encryptedData.senderPublicKeyString);
```

## Dependencies

`getSenderPublicKeyString`: A function to retrieve the sender's public key string.
`deriveSharedKeySender`: A function to derive a shared key using sender's private key and receiver's public key.
`Crypto.AES.encrypt`: AES encryption function used to encrypt the data.

## Notes
- Ensure that the necessary dependencies (getSenderPublicKeyString, deriveSharedKeySender, Crypto.AES.encrypt) are available and properly implemented before using this function.
- Note: Replace receiver_public_key_hex_here with the actual hexadecimal representation of the receiver's public key when using the function.

# decryptData Function Documentation

The `decryptData` function is used to decrypt encrypted data using the receiver's private key.

## Parameters
- **data** (Object): An object containing the encrypted data and sender's public key string.
  - **secret** (String): The encrypted data.
  - **senderPublicKeyString** (String): The sender's public key string.
- **privateKeyHex** (String): The hexadecimal representation of the receiver's private key.

## Return Value
The decrypted message as a string.

## Throws
- **Error**: If `privateKeyHex` is not a valid string or if the private key cannot be determined from the provided hexadecimal representation.

## Example Usage
```javascript
const encryptedData = {
    secret: "encrypted_data_here",
    senderPublicKeyString: "sender_public_key_string_here"
};
const privateKeyHex = "receiver_private_key_hex_here";

const decryptedMessage = floCrypto.decryptData(encryptedData, privateKeyHex);
console.log("Decrypted Message:", decryptedMessage);
```

## Dependencies

- **wifToDecimal**: A function to convert the receiver's private key from WIF format to decimal format.
- **deriveSharedKeyReceiver**: A function to derive a shared key using sender's public key string and receiver's private key.
- **Crypto.AES.decrypt**: AES decryption function used to decrypt the data.

## Notes

- Ensure that the necessary dependencies (`wifToDecimal`, `deriveSharedKeyReceiver`, `Crypto.AES.decrypt`) are available and properly implemented before using this function.
- **Note**: Replace `"encrypted_data_here"` with the actual encrypted data, `"sender_public_key_string_here"` with the sender's public key string, and `"receiver_private_key_hex_here"` with the receiver's private key in hexadecimal format when using the function.

# signData Function Documentation

The `signData` function is used to sign data using the sender's private key.

## Parameters
- **data** (String): The data to be signed.
- **privateKeyHex** (String): The hexadecimal representation of the sender's private key.

## Return Value
A hexadecimal string representing the signature of the input data.

## Dependencies
- **Bitcoin.ECKey**: A class for handling elliptic curve cryptography operations.
- **Crypto.SHA256**: SHA-256 hash function used to create the message hash.
- **Bitcoin.ECDSA.sign**: Function for generating the ECDSA signature.
- **Crypto.util.bytesToHex**: Utility function to convert bytes to hexadecimal string.

## Example Usage
```javascript
const data = "Hello, World!";
const privateKeyHex = "sender_private_key_hex_here";

const signature = floCrypto.signData(data, privateKeyHex);
console.log("Signature:", signature);
```

## Notes

- Ensure that the necessary dependencies (`Bitcoin.ECKey`, `Crypto.SHA256`, `Bitcoin.ECDSA.sign`, `Crypto.util.bytesToHex`) are available and properly implemented before using this function.
- **Note**: Replace `"sender_private_key_hex_here"` with the actual sender's private key in hexadecimal format when using the function.

# verifySign Function Documentation

The `verifySign` function is used to verify the signature of data using the sender's public key.

## Parameters
- **data** (String): The original data that was signed.
- **signatureHex** (String): The hexadecimal representation of the signature to be verified.
- **publicKeyHex** (String): The hexadecimal representation of the sender's public key.

## Return Value
A boolean value indicating whether the signature is valid (`true`) or not (`false`).

## Dependencies
- **Crypto.SHA256**: SHA-256 hash function used to create the message hash.
- **Crypto.util.hexToBytes**: Utility function to convert hexadecimal string to bytes.
- **ecparams.getCurve().decodePointHex**: Function to decode the sender's public key from hexadecimal format.
- **Bitcoin.ECDSA.verify**: Function for verifying the ECDSA signature.

## Example Usage
```javascript
const data = "Hello, World!";
const signatureHex = "signature_hex_here";
const publicKeyHex = "sender_public_key_hex_here";

const isSignatureValid = floCrypto.verifySign(data, signatureHex, publicKeyHex);
console.log("Is Signature Valid?", isSignatureValid);
```
## Notes

- Ensure that the necessary dependencies (`Crypto.SHA256`, `Crypto.util.hexToBytes`, `ecparams.getCurve().decodePointHex`, `Bitcoin.ECDSA.verify`) are available and properly implemented before using this function.
- **Note**: Replace `"signature_hex_here"` with the actual signature in hexadecimal format, and `"sender_public_key_hex_here"` with the sender's public key in hexadecimal format when using the function

# generateNewID Function Documentation

The `generateNewID` function is used to generate a new flo ID, along with its corresponding private key and public key.

## Return Value
An object containing the following properties:
- **floID** (String): The newly generated flo ID.
- **pubKey** (String): The hexadecimal representation of the corresponding public key.
- **privKey** (String): The Wallet Import Format (WIF) representation of the corresponding private key.

## Dependencies
- **Bitcoin.ECKey**: A class for generating elliptic curve key pairs.

## Example Usage
```javascript
const newIDInfo = floCrypto.generateNewID();
console.log("Flo ID:", newIDInfo.floID);
console.log("Public Key:", newIDInfo.pubKey);
console.log("Private Key (WIF):", newIDInfo.privKey);
```

## Notes

- Ensure that the necessary dependency (`Bitcoin.ECKey`) is available and properly implemented before using this function.

# getPubKeyHex Function Documentation

The `getPubKeyHex` function is used to obtain the public key from a given private key.

## Parameters
- **privateKeyHex** (String): The hexadecimal representation of the private key.

## Return Value
- (String): The hexadecimal representation of the corresponding public key.

## Dependencies
- **Bitcoin.ECKey**: A class for handling elliptic curve cryptography operations.

## Example Usage
```javascript
const privateKeyHex = "private_key_hex_here";
const publicKeyHex = floCrypto.getPubKeyHex(privateKeyHex);
console.log("Public Key:", publicKeyHex);
```

## Notes
- Ensure that the necessary dependency (`Bitcoin.ECKey`) is available and properly implemented before using this function.
- If `privateKeyHex` is not provided or invalid, the function will return `null`.

# getFloID Function Documentation

The `getFloID` function is used to obtain the flo-ID from a given public key or private key.

## Parameters
- **keyHex** (String): The hexadecimal representation of the public key or private key.

## Return Value
- (String): The corresponding flo-ID.

## Dependencies
- **Bitcoin.ECKey**: A class for handling elliptic curve cryptography operations.

## Example Usage
```javascript
const keyHex = "public_key_or_private_key_hex_here";
const floID = floCrypto.getFloID(keyHex);
console.log("Flo-ID:", floID);
```

## Notes
- Ensure that the necessary dependency (`Bitcoin.ECKey`) is available and properly implemented before using this function.
- If `keyHex` is not provided or invalid, the function will return `null`.

# getAddress Function Documentation

The `getAddress` function is used to obtain the cryptocurrency address (BTC or FLO) corresponding to a given private key.

## Parameters
- **privateKeyHex** (String): The hexadecimal representation of the private key.
- **strict** (Boolean, optional): A flag to enforce strict address generation. Default is `false`.

## Return Value
- (String): The cryptocurrency address corresponding to the provided private key.

## Dependencies
- **Bitcoin.ECKey**: A class for handling elliptic curve cryptography operations.
- **bitjs.Base58.decode**: Function to decode Base58 encoded strings.
- **coinjs.bech32Address**: Function to generate BTC bech32 address.
- **bitjs.pubkey2address**: Function to generate FLO address from public key.

## Example Usage
```javascript
const privateKeyHex = "private_key_hex_here";
const address = floCrypto.getAddress(privateKeyHex, true);
console.log("Cryptocurrency Address:", address);
```

## Notes
- Ensure that the necessary dependencies (`Bitcoin.ECKey`, `bitjs.Base58.decode`, `coinjs.bech32Address`, `bitjs.pubkey2address`) are available and properly implemented before using this function.
- If `privateKeyHex` is not provided or invalid, the function will return `null`.
- The `strict` flag, if set to `true`, enforces strict address generation based on the provided private key version. If set to `false`, the function will default to generating a FLO address.

# verifyPrivKey Function Documentation

The `verifyPrivKey` function is used to verify whether a given private key corresponds to a provided public key or flo-ID.

## Parameters
- **privateKeyHex** (String): The hexadecimal representation of the private key.
- **pubKey_floID** (String): The public key or flo-ID to be verified.
- **isfloID** (Boolean, optional): A flag indicating whether the provided key is a flo-ID. Default is `true`.

## Return Value
- (Boolean): `true` if the private key corresponds to the provided public key or flo-ID, `false` otherwise. Returns `null` if an error occurs during verification.

## Dependencies
- **Bitcoin.ECKey**: A class for handling elliptic curve cryptography operations.

## Example Usage
```javascript
const privateKeyHex = "private_key_hex_here";
const pubKey_floID = "public_key_or_floID_here";
const isfloID = true;

const isPrivateKeyValid = floCrypto.verifyPrivKey(privateKeyHex, pubKey_floID, isfloID);
console.log("Is Private Key Valid?", isPrivateKeyValid);
```

## Notes
- Ensure that the necessary dependency (`Bitcoin.ECKey`) is available and properly implemented before using this function.
- If `privateKeyHex` or `pubKey_floID` is not provided or invalid, the function will return `false`.
- If `isfloID` is set to `true`, the function will verify against a flo-ID. If set to `false`, it will verify against a public key.

# getMultisigAddress Function Documentation

The `getMultisigAddress` function is used to generate a multisignature address based on a list of public keys and the number of required signatures.

## Parameters
- **publicKeyList** (Array of Strings): An array containing hexadecimal representations of public keys.
- **requiredSignatures** (Integer): The number of required signatures for the multisignature address.

## Return Value
- (String): The generated multisignature address, or `null` if an error occurs during the generation.

## Dependencies
- **bitjs.pubkeys2multisig**: Function to generate a multisignature address from an array of public keys.

## Example Usage
```javascript
const publicKeyList = ["pubKey1_hex", "pubKey2_hex", "pubKey3_hex"];
const requiredSignatures = 2;

const multisigAddress = floCrypto.getMultisigAddress(publicKeyList, requiredSignatures);
console.log("Multisig Address:", multisigAddress);
```

## Notes
- Ensure that the necessary dependency (`bitjs.pubkeys2multisig`) is available and properly implemented before using this function.
- `publicKeyList` should be an array of hexadecimal strings representing the public keys.
- `requiredSignatures` should be an integer indicating the number of required signatures for the multisignature address.
- If `publicKeyList` is empty, not an array, or contains invalid keys, or if `requiredSignatures` is not a valid integer, the function will return `null`.

# decodeRedeemScript Function Documentation

The `decodeRedeemScript` function is used to decode a multisignature redeem script.

## Parameters
- **redeemScript** (String): The hexadecimal representation of the redeem script.

## Return Value
- (Object): An object containing the decoded information of the multisignature redeem script, or `null` if an error occurs during decoding.

## Dependencies
- **bitjs.transaction().decodeRedeemScript**: Function to decode a multisignature redeem script.

## Example Usage
```javascript
const redeemScript = "redeem_script_hex_here";

const decodedRedeemScript = floCrypto.decodeRedeemScript(redeemScript);
console.log("Decoded Redeem Script:", decodedRedeemScript);
```

## Notes
- Ensure that the necessary dependency (`bitjs.transaction().decodeRedeemScript`) is available and properly implemented before using this function.
- If the `redeemScript` is not a valid hexadecimal string or if an error occurs during decoding, the function will return `null`.

# validateFloID Function Documentation

The `validateFloID` function is used to check whether a given flo-ID is valid or not.

## Parameters
- **floID** (String): The flo-ID to be validated.
- **regularOnly** (Boolean, optional): A flag indicating whether to allow only regular flo-IDs. Default is `false`.

## Return Value
- (Boolean): `true` if the flo-ID is valid, `false` otherwise.

## Dependencies
- **Bitcoin.Address**: A class for handling Bitcoin addresses.

## Example Usage
```javascript
const floID = "flo_ID_here";
const isValidFloID = floCrypto.validateFloID(floID, true);
console.log("Is Flo-ID Valid?", isValidFloID);
```

## Notes
- Ensure that the necessary dependency (`Bitcoin.Address`) is available and properly implemented before using this function.
- If `floID` is not a valid flo-ID (not a valid Bitcoin address), the function will return `false`.
- If `regularOnly` is set to `true`, the function will only consider standard flo-IDs as valid; otherwise, it will consider all valid flo-IDs as valid.

# validateAddr Function Documentation

The `validateAddr` function is used to check whether a given address (from any blockchain) is valid or not.

## Parameters
- **address** (String): The address to be validated.
- **std** (Boolean or Integer or Array, optional): A flag or array indicating whether to allow specific address versions (standard addresses). Default is `true`.
- **bech** (Boolean or Integer or Array, optional): A flag or array indicating whether to allow specific bech32 address versions. Default is `true`.

## Return Value
- (Boolean): `true` if the address is valid, `false` otherwise.

## Dependencies
- **decodeAddress**: A function to decode the provided address.

## Example Usage
```javascript
const address = "address_here";
const isValidAddress = floCrypto.validateAddr(address, true, true);
console.log("Is Address Valid?", isValidAddress);
```

## Notes
- Ensure that the necessary dependency (`decodeAddress`) is available and properly implemented before using this function.
- If `address` is not a valid address, the function will return `false`.
- The `std` parameter allows specifying the allowed standard address versions. If set to `true`, all standard versions are allowed. If set to an integer or an array of integers, only the specified version(s) are allowed.
- The `bech` parameter allows specifying the allowed bech32 address versions. If set to `true`, all bech32 versions are allowed. If set to an integer or an array of integers, only the specified version(s) are allowed.

# verifyPubKey Function Documentation

The `verifyPubKey` function is used to verify whether a given public key or redeem script corresponds to the provided address (from any blockchain).

## Parameters
- **pubKeyHex** (String): The hexadecimal representation of the public key or redeem script.
- **address** (String): The address to be verified.

## Return Value
- (Boolean): `true` if the public key or redeem script corresponds to the provided address, `false` otherwise.

## Dependencies
- **decodeAddress**: A function to decode the provided address.
- **Crypto.util.bytesToHex**: Utility function to convert bytes to hexadecimal string.
- **Crypto.SHA256**: SHA-256 hash function.
- **ripemd160**: RIPEMD-160 hash function.

## Example Usage
```javascript
const pubKeyHex = "public_key_or_redeem_script_hex_here";
const address = "address_here";

const isPubKeyValid = floCrypto.verifyPubKey(pubKeyHex, address);
console.log("Is Public Key Valid?", isPubKeyValid);
```
## Notes
- Ensure that the necessary dependencies (`decodeAddress`, `Crypto.util.bytesToHex`, `Crypto.SHA256`, `Crypto.util.hexToBytes`, `ripemd160`) are available and properly implemented before using this function.
- If the public key or redeem script does not correspond to the provided address, the function will return `false`.

# toFloID Function Documentation

The `toFloID` function is used to convert a given address (from any blockchain) to its equivalent floID.

## Parameters
- **address** (String): The address to be converted.
- **options** (Object, optional): An object containing options for version checks. Default is `null`.
  - **std** (Array of Integers, optional): An array of allowed standard address versions.
  - **bech** (Array of Integers, optional): An array of allowed bech32 address versions.

## Return Value
- (String): The equivalent floID corresponding to the provided address. Returns `undefined` if the address is not valid or does not match the specified options.

## Dependencies
- **decodeAddress**: A function to decode the provided address.
- **Crypto.SHA256**: SHA-256 hash function.
- **bitjs.pub**: The version byte for FLO addresses.
- **bitjs.Base58.encode**: Base58 encoding function.

## Example Usage
```javascript
const address = "address_here";
const options = {
    std: [version1, version2],
    bech: [version3, version4]
};

const floID = floCrypto.toFloID(address, options);
console.log("Equivalent FloID:", floID);
```

## Notes
- Ensure that the necessary dependencies (`decodeAddress`, `Crypto.SHA256`, `bitjs.pub`, `bitjs.Base58.encode`) are available and properly implemented before using this function.
- If the `address` is not valid or does not match the specified options, the function will return `undefined`.

# toMultisigFloID Function Documentation

The `toMultisigFloID` function is used to convert a given multisig address (from any blockchain) to its equivalent multisig floID.

## Parameters
- **address** (String): The multisig address to be converted.
- **options** (Object, optional): An object containing options for version checks. Default is `null`.
  - **std** (Array of Integers, optional): An array of allowed standard address versions.
  - **bech** (Array of Integers, optional): An array of allowed bech32 address versions.

## Return Value
- (String): The equivalent multisig floID corresponding to the provided multisig address. Returns `undefined` if the address is not valid or does not match the specified options.

## Dependencies
- **decodeAddress**: A function to decode the provided multisig address.
- **Crypto.SHA256**: SHA-256 hash function.
- **ripemd160**: A cryptographic hash function.
- **bitjs.multisig**: The version byte for multisig FLO addresses.
- **bitjs.Base58.encode**: Base58 encoding function.

## Example Usage
```javascript
const multisigAddress = "multisig_address_here";
const options = {
    std: [version1, version2],
    bech: [version3, version4]
};

const multisigFloID = floCrypto.toMultisigFloID(multisigAddress, options);
console.log("Equivalent Multisig FloID:", multisigFloID);
```

## Notes
- Ensure that the necessary dependencies (`decodeAddress`, `Crypto.SHA256`, `ripemd160`, `bitjs.multisig`, `bitjs.Base58.encode`) are available and properly implemented before using this function.
- If the `address` is not valid or does not match the specified options, the function will return `undefined`.

# isSameAddr Function Documentation

The `isSameAddr` function is used to check whether two given addresses (from any blockchain) correspond to the same keys.

## Parameters
- **addr1** (String): The first address to be compared.
- **addr2** (String): The second address to be compared.

## Return Value
- (Boolean): `true` if the addresses correspond to the same keys, `false` otherwise. Returns `undefined` if either `addr1` or `addr2` is not provided or invalid.

## Dependencies
- **decodeAddress**: A function to decode the provided addresses.
- **Crypto.util.bytesToHex**: Utility function to convert bytes to hexadecimal string.
- **ripemd160**: A cryptographic hash function.

## Example Usage
```javascript
const addr1 = "address1_here";
const addr2 = "address2_here";

const sameKeys = floCrypto.isSameAddr(addr1, addr2);
console.log("Do Addresses Correspond to Same Keys?", sameKeys);
```

## Notes
- Ensure that the necessary dependencies (`decodeAddress`, `Crypto.util.bytesToHex`, `ripemd160`) are available and properly implemented before using this function.
- If either `addr1` or `addr2` is not provided or invalid, the function will return `undefined`.

# decodeAddr Function Documentation

The `decodeAddr` function is used to decode the provided address and determine its version, hexadecimal representation, and raw bytes.

## Parameters
- **address** (String): The address to be decoded.

## Return Value
- (Object or null): An object containing decoded information, including version, hexadecimal representation, and raw bytes. Returns `null` if the provided address is not valid.

## Dependencies
- **bitjs.Base58.decode**: Base58 decoding function for legacy addresses.
- **Crypto.SHA256**: SHA-256 hash function.
- **Crypto.util.bytesToHex**: Utility function to convert bytes to hexadecimal string.
- **coinjs.bech32_decode**: Bech32 decoding function for bech32 addresses.
- **coinjs.bech32_convert**: Bech32 conversion function.

## Example Usage
```javascript
const address = "address_here";
const decodedInfo = floCrypto.decodeAddr(address);
console.log("Decoded Address Information:", decodedInfo);
```

## Notes
- Ensure that the necessary dependencies (`bitjs.Base58.decode`, `Crypto.SHA256`, `Crypto.util.bytesToHex`, `coinjs.bech32_decode`, `coinjs.bech32_convert`) are available and properly implemented before using this function.
- The function will return `null` if the provided address is not valid.

# createShamirsSecretShares Function Documentation

The `createShamirsSecretShares` function uses Shamir's Secret Sharing algorithm to split a given string into shares based on the specified total shares and threshold limit.

## Parameters
- **str** (String): The input string to be split.
- **total_shares** (Integer): The total number of shares to be generated.
- **threshold_limit** (Integer): The minimum number of shares required to reconstruct the original string.

## Return Value
- (Array or Boolean): An array containing the shares generated using Shamir's Secret Sharing algorithm. Returns `false` if the input string is empty or if there is an error during the splitting process.

## Dependencies
- **shamirSecretShare.str2hex**: Function to convert a string to hexadecimal representation.
- **shamirSecretShare.share**: Function to generate shares using Shamir's Secret Sharing algorithm.

## Example Usage
```javascript
const inputString = "input_string_here";
const totalShares = 5;
const thresholdLimit = 3;

const shares = floCrypto.createShamirsSecretShares(inputString, totalShares, thresholdLimit);
console.log("Generated Shares:", shares);
```

## Notes
- Ensure that the necessary dependencies (`shamirSecretShare.str2hex`, `shamirSecretShare.share`) are available and properly implemented before using this function.
- The function will return `false` if the input string is empty or if there is an error during the splitting process.

# retrieveShamirSecret Function Documentation

The `retrieveShamirSecret` function is used to retrieve the original secret by combining the provided Shamir's Secret Sharing shares.

## Parameters
- **sharesArray** (Array): An array containing Shamir's Secret Sharing shares to be combined.

## Return Value
- (String or Boolean): The retrieved original secret. Returns `false` if the input shares array is empty or if there is an error during the retrieval process.

## Dependencies
- **shamirSecretShare.combine**: Function to combine shares using Shamir's Secret Sharing algorithm.
- **shamirSecretShare.hex2str**: Function to convert hexadecimal representation to a string.

## Example Usage
```javascript
const sharesArray = ["share1", "share2", "share3"];
const retrievedSecret = floCrypto.retrieveShamirSecret(sharesArray);
console.log("Retrieved Secret:", retrievedSecret);
```
## Notes
- Ensure that the necessary dependencies (`shamirSecretShare.combine`, `shamirSecretShare.hex2str`) are available and properly implemented before using this function.
- The function will return `false` if the input shares array is empty or if there is an error during the retrieval process.

# verifyShamirsSecret Function Documentation

The `verifyShamirsSecret` function is used to verify the provided Shamir's Secret Sharing shares against a given string.

## Parameters
- **sharesArray** (Array): An array containing Shamir's Secret Sharing shares to be verified.
- **str** (String): The original string to be verified against the retrieved secret.

## Return Value
- (Boolean or null): `true` if the shares verify the provided string, `false` otherwise. Returns `null` if the input string is not provided.

## Dependencies
- **retrieveShamirSecret**: Function to retrieve the original secret by combining shares using Shamir's Secret Sharing algorithm.

## Example Usage
```javascript
const sharesArray = ["share1", "share2", "share3"];
const originalString = "original_string_here";

const verificationResult = floCrypto.verifyShamirsSecret(sharesArray, originalString);
console.log("Shares Verification Result:", verificationResult);
```
## Notes
- Ensure that the necessary dependency (`retrieveShamirSecret`) is available and properly implemented before using this function.
- The function will return `null` if the input string is not provided.

# validateASCII Function Documentation

The `validateASCII` function is used to validate a string to ensure it contains only ASCII characters within the printable range (32 to 127) by default.

## Parameters
- **string** (String): The input string to be validated.
- **bool** (Boolean, optional): If `true`, the function returns `true` if the entire string contains only printable ASCII characters; if `false`, it returns an object containing information about invalid characters and their positions. Default is `true`.

## Return Value
- (Boolean or Object or null): Returns `true` if the input string contains only printable ASCII characters. Returns an object containing information about invalid characters and their positions if `bool` is set to `false`. Returns `null` if the input is not a string.

## Example Usage
```javascript
const inputString = "ASCII_string_here";

// Validate ASCII characters
const isValid = floCrypto.validateASCII(inputString);
console.log("Is Valid ASCII?", isValid);

// Validate ASCII characters and get invalid characters with their positions
const invalidChars = floCrypto.validateASCII(inputString, false);
console.log("Invalid Characters:", invalidChars);
```

## Notes
- If `bool` is set to `true`, the function will return `true` if the input string contains only printable ASCII characters; otherwise, it will return `false`.
- If `bool` is set to `false`, the function will return an object containing information about invalid characters and their positions. If there are no invalid characters, it will return an empty object.
- The function will return `null` if the input is not a string.

# convertToASCII Function Documentation

The `convertToASCII` function is used to convert a string to ASCII characters using specified conversion modes.

## Parameters
- **string** (String): The input string to be converted.
- **mode** (String, optional): The conversion mode. Available options are 'hard-unicode', 'soft-unicode', 'hard-remove', and 'soft-remove'. Default is 'soft-remove'.

## Return Value
- (String or null): The converted string. Returns `null` if the input is not a string.

## Example Usage
```javascript
const inputString = "input_string_here";

// Convert to ASCII characters using soft-remove mode
const convertedString = floCrypto.convertToASCII(inputString);
console.log("Converted String:", convertedString);
```
## Notes
- Available conversion modes:
  - 'hard-unicode': Converts characters to Unicode escape sequences (e.g., `\uXXXX`).
  - 'soft-unicode': Converts characters to Unicode escape sequences if available in `ascii_alternatives` list; otherwise, uses regular Unicode escape sequences.
  - 'hard-remove': Removes non-ASCII characters from the string.
  - 'soft-remove': Replaces non-ASCII characters with their alternatives from `ascii_alternatives` list if available; otherwise, removes them.
- Ensure that the necessary dependencies (`validateASCII`) and the `ascii_alternatives` list are available and properly implemented before using this function.
- The function will return `null` if the input is not a string.

# revertUnicode Function Documentation

The `revertUnicode` function is used to revert Unicode escape sequences (e.g., `\uXXXX`) back to their corresponding characters in a given string.

## Parameters
- **string** (String): The input string containing Unicode escape sequences to be reverted.

## Return Value
- (String): The string with reverted Unicode escape sequences.

## Example Usage
```javascript
const unicodeString = "\\u0048\\u0065\\u006c\\u006c\\u006f";
const revertedString = floCrypto.revertUnicode(unicodeString);
console.log("Reverted String:", revertedString);
```
