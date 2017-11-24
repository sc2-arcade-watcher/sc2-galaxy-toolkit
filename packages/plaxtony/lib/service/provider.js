"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AbstractProvider {
    init(store, logger) {
        this.store = store;
        this.console = logger;
    }
}
exports.AbstractProvider = AbstractProvider;
function createProvider(cls, store, logger) {
    const provider = new cls();
    if (!logger) {
        logger = {
            error: (msg) => { },
            warn: (msg) => { },
            info: (msg) => { },
            log: (msg) => { },
        };
    }
    provider.init(store, {
        error: (message) => {
            logger.error('[' + cls.name + '] ' + message);
        },
        warn: (message) => {
            logger.warn('[' + cls.name + '] ' + message);
        },
        info: (message) => {
            logger.info('[' + cls.name + '] ' + message);
        },
        log: (message) => {
            logger.log('[' + cls.name + '] ' + message);
        },
    });
    return provider;
}
exports.createProvider = createProvider;
//# sourceMappingURL=provider.js.map