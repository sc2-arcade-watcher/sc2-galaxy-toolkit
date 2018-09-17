import * as lsp from 'vscode-languageserver';
import { AbstractProvider } from './provider';
export declare type DiagnosticsCallback = (a: string) => void;
export declare class DiagnosticsProvider extends AbstractProvider {
    private reporter?;
    private translateDiagnostics(sourceFile, origDiagnostics, source);
    subscribe(uri: string): void;
    checkFile(documentUri: string): void;
    provideDiagnostics(uri: string): lsp.Diagnostic[];
    checkFileRecursively(documentUri: string): {
        success: boolean;
        diagnostics: lsp.PublishDiagnosticsParams[];
    };
}
