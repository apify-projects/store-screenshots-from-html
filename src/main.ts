import { Actor } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
import { router } from './routes.js';
import { InputSchema } from './types.js';
import { getStartRequests, validateInput } from './tools.js';
import configuration from './configuration.js';

await Actor.init();

const input = await Actor.getInput<InputSchema>();

validateInput(input);
configuration.setInputValues(input as InputSchema);
const startUrls = await getStartRequests(input as InputSchema);

const crawler = new PlaywrightCrawler({
    requestHandler: router,
});

await crawler.run(startUrls);

// Exit successfully
await Actor.exit();
