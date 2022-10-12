import { Request } from 'crawlee';
import { PLACEHOLDER_URL } from './constants.js';

class PlaceholderRequest extends Request {
    constructor(key: string, userData: Record<string, unknown> = {}) {
        super({
            uniqueKey: key,
            url: PLACEHOLDER_URL,
            userData,
        });
    }
}

export default PlaceholderRequest;
