# Messenger Architecture

### Standard Operations Configuration


### `floGlobals Object`
- floGlobals is a standard object used in Standard Operations based App
- floGlobals.adminID is the blockchain based address whose commands all browser clients will follow. Currently it is `floGlobals.adminID: "FMRsefPydWznGWneLqi4ABeQAJeFvtS3aQ"`
- floGlobals.name is "messenger" indicating name of application 
- floGlobals.idInterval is the time interval used to switch display between your Bitcoin Address used to log-in, and FLO address 
- floGlobals.subadmins are used to do regular access control in the mesenger app. Currently there are none set

### `processData` object
- Understanding `processData` object is key to understand messenger product
- Overview of processDAta: `processData` is the processing part of messenger. There are kinds of `processData` activities: 
1. `processData.direct` - This is used in processing individual mails and messages
2. `processData.group(groupID)` - This is used in processing group messages
3. `processData.pipeline[model](pipeID);` - This is used in processing any pipeline events foor


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



# Let us specify all DATA DEFINITIONS used in Messenger Application first 
## The master object encapsulates all the functionalities

```
 var obj = {
                messages: {},
                mails: {},
                marked: {},
                chats: {},
                groups: {},
                gkeys: {},
                blocked: {},
                pipeline: {},
                request_sent: {},
                request_received: {},
                response_sent: {},
                response_received: {},
                flodata: {},
                appendix: {},
                userSettings: {},
                multisigLabels: {}
            }
```            

## Internal message `types` defined in application for usage in sendApplicationData

### The key to understand messenger application is to start with message types first

For sendraw function, `function sendRaw(message, recipient, type, encrypt = null, comment = undefined)` following types are defined
- "MESSAGE"
- "MAIL"
- "REQUEST"
- "RESPONSE"
- "UP_NAME"
- "UP_DESCRIPTION"
- "CREATE GROUP"
- "ADD_MEMBERS"
- "RM_MEMBERS"
- "REVOKE_KEY"
- "GROUP_MSG"
- "TRANSACTION"
- "BROADCAST"
- "CREATE_PIPELINE"

#### function `sendRaw(message, recipient, type, encrypt = null, comment = undefined)` packages the input parameters into `floCloudAPI.sendApplicationData(message, type, options)`

- options contain options.receiverID, and options.comment

```options = {
                receiverID: recipient,
            }
            if (comment)
                options.comment = comment
```
### Message Payload: When a message is sent it has a payload of vectorclock and data. 

```
            sendRaw(message, receiver, "MESSAGE").then(result => {
                let vc = result.vectorClock;
                let data = {
                    floID: receiver,
                    time: result.time,
                    category: 'sent',
                    message: encrypt(message)
                }
```

### Description of Mail Object

```
let mail = {
                subject: subject,
                content: content,
                ref: Date.now() + floCrypto.randString(8, true),
                prev: prev
            }

let promises = recipients.map(r => sendRaw(JSON.stringify(mail), r, "MAIL"))

```

### SendRequest types
- "PUBLIC_KEY"
- This is used in sendResponse as well

```
sendRequest(receiver, "PUBLIC_KEY", message, false);

```

### Understanding GroupInfo
- Contains groupInfo.eKey, groupInfo.admin, groupInfo.members, groupInfo.disabled, groupInfo.name 

### Understanding DataList
-  dataList = ["messages", "mails", "marked", "chats", "groups", "gkeys", "pipeline", "blocked", "appendix"]
-   defaultList : dataList = ["mails", "marked", "groups", "pipeline", "chats", "blocked", "appendix"]

### Understanding Mapping between functionalities and sendRaw messages
This section illustrates how functionaility is getting translated into sendRaw feature 

- messenger.changeGroupName = function (groupID, name) 
- sendRaw(message, groupID, "UP_NAME", false)

- messenger.changeGroupDescription = function (groupID, description) 
- sendRaw(message, groupID, "UP_DESCRIPTION", false)

- messenger.addGroupMembers = function (groupID, newMem, note = undefined)
- sendRaw(message, groupID, "ADD_MEMBERS", false, note)

