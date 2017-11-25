import * as gt from '../compiler/types';
import { SyntaxKind, Symbol, Node, SourceFile, FunctionDeclaration, NamedDeclaration, VariableDeclaration } from '../compiler/types';
import { TypeChecker } from '../compiler/checker';
import { AbstractProvider } from './provider';
import { tokenToString } from '../compiler/scanner';
import { findAncestor, isToken, isPartOfExpression } from '../compiler/utils';
import { getTokenAtPosition, findPrecedingToken, fuzzysearch } from './utils';
import { Printer } from '../compiler/printer';
import * as lsp from 'vscode-languageserver';
import { getDocumentationOfSymbol } from './s2meta';
import * as trig from '../sc2mod/trigger';

export const enum CompletionFunctionExpand {
    None,
    Parenthesis,
    ArgumentsNull,
    ArgumentsDefault,
};

export interface CompletionConfig {
    functionExpand: CompletionFunctionExpand;
};

export class CompletionsProvider extends AbstractProvider {
    private printer: Printer = new Printer();
    public config: CompletionConfig;

    constructor() {
        super();
        this.config = <CompletionConfig>{
            functionExpand: CompletionFunctionExpand.None,
        };
    }

    public expandFunctionArguments(decl: gt.FunctionDeclaration): string[] {
        let args: string[] = [];
        let funcElement: trig.FunctionDef;

        if (this.store.s2metadata && this.config.functionExpand === CompletionFunctionExpand.ArgumentsDefault) {
            funcElement = <trig.FunctionDef>this.store.s2metadata.findElementByName(decl.name.name)
        }

        for (const [key, param] of decl.parameters.entries()) {
            let paramElement: trig.Param;
            if (funcElement) {
                const index = key - (funcElement.flags & trig.ElementFlag.Event ? 1 : 0);
                if (index > 0) {
                    const paramDef = funcElement.getParameters()[index];
                    if (paramDef.default) {
                        paramElement = paramDef.default.resolve();
                    }
                }
            }

            if (!paramElement) {
                if (param.type.kind === gt.SyntaxKind.IntKeyword) {
                    args.push('0');
                }
                else if (param.type.kind === gt.SyntaxKind.FixedKeyword) {
                    args.push('0.0');
                }
                else {
                    args.push('null');
                }
            }
            else {
                if (paramElement.value) {
                    if (paramElement.valueType === "gamelink") {
                        args.push(`"${paramElement.value}"`);
                    }
                    else {
                        args.push(paramElement.value);
                    }
                }
                else if (paramElement.preset) {
                    args.push(this.store.s2metadata.getElementSymbolName(paramElement.preset.resolve()));
                }
                else if (paramElement.valueElement) {
                    args.push(this.store.s2metadata.getElementSymbolName(paramElement.valueElement.resolve().values[0].resolve()));
                }
                else if (paramElement.functionCall) {
                    const fcallDef = paramElement.functionCall.resolve().functionDef.resolve();
                    const fcallSymbol = this.store.resolveGlobalSymbol(
                        this.store.s2metadata.getElementSymbolName(fcallDef)
                    );
                    args.push(
                        this.store.s2metadata.getElementSymbolName(fcallDef)
                         + '(' + this.expandFunctionArguments(<gt.FunctionDeclaration>fcallSymbol.declarations[0]).join(', ') + ')'
                    );
                }
                else {
                    args.push('null');
                }
            }
        }
        return args;
    }

    private buildFromSymbolDecl(symbol: Symbol): lsp.CompletionItem {
        const node = <NamedDeclaration>(symbol.declarations[0]);

        if (node.name === undefined) {
            return null;
        }

        const item = <lsp.CompletionItem>{
            label: node.name.name,
        };

        switch (node.kind) {
            case SyntaxKind.StructDeclaration:
                item.kind = lsp.CompletionItemKind.Class;
                break;
            case SyntaxKind.FunctionDeclaration:
                item.kind = lsp.CompletionItemKind.Function;
                break;
            case SyntaxKind.VariableDeclaration:
            case SyntaxKind.ParameterDeclaration:
                item.kind = lsp.CompletionItemKind.Variable;
                break;
            case SyntaxKind.PropertyDeclaration:
                item.kind = lsp.CompletionItemKind.Property;
                break;
            case SyntaxKind.TypedefDeclaration:
                item.kind = lsp.CompletionItemKind.Interface;
                break;
            default:
                item.kind = lsp.CompletionItemKind.Text;
                break;
        }

        return item;
    }

