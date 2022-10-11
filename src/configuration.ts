import { Request } from 'crawlee';
import { Actor } from 'apify';
import { DatasetClient, KeyValueStoreClient } from 'apify-client';
import {
    DATASET_ITEMS_KEY,
    DEFAULT_IMAGE_QUALITY,
    DEFAULT_VIEWPORT_HEIGHT,
    DEFAULT_VIEWPORT_WIDTH,
    KV_STORE_REQUESTS_KEY,
} from './constants.js';
import { InputSchema } from './types.js';

export class Configuration {
    public imageQuality: number;
    public viewportWidth: number;
    public viewportHeight: number;
    public screenshotCrawlerStartRequests: Request[] | null;
    public sourceKVStoreClient: KeyValueStoreClient | null;
    public kvStorePrefix: string | null;
    public sourceDatasetClient: DatasetClient | null;
    public datasetHtmlField: string | null;
    public datasetItems: Record<string, unknown> | null;

    constructor() {
        this.imageQuality = DEFAULT_IMAGE_QUALITY;
        this.viewportWidth = DEFAULT_VIEWPORT_WIDTH;
        this.viewportHeight = DEFAULT_VIEWPORT_HEIGHT;
        this.screenshotCrawlerStartRequests = null;
        this.kvStorePrefix = null;
        this.sourceKVStoreClient = null;
        this.sourceDatasetClient = null;
        this.datasetHtmlField = null;
        this.datasetItems = null;
    }

    async init(input: InputSchema) {
        const client = Actor.newClient();
        const store = await Actor.openKeyValueStore();

        if (input.imageQuality) {
            this.imageQuality = input.imageQuality;
        }

        if (input.viewportWidth) {
            this.viewportWidth = input.viewportWidth;
        }

        if (input.viewportHeight) {
            this.viewportHeight = input.viewportHeight;
        }

        this.screenshotCrawlerStartRequests = await store.getAutoSavedValue<Request[]>(KV_STORE_REQUESTS_KEY, []);

        if (input.kvStoreId) {
            this.sourceKVStoreClient = client.keyValueStore(input.kvStoreId); this.kvStorePrefix = input.kvStorePrefix ?? null;
        }

        if (input.datasetId) {
            this.sourceDatasetClient = client.dataset(input.datasetId);
            this.datasetItems = await store.getAutoSavedValue<Record<string, unknown>>(DATASET_ITEMS_KEY, {});
        }

        if (input.datasetHtmlField) {
            this.datasetHtmlField = input.datasetHtmlField;
        }
    }
}

const configuration = new Configuration();
export default configuration;
