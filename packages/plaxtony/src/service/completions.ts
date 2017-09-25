import { SyntaxKind, Symbol, Node, SourceFile, FunctionDeclaration, NamedDeclaration } from '../compiler/types';
import { Store } from './store';
import { findAncestor } from '../compiler/utils';
import { getTokenAtPosition, findPrecedingToken } from './utils';
import * as vs from 'vscode-languageserver';

export class CompletionsProvider {
    private store: Store;

    private getFromSymbol(parentSymbol: Symbol): vs.CompletionItem[] {
        const completions = <vs.CompletionItem[]> [];

        for (let symbol of parentSymbol.members.values()) {
            const node = <NamedDeclaration>(symbol.declarations[0]);

            if (node.name === undefined) {
                continue;
            }

            const item = <vs.CompletionItem>{
                label: node.name.name,
            };

            switch (node.kind) {
                case SyntaxKind.StructDeclaration:
                    item.kind = vs.CompletionItemKind.Class;
                    break;
                case SyntaxKind.FunctionDeclaration:
                    item.kind = vs.CompletionItemKind.Function;
                    break;
                case SyntaxKind.VariableDeclaration:
                case SyntaxKind.ParameterDeclaration:
                    item.kind = vs.CompletionItemKind.Variable;
                    break;
                default:
                    item.kind = vs.CompletionItemKind.Text;
                    break;
            }

            completions.push(item);
        }

        return completions;
    }

    public constructor(store: Store) {
        this.store = store;
    }

    public getCompletionsAt(uri: string, position: number): vs.CompletionItem[] {
        let completions = <vs.CompletionItem[]> [];

        const currentDocument = this.store.documents.get(uri);
        const currentToken = findPrecedingToken(position, currentDocument);
        const currentContext = <FunctionDeclaration>findAncestor(currentToken, (element: Node): boolean => {
            return element.kind === SyntaxKind.FunctionDeclaration;
        })
        if (currentContext) {
            completions = completions.concat(this.getFromSymbol(currentContext.symbol));
        }

        for (const document of this.store.documents.values()) {
            completions = completions.concat(this.getFromSymbol(document.symbol));
        }

        return completions;
    }
}
