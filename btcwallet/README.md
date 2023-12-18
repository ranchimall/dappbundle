# BTC Wallet
[![Workflow push to Dappbundle](https://github.com/ranchimall/btcwallet/actions/workflows/push-dappbundle.yml/badge.svg)](https://github.com/ranchimall/btcwallet/actions/workflows/push-dappbundle.yml)

BTC Wallet
It is a web-based Bitcoin wallet and Bitcoin explorer that promotes self-custody by generating Bitcoin addresses and private keys locally on the user's device. If you are suspicious about internet monitoring, then open the URL, disconnect your computer from the internet, and then generate the Bitcoin address and private key.  
These are client-side scripts that can generate Bitcoin addresses, send Bitcoin transactions to the blockchain, and monitor Bitcoin data from the Bitcoin blockchain.


### Live URL for BTC Wallet:
*https://ranchimall.github.io/btcwallet/*

#### Do not forget to copy and save the private key in a safe place. This BTC wallet doesn't give a seed phrase but directly the original private key, which makes it more secure for the users to take full custody of their bitcoins.

#### Note:
Seed phrases are English words and can be memorized by someone who is looking at your screen. Private keys are random characters that hide inside asterisk signs that make it difficult for anyone to look at them and memorize them.


## Instructions to use 

Note: BTC Wallet uses IndedxedDB for storing data, which means data is stored in the respective browser you used to open the web wallet. Data stored by one browser can't be accessed by other browsers.

## Functions:

### Generate BTC address
Click on "Generate BTC address" to generate a new Bitcoin address with its private key. With the use of the "Copy" button, both the BTC address and private key can be copied to save it somewhere safe.

Note: Do not share your private key with anyone and keep it safe. Once lost a private key can't be recovered.

### Retrieve BTC address
In case you have forgotten your Bitcoin address but still have the private key, you can retrieve the Bitcoin address. Simply enter the private key and click on the "Recover" button.

### Search BTC address or transaction ID (Bitcoin Explorer)
Any Bitcoin address or a Bitcoin transaction id can be searched to fetch the blockchain data. Simply enter the Bitcoin address or the transaction id, press "Enter" or click on "Search" to fetch the blockchain transactions.

### Send
i) The "Send" button can be used to send bitcoins to other Bitcoin addresses. <br>
ii) Click on the "Send" button from the left menu bar <br>
iii) Enter or paste the "Sender's Bitcoin address" <br>
iv) Enter or paste the "Sender's Bitcoin private key" <br>
v) Upon entering the private key, the balance of the address will reflect on the screen <br>
vi) Enter the "Reciever's Bitcoin address" <br>
vi) Enter the "amount" of bitcoin to be sent <br>
vii) Amount can be entered in the form of BTC, USD, or INR <br>
viii) Amount entered in USD or INR will automatically convert to the equivalent BTC amount <br>
ix) Approximate fees will show up before making the transaction <br>
x) Fees can be modified by the user. An increased fee increases the chance of transactions taking place faster <br>
xi) Click on the "Send" button to initiate the transaction <br>
xii) This will give the transaction id using which the transaction details and confirmation can be monitored <br>

#### Note: Multiple senders and multiple receiver addresses can be used to send Bitcoins to multiple receivers. For multiple senders, all their corresponding private keys will be required

#### Note: The fee is comparatively low than other Bitcoin wallets or other Exchange wallets because RanchiMall does not have any additional fees for any transaction.


## Convert
i) "Convert" is a special feature developed by RanchiMall which converts a FLO blockchain address to an equivalent Bitcoin address <br>
ii) The same can be done with a Bitcoin address as well. A Bitcoin address can be converted to its equivalent FLO address <br>

### Why is "Converter" required
i) RanchiMall has built all dapps on the FLO blockchain <br>
ii) All the dapps require a FLO private key to be signed in <br>
iii) Later RanchiMall developed a Bitcoin address sign-in architecture for its dapps <br>
iv) If a user has a FLO address and he/she uses any of RanchiMall dapps, then using an equivalent Bitcoin address to sign in will also take the user to the same account which he/she signed into using their FLO private key.

### More about Converter
i) Both the FLO or BTC address and the Private keys can be converted for each other <br>
ii) This means a FLO address can have its equivalent BTC address and a BTC address can have its equivalent FLO address <br>
iii) A FLO private key can be converted to its equivalent BTC address's private key <br>

#### Note: The pairing of this conversion will always remain the same. <br>
a) A FLO blockchain address can have only one equivalent BTC address <br>
b) A Bitcoin blockchain address can have only one equivalent FLO blockchain address <br>
c) Along with the FLO or BTC address, their private keys can also be converted <br>

### How to use Converter
i) Click on the "Convert" button on the homepage <br>
ii) Click on "FLO" if you want to convert a FLO blockchain address or FLO private key to its equivalent BTC address or BTC private key <br>
iii) Under the "Private key converter", enter the private key of the FLO address. This will convert the FLO private key to the equivalent BTC private key and BTC address <br>
iv) Click on "BTC" if you want to convert a Bitcoin blockchain address or BTC private key to its equivalent FLO address or FLO private key <br>
v) Under the "Address converter", enter the FLO address to get the equivalent BTC address and vice versa <br>

 
