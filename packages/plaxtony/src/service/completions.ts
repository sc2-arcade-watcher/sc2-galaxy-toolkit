import * as gt from '../compiler/types';
import { SyntaxKind, Symbol, Node, SourceFile, FunctionDeclaration, NamedDeclaration, VariableDeclaration } from '../compiler/types';
import { TypeChecker } from '../compiler/checker';
import { AbstractProvider } from './provider';
import { tokenToString } from '../compiler/scanner';
import { findAncestor, isToken, isPartOfExpression } from '../compiler/utils';
import { getTokenAtPosition, findPrecedingToken, fuzzysearch } from './utils';
import { Printer } from '../compiler/printer';
import * as vs from 'vscode-languageserver';
import { getDocumentationOfSymbol } from './s2meta';

export class CompletionsProvider extends AbstractProvider {
    private printer: Printer = new Printer();

    private buildFromSymbolDecl(symbol: Symbol): vs.CompletionItem {
        const node = <NamedDeclaration>(symbol.declarations[0]);

        if (node.name === undefined) {
            return null;
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

        return item;
    }

    private buildFromSymbolMembers(parentSymbol: Symbol, query?: string): vs.CompletionItem[] {
        const completions = <vs.CompletionItem[]> [];

        for (const symbol of parentSymbol.members.values()) {
            if (!query || fuzzysearch(query, symbol.escapedName)) {
                const item = this.buildFromSymbolDecl(symbol);
                if (item) {
                    completions.push(item);
                }
            }
        }

        return completions;
    }

    public getCompletionsAt(uri: string, position: number): vs.CompletionItem[] {
        let completions = <vs.CompletionItem[]> [];

        const currentDocument = this.store.documents.get(uri);
        let currentToken = findPrecedingToken(position, currentDocument);

        if (currentToken && (
            currentToken.kind === gt.SyntaxKind.StringLiteral ||
            currentToken.kind === gt.SyntaxKind.NumericLiteral
        )) {
            return completions;
        }

        // query
        let query: string = null;
        if (currentToken && currentToken.pos <= position && currentToken.end >= position && currentToken.kind === gt.SyntaxKind.Identifier) {
            const offset = position -= currentToken.pos;
            query = (<gt.Identifier>currentToken).name.substr(0, offset);
        }

        if (currentToken) {
            // properties
            const checker = new TypeChecker(this.store);
            if (currentToken.kind === gt.SyntaxKind.DotToken || currentToken.kind === gt.SyntaxKind.Identifier) {
                if (currentToken.parent.kind === gt.SyntaxKind.PropertyAccessExpression) {
                    currentToken = (<gt.PropertyAccessExpression>currentToken.parent).expression;
                    const type = checker.getTypeOfNode(currentToken);
                    if (type.flags & gt.TypeFlags.Struct) {
                        return this.buildFromSymbolMembers(type.symbol);
                    }
                }
            }

            // local variables
            const currentContext = <FunctionDeclaration>findAncestor(currentToken, (element: Node): boolean => {
                return element.kind === SyntaxKind.FunctionDeclaration;
            })
            if (currentContext) {
                completions = completions.concat(this.buildFromSymbolMembers(currentContext.symbol, query));
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
        const processedSymbols = new Map<string, Symbol>();
        let count = 0;
        outer: for (const document of this.store.documents.values()) {
            for (const [name, symbol] of document.symbol.members) {
                if (processedSymbols.has(name)) continue;
                if (!query || fuzzysearch(query, name)) {
                    processedSymbols.set(name, symbol);
                    const citem = this.buildFromSymbolDecl(symbol);
                    completions.push(citem);

                    if (++count >= 10000 && query) {
                        break outer;
                    }
                }
            }
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
