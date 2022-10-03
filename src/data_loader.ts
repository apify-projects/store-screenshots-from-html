import { Actor, KeyValueStore } from 'apify';
import { Dataset, log } from 'crawlee';
import { InputSchema, SiteInputDto } from './types.js';
import { DEFAULT_BATCH_SIZE, DEFAULT_NAME } from './constants.js';
import ScreenshotRequest from './screenshot_request.js';

enum InputSources {
    DirectInput,
    DatasetInput,
    KVStoreInput
}

interface InputSourceState {
    finished: boolean,
    sourceType: InputSources,
}

class DataLoader {
    private _htmlInput: string | null;
    private _dataset: Dataset | null;
    private _datasetHtmlField: string | null;
    private _datasetKeyFields: string[] | null;
    private _kvStore: KeyValueStore | null;
    private _kvStorePrefix: string | null;
    private _usedKeys: Set<string>;
    private _datasetPointer: number;
    private _inputState: InputSourceState[];
    private readonly _batchSize: number;

    constructor() {
        this._htmlInput = null;
        this._dataset = null;
        this._datasetHtmlField = null;
        this._datasetKeyFields = null;
        this._kvStore = null;
        this._kvStorePrefix = null;
        this._usedKeys = new Set<string>();
        this._datasetPointer = 0;
        this._batchSize = DEFAULT_BATCH_SIZE;
        this._inputState = [];
    }

    public async setInputValues(input: InputSchema) {
        if (input.html) {
            this._htmlInput = input.html;
            this._inputState.push({
                finished: false,
                sourceType: InputSources.DirectInput,
            });
        }
        if (input.datasetId) {
            this._dataset = await Actor.openDataset(input.datasetId);
            this._inputState.push({
                finished: false,
                sourceType: InputSources.DatasetInput,
            });
        }

        if (input.datasetHtmlField) this._datasetHtmlField = input.datasetHtmlField;
        if (input.datasetKeyFields) this._datasetKeyFields = input.datasetKeyFields;

        if (input.kvStoreId) {
            this._kvStore = await Actor.openKeyValueStore(input.kvStoreId);
            this._inputState.push({
                finished: false,
                sourceType: InputSources.KVStoreInput,
            });
        }
        if (input.kvStorePrefix) this._kvStorePrefix = input.kvStorePrefix;
    }

    public async getNextBatch(): Promise<ScreenshotRequest[]> {
        log.debug('Loading batch');
        const loaded = [];
        while (loaded.length < this._batchSize) {
            const items: SiteInputDto[] | null = await this.getItemsFromNextSource(this._batchSize - loaded.length);
            if (items !== null) {
                loaded.push(...items);
            }

            if (items === null) {
                break;
            }
        }

        // If the batch is complete, mark last item, as shouldLoadNext
        if (loaded.length === this._batchSize) {
            log.debug(`Batch is complete, marking next loader`);
            const lastLoaded = loaded[loaded.length - 1];
            lastLoaded.shouldLoadNext = true;
        }

        return loaded.map((item) => new ScreenshotRequest(item));
    }

    private async getItemsFromNextSource(itemCount: number): Promise<SiteInputDto[] | null> {
        const nextInputSourceState = this._inputState.find((inputSourceState) => !inputSourceState.finished);
        if (!nextInputSourceState) return null;

        const { sourceType } = nextInputSourceState;
        if (sourceType === InputSources.DirectInput) {
            log.debug(`Loading data from direct source`);
            const item: SiteInputDto = {
                key: DEFAULT_NAME,
                html: this._htmlInput as string,
                shouldLoadNext: false,
            };
            nextInputSourceState.finished = true;
            return [item];
        }

        if (sourceType === InputSources.KVStoreInput) {
            const items = await this.getItemsFromKVStore(itemCount);
            if (items.length < itemCount) nextInputSourceState.finished = true;
            log.debug(`Loaded ${items.length} items from KV store`);
            return items;
        }

        if (sourceType === InputSources.DatasetInput) {
            const items = await this.getItemsFromDataset(itemCount);
            if (items.length < itemCount) nextInputSourceState.finished = true;
            log.debug(`Loaded ${items.length} items from dataset`);
            return items;
        }

        return [];
    }

    private async getItemsFromKVStore(itemCount: number): Promise<SiteInputDto[]> {
        const inputSites: SiteInputDto[] = [];
        let loaded = 0;
        await this._kvStore?.forEachKey(async (key) => {
            if (!this._kvStorePrefix || key.startsWith(this._kvStorePrefix)) {
                if (loaded < itemCount) {
                    if (!this._usedKeys.has(key)) {
                        this._usedKeys.add(key);
                        loaded++;

                        const html = await this._kvStore?.getValue<string>(key) as string;
                        const keyWithoutPrefix = this._kvStorePrefix ? key.slice(this._kvStorePrefix.length) : key;
                        inputSites.push({
                            key: keyWithoutPrefix,
                            html,
                            shouldLoadNext: false,
                        });
                    }
                }
            }
        });

        return inputSites;
    }

    private async getItemsFromDataset(itemCount: number): Promise<SiteInputDto[]> {
        if (this._dataset === null) {
            throw new Error('Dataset is not open');
        }

        const { items } = await this._dataset.getData({
            offset: this._datasetPointer,
            limit: itemCount,
        });
        this._datasetPointer += items.length;

        const filteredItems = items.filter((item) => {
            const hasHtmlField = typeof item[this._datasetHtmlField as string] === 'string';

            const hasKeyFields = this._datasetKeyFields?.every((field) => item[field]);
            return hasHtmlField && hasKeyFields;
        });

        return filteredItems.map((item) => {
            const key = this._datasetKeyFields?.map((field) => item[field]).join('_') as string;
            return {
                html: item[this._datasetHtmlField as string],
                key,
                shouldLoadNext: false,
            };
        });
    }
}

const dataLoader = new DataLoader();
export default dataLoader;
