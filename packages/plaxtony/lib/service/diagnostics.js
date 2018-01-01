"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lsp = require("vscode-languageserver");
const provider_1 = require("./provider");
const checker_1 = require("../compiler/checker");
const binder_1 = require("../compiler/binder");
const utils_1 = require("./utils");
class DiagnosticsProvider extends provider_1.AbstractProvider {
    translateDiagnostics(sourceFile, origDiagnostics) {
        let lspDiagnostics = [];
        for (let dg of origDiagnostics) {
            lspDiagnostics.push({
                severity: lsp.DiagnosticSeverity.Error,
                range: {
                    start: utils_1.getLineAndCharacterOfPosition(sourceFile, dg.start),
                    end: utils_1.getLineAndCharacterOfPosition(sourceFile, dg.start + dg.length)
                },
                message: dg.messageText,
            });
        }
        return lspDiagnostics;
    }
    subscribe(uri) {
    }
    checkFile(documentUri) {
        const checker = new checker_1.TypeChecker(this.store);
        const sourceFile = this.store.documents.get(documentUri);
        binder_1.unbindSourceFile(sourceFile, this.store);
        sourceFile.additionalSyntacticDiagnostics = checker.checkSourceFile(sourceFile, true);
    }
    provideDiagnostics(uri) {
        let diagnostics = [];
        const sourceFile = this.store.documents.get(uri);
        const parseDiag = sourceFile.parseDiagnostics;
        diagnostics = diagnostics.concat(parseDiag);
        const checkerDiag = sourceFile.additionalSyntacticDiagnostics;
        diagnostics = diagnostics.concat(checkerDiag);
        this.console.info(`${uri} - ${parseDiag.length} - ${checkerDiag.length}`);
        return this.translateDiagnostics(sourceFile, diagnostics);
    }
}
exports.DiagnosticsProvider = DiagnosticsProvider;
//# sourceMappingURL=diagnostics.js.map