- messenger.rmGroupMembers = function (groupID, rmMem, note = undefined) 
- p1 = sendRaw(message, groupID, "RM_MEMBERS", false, note)

- messenger.revokeKey = function (groupID)
- groupInfo.members.map(m => sendRaw(JSON.stringify({
                newKey,
                groupID
            }), m, "REVOKE_KEY", true))

- messenger.sendGroupMessage = function (message, groupID)
- sendRaw(message, groupID, "GROUP_MSG", false)

- message = encrypt(tx_hex, pipeline.eKey);
- sendRaw(message, pipeline.id, "TRANSACTION", false)

- btcOperator.broadcastTx(tx_hex_signed)
- sendRaw(encrypt(txid, pipeline.eKey), pipeline.id, "BROADCAST", false)

- messenger.createPipeline = function (model, members, ekeySize = 16, pubkeys = null)
- sendRaw(pipelineInfo, m, "CREATE_PIPELINE", true));

- messenger.sendPipelineMessage = function (message, pipeID)
- sendRaw(message, pipeID, "MESSAGE", false)

###  Understanding appendix
It has two usages in the application
- appendix.lastReceived to compare against what vectorClock data we have
- appendix.AESKey to check what encryption keys to be used

### compactIDB.addData and compactIDB.writeData

- The addData function is used to add new records to an object store. It will throw an error if the key already exists
- The writeData function is used to update or insert data into an object store. It will update if the key already exists

### Why do we use uhtml

uhtml is a small, efficient, and ultra-fast JavaScript library for creating web components and managing the DOM (Document Object Model). It allows developers to write templates directly in JavaScript without needing a separate build step. uhtml focuses on minimalism and performance, aiming to provide a lightweight solution for rendering dynamic content in web applications.

## Here's a brief overview of what uhtml does:

- Template Rendering: uhtml provides a way to create HTML templates directly in JavaScript code. These templates can include dynamic content and data-binding expressions.

- Virtual DOM: uhtml utilizes a virtual DOM approach, where changes to the UI are first made in memory (virtual DOM), and then efficiently applied to the actual DOM, reducing unnecessary reflows and repaints.

- Efficiency: uhtml is designed to be incredibly fast and efficient. It achieves this by minimizing the overhead associated with creating and updating DOM elements.

- Reactivity: uhtml templates can be reactive, meaning they can automatically update when the underlying data changes. This reactivity is often used in modern web frameworks to create responsive and dynamic user interfaces.

## Explain the UI process

### `getRef(elementId)`
getRef is the cornerstone of UI in Messenger App. getRef(elementId), is a custom utility function designed to improve the efficiency of accessing DOM elements by their IDs. It provides a way to cache references to DOM elements and reuse them, reducing the number of times the actual DOM is queried. Instead of using `document.getElementById(elementId)` directly in the code, we use `getRef(elementId)` to access the DOM elements. The function takes care of efficient element retrieval and caching.

getRef(elementId) Function:

1. getRef(elementId) is a custom JavaScript function used to obtain references to DOM elements using their unique IDs. It optimizes the process of accessing DOM elements by caching the references, allowing for efficient reuse without the need to repeatedly query the DOM. When you call getRef('mail_contact_list'), it returns the DOM element with the ID 'mail_contact_list'.

2. We use getRef(elementId) instead of document.getElementById

### uhtml Library Usage:

1. uhtml is a JavaScript library for efficient and lightweight HTML templating and rendering. It allows you to create HTML templates directly in your JavaScript code.

2. The line const { html, render: renderElem } = uhtml; imports the html function and an alias for the render function from the uhtml library. The html function is used to create HTML template literals, and renderElem is used to render those templates into DOM elements efficiently.

- Rendering HTML with renderElem():

1. The code renderElem(getRef('mail_contact_list'), html${mailingContacts}) combines the previously mentioned concepts. Here's what's happening:

2. html${mailingContacts} creates an HTML template literal using the uhtml library. It represents the HTML structure defined by the mailingContacts variable.

