import { Actor } from 'apify';
import { DatasetScreenshotsOutput, InputSchema } from './types.js';
import { API_BASE_URL } from './constants.js';

export const validateInput = (input: InputSchema | null) => {
    if (!input) {
        throw new Error('You have to provide input');
    }

    if (input.datasetOutput === DatasetScreenshotsOutput.Dataset && !Actor.isAtHome()) {
        throw new Error('Option datasetOutput is available only on Apify platform');
    }

    if (input.datasetOutput === DatasetScreenshotsOutput.KVStore && !input.datasetKeyFields) {
        throw new Error('You have to set datasetKeyFields, if you want to save screenshots from dataset to KV store');
    }

    if (input.datasetId && !input.datasetHtmlField) {
        throw new Error('You have to set datasetHtmlField, if you load data from dataset');
    }
};

export const getUid = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const getKVStoreKeyURL = (kvStoreId: string, key: string): string => {
    const url = new URL(`/v2/key-value-stores/${kvStoreId}/records/${key}`, API_BASE_URL);
    return url.toString();
};
