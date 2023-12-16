## routeTo(targetPage, options = {}) explanation 
- routeTo handles routing and animation logic for our web applications. This function takes a targetPage and an optional options object as parameters.
- Destructures options Object: firstLoad, hashChange, and isPreview are destructured from the options object.
- Parsing targetPage:
  1. If targetPage is an empty string, pageId is set to 'check_details'.
  2. If targetPage contains a slash (/), it splits targetPage into parts. The first part is the pageId, and the second part (if any) is further split into subPageId1.
Query parameters are parsed from the search parameters of the URL, if available.
- Handling check_details Page:
  1. If the pageId is 'check_details', it checks for query parameters. If there are query parameters, it updates the search input value and renders query results.
- Animating Navigation:
  1. Animates the transition of the navigation menu based on the current and previous active elements.
  2. Handles the indicator animation to show the active menu item.
  3. If the current page is not found in the navigation menu, it hides the navigation bar.
- Showing/Hiding Pages:
  1. Hides all pages, then shows the target page and animates its opacity to make it visible.
- Updating pagesData.lastPage:
  1. Updates the lastPage property of pagesData to keep track of the last visited page.

## UI Page Flow
- Linking scripts are added first

- Create sm-notifications thereafter
- Create sm-popup

- Then create `<div id="main_card">`

- Then create `<header></header>` inside the main card

- Then create `<main id="pages_container" class="grid">`

- Then the first page `<div id="check_details" class="page hidden">`
- Then the second page `<div id="send" class="page">`
- Then the third page `<div id="convert_key" class="page hidden flex flex-direction-column gap-1-5">`


- Inside a page
  1. Fieldsets
  2. Input inside it
  3. Then button <button type="submit" onclick="convertBtcPrivateKey()" class="button button--primary cta" disabled="">Convert</button>

- Clicking a button will lead to action <button type="submit" onclick="convertBtcPrivateKey()" 

- Everything happens through clicking

```javascript
  <button id="convert_to_flo" class="button--primary justify-self-center cta" type="submit" disabled="">
                                        Convert
                                    </button>

<div id="btc_address_converter_result"></div>

 getRef('convert_to_flo').onclick = evt => {
            const btc_bech = getRef('convert_btc_input').value.trim();
            if (btc_bech === '') {
                getRef('convert_btc_input').focusIn()
                return notify('Please enter BTC address', 'error');
            }

```

- Or we can add eventlisteners from Javascript side
- We add eventListeners to any id
```javascript
        getRef('convert_btc_private_key_form').addEventListener('invalid', e => {
            getRef('flo_private').value = '';
            getRef('converted_flo_address').value = '';
        })
```

- Then the navbar
` <nav id="main_navbar">`
- Navbar goes into bottom of the page

- Then you place your popups
```
<sm-popup id="txid_popup">

getRef('txid_popup__resolved_txid').value = txid;
openPopup('txid_popup', true);
```

- Now there is <script id="ui_utils"> this is the script with UI Javascript logic

- And finally the <script></script> with actual business logic
 
- Attach eventlisteners to different buttons, and handle them as per the busines logic
