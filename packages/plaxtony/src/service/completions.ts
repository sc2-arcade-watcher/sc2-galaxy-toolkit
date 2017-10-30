import * as gt from '../compiler/types';
import { SyntaxKind, Symbol, Node, SourceFile, FunctionDeclaration, NamedDeclaration, VariableDeclaration } from '../compiler/types';
import { TypeChecker } from '../compiler/checker';
import { AbstractProvider } from './provider';
import { tokenToString } from '../compiler/scanner';
import { findAncestor, isToken, isPartOfExpression } from '../compiler/utils';
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
                    break;
                case SyntaxKind.VariableDeclaration:
                case SyntaxKind.ParameterDeclaration:
                    item.kind = vs.CompletionItemKind.Variable;
                    break;
                case SyntaxKind.PropertyDeclaration:
                    item.kind = vs.CompletionItemKind.Property;
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
        let currentToken = findPrecedingToken(position, currentDocument);

        if (currentToken) {
            // properties
            const checker = new TypeChecker(this.store);
            if (currentToken.kind === gt.SyntaxKind.DotToken || currentToken.kind === gt.SyntaxKind.Identifier) {
                if (currentToken.parent.kind === gt.SyntaxKind.PropertyAccessExpression) {
                    currentToken = (<gt.PropertyAccessExpression>currentToken.parent).expression;
                    const type = checker.getTypeOfNode(currentToken);
                    if (type.flags & gt.TypeFlags.Struct) {
                        return this.getFromSymbol(type.symbol);
                    }
                }
            }

            // local variables
            const currentContext = <FunctionDeclaration>findAncestor(currentToken, (element: Node): boolean => {
                return element.kind === SyntaxKind.FunctionDeclaration;
            })
            if (currentContext) {
                completions = completions.concat(this.getFromSymbol(currentContext.symbol));
            }
        }

        // keyword types
        if (!currentToken || !isPartOfExpression(currentToken)) {
            for (let i = gt.SyntaxKindMarker.FirstBasicType; i <= gt.SyntaxKindMarker.LastBasicType; i++) {
                completions.push({
                    label: tokenToString(<any>i),
                    kind: vs.CompletionItemKind.Keyword
                });
            }
            for (let i = gt.SyntaxKindMarker.FirstComplexType; i <= gt.SyntaxKindMarker.LastComplexType; i++) {
                completions.push({
                    label: tokenToString(<any>i),
                    kind: vs.CompletionItemKind.Keyword
                });
            }
        }

        // global symbols
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

                let node = symbol.declarations[0];

                switch (node.kind) {
                    case SyntaxKind.FunctionDeclaration:
                        node = Object.create(node);
                        (<gt.FunctionDeclaration>node).body = null;
                    case SyntaxKind.VariableDeclaration:
                    case SyntaxKind.ParameterDeclaration:
                    case SyntaxKind.PropertyDeclaration:
                        completion.detail = this.printer.printNode(node);
                        break;
                }

                break;
            }
        }
        return completion;
    }
}
