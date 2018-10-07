import * as util from 'util';
import * as vs from 'vscode';
import { Store } from '../index/store';
import { ServiceContext } from '../service';

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

export interface IService {
    console: LoggerConsole;
}

export abstract class AbstractProvider implements IService {
    protected svcContext: ServiceContext;
    protected store: Store;
    console: LoggerConsole;

    public init(svcContext: ServiceContext, store: Store, console: LoggerConsole) {
        this.svcContext = svcContext;
        this.store = store;
        this.console = console;
    }
}

export function createProvider<T extends AbstractProvider>(cls: new () => T, svcContext: ServiceContext, store: Store, logger?: LoggerConsole): T {
    const provider = new cls();
    if (!logger) {
        logger = <LoggerConsole>{
            error: (msg) => {},
            warn: (msg) => {},
            info: (msg) => {},
            log: (msg) => {},
        };
    }
    provider.init(svcContext, store, <LoggerConsole>{
        error: (message) => {
            logger.error(/* '[' + cls.name + '] ' +  */message);
        },
        warn: (message) => {
            logger.warn(/* '[' + cls.name + '] ' +  */message);
        },
        info: (message) => {
            logger.info(/* '[' + cls.name + '] ' +  */message);
        },
        log: (message) => {
            logger.log(/* '[' + cls.name + '] ' +  */message);
        },
    });
    return provider;
}

function formatElapsed(start: [number, number], end: [number, number]): string {
    const diff = process.hrtime(start);
    var elapsed = diff[1] / 1000000; // divide by a million to get nano to milli
    let out = '';
    if (diff[0] > 0) {
        out += diff[0] + "s ";
    }
    out += elapsed.toFixed(3) + "ms";
    return out;
}

let reqDepth = 0;
export function svcRequest(showArg = false, argFormatter?: (payload: any) => any, msg?: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const method = (<Function>descriptor.value);
        descriptor.value = async function(...args: any[]) {
            const server = <IService>this;
            server.console.info('>'.repeat(++reqDepth) + ' ' + (msg ? msg : propertyKey));
            if (showArg) {
                server.console.log(util.inspect(args[0], true, 1, false));
            }
            else if (argFormatter) {
                server.console.log(util.inspect(argFormatter(args[0])));
            }

            var start = process.hrtime();
            let ret;
            try {
                ret = method.bind(this)(...arguments);
                if (ret instanceof Promise) {
                    ret = await ret;
                }
            }
            catch (e) {
                ret = null;
                server.console.error('[' + (<Error>e).name + '] ' + (<Error>e).message + '\n' + (<Error>e).stack);
            }

            server.console.info('='.repeat(reqDepth--) + ' ' + (msg ? msg : propertyKey) + ' ' + `${formatElapsed(start, process.hrtime())} [${typeof ret}]`);

            return ret;
        }
    }
}