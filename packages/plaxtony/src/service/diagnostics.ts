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

    private translateDiagnostics(sourceFile: gt.SourceFile, origDiagnostics: gt.Diagnostic[], source: string): lsp.Diagnostic[] {
        let lspDiagnostics: lsp.Diagnostic[] = [];

        for (let dg of origDiagnostics) {
            lspDiagnostics.push({
                severity: lsp.DiagnosticSeverity.Error,
                range: {
                    start: getLineAndCharacterOfPosition(sourceFile, dg.start),
                    end: getLineAndCharacterOfPosition(sourceFile, dg.start + dg.length)
                },
                message: dg.messageText,
                source,
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
        const sourceFile = this.store.documents.get(uri);

        let parseDiag = sourceFile.parseDiagnostics;
        let checkerDiag = sourceFile.additionalSyntacticDiagnostics;

        this.console.log(`${uri} - ${parseDiag.length} - ${checkerDiag.length}`);

        if (parseDiag.length > 100) parseDiag = parseDiag.slice(0, 100);
        if (checkerDiag.length > 100) checkerDiag = checkerDiag.slice(0, 100);

        return [].concat(
            this.translateDiagnostics(sourceFile, parseDiag, 'parser'),
            this.translateDiagnostics(sourceFile, checkerDiag, 'typecheck')
        );
    }

    public checkFileRecursively(documentUri: string) {
        const checker = new TypeChecker(this.store);
        const sourceFile = this.store.documents.get(documentUri);
        const result = checker.checkSourceFileRecursively(sourceFile);

        const ld: lsp.PublishDiagnosticsParams[] = [];
        for (const [itUri, itDg] of result.diagnostics) {
            ld.push({
                uri: itUri,
                diagnostics: this.translateDiagnostics(this.store.documents.get(itUri), itDg, 'verify'),
            })
        }

        return {
            success: result.success,
            diagnostics: ld,
        };
    }
}
