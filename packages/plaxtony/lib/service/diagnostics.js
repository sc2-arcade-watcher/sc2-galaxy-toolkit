"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const provider_1 = require("./provider");
class DiagnosticsProvider extends provider_1.AbstractProvider {
    subscribe(uri) {
    }
    diagnose(uri) {
        let diagnostics = [];
        const sourceFile = this.store.documents.get(uri);
        this.console.info(`${uri}`);
        const parseDiag = sourceFile.parseDiagnostics;
        this.console.info(`parse diagnostics = ${parseDiag.length}`);
        diagnostics = diagnostics.concat(parseDiag);
        const checkerDiag = sourceFile.additionalSyntacticDiagnostics;
        this.console.info(`type checker diagnostics = ${checkerDiag.length}`);
        diagnostics = diagnostics.concat(checkerDiag);
        return diagnostics;
    }
}
exports.DiagnosticsProvider = DiagnosticsProvider;
//# sourceMappingURL=diagnostics.js.map