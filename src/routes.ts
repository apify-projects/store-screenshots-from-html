import { createBasicRouter, createPlaywrightRouter, Request } from 'crawlee';
import { Actor } from 'apify';
import { ScreenshotCrawlerUserData } from './types.js';
import { DATA_LOADER_LABELS, KV_STORE_PAGINATION_LIMIT, SCREENSHOT_EXTENSION, SCREENSHOT_MIME } from './constants.js';
import configuration from './configuration.js';
import { getKVStoreKeyURL, getUid, isCorrectKeyPrefix } from './tools.js';
import PlaceholderRequest from './placeholder_request.js';

export const dataLoaderCrawlerRouter = createBasicRouter();
export const screenshotCrawlerRouter = createPlaywrightRouter();

await Actor.init();
const store = await Actor.openKeyValueStore();

/**
 * Handles pagination over KV store.
 * Saves requests on snapshot URLs
 */
dataLoaderCrawlerRouter.addDefaultHandler(async ({ crawler, request, log }) => {
    const { exclusiveStartKey } = request.userData as Record<string, unknown>;
    if (!configuration.sourceKVStoreClient) {
        throw new Error('KV Store client was not initialized.');
    }

    log.info(`Loading data from KV store - start key: ${exclusiveStartKey}`);
    const { nextExclusiveStartKey, isTruncated, items } = await configuration.sourceKVStoreClient.listKeys({
        limit: KV_STORE_PAGINATION_LIMIT,
        exclusiveStartKey: exclusiveStartKey as string | undefined,
    });

    const requests = items.map((item) => {
        if (!isCorrectKeyPrefix(item.key, configuration.kvStorePrefix)) {
            return null;
        }

        const url = getKVStoreKeyURL(configuration.sourceKVStoreClient?.id as string, item.key);
        const screenshotRequestUserData: ScreenshotCrawlerUserData = {
            key: item.key,
        };

        return new Request({
            url,
            userData: screenshotRequestUserData,
        });
    }).filter((screenshotRequest) => screenshotRequest !== null);
    configuration.screenshotCrawlerStartRequests?.push(...(requests as Request[]));

    if (isTruncated) {
        const kvStoreRequest = new PlaceholderRequest(nextExclusiveStartKey, {
            exclusiveStartKey: nextExclusiveStartKey,
            label: DATA_LOADER_LABELS.KV_STORE,
        });
        await crawler.addRequests([kvStoreRequest]);
    }
});

screenshotCrawlerRouter.use(async ({ page, blockRequests }) => {
    // Set viewport size according to configuration
    page.setViewportSize({
        width: configuration.viewportWidth,
        height: configuration.viewportHeight,
    });

    // Disable any resource blocking
    blockRequests({
        urlPatterns: [],
    });
});

screenshotCrawlerRouter.addDefaultHandler(async ({ log, page, request }) => {
    const { key, saveToDefaultDataset, directHtml } = request.userData as ScreenshotCrawlerUserData;
    log.info(`Handling page - ${request.url}`);

    const fullKey = `${key ?? getUid()}.${SCREENSHOT_EXTENSION}`.replace('.html', '');

    if (directHtml) {
        await page.setContent(directHtml, { waitUntil: 'load' });
    }

    const screenshot = await page.screenshot({ type: 'jpeg', quality: configuration.imageQuality });

    log.debug(`Saving screenshot to default KV store - key: ${key}`);
    await Actor.setValue(fullKey, screenshot, { contentType: SCREENSHOT_MIME });

    /**
     * If data were loaded from dataset,
     * we are pushing to actor's default dataset identical items, but with additional screenshotUrl field.
     */
    if (saveToDefaultDataset) {
        const screenshotUrl = getKVStoreKeyURL(store.id, fullKey);
        const item = configuration.datasetItems?.[request.url];
        if (typeof item === 'object') {
            await Actor.pushData({
                ...item,
                screenshotUrl,
            });
        }
    }
});
