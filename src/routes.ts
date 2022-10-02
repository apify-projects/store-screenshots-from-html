import { createPlaywrightRouter } from 'crawlee';
import { Actor } from 'apify';
import { SiteInputDto } from './types.js';
import configuration from './configuration.js';
import { SCREENSHOT_MIME } from './constants.js';

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

router.addDefaultHandler(async ({ log, page, request }) => {
    const { key, html } = request.userData as SiteInputDto;
    log.info(`Handling page - ${key}`);
    await page.setContent(html, { waitUntil: 'load' });
    const screenshot = await page.screenshot({ type: 'jpeg', quality: configuration.imageQuality });
    await store.setValue(key, screenshot, { contentType: SCREENSHOT_MIME });
});
