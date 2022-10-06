# What does Screenshot Actor do?
This actor allows you to render and take screenshots of a saved HTML structure. You can provide the data from a dataset, key-value store or directly input the structure to actor.

# How much does it cost to use this actor?
You can create up to 3000 screenshots for 1 USD.

# Features
- Loading data from datasets
    - You can set up multiple keys as a unique key
- Loading data from Key-value stores
    - You can filter values by key prefix
- Loading HTML directly from input
- Loading data in batches
    - Actor loads data in batches, therefore this actor is usable also for large datasets without using too much memory

# Input
- **html** - HTML structure you want to render
- **kvStoreId** - ID of KV store, you want to load input data from
- **kvStorePrefix** - if this option is set, only keys with given prefix will be used
- **datasetId** - ID of dataset, you want to load input data from
- **datasetOutput** - Screenshots for data loaded from dataset can be saved either to Key-Value store or to Dataset
    - Dataset - Default dataset of the actor will contain copy of source dataset. Each item will have additional item screenshotUrl containing URL to made screenshot.
    - Key-value store - Screenshots will be saved to the default dataset of the actor. You should set the datasetKeyFields option, by which the key will be created.
- **datasetHtmlField** - name of field, that contains HTML structure
- **datasetKeyFields** - item fields that should form a unique key for output screenshot
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

