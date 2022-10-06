export interface InputSchema {
    html?: string,
    kvStoreId?: string,
    kvStorePrefix?: string,
    datasetId?: string,
    datasetOutput?: DatasetScreenshotsOutput,
    datasetHtmlField?: string,
    datasetKeyFields?: string[],
    imageQuality?: number,
    viewportWidth?: number,
    viewportHeight?: number,
    debug?: boolean,
}

export interface SiteInputDto {
    html: string,
    shouldLoadNext: boolean,
    key?: string,
    item?: Record<string, unknown>
}

export enum DatasetScreenshotsOutput {
    Dataset = 'dataset',
    KVStore = 'kv',
}
