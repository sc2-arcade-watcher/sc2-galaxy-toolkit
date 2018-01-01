import * as lsp from 'vscode-languageserver';
import * as gt from '../compiler/types';
import { AbstractProvider } from './provider';
import { Diagnostic } from '../compiler/types';
import { TypeChecker } from '../compiler/checker';
import { unbindSourceFile } from '../compiler/binder';
import { getLineAndCharacterOfPosition } from './utils';

export type DiagnosticsCallback = (a: string) => void;

export class DiagnosticsProvider extends AbstractProvider {
    private reporter?: DiagnosticsCallback;

    private translateDiagnostics(sourceFile: gt.SourceFile, origDiagnostics: gt.Diagnostic[]): lsp.Diagnostic[] {
        let lspDiagnostics: lsp.Diagnostic[] = [];

        for (let dg of origDiagnostics) {
            lspDiagnostics.push({
                severity: lsp.DiagnosticSeverity.Error,
                range: {
                    start: getLineAndCharacterOfPosition(sourceFile, dg.start),
                    end: getLineAndCharacterOfPosition(sourceFile, dg.start + dg.length)
                },
                message: dg.messageText,
            });
        }

        return lspDiagnostics;
    }

    public subscribe(uri: string) {
    }

    public checkFile(documentUri: string) {
        const checker = new TypeChecker(this.store);
        const sourceFile = this.store.documents.get(documentUri);
        unbindSourceFile(sourceFile, this.store);
        sourceFile.additionalSyntacticDiagnostics = checker.checkSourceFile(sourceFile, true);
    }

    public provideDiagnostics(uri: string): lsp.Diagnostic[] {
        let diagnostics: Diagnostic[] = [];
        const sourceFile = this.store.documents.get(uri);

        const parseDiag = sourceFile.parseDiagnostics;
        diagnostics = diagnostics.concat(parseDiag);

        const checkerDiag = sourceFile.additionalSyntacticDiagnostics;
        diagnostics = diagnostics.concat(checkerDiag);

        this.console.info(`${uri} - ${parseDiag.length} - ${checkerDiag.length}`);

        return this.translateDiagnostics(sourceFile, diagnostics);
    }
}
