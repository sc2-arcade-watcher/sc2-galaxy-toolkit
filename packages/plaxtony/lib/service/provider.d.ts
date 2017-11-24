import { Store } from './store';
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
export declare abstract class AbstractProvider {
    protected store: Store;
    protected console: LoggerConsole;
    init(store: Store, logger: LoggerConsole): void;
}
export declare function createProvider<T extends AbstractProvider>(cls: new () => T, store: Store, logger?: LoggerConsole): T;
