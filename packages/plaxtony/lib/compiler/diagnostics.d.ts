import * as gt from './types';
export declare function formatStringFromArgs(text: string, args: {
    [index: number]: string;
}, baseIndex?: number): string;
export declare function createFileDiagnostic(file: gt.SourceFile, start: number, length: number, message: gt.DiagnosticMessage, ...args: (string | number)[]): gt.Diagnostic;
