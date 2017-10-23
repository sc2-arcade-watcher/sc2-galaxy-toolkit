import { Store } from './store';
import * as lsp from 'vscode-languageserver';

export interface LoggerConsole {
    /**
     * Show an error message.
     *
     * @param message The message to show.
     */
    error(message: string): void;
    /**
     * Show a warning message.
     *
     * @param message The message to show.
     */
    warn(message: string): void;
    /**
     * Show an information message.
     *
     * @param message The message to show.
     */
    info(message: string): void;
    /**
     * Log a message.
     *
     * @param message The message to log.
     */
    log(message: string): void;
}

export abstract class AbstractProvider {
    protected store: Store;
    protected console: LoggerConsole;

    public init(store: Store, logger: LoggerConsole) {
        this.store = store;
        this.console = logger;
    }
}

export function createProvider<T extends AbstractProvider>(cls: new () => T, store: Store, logger?: LoggerConsole): T {
    const provider = new cls();
    if (!logger) {
        logger = <LoggerConsole>{
            error: (msg) => {},
            warn: (msg) => {},
            info: (msg) => {},
            log: (msg) => {},
        };
    }
    provider.init(store, <LoggerConsole>{
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
    })
    return provider;
}