3. getRef('mail_contact_list') retrieves the DOM element with the ID 'mail_contact_list' using the custom getRef() function.

4. renderElem(targetElement, htmlTemplate) is a call to the renderElem function from the uhtml library. It takes two parameters: the target DOM element where the rendered HTML will be appended (getRef('mail_contact_list') in this case) and the HTML template created with the html function.

### A direct simple example explaining the render logic

```
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dynamic List with uhtml</title>
</head>

<body>
    <div id="app"></div>

    <script src="https://unpkg.com/uhtml@3.0.1/es.js"></script>
    <script>
        const { html, render } = uhtml;

        // Data to be displayed
        const items = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'];

        // Function to render items using uhtml
        function renderItems(items) {
            return html`
                <ul>
                    ${items.map(item => html`<li>${item}</li>`)}
                </ul>
            `;
        }

        // Render items into the 'app' element
        const appElement = document.getElementById('app');
        render(appElement, renderItems(items));
    </script>
</body>

</html>
```

### Functions created for Rendering


```
                messenger.renderUI.chats = renderChatList;
                messenger.renderUI.directChat = renderDirectUI;
                messenger.renderUI.groupChat = renderGroupUI;
                messenger.renderUI.pipeline = renderPipelineUI;
                messenger.renderUI.mails = m => renderMailList(m, false);
                messenger.renderUI.marked = renderMarked;
```

### There are two meanings of render in the UI of messenger application

1. In class lazyloader, this.render() is a method internal to lazyloader based objects
2. In uhtml invocations, render creates actual html when `html` parameter is fed to it
3. Sometimes in apps like BTCWallet, render is an object with collection of functions like addressDetails, and txDetails. However, its not used in messenger.  

### Example of uhtml html creation

- METHOD 1: render.something () In the code below function takes floID as input parameter, and return uhtml compatible html. This can then be fed to  `render.selectableContact(contact)` for actual HTML creation 


```
//HTML creation stage
selectableContact(floID) {
                const name = getContactName(floID)
                const initial = name.charAt(0)
                return html`
                    <label class="flex align-center selectable-contact interactive" data-flo-address=${floID} style=${`--contact-color: var(${contactColor(floID)})`}>
                        <div class="initial flex align-center"> ${initial} </div>
                        <div class="grid gap-0-3">
                            <h4 class="name">${name}</h4>
                            <p class="contact__flo-address wrap-around">${floID}</p>
                        </div>
                        <input type="checkbox" autocomplete="off" value=${floID}/>
                    </label>
                `
            }

//At render stage
render.selectableContact(contact);            
```            

- METHOD 2: renderElem(getRef,html) method. Another way we have used to to achieve html from render is the code snippet below using renderElem function

```
        const { html, render: renderElem } = uhtml;

        function renderContactList(contactList = floGlobals.contacts) {
            const contacts = Object.keys(contactList)
                .sort((a, b) => getContactName(a).localeCompare(getContactName(b)))
                .map(floID => {
                    const isSelected = selectedMembers.has(floID)
                    return render.contactCard(floID, { type: 'contact', isSelected, ref: getRef('contacts_container') })
                })
            renderElem(getRef('contacts_container'), html`${contacts}`)
        }
```        
## How do you create new models

- Lets look at usage of createPipeline function which uses `TYPE_BTC_MULTISIG` model here. 

```
                createPipeline(TYPE_BTC_MULTISIG, co_owners, 32, decode.pubkeys).then(pipeline => {
                    let message = encrypt(tx_hex, pipeline.eKey);
                    sendRaw(message, pipeline.id, "TRANSACTION", false)
                        .then(result => resolve(pipeline.id))
                        .catch(error => reject(error)) //SENDRAW
                }).catch(error => reject(error)) //CREATE PIPELINE
```  

