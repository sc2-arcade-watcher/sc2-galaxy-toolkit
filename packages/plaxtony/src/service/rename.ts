import { AbstractProvider } from './provider';
import * as gt from '../compiler/types';
import * as lsp from 'vscode-languageserver';
import { ReferencesProvider } from './references';
import { TypeChecker } from '../compiler/checker';
import { getPositionOfLineAndCharacter, getAdjacentIdentfier } from './utils';
import { getSourceFileOfNode } from '../compiler/utils';
import URI from 'vscode-uri/lib';

export class RenameProvider extends AbstractProvider {
    public referencesProvider: ReferencesProvider;

    public onRenameRequest(params: lsp.RenameParams): lsp.WorkspaceEdit | lsp.ResponseError<undefined> {
        const workspaceEdit = <lsp.WorkspaceEdit>{
            changes: {},
        };

        const sourceFile = this.store.documents.get(params.textDocument.uri);
        if (!sourceFile) return;

        const position = getPositionOfLineAndCharacter(sourceFile, params.position.line, params.position.character);
        const currentToken = getAdjacentIdentfier(position, sourceFile);
        if (!currentToken) {
            return null;
        }

        const checker = new TypeChecker(this.store);
        const symbol = checker.getSymbolAtLocation(currentToken);
        if (!symbol) {
            return new lsp.ResponseError<undefined>(lsp.ErrorCodes.InvalidRequest, 'Not identifier');
        }

        for (const decl of symbol.declarations) {
            const declSourceFile = getSourceFileOfNode(decl);
            if (
                (!this.store.rootPath || !URI.parse(declSourceFile.fileName).fsPath.startsWith(this.store.rootPath)) &&
                !this.store.openDocuments.has(declSourceFile.fileName)
            ) {
                return new lsp.ResponseError<undefined>(lsp.ErrorCodes.InvalidRequest, 'Declaration not in workspace');
            }
        }

        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(params.newName)) {
            return new lsp.ResponseError<undefined>(lsp.ErrorCodes.InvalidRequest, 'Invalid name');
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
            workspaceEdit.changes[loc.uri].push(<lsp.TextEdit>{
                range: loc.range,
                newText: params.newName,
            });
        }

        return workspaceEdit;
    }
}