    private buildFromSymbolMembers(parentSymbol: Symbol, query?: string): lsp.CompletionItem[] {
        const completions = <lsp.CompletionItem[]> [];

        for (const symbol of parentSymbol.members.values()) {
            if (!query || fuzzysearch(query, symbol.escapedName)) {
                const item = this.buildFromSymbolDecl(symbol);
                item.data = {
                    parentSymbol: parentSymbol.escapedName,
                };
                if (item) {
                    completions.push(item);
                }
            }
        }

        return completions;
    }

    public getCompletionsAt(uri: string, position: number): lsp.CompletionItem[] {
        let completions = <lsp.CompletionItem[]> [];

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
            if (
                (currentToken.kind === gt.SyntaxKind.DotToken || currentToken.kind === gt.SyntaxKind.Identifier) &&
                (currentToken.parent.kind === gt.SyntaxKind.PropertyAccessExpression && (<gt.PropertyAccessExpression>currentToken.parent).expression !== currentToken)
            ) {
                const checker = new TypeChecker(this.store);
                currentToken = (<gt.PropertyAccessExpression>currentToken.parent).expression;
                const type = checker.getTypeOfNode(currentToken, true);
                if (type.flags & gt.TypeFlags.Struct) {
                    return this.buildFromSymbolMembers(type.symbol);
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
                    kind: lsp.CompletionItemKind.Keyword
                });
            }
            for (let i = gt.SyntaxKindMarker.FirstComplexType; i <= gt.SyntaxKindMarker.LastComplexType; i++) {
                completions.push({
                    label: tokenToString(<any>i),
                    kind: lsp.CompletionItemKind.Keyword
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

    public resolveCompletion(completion: lsp.CompletionItem): lsp.CompletionItem {
        let symbol: gt.Symbol;
        let parentSymbolName: string;

        if (completion.data && completion.data.parentSymbol) {
            parentSymbolName = (<string>completion.data.parentSymbol);
        }
        for (const sourceFile of this.store.documents.values()) {
            if (parentSymbolName) {
                symbol = sourceFile.symbol.members.get(parentSymbolName);
                if (!symbol) continue;
            }
            else {
                symbol = sourceFile.symbol;
            }
            symbol = symbol.members.get(completion.label);
            if (symbol) break;
        }

        if (this.config.functionExpand !== CompletionFunctionExpand.None && completion.kind === lsp.CompletionItemKind.Function) {
            const decl = <gt.FunctionDeclaration>symbol.declarations[0];
            let funcArgs: string[] = [];

            // TODO: support funcrefs expansion
            if (decl.kind === gt.SyntaxKind.FunctionDeclaration && this.config.functionExpand !== CompletionFunctionExpand.Parenthesis) {
                funcArgs = this.expandFunctionArguments(decl);
            }

            if (funcArgs) {
                completion.insertTextFormat = lsp.InsertTextFormat.Snippet;
                funcArgs = funcArgs.map((item, index) => {
                    return `\${${index+1}:${item}}`;
                });
                completion.insertText = completion.label + '(' + funcArgs.join(', ') + ')$0';
            }
            else {
                completion.insertTextFormat = lsp.InsertTextFormat.PlainText;
                completion.insertText = completion.label + '($1)$0';
            }
        }

        if (symbol) {
            completion.documentation = getDocumentationOfSymbol(this.store, symbol);

            let node = symbol.declarations[0];

            switch (node.kind) {
                case SyntaxKind.FunctionDeclaration:
                    node = Object.create(node);
                    (<gt.FunctionDeclaration>node).body = null;
                    // pass through
                case SyntaxKind.VariableDeclaration:
                case SyntaxKind.ParameterDeclaration:
                case SyntaxKind.PropertyDeclaration:
                case SyntaxKind.TypedefDeclaration:
                    completion.detail = this.printer.printNode(node);
                    break;
            }
        }
        return completion;
    }
}
