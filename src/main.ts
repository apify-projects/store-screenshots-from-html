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

configuration.setInputValues(input as InputSchema);
await dataLoader.setInputValues(input as InputSchema);

const startUrls = await dataLoader.getNextBatch();
const crawler = new PlaywrightCrawler({
    requestHandler: router,
    maxRequestRetries: 1,
});

await crawler.run(startUrls);

await Actor.exit();
