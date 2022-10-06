import { Actor } from 'apify';
import { Configuration, Dataset, EventType, KeyValueStore, log, StorageClient } from 'crawlee';
import { DatasetScreenshotsOutput, InputSchema, SiteInputDto } from './types.js';
import { DEFAULT_BATCH_SIZE, DEFAULT_NAME, HTML_MIME } from './constants.js';
import ScreenshotRequest from './screenshot_request.js';
import { getUid } from './tools.js';

enum InputSources {
    DirectInput,
    DatasetInput,
    KVStoreInput
}

interface InputSourceState {
    finished: boolean,
    sourceType: InputSources,
}

interface DataLoaderState {
    usedKeys: string[],
    datasetPointer: number,
    inputState: InputSourceState[],
    initialBatchLoaded: boolean,
}

class DataLoader {
    public initialBatchLoaded: boolean;
    private _storageClient: StorageClient | null;
    private _htmlInput: string | null;
    private _dataset: Dataset | null;
    private _loadDatasetItem: boolean;
    private _datasetHtmlField: string | null;
    private _datasetKeyFields: string[] | null;
    private _datasetItemCount: number | null;
    private _kvStore: KeyValueStore | null;
    private _kvStorePrefix: string | null;
    private _usedKeys: Set<string>;
    private _datasetPointer: number;
    private _inputState: InputSourceState[];
    private readonly _batchSize: number;
    private readonly stateKey = 'DATA_LOADER_STATE';

    constructor() {
        this._storageClient = null;
        this._htmlInput = null;
        this._dataset = null;
        this._loadDatasetItem = false;
        this._datasetHtmlField = null;
        this._datasetKeyFields = null;
        this._datasetItemCount = null;
        this._kvStore = null;
        this._kvStorePrefix = null;
        this._usedKeys = new Set<string>();
        this._datasetPointer = 0;
        this._batchSize = DEFAULT_BATCH_SIZE;
        this._inputState = [];
        this.initialBatchLoaded = false;
    }

    public async init(input: InputSchema) {
        await Actor.init();
        await this.loadState();

        Actor.on(EventType.PERSIST_STATE, async () => {
            await this.saveState();
        });

        this._storageClient = Configuration.getStorageClient();

        if (input.html) {
            this._htmlInput = input.html;
        }

        if (input.datasetId) {
            this._dataset = await Actor.openDataset(input.datasetId);
            this._datasetItemCount = (await this._dataset.getInfo())?.itemCount ?? null;
        }
        if (input.datasetOutput === DatasetScreenshotsOutput.Dataset) {
            this._loadDatasetItem = true;
        }
        if (input.datasetHtmlField) {
            this._datasetHtmlField = input.datasetHtmlField;
        }
        if (input.datasetKeyFields) {
            this._datasetKeyFields = input.datasetKeyFields;
        }

        if (input.kvStoreId) {
            this._kvStore = await Actor.openKeyValueStore(input.kvStoreId);
        }
        if (input.kvStorePrefix) {
            this._kvStorePrefix = input.kvStorePrefix;
        }

        // not setting inputState after migration
        if (this._inputState.length === 0) {
            if (input.html) {
                this._inputState.push({
                    finished: false,
                    sourceType: InputSources.DirectInput,
                });
            }

            if (input.datasetId) {
                this._inputState.push({
                    finished: false,
                    sourceType: InputSources.DatasetInput,
                });
            }

            if (input.kvStoreId) {
                this._inputState.push({
                    finished: false,
                    sourceType: InputSources.KVStoreInput,
                });
            }
        }
    }

    public async getNextBatch(): Promise<ScreenshotRequest[]> {
        log.debug('Loading next batch');
        this.initialBatchLoaded = true;

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

    private async saveState() {
        const state: DataLoaderState = {
            usedKeys: [...this._usedKeys],
            datasetPointer: this._datasetPointer,
            inputState: this._inputState,
            initialBatchLoaded: this.initialBatchLoaded,
        };

        log.debug(`Input state before migration: ${JSON.stringify(this._inputState)}`);
        log.debug(`Dataset pointer before migration: ${this._datasetPointer}`);
        log.debug(`Length of usedKeys before migration: ${this._usedKeys.size}`);

        await Actor.setValue(this.stateKey, state);
    }

    private async loadState() {
        const state = await Actor.getValue<DataLoaderState>(this.stateKey);
        if (!state) return;

        this._usedKeys = new Set<string>(state.usedKeys);
        this._datasetPointer = state.datasetPointer;
        this._inputState = state.inputState;
        this.initialBatchLoaded = state.initialBatchLoaded;

        log.debug(`Input state after migration: ${JSON.stringify(this._inputState)}`);
        log.debug(`Dataset pointer after migration: ${this._datasetPointer}`);
        log.debug(`Length of usedKeys after migration: ${this._usedKeys.size}`);
        log.debug(`Initial batch loaded: ${this.initialBatchLoaded}`);
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
            if (items.length < itemCount) {
                nextInputSourceState.finished = true;
            }
            log.debug(`Loaded ${items.length} items from KV store`);
            return items;
        }

        if (sourceType === InputSources.DatasetInput) {
            const items = await this.getItemsFromDataset(itemCount);
            if (this._datasetPointer >= (this._datasetItemCount as number)) {
                nextInputSourceState.finished = true;
            }
            log.debug(`Loaded ${items.length} items from dataset`);
            return items;
        }

        return [];
    }

    private async getItemsFromKVStore(itemCount: number): Promise<SiteInputDto[]> {
        if (this._kvStore === null) {
            throw new Error('KV store is not open');
        }
        const inputSites: SiteInputDto[] = [];
        let loaded = 0;
        await this._kvStore?.forEachKey(async (key) => {
            const record = await this._storageClient?.keyValueStore(this._kvStore?.id as string).getRecord(key);
            if (
                this.isCorrectKeyPrefix(key)
                && loaded < itemCount
                && record?.contentType?.includes(HTML_MIME)
                && !this._usedKeys.has(key)
            ) {
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
        });

        return inputSites;
    }

    private isCorrectKeyPrefix(key: string) {
        return !this._kvStorePrefix || key.startsWith(this._kvStorePrefix);
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

            // Checking key fields if set
            const hasKeyFields = !this._datasetKeyFields || this._datasetKeyFields?.every((field) => item[field] !== undefined);
            return hasHtmlField && hasKeyFields;
        });

        return filteredItems.map((item) => {
            const fieldsKey = this._datasetKeyFields
                ? this._datasetKeyFields?.map((field) => item[field]).join('_') as string
                : undefined;

            /**
             * If key from fields is available, we use this key.
             * Otherwise, we generate random key.
             */
            const key = fieldsKey ?? getUid();
            const itemValue = this._loadDatasetItem ? item : undefined;

            return {
                html: item[this._datasetHtmlField as string],
                shouldLoadNext: false,
                key,
                item: itemValue,
            };
        });
    }
}

const dataLoader = new DataLoader();
export default dataLoader;
