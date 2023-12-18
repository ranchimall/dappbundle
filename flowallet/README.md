# FLO Wallet
FLO Web Wallet

These are client-side scripts that can generate FLO addresses, send FLO transactions to the blockchain and monitor FLO data from the blockchain

NOTE: Use respective file for mainnet and testnet  

### Live URL for FLO Wallet:
*https://ranchimall.github.io/flowallet/*  

## Instructions to use 

Note: Web wallet uses IndedxedDB for storing data, which means data is stored in the respective browser you used to open web wallet. Data stored by one browser can't be accessed by other browsers.

There are 4 pages in this web app :
----------------------

### Monitor FLO Data

This app allows users to view the transactions done by the given address/es.
1. Click/Tap on the '+' floating button at bottom-right hand side, which opens a popup window.

2. Enter the FLO address that you want to monitor, You can also specify a label for that address which will be displayed as a name for that address. If you left the label field empty, the default label will be 'Unknown'.

3. Click/Tap on 'Ok' and the address you added will be displayed on the monitoring page as a card. This address is also added to your local database. Once you add an address/label pair, It will stay there until you clear data(Option available on Settings page).

4. When you hover the mouse pointer on a monitoring card, three dots will appear. clicking on this allows the user to edit or remove that address from the monitoring list.(On mobile devices this option is always visible)

5. To see transactions done by any address, click/Tap on the respective address card. It will open a follow-up window, which displays transactions in the message format. consisting of data sent/received to/from, date of transaction, and FLO data. Arrows on the message body indicate the direction of the transaction i.e. Data is sent or received. On the top of the window, we have the option to go back to the monitoring page or refresh the transaction history.

### Send FLO Data

This page allows users to send FLO data and transactions to the blockchain. To send any data you have to check your balance first, to make sure you have enough balance as each transaction requires 0.0005 FLOs to be valid.

1. Enter the sender's address
2. Click check balance.
3. Balance of the respective address will be displayed
4. Enter the Receiver's address
5. Enter the amount 
6. Enter FLO data (if required)
7. Click Send
8. Enter the private key for the address in the prompt
9. The transaction will be sent to the blockchain and returns the txid (returns error if any).

Note: Transaction fee is set to 0.0005

### FLO address generation/recovery page
This page can be used to generate or recover FLO addresses and private key pairs. This page has two buttons 
#### generate a new address
As the name implies this button when clicked/tapped generates a new FLO address and private key pair. Also, there is a one-click/tap option that allows the user to copy the FLO address or private key.

#### Recover FLO address 
This button when click/tapped opens a popup, which prompts the user to enter private key associated with the FLO address that has to be recovered. Once the correct private key is entered corresponding FLO address is displayed again.

Note: Do not share your private key with anyone and keep it safe. Once lost a private key can't be recovered.

### Settings page

This page contains settings and information about Webapp.

#### Dark mode setting

This section allows the user to set a color scheme (light/dark) with two options, either automatic or manual.
 1. Automatic - If this toggle is turned on, Dark mode is enabled automatically from 6 pm to 6 am (Custom timing will be added in future versions).
 
 2. Manual - Turning this toggle on/off changes the color scheme and stays in that mode unless changed by the user again.

#### CLear all local data

This option clears all the data stored in IndexedDB databases from the browser. This is the same as clearing browser data and cache. After deleting data, it may take more time to load transactions as they are now fetched again from the blockchain. Also, you have to add addresses to start monitoring again.

#### About 
This section contains information about the version and underlying technologies.


Note: For reducing API calls and processing time, monitored data are stored in the local browser. While monitoring the same address, the data from the browser database (IndexedDB) is used and only the new transactions are obtained using API.
