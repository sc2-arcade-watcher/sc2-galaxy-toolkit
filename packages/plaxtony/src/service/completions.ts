import * as gt from '../compiler/types';
import { SyntaxKind, Symbol, Node, SourceFile, FunctionDeclaration, NamedDeclaration, VariableDeclaration } from '../compiler/types';
import { TypeChecker } from '../compiler/checker';
import { AbstractProvider } from './provider';
import { tokenToString } from '../compiler/scanner';
import { findAncestor, isToken, isPartOfExpression } from '../compiler/utils';
import { getTokenAtPosition, findPrecedingToken, fuzzysearch, getAdjacentToken } from './utils';
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
            data: {},
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

    private provideTriggerHandlers(): lsp.CompletionItem[] {
        let completions = <lsp.CompletionItem[]> [];

        for (const document of this.store.documents.values()) {
            for (const [name, symbol] of document.symbol.members) {
                if (symbol.declarations[0].kind !== gt.SyntaxKind.FunctionDeclaration) continue;
                const funcDecl = <gt.FunctionDeclaration>symbol.declarations[0];
                if (funcDecl.type.kind !== gt.SyntaxKind.BoolKeyword) continue;
                if (funcDecl.parameters.length !== 2) continue;
                if (funcDecl.parameters[0].type.kind !== gt.SyntaxKind.BoolKeyword) continue;
                if (funcDecl.parameters[1].type.kind !== gt.SyntaxKind.BoolKeyword) continue;

                const item = this.buildFromSymbolDecl(symbol);
                item.data.dontExpand = true;
                completions.push(item);
            }
        }

        return completions;
    }

    private provideGameLinks(gameType: string) {
        const links = this.store.s2metadata.getLinksForGameType(gameType);

        let completions = <lsp.CompletionItem[]> [];
        for (const item of links.values()) {
            const localizedName = this.store.s2metadata.getGameLinkLocalizedName(gameType, item.id, false);
            let name = item.id;
            if (localizedName) {
                name += ` "${localizedName}"`;
            }
            completions.push(<lsp.CompletionItem>{
                label: name,
                insertText: item.id,
                data: {
                    elementType: 'gamelink',
                    gameType: gameType,
                },
                kind: lsp.CompletionItemKind.Value,
            });
        }
        return completions;
    }

    public getCompletionsAt(uri: string, position: number): lsp.CompletionItem[] {
        let completions = <lsp.CompletionItem[]> [];

        const sourceFile = this.store.documents.get(uri);
        if (!sourceFile) return;
        let currentToken = findPrecedingToken(position, sourceFile);
        // const adjacentToken = getAdjacentToken(position, sourceFile);

        // query
        let query: string = null;
        const processedSymbols = new Map<string, Symbol>();
        if (currentToken && currentToken.pos <= position && currentToken.end >= position && currentToken.kind === gt.SyntaxKind.Identifier) {
            const offset = position -= currentToken.pos;
            query = (<gt.Identifier>currentToken).name.substr(0, offset);
        }

        // trigger handlers
        if (currentToken && currentToken.kind === gt.SyntaxKind.StringLiteral) {
            const callExpr = <gt.CallExpression>currentToken.parent;
            // trigger handlers
            if (
                callExpr.kind === gt.SyntaxKind.CallExpression &&
                callExpr.expression.kind === gt.SyntaxKind.Identifier &&
                (<gt.Identifier>(callExpr.expression)).name === "TriggerCreate"
            ) {
                return this.provideTriggerHandlers();
            }
        }

        // presets
        if (currentToken && this.store.s2metadata) {
            const elementType = this.store.s2metadata.getElementTypeOfNode(currentToken);
            if (elementType) {
                // TODO: support <any> gamelink
                if (elementType.type === 'gamelink' && currentToken.kind === gt.SyntaxKind.StringLiteral && elementType.gameType) {
                    return this.provideGameLinks(elementType.gameType);
                }
            }
            if (elementType && elementType.type === 'preset') {
                for (const name of this.store.s2metadata.getConstantNamesOfPreset(elementType.typeElement.resolve())) {
                    const symbol = this.store.resolveGlobalSymbol(name);
                    if (symbol) {
                        const citem = this.buildFromSymbolDecl(symbol);
                        completions.push(citem);
                        processedSymbols.set(name, symbol);
                    }
                }
                if (!query) return completions;
            }
        }

        // exit early for str and num literals
        if (currentToken && (
            currentToken.kind === gt.SyntaxKind.StringLiteral ||
            currentToken.kind === gt.SyntaxKind.NumericLiteral
        )) {
            return completions;
        }

        // properties
        if (currentToken) {
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
        }

        // local variables
        if (currentToken) {
            const currentContext = <FunctionDeclaration>findAncestor(currentToken, (element: Node): boolean => {
                return element.kind === SyntaxKind.FunctionDeclaration;
            })
            if (currentContext) {
                completions = completions.concat(this.buildFromSymbolMembers(currentContext.symbol, query));
            }
        }

        // keyword types
        // if (!currentToken || !isPartOfExpression(currentToken)) {
        //     for (let i = gt.SyntaxKindMarker.FirstBasicType; i <= gt.SyntaxKindMarker.LastBasicType; i++) {
        //         completions.push({
        //             label: tokenToString(<any>i),
        //             kind: lsp.CompletionItemKind.Keyword
        //         });
        //     }
        //     for (let i = gt.SyntaxKindMarker.FirstComplexType; i <= gt.SyntaxKindMarker.LastComplexType; i++) {
        //         completions.push({
        //             label: tokenToString(<any>i),
        //             kind: lsp.CompletionItemKind.Keyword
        //         });
        //     }
        // }

        // keywords
        for (let i = gt.SyntaxKindMarker.FirstKeyword; i <= gt.SyntaxKindMarker.LastKeyword; i++) {
            const name = tokenToString(<any>i);
            if (!query || fuzzysearch(query, name)) {
                completions.push({
                    label: name,
                    kind: lsp.CompletionItemKind.Keyword
                });
            }
        }

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

        if (completion.data && completion.data.elementType && completion.data.elementType === 'gamelink') {
            completion.documentation = this.store.s2metadata.getGameLinkLocalizedName(completion.data.gameType, completion.insertText, true);
            completion.documentation += '\n<' + this.store.s2metadata.getGameLinkKind(completion.data.gameType, completion.insertText) + '>';
            return completion;
        }

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

        if (
            this.config.functionExpand !== CompletionFunctionExpand.None &&
            completion.kind === lsp.CompletionItemKind.Function &&
            !(completion.data && completion.data.dontExpand)
        ) {
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
