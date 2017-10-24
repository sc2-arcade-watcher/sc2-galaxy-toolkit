import { Store } from './store';
export interface LoggerConsole {
    error(message: string): void;
    warn(message: string): void;
    info(message: string): void;
    log(message: string): void;
}
export declare abstract class AbstractProvider {
    protected store: Store;
    protected console: LoggerConsole;
    init(store: Store, logger: LoggerConsole): void;
}
export declare function createProvider<T extends AbstractProvider>(cls: new () => T, store: Store, logger?: LoggerConsole): T;
