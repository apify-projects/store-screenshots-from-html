export interface InputSchema {
    html?: string,
    kvStoreId?: string,
    kvStorePrefix?: string,
    datasetId?: string,
    datasetHtmlField?: string,
    datasetKeyField?: string,
    imageQuality?: number,
    viewportWidth?: number,
    viewportHeight?: number,
}

export interface SiteInputDto {
    key: string,
    html: string,
}
