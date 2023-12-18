# FLO Messenger
 
• Messenger is a blockchain-based decentralized messaging app that uses Bitcoin or FLO blockchain addresses as user identities. Instead of a centralized server, messages are encrypted and stored in the users' browsers.  
• Bitcoin or FLO blockchain addresses can communicate with each other using a messaging interface  
• Messenger comes with "Multisig" where users can create multi-sig addresses and using a messaging interface make transactions on the multi-sig.  
• Switching browsers or devices won't bring back old messages. Remember to back up and import to access your messages in the new browser/device. That's the security of Messenger.  

#### Note:  
Do not lose the private key. Copy and save it securely. Once a private key is lost, it cannot be recovered

### Live URL for FLO Messenger:
*https://ranchimall.github.io/messenger/*  

## Messenger Architecture
### Product Pipelines
1. The core feature of the product is pipelines. A pipeline is created by invloking inbuilt models
2. Right now we have models for Multisig creation for Bitcoin and FLO Multisigs. 
3. What is pipeline ?
• It has an ID
• It has model like TYPE_BTC_MULTISIG
• It has members like different Bitcoin IDs or FLO IDs
• It has an encryption key unique to the pipeline, and known just to members of that pipeline
4. A pipeline sends custom messages defined as per a model to an attached group
5. Pipeline ID could be a recipient of a message. Then every Bitcoin or FLO Address will get the message with the action needed for that pipeline
6. Details of the technical functions are available here- [Functions](docs/functions.md)

## How to use Messenger  
### General messaging  
1. Go to the homepage of Messenger
2. Sign in using a Bitcoin or FLO blockchain private key
3. In case you don't have the private key, generate using
   FLO Wallet (for FLO address and private key): https://ranchimall.github.io/flowallet/
   BTC Wallet (for Bitcoin address and private key): https://ranchimall.github.io/btcwallet/
** Note: FLO address or FLO ID and private key can be created from Messenger's homepage as well
4. To start a new message or chat, click on the "New chat" button
5. Add a FLO ID or a Bitcoin address as a contact
6. Select the contact to start messaging
** Note: Until the receiver replies, the message is not encrypted.

### Mail  
1. Mail is similar to Messaging except the user can send messages to multiple FLO IDs or Bitcoin addresses at the same time
2. Go to "Mail" and enter the recipient's FLO or Bitcoin address
3. Separate multiple addresses with a comma
4. Type a mail and send

### Multisig messaging  
1. Go to "Multisig" on the homepage
2. To create a Bitcoin multisig, click on "BTC"
3. To create a FLO multisig, click on "FLO"
4. To add BTC or FLO addresses in the new multisig, select contacts that are to be added
5. Contacts have to be saved in advance before creating a multisig address
6. After selecting the contacts, click "Next" and give the multisig address a label name
7. Select the minimum number of signatures required for the multisig
8. Click "Create" and the multisig address will be created

### Sending a multisig transaction  
1. The user must have some balance in the multisig address
2. Go to "Multisig" and click on "init transaction"
3. Enter the receiver's BTC address for a Bitcoin multisig or FLO address for a FLO multisig
4. Enter the amount to be transferred
5. Multiple addresses can be added as receivers with different amounts for each address
6. Click on "Initiate" to initiate the transaction from the multisig address
7. Associated multisig owners will be notified of this transaction
8. Once the required number of signatures is approved, the transaction will take place from the multisig address

### Requests  
1. Multisig owners will get a notification under the "Request" tab for multisig transaction approvals
2. They can approve or deny a multisig transaction request

# Messenger Documentation

- [Product Overview](docs/product-overview.md)
- [Features](docs/features.md)
- [Usage](docs/usage.md)
- [Functions](docs/functions.md)
- [Technical Architecture](docs/technical-architecture.md)
- [Additional Resources](docs/additional-resources.md)
- [Changelog](docs/changelog.md)

      
