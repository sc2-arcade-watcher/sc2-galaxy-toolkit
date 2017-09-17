"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DiagnosticsProvider {
    constructor(store, reporter) {
        this.store = store;
        this.reporter = reporter;
    }
    subscribe(uri) {
    }
    diagnose() {
        let diagnostics = [];
        for (let doc of this.store.documents.values()) {
            diagnostics = diagnostics.concat(doc.parseDiagnostics);
        }
        return diagnostics;
    }
}
exports.DiagnosticsProvider = DiagnosticsProvider;
