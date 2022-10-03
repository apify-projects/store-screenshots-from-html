import { InputSchema } from './types.js';

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

const isDatasetInputValid = (input: InputSchema) => {
    const datasetValues = [input.datasetId, input.datasetKeyFields, input.datasetHtmlField];
    const allUndefined = datasetValues.every((inputValue) => inputValue === undefined);
    const noneUndefined = datasetValues.every((inputValue) => inputValue !== undefined);
    return allUndefined || noneUndefined;
};
