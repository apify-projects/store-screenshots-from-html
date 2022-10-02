import { Request } from 'crawlee';
import { SiteInputDto } from './types.js';
import { PLACEHOLDER_URL } from './constants.js';

class ScreenshotRequest extends Request {
    constructor(userData: SiteInputDto) {
        super({
            uniqueKey: userData.key,
            url: PLACEHOLDER_URL,
            userData,
        });
    }
}

export default ScreenshotRequest;
