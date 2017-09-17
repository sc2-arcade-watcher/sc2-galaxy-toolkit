import { Store } from './store';
import { Diagnostic } from '../compiler/types';
export declare type DiagnosticsCallback = (a: string) => void;
export declare class DiagnosticsProvider {
    private store;
    private reporter?;
    constructor(store: Store, reporter?: DiagnosticsCallback);
    subscribe(uri: string): void;
    diagnose(): Diagnostic[];
}
