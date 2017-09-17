import { Store } from './store';
import { Diagnostic } from '../compiler/types';

export type DiagnosticsCallback = (a: string) => void;

export class DiagnosticsProvider {
    private store: Store;
    private reporter?: DiagnosticsCallback;

    public constructor(store: Store, reporter?: DiagnosticsCallback) {
        this.store = store;
        this.reporter = reporter;
    }

    public subscribe(uri: string) {
    }

    public diagnose(): Diagnostic[] {
        let diagnostics: Diagnostic[] = [];
        for (let doc of this.store.documents.values()) {
            diagnostics = diagnostics.concat(doc.parseDiagnostics);
        }
        return diagnostics;
    }
}
