import { KeyValueStore } from 'crawlee';
import { Actor, ApifyEnv } from 'apify';
import { DEFAULT_IMAGE_QUALITY, DEFAULT_VIEWPORT_HEIGHT, DEFAULT_VIEWPORT_WIDTH } from './constants.js';
import { DatasetScreenshotsOutput, InputSchema } from './types.js';

class Configuration {
    private readonly IMAGE_KV_STORE_PREFIX = 'IMAGES-';

    public imageQuality: number;
    public viewportWidth: number;
    public viewportHeight: number;
    public imageKVStore: KeyValueStore | null;

    constructor() {
        this.imageQuality = DEFAULT_IMAGE_QUALITY;
        this.viewportWidth = DEFAULT_VIEWPORT_WIDTH;
        this.viewportHeight = DEFAULT_VIEWPORT_HEIGHT;
        this.imageKVStore = null;
    }

    async init(input: InputSchema, env: ApifyEnv) {
        if (input.imageQuality) this.imageQuality = input.imageQuality;
        if (input.viewportWidth) this.viewportWidth = input.viewportWidth;
        if (input.viewportHeight) this.viewportHeight = input.viewportHeight;

        if (input.datasetOutput === DatasetScreenshotsOutput.Dataset) {
            const imageKVStoreID = `${this.IMAGE_KV_STORE_PREFIX}${env.actorRunId}`;
            this.imageKVStore = await Actor.openKeyValueStore(imageKVStoreID);
        }
    }
}

const configuration = new Configuration();
export default configuration;
