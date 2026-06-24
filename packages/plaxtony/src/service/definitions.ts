import * as gt from '../compiler/types';
import { TypeChecker } from '../compiler/checker';
import { AbstractProvider } from './provider';
import { getSourceFileOfNode, isNamedDeclarationKind } from '../compiler/utils';
import { getTokenAtPosition, getLineAndCharacterOfPosition, getNodeRange } from './utils';
import * as lsp from 'vscode-languageserver';

export class DefinitionProvider extends AbstractProvider {
    protected processIncludeStatement(inclStmt: gt.IncludeStatement) {
        const links: lsp.DefinitionLink[] = [];

        const qresults = this.store.qualifiedDocuments.get(
            inclStmt.path.value.toLowerCase().replace(/\.galaxy$/, '')
        );
        if (!qresults) return;

        for (const qsfile of qresults.values()) {
            const targetRange = lsp.Range.create(
                { line: 0, character: 0 },
                { line: 0, character: 0 }
            );

            links.push({
                targetUri: qsfile.fileName,
                targetRange: getNodeRange(qsfile),
                targetSelectionRange: targetRange,
                originSelectionRange: getNodeRange(inclStmt.path),
            });
        }

        return links;
    }

    protected processIdentifier(identifier: gt.Identifier) {
        const links: lsp.DefinitionLink[] = [];

        const checker = new TypeChecker(this.store);
        const symbol = checker.getSymbolAtLocation(identifier);

        if (!symbol) return;

        for (const decl of symbol.declarations) {
            let declName = decl;
            if (isNamedDeclarationKind(decl.kind)) {
                declName = (<gt.NamedDeclaration>decl).name;
            }

            const sourceFile = getSourceFileOfNode(decl);

            links.push({
                targetUri: sourceFile.fileName,
                targetRange: getNodeRange(decl),
                targetSelectionRange: getNodeRange(declName),
            });
        }

        return links;
    }

    public getDefinitionAt(uri: string, position: number): lsp.DefinitionLink[] | undefined {
        const sourceFile = this.store.documents.get(uri);
        if (!sourceFile) return;

        const currentToken = getTokenAtPosition(position, sourceFile);
        if (!currentToken) return;

        if (currentToken.kind === gt.SyntaxKind.StringLiteral) {
            if (currentToken.parent.kind === gt.SyntaxKind.IncludeStatement) {
                return this.processIncludeStatement(<gt.IncludeStatement>currentToken.parent);
            }
        }
        else if (currentToken.kind === gt.SyntaxKind.Identifier) {
            return this.processIdentifier(<gt.Identifier>currentToken);
        }
    }
}
