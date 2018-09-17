"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const provider_1 = require("./provider");
const lsp = require("vscode-languageserver");
const checker_1 = require("../compiler/checker");
const utils_1 = require("./utils");
const utils_2 = require("../compiler/utils");
const vscode_uri_1 = require("vscode-uri");
function deepEqual(x, y) {
    const ok = Object.keys, tx = typeof x, ty = typeof y;
    return x && y && tx === 'object' && tx === ty ? (ok(x).length === ok(y).length &&
        ok(x).every(key => deepEqual(x[key], y[key]))) : (x === y);
}
;
class RenameProvider extends provider_1.AbstractProvider {
    getTokenAt(params) {
        const sourceFile = this.store.documents.get(params.textDocument.uri);
        if (!sourceFile)
            return null;
        const position = utils_1.getPositionOfLineAndCharacter(sourceFile, params.position.line, params.position.character);
        const currentToken = utils_1.getAdjacentIdentfier(position, sourceFile);
        if (!currentToken)
            return null;
        const checker = new checker_1.TypeChecker(this.store);
        const symbol = checker.getSymbolAtLocation(currentToken);
        if (!symbol)
            return null;
        return {
            sourceFile,
            identifier: currentToken,
            symbol,
        };
    }
    locationsToWorkspaceEdits(locations, newText) {
        const workspaceEdit = {
            changes: {},
        };
        for (const loc of locations) {
            if (typeof workspaceEdit.changes[loc.uri] === "undefined") {
                workspaceEdit.changes[loc.uri] = [];
            }
            workspaceEdit.changes[loc.uri].push({
                range: loc.range,
                newText: newText,
            });
        }
        return workspaceEdit;
    }
    prefetchLocations() {
        if (this.recentRequest && !this.recentRequest.locations) {
            this.recentRequest.locations = this.referencesProvider.onReferences({
                textDocument: this.recentRequest.params.textDocument,
                position: this.recentRequest.params.position,
                context: { includeDeclaration: true },
            }, true);
        }
    }
    onPrepareRename(params) {
        // const sourceFile = this.store.documents.get(params.textDocument.uri);
        const result = this.getTokenAt(params);
        if (!result) {
            return new lsp.ResponseError(lsp.ErrorCodes.InvalidParams, 'Not an identifier');
        }
        for (const decl of result.symbol.declarations) {
            const declSourceFile = utils_2.getSourceFileOfNode(decl);
            if ((!this.store.rootPath || !vscode_uri_1.default.parse(declSourceFile.fileName).fsPath.startsWith(this.store.rootPath)) &&
                !this.store.openDocuments.has(declSourceFile.fileName)) {
                return new lsp.ResponseError(lsp.ErrorCodes.InvalidParams, 'Declaration not in workspace');
            }
        }
        this.recentRequest = Object.assign({ params }, result);
        return {
            placeholder: result.symbol.escapedName,
            range: {
                start: utils_1.getLineAndCharacterOfPosition(utils_2.getSourceFileOfNode(result.identifier), result.identifier.pos),
                end: utils_1.getLineAndCharacterOfPosition(utils_2.getSourceFileOfNode(result.identifier), result.identifier.end),
            },
        };
    }
    onRenameRequest(params) {
        const sourceFile = this.store.documents.get(params.textDocument.uri);
        if (!sourceFile)
            return;
        if (!this.recentRequest || !deepEqual(this.recentRequest.params, { textDocument: params.textDocument, position: params.position }) || this.recentRequest.sourceFile !== sourceFile) {
            return;
        }
        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(params.newName)) {
            return new lsp.ResponseError(lsp.ErrorCodes.InvalidRequest, 'Invalid name');
        }
        if (this.store.resolveGlobalSymbol(params.newName)) {
            return new lsp.ResponseError(lsp.ErrorCodes.InvalidRequest, 'Name already in use');
        }
        if (this.recentRequest.locations) {
            return this.locationsToWorkspaceEdits(this.recentRequest.locations, params.newName);
        }
        return null;
    }
}
exports.RenameProvider = RenameProvider;
//# sourceMappingURL=rename.js.map