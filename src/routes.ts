import { createPlaywrightRouter } from 'crawlee';
import { Actor } from 'apify';
import { SiteInputDto } from './types.js';
import { SCREENSHOT_MIME } from './constants.js';
import configuration from './configuration.js';
import dataLoader from './data_loader.js';
import { getKVStoreKeyURL } from './tools.js';

export const router = createPlaywrightRouter();

router.use(async ({ page, blockRequests }) => {
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

router.addDefaultHandler(async ({ log, page, request, crawler }) => {
    const { key, html, shouldLoadNext, item } = request.userData as SiteInputDto;
    log.info(`Handling page - ${key}`);
    if (shouldLoadNext && request.retryCount === 0) {
        log.info('Loading next batch');
        const items = await dataLoader.getNextBatch();
        await crawler.addRequests(items);
    }

    await page.setContent(html, { waitUntil: 'load' });
    const screenshot = await page.screenshot({ type: 'jpeg', quality: configuration.imageQuality });

    if (item && configuration.imageKVStore) {
        const imageKey = `${key}.jpeg`;
        await configuration.imageKVStore.setValue(imageKey, screenshot, { contentType: SCREENSHOT_MIME });

        // Runs for which we save dataset data to new dataset are allowed only on Apify platform
        const screenshotUrl = getKVStoreKeyURL(configuration.imageKVStore.id, imageKey);

        log.debug(`Saving screenshot to named KV store: ${configuration.imageKVStore.name}, key: ${imageKey}, url: ${screenshotUrl}`);
        await Actor.pushData({
            ...item,
            screenshotUrl,
        });
    }

    if (!item && key) {
        log.debug(`Saving screenshot to default KV store - key: ${key}`);
        await Actor.setValue(key, screenshot, { contentType: SCREENSHOT_MIME });
    }
});
