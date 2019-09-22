import { AbstractProvider } from './provider';
import * as gt from '../compiler/types';
import * as lsp from 'vscode-languageserver';
import { ReferencesProvider } from './references';
import { TypeChecker } from '../compiler/checker';
import { getPositionOfLineAndCharacter, getAdjacentIdentfier, getLineAndCharacterOfPosition } from './utils';
import { getSourceFileOfNode } from '../compiler/utils';
import URI from 'vscode-uri';

function deepEqual(x: any, y: any): boolean {
    const ok = Object.keys, tx = typeof x, ty = typeof y;
    return x && y && tx === 'object' && tx === ty ? (
        ok(x).length === ok(y).length &&
        ok(x).every(key => deepEqual(x[key], y[key]))
    ) : (x === y);
}

export interface RenameRequestCached {
    params: lsp.TextDocumentPositionParams;
    sourceFile: gt.SourceFile;
    identifier: gt.Identifier;
    symbol: gt.Symbol;
    locations?: lsp.Location[];
};

export class RenameProvider extends AbstractProvider {
    public referencesProvider: ReferencesProvider;
    protected recentRequest: RenameRequestCached;

    protected getTokenAt(params: lsp.TextDocumentPositionParams) {
        const sourceFile = this.store.documents.get(params.textDocument.uri);
        if (!sourceFile) return null;

        const position = getPositionOfLineAndCharacter(sourceFile, params.position.line, params.position.character);
        const currentToken = getAdjacentIdentfier(position, sourceFile);
        if (!currentToken) return null;

        const checker = new TypeChecker(this.store);
        const symbol = checker.getSymbolAtLocation(currentToken);
        if (!symbol) return null;

        return {
            sourceFile,
            identifier: currentToken,
            symbol,
        };
    }

    protected locationsToWorkspaceEdits(locations: lsp.Location[], newText: string) {
        const workspaceEdit = <lsp.WorkspaceEdit>{
            changes: {},
        };

        for (const loc of locations) {
            if (typeof workspaceEdit.changes[loc.uri] === "undefined") {
                workspaceEdit.changes[loc.uri] = [];
            }
            workspaceEdit.changes[loc.uri].push(<lsp.TextEdit>{
                range: loc.range,
                newText: newText,
            });
        }

        return workspaceEdit;
    }

    public prefetchLocations() {
        if (this.recentRequest && !this.recentRequest.locations) {
            this.recentRequest.locations = this.referencesProvider.onReferences({
                textDocument: this.recentRequest.params.textDocument,
                position: this.recentRequest.params.position,
                context: { includeDeclaration: true },
            }, true);
        }
    }

    public onPrepareRename(params: lsp.TextDocumentPositionParams) {
        // const sourceFile = this.store.documents.get(params.textDocument.uri);
        const result = this.getTokenAt(params);
        if (!result) {
            return new lsp.ResponseError<undefined>(lsp.ErrorCodes.InvalidParams, 'Not an identifier');
        }

        for (const decl of result.symbol.declarations) {
            const declSourceFile = getSourceFileOfNode(decl);
            if (!this.store.isUriInWorkspace(declSourceFile.fileName) && !this.store.openDocuments.has(declSourceFile.fileName)) {
                return new lsp.ResponseError<undefined>(lsp.ErrorCodes.InvalidParams, 'Declaration not in workspace');
            }
        }

        this.recentRequest = Object.assign({params}, result);

        return {
            placeholder: result.symbol.escapedName,
            range: <lsp.Range>{
                start: getLineAndCharacterOfPosition(getSourceFileOfNode(result.identifier), result.identifier.pos),
                end: getLineAndCharacterOfPosition(getSourceFileOfNode(result.identifier), result.identifier.end),
            },
        };
    }

    public onRenameRequest(params: lsp.RenameParams): lsp.WorkspaceEdit | lsp.ResponseError<undefined> {
        const sourceFile = this.store.documents.get(params.textDocument.uri);
        if (!sourceFile) return;

        if (!this.recentRequest || !deepEqual(this.recentRequest.params, <lsp.TextDocumentPositionParams>{ textDocument: params.textDocument, position: params.position }) || this.recentRequest.sourceFile !== sourceFile) {
            return;
        }

        if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(params.newName)) {
            return new lsp.ResponseError<undefined>(lsp.ErrorCodes.InvalidRequest, 'Invalid name');
        }

        if (this.store.resolveGlobalSymbol(params.newName)) {
            return new lsp.ResponseError<undefined>(lsp.ErrorCodes.InvalidRequest, 'Name already in use');
        }

        if (this.recentRequest.locations) {
            return this.locationsToWorkspaceEdits(this.recentRequest.locations, params.newName);
        }

        return null;
    }
}
