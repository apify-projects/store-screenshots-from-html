import { Actor } from 'apify';
import { BasicCrawler, log, LogLevel, PlaywrightCrawler, Request } from 'crawlee';
import { dataLoaderCrawlerRouter, screenshotCrawlerRouter } from './routes.js';
import { InputSchema, ScreenshotCrawlerUserData } from './types.js';
import { getDatasetRequests, validateInput } from './tools.js';
import configuration from './configuration.js';
import {
    DIRECT_INPUT_KEY,
    KV_STORE_INITIAL_REQUEST_UNIQUE_KEY,
} from './constants.js';
import PlaceholderRequest from './placeholder_request.js';

await Actor.init();

const input = await Actor.getInput<InputSchema>();
if (!input) {
    throw new Error('You have to provide input');
}
validateInput(input);

if (input.debug) {
    log.setLevel(LogLevel.DEBUG);
}

await configuration.init(input as InputSchema);
if (configuration.screenshotCrawlerStartRequests === null) {
    throw new Error('Could not initialize screenshot crawler request list');
}

if (input.html) {
    const userData: ScreenshotCrawlerUserData = {
        key: DIRECT_INPUT_KEY,
        directHtml: input?.html,
    };

    const directInputRequest = new PlaceholderRequest(DIRECT_INPUT_KEY, userData as Record<string, unknown>);
    configuration.screenshotCrawlerStartRequests.push(directInputRequest);
}

if (input.kvStoreId) {
    const dataLoaderStartRequests = [];
    dataLoaderStartRequests.push(new PlaceholderRequest(KV_STORE_INITIAL_REQUEST_UNIQUE_KEY));
    const requestLoader = new BasicCrawler({
        requestHandler: dataLoaderCrawlerRouter,
    });
    await requestLoader.run(dataLoaderStartRequests);
}

if (input.datasetId) {
    const datasetStartRequests = await getDatasetRequests(configuration, input.datasetSaveToDataset ?? true, input.datasetKeyFields);
    configuration.screenshotCrawlerStartRequests.push(...datasetStartRequests);
}

const crawler = new PlaywrightCrawler({
    requestHandler: screenshotCrawlerRouter,
});
await crawler.run(configuration.screenshotCrawlerStartRequests as Request[]);

await Actor.exit();
