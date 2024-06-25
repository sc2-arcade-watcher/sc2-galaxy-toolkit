import { createLogger, format, transports } from 'winston';
import * as util from 'util';

export const logger = createLogger({
    level: process.env['SC2LAYOUT_LOG_LEVEL'] || 'warn',
    format: format.combine(
        format.timestamp({
            alias: 'time',
            format: 'hh:mm:ss.SSS',
        }),
        format.ms(),
        format.prettyPrint({ colorize: false, depth: 2 }),
        format.printf(info => {
            const out = [
                `${info.time} ${info.level.substr(0, 3).toUpperCase()} ${info.message}`
            ];

            if (info.durationMs) {
                out[out.length - 1] += ` ${info.ms}`;
            }

            const splat: any[] = info[<any>Symbol.for('splat')];
            if (Array.isArray(splat)) {
                const dump = splat.length === 1 ? splat.pop() : splat;
                out.push(util.inspect(dump, {
                    colors: false,
                    depth: 3,
                    compact: true,
                    maxArrayLength: 500,
                    breakLength: 140,
                }));
            }

            return out.join('\n');
        }),
    ),
    transports: [
        new transports.Console(),
    ],
});

export function isPromise(val: any): val is Promise<any> {
    return !!val && typeof val === 'object' && typeof val.then === 'function' && typeof val.catch === 'function';
}

function formatMemoryUsage(mem: NodeJS.MemoryUsage) {
    function toMegabytes(n: number) {
        return (Math.round(n / 1024 / 1024 * 100) / 100).toFixed(1).padEnd(5);
    }
    return `${toMegabytes(mem.rss)}M ${toMegabytes(mem.heapTotal)}M ${toMegabytes(mem.heapUsed)}M`;
}

export interface LogItOptions {
    level?: 'error' | 'warn' | 'info' | 'verbose' | 'debug';
    message?: string;
    profiling?: boolean;
    profTime?: boolean;
    profMemory?: boolean;
    argsDump?: ((...args: any[]) => any) | boolean;
    resDump?: ((res: any) => any) | boolean;
    scopeDump?: ((scope: any) => any);
}

export function logIt(lgOpts: LogItOptions = {}) {
    lgOpts = Object.assign<LogItOptions, LogItOptions>({
        level: 'verbose',
        profiling: true,
        profTime: false,
        profMemory: false,
    }, lgOpts);

    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        if (!(<any>logger).isLevelEnabled(lgOpts.level)) {
            return;
        }

        const fn = <Function>descriptor.value;
        let msgPrefix: string;

        function markDone(fnResult: any, pTimeSnapshot: [number, number]) {
            const diff = process.hrtime(pTimeSnapshot);
            const diffMs = (diff[0] * 1000) + (diff[1] / 1000000);
            const out = [`-${msgPrefix.padEnd(35)} = ${diffMs.toFixed(0).padStart(4)}ms`];
            if (lgOpts.profiling || lgOpts.profMemory) {
                out.push(` | ${formatMemoryUsage(process.memoryUsage())}`);
            }

            let metaArgs: any[] = [];
            if (lgOpts.resDump === true) {
                metaArgs = [fnResult];
            }
            else if (typeof lgOpts.resDump === 'function') {
                metaArgs = [lgOpts.resDump(fnResult)];
            }
            else {
                if (!lgOpts.profiling) {
                    return;
                }
            }

            logger.log(lgOpts.level, out.join(''), ...metaArgs);
        }

        const proxyFn = function(this: any, ...args: any[]) {
            if (!msgPrefix) {
                msgPrefix = `${this.constructor.name}:${propertyKey}`;
            }

            const pTimeSnapshot = process.hrtime();

            const out: string[] = [` ${msgPrefix.padEnd(35 + 9)}`];
            if (lgOpts.message) {
                out.push(lgOpts.message);
            }
            else if (lgOpts.profiling || lgOpts.profMemory) {
                out.push(` | ${formatMemoryUsage(process.memoryUsage())}`);
            }

            if (lgOpts.scopeDump) {
                logger.log(lgOpts.level, out.join(''), lgOpts.scopeDump(this));
            }

            let metaArgs: any[] = [];
            if (lgOpts.argsDump === true) {
                metaArgs = args;
            }
            else if (typeof lgOpts.argsDump === 'function') {
                metaArgs = [lgOpts.argsDump(...args)];
            }
            logger.log(lgOpts.level, out.join(''), ...metaArgs);

            let fnResult = fn.apply(this, args);
            if (isPromise(fnResult)) {
                fnResult = fnResult
                    .then(res => {
                        markDone(res, pTimeSnapshot);
                        return res;
                    })
                    .catch((err: Error) => {
                        markDone(err, pTimeSnapshot);
                        throw err;
                    })
                ;
                return fnResult;
            }
            else {
                markDone(fnResult, pTimeSnapshot);
                return fnResult;
            }
        };
        descriptor.value = proxyFn;
    };
}
