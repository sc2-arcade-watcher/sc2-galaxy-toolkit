import { SyntaxKind, Symbol, Node, SourceFile, FunctionDeclaration, NamedDeclaration, VariableDeclaration } from '../compiler/types';
import { AbstractProvider } from './provider';
import { findAncestor } from '../compiler/utils';
import { getTokenAtPosition, findPrecedingToken } from './utils';
import { Printer } from '../compiler/printer';
import * as vs from 'vscode-languageserver';
import { getDocumentationOfSymbol } from './s2meta';

export class CompletionsProvider extends AbstractProvider {
    private printer: Printer = new Printer();

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
                    item.detail = this.printer.printNode((<FunctionDeclaration>node).type);
                    break;
                case SyntaxKind.VariableDeclaration:
                case SyntaxKind.ParameterDeclaration:
                    item.kind = vs.CompletionItemKind.Variable;
                    item.detail = this.printer.printNode((<VariableDeclaration>node).type);
                    break;
                default:
                    item.kind = vs.CompletionItemKind.Text;
                    break;
            }

            completions.push(item);
        }

        return completions;
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

    public resolveCompletion(completion: vs.CompletionItem): vs.CompletionItem {
        for (const sourceFile of this.store.documents.values()) {
            const symbol = sourceFile.symbol.members.get(completion.label);
            if (symbol) {
                completion.documentation = getDocumentationOfSymbol(this.store, symbol);
                break;
            }
        }
        return completion;
    }
}
