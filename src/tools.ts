import { InputSchema } from './types.js';

export const validateInput = (input: InputSchema | null) => {
    if (!input) {
        throw new Error('You have to provide input');
    }

    if (!isDatasetInputValid(input)) {
        throw new Error('You have to set all datasetId, datasetHtmlField, datasetKeyField inputs if you want to get data from dataset');
    }
};

const isDatasetInputValid = (input: InputSchema) => {
    const datasetValues = [input.datasetId, input.datasetKeyFields, input.datasetHtmlField];
    const noneUndefined = datasetValues.every((inputValue) => inputValue !== undefined);
    return noneUndefined || !input.datasetId;
};
