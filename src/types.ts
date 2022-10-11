export interface InputSchema {
    html?: string,
    kvStoreId?: string,
    kvStorePrefix?: string,
    datasetId?: string,
    datasetHtmlField?: string,
    datasetKeyFields?: string[],
    datasetSaveToDataset?: boolean,
    imageQuality?: number,
    viewportWidth?: number,
    viewportHeight?: number,
    debug?: boolean,
}

export interface ScreenshotCrawlerUserData {
    key?: string,
    saveToDefaultDataset?: boolean,
    directHtml?: string,
}