- To design a new model, you need to define the states the pipeline in the model will take, and also define the message types that will move the state forward.
- A model tells what are the types of messages in that system, and how should they be handled. There is no explicit definition of model. Rather we straight define the processing logic as part of processData.pipeLine function, and it initiates the model.
- You need to define what are the type of messages in your model. For instance the message types for `TYPE_BTC_MULTISIG` model are "TRANSACTION", "BROADCAST" and "MESSAGE". 
- If the model message type is "TRANSACTION", then it needs to be signed by anyone of the person who sees this first, and then needs to sign the BTC Multisig transaction. 
- If the model message type is "BROADCAST", then all signatures are received, and multisig messaeg has to be broadcasted to the blockchain.
- If the model message type is "MESSAGE", then simply show the message to all members in the pipeline
- Similarly as part of model design, you need to identify the types of messages for the models first.
- Then you need to create the processing logic for each type of message in processData.pipeline[MODEL_NAME]. It will have a common processing section and switch case for each of the message type
- A pipelines moves its state forward as the message type changes due to action of members.
- The model processing logic specified how the state of pipeline changes.
- In this example the state of pipeline changes as soon as one member performs an action which leads him client to proclaim the state of pipeline has moved to the next message
- States in TYPE_BTC_MULTISIG model are Create -> Transact -> Transact -> Broadcast -> close if it is 2 of 3 BTC Multisig
- After the processing, the message has to be given to inboxes of correct recipients like using `newInbox.messages[vc] = data;`
- You should also store a copy of that message locally like using `compactIDB.addData("messages", Object.assign({}, data),${pipeID}|${vc});` 
- Every pipeline is identified by a system generated pipeID which is made available to creator and members when a new pipleline is created     

```
//pipeline model for btc multisig
    processData.pipeline[TYPE_BTC_MULTISIG] = function (pipeID) {
        return (unparsed, newInbox) => {
            if (!_loaded.pipeline[pipeID].members.includes(floCrypto.toFloID(unparsed.senderID)))
                return;
            let data = {
                time: unparsed.time,
                sender: unparsed.senderID,
                pipeID: unparsed.receiverID
            }
            let vc = unparsed.vectorClock,
                k = _loaded.pipeline[pipeID].eKey;
            unparsed.message = decrypt(unparsed.message, k)
            //store the pubKey if not stored already
            floDapps.storePubKey(unparsed.senderID, unparsed.pubKey);
            data.type = unparsed.type;
            switch (unparsed.type) {
                case "TRANSACTION": {
                    data.tx_hex = unparsed.message;
                    break;
                }
                case "BROADCAST": {
                    data.txid = unparsed.message;
                    //the following check is done on parallel (in background) instead of sync
                    btcOperator.getTx.hex(data.txid).then(tx_hex_final => {
                        getChat(pipeID).then(result => {
                            let tx_hex_inital = Object.keys(result).sort().map(i => result[i].tx_hex).filter(x => x).shift();
                            if (btcOperator.checkIfSameTx(tx_hex_inital, tx_hex_final))
                                disablePipeline(pipeID);
                        }).catch(error => console.error(error))
                    }).catch(error => console.error(error))
                    break;
                }
                case "MESSAGE": {
                    data.message = encrypt(unparsed.message);
                    break;
                }
            }
            compactIDB.addData("messages", Object.assign({}, data), `${pipeID}|${vc}`);
            if (data.message)
                data.message = decrypt(data.message);
            newInbox.messages[vc] = data;
        }
    }
```

## Ok. The model is created. How do I use it 

- After a model has been created in processData.pipeline[YOUR_MODEL_NAME] with pipeID as the input parameter, the first action is creation of pipeline using that model. 
- Pipeline creation is a standard function, and as new model creator, the system does it all for you. All you have to do is to use messenger.createPipeline with model parameter as YOUR_MODEL_NAME.
- Pipeline creation does not need a special message type. It will be created by the initiator, and sent as messages to everyone who is member of that pipeline.
- However once the message has been given to all users, a valid action from any of them can move the state of pipeline forward, and your model processing logic has to handle what do do next.
- Such sequence of actions has to be defined till the state reaches closure.
- You can also define role based messages in model processing logic, and assign those roles to specific Bitcoin or FLO IDs. Each of them will need their own message type. Switch case of message type has has handle the sequencing of hange of state.
- Role based implementation was not needed in Multisig cases. But it could be created if use case emerges by expanding the processing states.
- In theory role definition can be done at model stage. But role allocation will need the creator to act, and that would mean that createPipeline function will need an expansion.    

