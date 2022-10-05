import { DEFAULT_IMAGE_QUALITY, DEFAULT_VIEWPORT_HEIGHT, DEFAULT_VIEWPORT_WIDTH } from './constants.js';
import { InputSchema } from './types.js';

class Configuration {
    public imageQuality: number;
    public viewportWidth: number;
    public viewportHeight: number;

    constructor() {
        this.imageQuality = DEFAULT_IMAGE_QUALITY;
        this.viewportWidth = DEFAULT_VIEWPORT_WIDTH;
        this.viewportHeight = DEFAULT_VIEWPORT_HEIGHT;
    }

    init(input: InputSchema) {
        if (input.imageQuality) this.imageQuality = input.imageQuality;
        if (input.viewportWidth) this.viewportWidth = input.viewportWidth;
        if (input.viewportHeight) this.viewportHeight = input.viewportHeight;
    }
}

const configuration = new Configuration();
export default configuration;
