"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const checker_1 = require("../compiler/checker");
const provider_1 = require("./provider");
const scanner_1 = require("../compiler/scanner");
const utils_1 = require("../compiler/utils");
const utils_2 = require("./utils");
const printer_1 = require("../compiler/printer");
const lsp = require("vscode-languageserver");
const s2meta_1 = require("./s2meta");
function isInComment(sourceFile, pos) {
    const comment = sourceFile.commentsLineMap.get(utils_2.getLineAndCharacterOfPosition(sourceFile, pos).line);
    return comment && pos > comment.pos;
}
var CompletionFunctionExpand;
(function (CompletionFunctionExpand) {
    CompletionFunctionExpand[CompletionFunctionExpand["None"] = 0] = "None";
    CompletionFunctionExpand[CompletionFunctionExpand["Parenthesis"] = 1] = "Parenthesis";
    CompletionFunctionExpand[CompletionFunctionExpand["ArgumentsNull"] = 2] = "ArgumentsNull";
    CompletionFunctionExpand[CompletionFunctionExpand["ArgumentsDefault"] = 3] = "ArgumentsDefault";
})(CompletionFunctionExpand = exports.CompletionFunctionExpand || (exports.CompletionFunctionExpand = {}));
;
;
var CompletionItemDataFlags;
(function (CompletionItemDataFlags) {
    CompletionItemDataFlags[CompletionItemDataFlags["CanExpand"] = 2] = "CanExpand";
    CompletionItemDataFlags[CompletionItemDataFlags["CanAppendSemicolon"] = 4] = "CanAppendSemicolon";
})(CompletionItemDataFlags || (CompletionItemDataFlags = {}));
;
;
class CompletionsProvider extends provider_1.AbstractProvider {
    constructor() {
        super();
        this.printer = new printer_1.Printer();
        this.config = {
            functionExpand: 0 /* None */,
        };
    }
    expandFunctionArguments(decl) {
        let args = [];
        let funcElement;
        if (this.store.s2metadata && this.config.functionExpand === 3 /* ArgumentsDefault */) {
            funcElement = this.store.s2metadata.findElementByName(decl.name.name);
        }
        for (const [key, param] of decl.parameters.entries()) {
            let paramElement;
            if (funcElement) {
                const index = key - (funcElement.flags & 16 /* Event */ ? 1 : 0);
                if (index > 0) {
                    const paramDef = funcElement.getParameters()[index];
                    if (paramDef.default) {
                        paramElement = paramDef.default.resolve();
                    }
                }
            }
            if (!paramElement) {
                if (param.type.kind === 73 /* IntKeyword */) {
                    args.push('0');
                }
                else if (param.type.kind === 74 /* FixedKeyword */) {
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
                    const fcallSymbol = this.store.resolveGlobalSymbol(this.store.s2metadata.getElementSymbolName(fcallDef));
                    args.push(this.store.s2metadata.getElementSymbolName(fcallDef)
                        + '(' + this.expandFunctionArguments(fcallSymbol.declarations[0]).join(', ') + ')');
                }
                else {
                    args.push('null');
                }
            }
        }
        return args;
    }
    buildFromSymbolDecl(symbol) {
        const node = (symbol.declarations[0]);
        if (node.name === undefined) {
            return null;
        }
        const item = {
            label: node.name.name,
            data: {},
        };
        switch (node.kind) {
            case 137 /* StructDeclaration */:
                item.kind = lsp.CompletionItemKind.Class;
                break;
            case 139 /* FunctionDeclaration */:
                item.kind = lsp.CompletionItemKind.Function;
                break;
            case 138 /* VariableDeclaration */:
            case 140 /* ParameterDeclaration */:
                item.kind = lsp.CompletionItemKind.Variable;
                break;
            case 141 /* PropertyDeclaration */:
                item.kind = lsp.CompletionItemKind.Property;
                break;
            case 142 /* TypedefDeclaration */:
                item.kind = lsp.CompletionItemKind.Interface;
                break;
            default:
                item.kind = lsp.CompletionItemKind.Text;
                break;
        }
        return item;
    }
    buildFromSymbolMembers(parentSymbol, query) {
        const completions = [];
        for (const symbol of parentSymbol.members.values()) {
            if (!query || utils_2.fuzzysearch(query, symbol.escapedName)) {
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
    provideTriggerHandlers() {
        let completions = [];
        for (const document of this.store.documents.values()) {
            for (const [name, symbol] of document.symbol.members) {
                if (symbol.declarations[0].kind !== 139 /* FunctionDeclaration */)
                    continue;
                const funcDecl = symbol.declarations[0];
                if (funcDecl.type.kind !== 70 /* BoolKeyword */)
                    continue;
                if (funcDecl.parameters.length !== 2)
                    continue;
                if (funcDecl.parameters[0].type.kind !== 70 /* BoolKeyword */)
                    continue;
                if (funcDecl.parameters[1].type.kind !== 70 /* BoolKeyword */)
                    continue;
                const item = this.buildFromSymbolDecl(symbol);
                item.data.flags = 0;
                completions.push(item);
            }
        }
        return completions;
    }
    provideGameLinks(gameType) {
        const links = this.store.s2metadata.getLinksForGameType(gameType);
        let completions = [];
        for (const item of links.values()) {
            const localizedName = this.store.s2metadata.getGameLinkLocalizedName(gameType, item.id, false);
            let name = item.id;
            if (localizedName) {
                name += ` "${localizedName}"`;
            }
            completions.push({
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
    getCompletionsAt(uri, position, context) {
        let completions = [];
        const sourceFile = this.store.documents.get(uri);
        if (!sourceFile)
            return;
        if (isInComment(sourceFile, position))
            return;
        let currentToken = utils_2.findPrecedingToken(position, sourceFile);
        // const adjacentToken = getAdjacentToken(position, sourceFile);
        // query
        let query = null;
        const processedSymbols = new Map();
        if (currentToken && currentToken.pos <= position && currentToken.end >= position && currentToken.kind === 111 /* Identifier */) {
            const offset = position - currentToken.pos;
            query = currentToken.name.substr(0, offset);
        }
        // trigger handlers
        if (currentToken && currentToken.kind === 3 /* StringLiteral */) {
            const callExpr = currentToken.parent;
            // trigger handlers
            if (callExpr.kind === 119 /* CallExpression */ &&
                callExpr.expression.kind === 111 /* Identifier */ &&
                (callExpr.expression).name === "TriggerCreate") {
                return {
                    items: this.provideTriggerHandlers(),
                    isIncomplete: false,
                };
            }
        }
        // presets
        if (currentToken && this.store.s2metadata) {
            const elementType = this.store.s2metadata.getElementTypeOfNode(currentToken);
            if (elementType) {
                // TODO: support <any> gamelink
                if (elementType.type === 'gamelink' && currentToken.kind === 3 /* StringLiteral */ && elementType.gameType) {
                    return {
                        items: this.provideGameLinks(elementType.gameType),
                        isIncomplete: false,
                    };
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
                if (!query)
                    return {
                        items: completions,
                        isIncomplete: false,
                    };
            }
        }
        // exit early for str and num literals
        if (currentToken && (currentToken.kind === 3 /* StringLiteral */ ||
            currentToken.kind === 2 /* NumericLiteral */)) {
            return {
                items: completions,
                isIncomplete: false,
            };
        }
        // properties
        if (currentToken) {
            if ((currentToken.kind === 10 /* DotToken */ || currentToken.kind === 111 /* Identifier */) &&
                (currentToken.parent.kind === 118 /* PropertyAccessExpression */ && currentToken.parent.expression !== currentToken)) {
                const checker = new checker_1.TypeChecker(this.store);
                currentToken = currentToken.parent.expression;
                const type = checker.getTypeOfNode(currentToken, true);
                if (type.flags & 8192 /* Struct */) {
                    return {
                        items: this.buildFromSymbolMembers(type.symbol),
                        isIncomplete: false,
                    };
                }
            }
        }
        // local variables
        if (currentToken) {
            const currentContext = utils_1.findAncestor(currentToken, (element) => {
                return element.kind === 139 /* FunctionDeclaration */;
            });
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
        for (let i = 50 /* FirstKeyword */; i <= 110 /* LastKeyword */; i++) {
            const name = scanner_1.tokenToString(i);
            if (!query || utils_2.fuzzysearch(query, name)) {
                completions.push({
                    label: name,
                    kind: lsp.CompletionItemKind.Keyword
                });
            }
        }
        // can append semicolon
        let flags = 2 /* CanExpand */;
        if (currentToken) {
            if (currentToken.kind === 111 /* Identifier */ && position < currentToken.end) {
                flags &= ~2 /* CanExpand */;
            }
            if (currentToken.parent) {
                switch (currentToken.parent.kind) {
                    case 135 /* ExpressionStatement */: {
                        if (position >= currentToken.end) {
                            flags |= 4 /* CanAppendSemicolon */;
                        }
                        else {
                            flags |= currentToken.parent.syntaxTokens.findIndex(value => value.kind === 11 /* SemicolonToken */) === -1 ? 4 /* CanAppendSemicolon */ : 0;
                        }
                        break;
                    }
                    case 126 /* Block */:
                    case 125 /* SourceFile */:
                        {
                            if (position >= currentToken.end) {
                                flags |= 4 /* CanAppendSemicolon */;
                            }
                            break;
                        }
                    case 139 /* FunctionDeclaration */:
                        {
                            flags &= ~2 /* CanExpand */;
                            break;
                        }
                }
            }
        }
        let count = 0;
        let isIncomplete = false;
        outer: for (const document of this.store.documents.values()) {
            for (const [name, symbol] of document.symbol.members) {
                if ((symbol.flags & 1024 /* Static */) && document.fileName !== uri)
                    continue;
                if (processedSymbols.has(name))
                    continue;
                if (!query || utils_2.fuzzysearch(query, name)) {
                    processedSymbols.set(name, symbol);
                    const citem = this.buildFromSymbolDecl(symbol);
                    citem.data = {
                        flags: flags,
                    };
                    completions.push(citem);
                    if (++count >= 7500) {
                        isIncomplete = true;
                        break outer;
                    }
                }
            }
        }
        return {
            items: completions,
            isIncomplete: isIncomplete,
        };
    }
    resolveCompletion(completion) {
        let symbol;
        let parentSymbolName;
        const customData = completion.data || {};
        if (customData.elementType && customData.elementType === 'gamelink') {
            completion.documentation = this.store.s2metadata.getGameLinkLocalizedName(customData.gameType, completion.insertText, true);
            completion.documentation += '\n<' + this.store.s2metadata.getGameLinkKind(customData.gameType, completion.insertText) + '>';
            return completion;
        }
        if (customData.parentSymbol) {
            parentSymbolName = customData.parentSymbol;
        }
        for (const sourceFile of this.store.documents.values()) {
            if (parentSymbolName) {
                symbol = sourceFile.symbol.members.get(parentSymbolName);
                if (!symbol)
                    continue;
            }
            else {
                symbol = sourceFile.symbol;
            }
            symbol = symbol.members.get(completion.label);
            if (symbol)
                break;
        }
        if (this.config.functionExpand !== 0 /* None */ &&
            completion.kind === lsp.CompletionItemKind.Function &&
            customData.flags && customData.flags & 2 /* CanExpand */) {
            const decl = symbol.declarations[0];
            let funcArgs = [];
            // TODO: support funcrefs expansion
            if (decl.kind === 139 /* FunctionDeclaration */ && this.config.functionExpand !== 1 /* Parenthesis */) {
                funcArgs = this.expandFunctionArguments(decl);
            }
            if (funcArgs) {
                completion.insertTextFormat = lsp.InsertTextFormat.Snippet;
                funcArgs = funcArgs.map((item, index) => {
                    return `\${${index + 1}:${item}}`;
                });
                completion.insertText = completion.label + '(' + funcArgs.join(', ') + ')';
            }
            else {
                completion.insertTextFormat = lsp.InsertTextFormat.PlainText;
                completion.insertText = completion.label + '($1)';
            }
            if (customData.flags && customData.flags & 4 /* CanAppendSemicolon */) {
                completion.insertText += ';';
            }
            completion.insertText += '$0';
        }
        if (symbol) {
            completion.documentation = s2meta_1.getDocumentationOfSymbol(this.store, symbol, false);
            let node = symbol.declarations[0];
            switch (node.kind) {
                case 139 /* FunctionDeclaration */:
                    node = Object.create(node);
                    node.body = null;
                // pass through
                case 138 /* VariableDeclaration */:
                case 140 /* ParameterDeclaration */:
                case 141 /* PropertyDeclaration */:
                case 142 /* TypedefDeclaration */:
                    completion.detail = this.printer.printNode(node);
                    break;
            }
        }
        if (completion.documentation) {
            completion.documentation = {
                kind: lsp.MarkupKind.Markdown,
                value: completion.documentation,
            };
        }
        return completion;
    }
}
exports.CompletionsProvider = CompletionsProvider;
//# sourceMappingURL=completions.js.map