```
const createPipeline = messenger.createPipeline = function (model, members, ekeySize = 16, pubkeys = null) {
        return new Promise((resolve, reject) => {
            //optional pubkey parameter
            if (pubkeys !== null) {
                if (!Array.isArray(pubkeys))
                    return reject('pubkeys must be an array (if passed)');
                else if (pubkeys.length !== members.length)
                    return reject('pubkey length doesnot match members length');
            }

            //validate members
            let imem1 = [],
                imem2 = []
            members.forEach((m, i) => {
                if (!floCrypto.validateAddr(m))
                    imem1.push(m);
                else if (!(m in floGlobals.pubKeys) && !floCrypto.isSameAddr(user.id, m)) {
                    if (pubkeys !== null && floCrypto.verifyPubKey(pubkeys[i], m))
                        floGlobals.pubKeys[m] = pubkeys[i];
                    else
                        imem2.push(m);
                }
            });
            if (imem1.length)
                return reject(`Invalid Members(floIDs): ${imem1}`);
            else if (imem2.length)
                return reject(`Invalid Members (pubKey not available): ${imem2}`);
            //create pipeline info
            const id = floCrypto.tmpID;
            let pipeline = {
                id,
                model,
                members
            }
            if (ekeySize)
                pipeline.eKey = floCrypto.randString(ekeySize);
            //send pipeline info to members
            let pipelineInfo = JSON.stringify(pipeline);
            let promises = members.filter(m => !floCrypto.isSameAddr(m, user.id)).map(m => sendRaw(pipelineInfo, m, "CREATE_PIPELINE", true));
            Promise.allSettled(promises).then(results => {
                console.debug(results.filter(r => r.status === "rejected").map(r => r.reason));
                _loaded.pipeline[pipeline.id] = Object.assign({}, pipeline);
                if (pipeline.eKey)
                    pipeline.eKey = encrypt(pipeline.eKey);
                compactIDB.addData("pipeline", pipeline, pipeline.id).then(result => {
                    requestPipelineInbox(pipeline.id, pipeline.model);
                    resolve(_loaded.pipeline[pipeline.id])
                }).catch(error => reject(error))
            })
        })
    }


```

## Explain me the full cycle of pipeline creation process

- TYPE_BTC_MULTISIG pipeline is created in MultiSig.createTx_BTC function. And as part of creation process, the creator performs the first signature at `tx_hex = btcOperator.signTx(tx_hex, privateKey)`, and the proceeds to create the pipeline. So the pipleine starts at "TRANSACT" stage itself as seen in `sendRaw(message, pipeline.id, "TRANSACTION", false)` message. 

```
MultiSig.createTx_BTC = function (address, redeemScript, receivers, amounts, fee = null, options = {}) {
        return new Promise(async (resolve, reject) => {
            let addr_type = btcOperator.validateAddress(address);
            if (addr_type != "multisig" && addr_type != "multisigBech32")
                return reject("Sender address is not a multisig");
            let decode = (addr_type == "multisig" ?
                coinjs.script().decodeRedeemScript : coinjs.script().decodeRedeemScriptBech32)(redeemScript);
            if (!decode || decode.address !== address || decode.type !== "multisig__")
                return reject("Invalid redeem-script");
            else if (!decode.pubkeys.includes(user.public.toLowerCase()) && !decode.pubkeys.includes(user.public.toUpperCase()))
                return reject("User is not a part of this multisig");
            else if (decode.pubkeys.length < decode.signaturesRequired)
                return reject("Invalid multisig (required is greater than users)");
            let co_owners = decode.pubkeys.map(p => floCrypto.getFloID(p));
            let privateKey = await floDapps.user.private;
            btcOperator.createMultiSigTx(address, redeemScript, receivers, amounts, fee, options).then(({ tx_hex }) => {
                tx_hex = btcOperator.signTx(tx_hex, privateKey);
                createPipeline(TYPE_BTC_MULTISIG, co_owners, 32, decode.pubkeys).then(pipeline => {
                    let message = encrypt(tx_hex, pipeline.eKey);
                    sendRaw(message, pipeline.id, "TRANSACTION", false)
                        .then(result => resolve(pipeline.id))
                        .catch(error => reject(error))
                }).catch(error => reject(error))
            }).catch(error => reject(error))
        })
    }

```    

