import { AbstractProvider } from './provider';
import { Diagnostic } from '../compiler/types';

export type DiagnosticsCallback = (a: string) => void;

export class DiagnosticsProvider extends AbstractProvider {
    private reporter?: DiagnosticsCallback;

    public subscribe(uri: string) {
    }

    public diagnose(uri: string): Diagnostic[] {
        let diagnostics: Diagnostic[] = [];
        // for (let doc of this.store.documents.values()) {
        //     diagnostics = diagnostics.concat(doc.parseDiagnostics);
        // }
        diagnostics = this.store.documents.get(uri).parseDiagnostics;
        this.console.info(`${uri}: parse errors = ${diagnostics.length}`);
        return diagnostics;
    }
}
