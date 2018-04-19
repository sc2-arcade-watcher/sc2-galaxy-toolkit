"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const provider_1 = require("./provider");
const lsp = require("vscode-languageserver");
const checker_1 = require("../compiler/checker");
const utils_1 = require("./utils");
const utils_2 = require("../compiler/utils");
const vscode_uri_1 = require("vscode-uri");
class RenameProvider extends provider_1.AbstractProvider {
    onRenameRequest(params) {
        const workspaceEdit = {
            changes: {},
        };
        const sourceFile = this.store.documents.get(params.textDocument.uri);
        if (!sourceFile)
            return;
        const position = utils_1.getPositionOfLineAndCharacter(sourceFile, params.position.line, params.position.character);
        const currentToken = utils_1.getAdjacentIdentfier(position, sourceFile);
        if (!currentToken) {
            return null;
        }
        const checker = new checker_1.TypeChecker(this.store);
        const symbol = checker.getSymbolAtLocation(currentToken);
        if (!symbol) {
            return new lsp.ResponseError(lsp.ErrorCodes.InvalidRequest, 'Not identifier');
        }
        for (const decl of symbol.declarations) {
            const declSourceFile = utils_2.getSourceFileOfNode(decl);
            if ((!this.store.rootPath || !vscode_uri_1.default.parse(declSourceFile.fileName).fsPath.startsWith(this.store.rootPath)) &&
                !this.store.openDocuments.has(declSourceFile.fileName)) {
                return new lsp.ResponseError(lsp.ErrorCodes.InvalidRequest, 'Declaration not in workspace');
            }
        }
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(params.newName)) {
            return new lsp.ResponseError(lsp.ErrorCodes.InvalidRequest, 'Invalid name');
        }
        if (this.store.resolveGlobalSymbol(params.newName)) {
            return new lsp.ResponseError(lsp.ErrorCodes.InvalidRequest, 'Name already in use');
        }
        const locations = this.referencesProvider.onReferences({
            textDocument: params.textDocument,
            position: params.position,
            context: { includeDeclaration: true },
        }, true);
        for (const loc of locations) {
            if (typeof workspaceEdit.changes[loc.uri] === "undefined") {
                workspaceEdit.changes[loc.uri] = [];
            }
            workspaceEdit.changes[loc.uri].push({
                range: loc.range,
                newText: params.newName,
            });
        }
        return workspaceEdit;
    }
}
exports.RenameProvider = RenameProvider;
//# sourceMappingURL=rename.js.map