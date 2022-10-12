import { Request } from 'crawlee';
import { InputSchema, ScreenshotCrawlerUserData } from './types.js';
import { API_BASE_URL } from './constants.js';
import { Configuration } from './configuration.js';

export const validateInput = (input: InputSchema): input is InputSchema => {
    if (input.datasetId && !input.datasetHtmlField) {
        throw new Error('If you load data from dataset, you have to set datasetHtmlField');
    }

    if (!input.datasetSaveToDataset && (!input.datasetKeyFields || input.datasetKeyFields.length === 0)) {
        throw new Error('If you want to save screenshots for dataset data only to KV store, you have to specify key fields.');
    }

    return true;
};

export const getDatasetRequests = async (configuration: Configuration, saveToDataset: boolean, keyFields?: string[]): Promise<Request[]> => {
    if (!configuration.sourceDatasetClient || !configuration.datasetItems) {
        throw new Error('Data from dataset could not be loaded.');
    }

    const { items } = await configuration.sourceDatasetClient.listItems();
    return items
        .map((item) => {
            const snapshotUrl = item[configuration.datasetHtmlField as string];
            if (!snapshotUrl || typeof snapshotUrl !== 'string') {
                return null;
            }

            const key = keyFields ? getItemKey(item, keyFields) : undefined;

            // Save item to local persisted map
            (configuration.datasetItems as Record<string, unknown>)[snapshotUrl] = item;

            const screenshotRequestUserData: ScreenshotCrawlerUserData = {
                key,
                saveToDefaultDataset: saveToDataset,
            };

            return new Request({
                url: snapshotUrl,
                userData: screenshotRequestUserData,
            });
        })
        .filter((request): request is Request => request !== null);
};

export const getUid = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const getKVStoreKeyURL = (kvStoreId: string, key: string): string => {
    const url = new URL(`/v2/key-value-stores/${kvStoreId}/records/${key}`, API_BASE_URL);
    return url.toString();
};

export const isCorrectKeyPrefix = (key: string, prefix: string | null) => {
    return !prefix || key.startsWith(prefix);
};

const getItemKey = (item: Record<string, unknown>, keyFields: string[]): string => {
    return keyFields
        .map((field) => {
            const fieldValue = item[field];
            if (!fieldValue) {
                return null;
            }

            if (typeof fieldValue === 'number') {
                return fieldValue.toString();
            }

            if (typeof fieldValue === 'string') {
                // String field can contain not allowed characters, e.g. ' '
                return fieldValue.replace(/[^a-zA-Z0-9!-_.'()]/g, '-');
            }

            return null;
        })
        .filter((fieldValue): fieldValue is string => fieldValue !== null)
        .join('_');
};
