import { AbstractProvider } from './provider';
import { Diagnostic } from '../compiler/types';
import { TypeChecker } from '../compiler/checker';

export type DiagnosticsCallback = (a: string) => void;

export class DiagnosticsProvider extends AbstractProvider {
    private reporter?: DiagnosticsCallback;

    public subscribe(uri: string) {
    }

    public diagnose(uri: string): Diagnostic[] {
        let diagnostics: Diagnostic[] = [];
        const sourceFile = this.store.documents.get(uri);

        this.console.info(`${uri}`);

        const parseDiag = sourceFile.parseDiagnostics;
        this.console.info(`parse diagnostics = ${parseDiag.length}`);
        diagnostics = diagnostics.concat(parseDiag);

        const checker = new TypeChecker(this.store);
        const checkerDiag = checker.checkSourceFile(sourceFile);
        this.console.info(`type checker diagnostics = ${checkerDiag.length}`);
        diagnostics = diagnostics.concat(checkerDiag);

        return diagnostics;
    }
}
