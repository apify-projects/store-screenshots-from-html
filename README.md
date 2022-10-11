# What does Screenshot Actor do?
This actor allows you to render and take screenshots of a saved HTML structure. You can provide the data from a dataset, key-value store or directly input the structure to actor.

# How much does it cost to use this actor?
You can create up to 3000 screenshots for 1 USD.

# Features
- Loading data from datasets
- Loading data from Key-value stores
- Loading HTML directly from input

# Input
- **html** - HTML structure you want to render
- **kvStoreId** - ID of KV store, you want to load input data from
- **kvStorePrefix** - if this option is set, only keys with given prefix will be used
- **datasetId** - ID of dataset, you want to load input data from
- **datasetSaveToDataset** - if set to true, output will be pushed to the default dataset, with new screenshotUrl field
- **datasetHtmlField** - name of a field, that contains HTML structure
- **datasetKeyFields** - item fields, that will create an unique key for the output screenshot
- **imageQuality** - quality of output JPEG screenshots, lowering this value can lower the size of the output
- **viewportWidth** - width of viewport
- **viewportHeight** - height of viewport

# Output
Output screenshots are stored either to the default key-value store or to the default dataset. File name for dataset screenshots is created by concatening the key fields with '_'. File name for data from Key-value store is the same as the original key, if prefix option is set, prefix is removed from the final file name.
If you set the datasetOutput option to Dataset, the actor will output all the items to the default dataset with a new field called screenshotUrl.

# Saving HTML structure
Most of the websites are including resources (css, js, ...) with relative links e.g.: "/assets/styles.css".
To be able to properly render the website just from the HTML structure, you should add to the result structure the base element.
Base element sets base url, that will be used with relative links.

## Adding base element with Puppeteer/Playwright
```js
await page.evaluate((url) => {
    const base = document.createElement('base');
    base.href = `${url.protocol}//${url.host}`;
    const head = document.head.prepend(base);
}, url);

const html = await page.content();
```

## Adding base element without headless browser
```js
const html = body.replace('<head>', `<head><base href="${url.protocol}//${url.host}" />`);
```