- Similarly all role based definitions can be created at initial `MultiSig.createTx_BTC` equivalent function at pipeline creation stage. The initial start is needed here. Then the processing logic of model will dictate how will the state move forward. 
- Right now all members are flat. But a system can be created where the message goes to a specific role.

### Callback functions used

- callbackFn are used to push data in localIDB and invoke new UI after main fetching of data has been done from Supernodes

- In requestDirectInbox()

```
let callbackFn = function (dataSet, error) {
            if (error)
                return console.error(error)
            let newInbox = {
                messages: {},
                requests: {},
                responses: {},
                mails: {},
                newgroups: [],
                keyrevoke: [],
                pipeline: {}
            }
            for (let vc in dataSet) {
                try {
                    parseData(dataSet[vc], newInbox);
                } catch (error) {
                    //if (error !== "blocked-user")
                    console.log(error);
                } finally {
                    if (_loaded.appendix.lastReceived < vc)
                        _loaded.appendix.lastReceived = vc;
                }
            }
            compactIDB.writeData("appendix", _loaded.appendix.lastReceived, "lastReceived");
            console.debug(newInbox);
            UI.direct(newInbox)
        }
```    

- In `requestGroupInbox(groupID, _async = true)`

```
let callbackFn = function (dataSet, error) {
            if (error)
                return console.error(error)
            console.info(dataSet)
            let newInbox = {
                messages: {}
            }
            let infoChange = false;
            for (let vc in dataSet) {
                if (groupID !== dataSet[vc].receiverID)
                    continue;
                try {
                    infoChange = parseData(dataSet[vc], newInbox) || infoChange;
                    if (!_loaded.appendix[`lastReceived_${groupID}`] ||
                        _loaded.appendix[`lastReceived_${groupID}`] < vc)
                        _loaded.appendix[`lastReceived_${groupID}`] = vc;
                } catch (error) {
                    console.log(error)
                }
            }
            compactIDB.writeData("appendix", _loaded.appendix[`lastReceived_${groupID}`], `lastReceived_${groupID}`);
            if (infoChange) {
                let newInfo = Object.assign({}, _loaded.groups[groupID]);
                newInfo.eKey = encrypt(newInfo.eKey)
                compactIDB.writeData("groups", newInfo, groupID)
            }
            console.debug(newInbox);
            UI.group(newInbox);
        }
```

- In `requestPipelineInbox(pipeID, model, _async = true)`

```
let callbackFn = function (dataSet, error) {
            if (error)
                return console.error(error);
            console.info(dataSet)
            let newInbox = {
                messages: {}
            }
            for (let vc in dataSet) {
                if (pipeID !== dataSet[vc].receiverID)
                    continue;
                try {
                    parseData(dataSet[vc], newInbox);
                    if (!floCrypto.isSameAddr(dataSet[vc].senderID, user.id))
                        addMark(pipeID, "unread")
                    if (!_loaded.appendix[`lastReceived_${pipeID}`] ||
                        _loaded.appendix[`lastReceived_${pipeID}`] < vc)
                        _loaded.appendix[`lastReceived_${pipeID}`] = vc;
                } catch (error) {
                    console.log(error)
                }
            }
            compactIDB.writeData("appendix", _loaded.appendix[`lastReceived_${pipeID}`], `lastReceived_${pipeID}`);
            console.debug(newInbox);
            UI.pipeline(model, newInbox);
        }
```
