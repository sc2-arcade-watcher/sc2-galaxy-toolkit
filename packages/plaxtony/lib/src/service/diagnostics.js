"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lsp = require("vscode-languageserver");
const provider_1 = require("./provider");
const checker_1 = require("../compiler/checker");
const binder_1 = require("../compiler/binder");
const utils_1 = require("./utils");
class DiagnosticsProvider extends provider_1.AbstractProvider {
    translateDiagnostics(sourceFile, origDiagnostics, source) {
        let lspDiagnostics = [];
        for (let dg of origDiagnostics) {
            lspDiagnostics.push({
                severity: lsp.DiagnosticSeverity.Error,
                range: {
                    start: utils_1.getLineAndCharacterOfPosition(sourceFile, dg.start),
                    end: utils_1.getLineAndCharacterOfPosition(sourceFile, dg.start + dg.length)
                },
                message: dg.messageText,
                source,
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
        const sourceFile = this.store.documents.get(uri);
        let parseDiag = sourceFile.parseDiagnostics;
        let checkerDiag = sourceFile.additionalSyntacticDiagnostics;
        this.console.log(`${uri} - ${parseDiag.length} - ${checkerDiag.length}`);
        if (parseDiag.length > 100)
            parseDiag = parseDiag.slice(0, 100);
        if (checkerDiag.length > 100)
            checkerDiag = checkerDiag.slice(0, 100);
        return [].concat(this.translateDiagnostics(sourceFile, parseDiag, 'parser'), this.translateDiagnostics(sourceFile, checkerDiag, 'typecheck'));
    }
    checkFileRecursively(documentUri) {
        const checker = new checker_1.TypeChecker(this.store);
        const sourceFile = this.store.documents.get(documentUri);
        const result = checker.checkSourceFileRecursively(sourceFile);
        const ld = [];
        for (const [itUri, itDg] of result.diagnostics) {
            ld.push({
                uri: itUri,
                diagnostics: this.translateDiagnostics(this.store.documents.get(itUri), itDg, 'verify'),
            });
        }
        return {
            success: result.success,
            diagnostics: ld,
        };
    }
}
exports.DiagnosticsProvider = DiagnosticsProvider;
//# sourceMappingURL=diagnostics.js.map