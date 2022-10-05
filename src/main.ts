import { Actor } from 'apify';
import { log, LogLevel, PlaywrightCrawler } from 'crawlee';
import { router } from './routes.js';
import { InputSchema } from './types.js';
import { validateInput } from './tools.js';
import configuration from './configuration.js';
import dataLoader from './data_loader.js';

await Actor.init();

const input = await Actor.getInput<InputSchema>();

validateInput(input);
if ((input as InputSchema).debug) {
    log.setLevel(LogLevel.DEBUG);
}

configuration.init(input as InputSchema);
await dataLoader.init(input as InputSchema);

const crawler = new PlaywrightCrawler({
    requestHandler: router,
});

// Do not load initial batch after migration
const startUrls = !dataLoader.initialBatchLoaded
    ? await dataLoader.getNextBatch()
    : [];

await crawler.run(startUrls);

await Actor.exit();
