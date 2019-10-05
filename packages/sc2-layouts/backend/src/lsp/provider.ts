import { Store } from '../index/store';
import { S2LServer, ErrorReporter as ErrorReporterContext, ErrorHandlerType } from './server';
import { DescIndex } from '../index/desc';
import { XRay } from '../index/xray';
import { isPromise } from '../logger';

export abstract class AbstractProvider implements ErrorReporterContext {
    protected slSrv: S2LServer;
    protected store: Store;
    protected dIndex: DescIndex;
    protected xray: XRay;
    errHandler: ErrorHandlerType;

    public init(slSrv: S2LServer, store: Store) {
        this.slSrv = slSrv;
        this.errHandler = slSrv.errHandler;
        this.store = store;
        this.dIndex = this.store.index;
        this.xray = new XRay(this.store);
        this.prepare();
    }

    protected prepare() {}

    public install() {}
}

export function errGuard() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const fn = <Function>descriptor.value;

        const proxyFn = function(this: ErrorReporterContext, ...args: any[]) {
            let fnResult: any;
            try {
                fnResult = fn.apply(this, args);
                if (isPromise(fnResult)) {
                    fnResult = fnResult
                        .then(res => {
                            return res;
                        })
                        .catch((err: Error) => {
                            this.errHandler({
                                err,
                                propKey: propertyKey,
                                self: this,
                            });
                            throw err;
                        })
                    ;
                    return fnResult;
                }
                else {
                    return fnResult;
                }
            }
            catch (err) {
                this.errHandler({
                    err,
                    propKey: propertyKey,
                    self: this,
                });
                throw err;
            }
        };
        descriptor.value = proxyFn;
    };
}
