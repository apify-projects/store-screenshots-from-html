import { Actor } from 'apify';
import { log } from 'crawlee';
import { InputSchema, SiteInputDto } from './types.js';
import { DEFAULT_NAME } from './constants.js';
import ScreenshotRequest from './screenshot_request.js';

export const validateInput = (input: InputSchema | null) => {
    if (!input) {
        throw new Error('You have to provide input');
    }

    if (input.kvStorePrefix && !input.kvStoreId) {
        throw new Error('You have to set input kvStoreId, if you set input kvStorePrefix');
    }

    if (!isDatasetInputValid(input)) {
        throw new Error('You have to set all datasetId, datasetHtmlField, datasetKeyField inputs, or none of them');
    }
};

export const getStartRequests = async (input: InputSchema): Promise<ScreenshotRequest[]> => {
    const inputSites = await getInputSites(input);
    return inputSites.map((inputSite) => new ScreenshotRequest(inputSite));
};

const isDatasetInputValid = (input: InputSchema) => {
    const datasetValues = [input.datasetId, input.datasetKeyField, input.datasetHtmlField];
    const allUndefined = datasetValues.every((inputValue) => inputValue === undefined);
    const noneUndefined = datasetValues.every((inputValue) => inputValue !== undefined);
    return allUndefined || noneUndefined;
};

const getInputSites = async (input: InputSchema): Promise<SiteInputDto[]> => {
    const inputSites: SiteInputDto[] = [];

    if (input.html) {
        inputSites.push({
            key: DEFAULT_NAME,
            html: input.html,
        });
    }

    if (input.kvStoreId) {
        const sitesFromKVStore = await getInputFromKVStore(input.kvStoreId, input.kvStorePrefix);
        log.info(`Loaded ${sitesFromKVStore.length} from KV store`);
        inputSites.push(...sitesFromKVStore);
    }

    if (input.datasetId && input.datasetKeyField && input.datasetHtmlField) {
        const sitesFromDataset = await getInputFromDataset(input.datasetId, input.datasetKeyField, input.datasetHtmlField);
        log.info(`Loaded ${sitesFromDataset.length} from dataset`);
        inputSites.push(...sitesFromDataset);
    }

    return inputSites;
};

/**
 * FIXME - batching
 */
const getInputFromKVStore = async (kvStoreId: string, prefix: string | undefined): Promise<SiteInputDto[]> => {
    const store = await Actor.openKeyValueStore(kvStoreId);
    const inputSites: SiteInputDto[] = [];

    await store.forEachKey(async (key) => {
        if (!prefix || key.startsWith(prefix)) {
            const html = await store.getValue<string>(key) as string;
            const keyWithoutPrefix = prefix ? key.slice(prefix.length) : key;
            inputSites.push({
                key: keyWithoutPrefix,
                html,
            });
        }
    });

    return inputSites;
};

const getInputFromDataset = async (datasetId: string, keyField: string, htmlField: string): Promise<SiteInputDto[]> => {
    const dataset = await Actor.openDataset(datasetId);
    const { items } = await dataset.getData();

    return items
        .map((item) => {
            const key = item[keyField];
            const html = item[htmlField];

            if (!key || !html) return null;

            if (typeof key !== 'string') return null;
            if (typeof html !== 'string') return null;

            return { key, html };
        })
        .filter((item) => item !== null) as SiteInputDto[];
};
