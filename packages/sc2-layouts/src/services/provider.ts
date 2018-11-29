import * as util from 'util';
import * as vs from 'vscode';
import { Store } from '../index/store';
import { ServiceContext } from '../service';
import { DescIndex } from '../index/desc';
import { XRay } from '../index/xray';

export interface ILoggerConsole {
    error(msg: string, ...params: any[]): void;
    warn(msg: string, ...params: any[]): void;
    info(msg: string, ...params: any[]): void;
    log(msg: string, ...params: any[]): void;
    debug(msg: string, ...params: any[]): void;
}

export enum LoggerLevel {
    error,
    warn,
    info,
    log,
    debug,
}
// type LoggerLevelKey = keyof typeof LoggerLevel;
// type LoggerConfig = { [K in LoggerLevelKey]: boolean };
type LoggerConsoleEmit = (msg: string, ...params: any[]) => void;

export function createLogger(emitter?: LoggerConsoleEmit): ILoggerConsole {
    if (!emitter) emitter = (msg: string, ...params: any[]) => {};
    return {
        error: (msg: string, ...params: any[]) => emitter(msg, params),
        warn: (msg: string, ...params: any[]) => emitter(msg, params),
        info: (msg: string, ...params: any[]) => emitter(msg, params),
        log: (msg: string, ...params: any[]) => emitter(msg, params),
        debug: (msg: string, ...params: any[]) => emitter(msg, params),
    };
}

export interface IService {
    console: ILoggerConsole;
}

export abstract class AbstractProvider implements IService {
    protected svcContext: ServiceContext;
    protected extContext: vs.ExtensionContext;
    console: ILoggerConsole;
    protected store: Store;
    protected dIndex: DescIndex;
    protected xray: XRay;

    public init(svcContext: ServiceContext, store: Store, console: ILoggerConsole) {
        this.svcContext = svcContext;
        this.extContext = svcContext.extContext;
        this.console = console;
        this.store = store;
        this.dIndex = this.store.index;
        this.xray = new XRay(this.store);
        this.prepare();
    }

    protected prepare() {}
}

export function createProvider<T extends AbstractProvider>(cls: new () => T, svcContext: ServiceContext, store: Store, logger: ILoggerConsole): T {
    const provider = new cls();
    provider.init(svcContext, store, logger);
    return provider;
}

function formatElapsed(start: [number, number], end: [number, number]): string {
    const diff = process.hrtime(start);
    let elapsed = diff[1] / 1000000; // divide by a million to get nano to milli
    let out = '';
    if (diff[0] > 0) {
        out += diff[0] + 's ';
    }
    out += elapsed.toFixed(3) + 'ms';
    return out;
}

let reqDepth = 0;
export function svcRequest(showArg = false, argFormatter?: (...payload: any[]) => any, resultFormatter?: (payload: any) => any) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const method = (<Function>descriptor.value);
        descriptor.value = async function(...args: any[]) {
            const server = <IService>this;
            server.console.info('>'.repeat(++reqDepth) + ' ' + propertyKey);
            if (showArg) {
                server.console.log(util.inspect(args[0], true, 1, false));
            }
            else if (argFormatter) {
                server.console.log(util.inspect(argFormatter(...args)));
            }

            let start = process.hrtime();
            let ret;
            try {
                ret = method.bind(this)(...arguments);
                if (ret instanceof Promise) {
                    ret = await ret;
                }
            }
            catch (e) {
                ret = void 0;
                server.console.error('[' + (<Error>e).name + '] ' + (<Error>e).message + '\n' + (<Error>e).stack);
            }

            if (ret !== void 0 && resultFormatter) {
                server.console.log(
                    '='.repeat(reqDepth--) + ' ' + propertyKey
                    + ' ' + `${formatElapsed(start, process.hrtime())}`
                    + ' r = ' + util.inspect(resultFormatter(ret))
                );
            }
            else {
                server.console.info(
                    '='.repeat(reqDepth--) + ' ' + propertyKey
                    + ' ' + `${formatElapsed(start, process.hrtime())}`
                );
            }

            return ret;
        };
    };
}
