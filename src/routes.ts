import { createPlaywrightRouter } from 'crawlee';
import { Actor } from 'apify';
import { SiteInputDto } from './types.js';
import { SCREENSHOT_MIME } from './constants.js';
import configuration from './configuration.js';
import dataLoader from './data_loader.js';

export const router = createPlaywrightRouter();

const store = await Actor.openKeyValueStore();

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
    const { key, html, shouldLoadNext } = request.userData as SiteInputDto;
    log.info(`Handling page - ${key}`);
    if (shouldLoadNext) {
        log.info('Loading next batch');
        const items = await dataLoader.getNextBatch();
        crawler.addRequests(items);
    }

    await page.setContent(html, { waitUntil: 'load' });
    const screenshot = await page.screenshot({ type: 'jpeg', quality: configuration.imageQuality });
    await store.setValue(key, screenshot, { contentType: SCREENSHOT_MIME });
});
