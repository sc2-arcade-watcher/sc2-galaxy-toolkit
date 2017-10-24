import { AbstractProvider } from './provider';
import { Diagnostic } from '../compiler/types';
export declare type DiagnosticsCallback = (a: string) => void;
export declare class DiagnosticsProvider extends AbstractProvider {
    private reporter?;
    subscribe(uri: string): void;
    diagnose(uri: string): Diagnostic[];
}
