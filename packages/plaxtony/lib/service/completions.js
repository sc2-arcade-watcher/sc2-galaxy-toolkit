"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gt = require("../compiler/types");
const checker_1 = require("../compiler/checker");
const provider_1 = require("./provider");
const scanner_1 = require("../compiler/scanner");
const utils_1 = require("../compiler/utils");
const utils_2 = require("./utils");
const printer_1 = require("../compiler/printer");
const lsp = require("vscode-languageserver");
const s2meta_1 = require("./s2meta");
const trig = require("../sc2mod/trigger");
var CompletionFunctionExpand;
(function (CompletionFunctionExpand) {
    CompletionFunctionExpand[CompletionFunctionExpand["None"] = 0] = "None";
    CompletionFunctionExpand[CompletionFunctionExpand["Parenthesis"] = 1] = "Parenthesis";
    CompletionFunctionExpand[CompletionFunctionExpand["ArgumentsNull"] = 2] = "ArgumentsNull";
    CompletionFunctionExpand[CompletionFunctionExpand["ArgumentsDefault"] = 3] = "ArgumentsDefault";
})(CompletionFunctionExpand = exports.CompletionFunctionExpand || (exports.CompletionFunctionExpand = {}));
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
                if (param.type.kind === 69 /* IntKeyword */) {
                    args.push('0');
                }
                else if (param.type.kind === 70 /* FixedKeyword */) {
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
            case 133 /* StructDeclaration */:
                item.kind = lsp.CompletionItemKind.Class;
                break;
            case 135 /* FunctionDeclaration */:
                item.kind = lsp.CompletionItemKind.Function;
                break;
            case 134 /* VariableDeclaration */:
            case 136 /* ParameterDeclaration */:
                item.kind = lsp.CompletionItemKind.Variable;
                break;
            case 137 /* PropertyDeclaration */:
                item.kind = lsp.CompletionItemKind.Property;
                break;
            case 138 /* TypedefDeclaration */:
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
                if (symbol.declarations[0].kind !== 135 /* FunctionDeclaration */)
                    continue;
                const funcDecl = symbol.declarations[0];
                if (funcDecl.type.kind !== 66 /* BoolKeyword */)
                    continue;
                if (funcDecl.parameters.length !== 2)
                    continue;
                if (funcDecl.parameters[0].type.kind !== 66 /* BoolKeyword */)
                    continue;
                if (funcDecl.parameters[1].type.kind !== 66 /* BoolKeyword */)
                    continue;
                const item = this.buildFromSymbolDecl(symbol);
                item.data.dontExpand = true;
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
    getCompletionsAt(uri, position) {
        let completions = [];
        const sourceFile = this.store.documents.get(uri);
        if (!sourceFile)
            return;
        let currentToken = utils_2.findPrecedingToken(position, sourceFile);
        // const adjacentToken = getAdjacentToken(position, sourceFile);
        // query
        let query = null;
        const processedSymbols = new Map();
        if (currentToken && currentToken.pos <= position && currentToken.end >= position && currentToken.kind === 107 /* Identifier */) {
            const offset = position -= currentToken.pos;
            query = currentToken.name.substr(0, offset);
        }
        // trigger handlers
        if (currentToken && currentToken.kind === 2 /* StringLiteral */) {
            const callExpr = currentToken.parent;
            // trigger handlers
            if (callExpr.kind === 115 /* CallExpression */ &&
                callExpr.expression.kind === 107 /* Identifier */ &&
                (callExpr.expression).name === "TriggerCreate") {
                return this.provideTriggerHandlers();
            }
        }
        // presets
        if (currentToken && this.store.s2metadata) {
            const elementType = this.store.s2metadata.getElementTypeOfNode(currentToken);
            if (elementType) {
                // TODO: support <any> gamelink
                if (elementType.type === 'gamelink' && currentToken.kind === 2 /* StringLiteral */ && elementType.gameType) {
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
                if (!query)
                    return completions;
            }
        }
        // exit early for str and num literals
        if (currentToken && (currentToken.kind === 2 /* StringLiteral */ ||
            currentToken.kind === 1 /* NumericLiteral */)) {
            return completions;
        }
        // properties
        if (currentToken) {
            if ((currentToken.kind === 9 /* DotToken */ || currentToken.kind === 107 /* Identifier */) &&
                (currentToken.parent.kind === 114 /* PropertyAccessExpression */ && currentToken.parent.expression !== currentToken)) {
                const checker = new checker_1.TypeChecker(this.store);
                currentToken = currentToken.parent.expression;
                const type = checker.getTypeOfNode(currentToken, true);
                if (type.flags & 8192 /* Struct */) {
                    return this.buildFromSymbolMembers(type.symbol);
                }
            }
        }
        // local variables
        if (currentToken) {
            const currentContext = utils_1.findAncestor(currentToken, (element) => {
                return element.kind === 135 /* FunctionDeclaration */;
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
        for (let i = 49 /* FirstKeyword */; i <= 106 /* LastKeyword */; i++) {
            const name = scanner_1.tokenToString(i);
            if (!query || utils_2.fuzzysearch(query, name)) {
                completions.push({
                    label: name,
                    kind: lsp.CompletionItemKind.Keyword
                });
            }
        }
        let count = 0;
        outer: for (const document of this.store.documents.values()) {
            for (const [name, symbol] of document.symbol.members) {
                if (processedSymbols.has(name))
                    continue;
                if (!query || utils_2.fuzzysearch(query, name)) {
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
    resolveCompletion(completion) {
        let symbol;
        let parentSymbolName;
        if (completion.data && completion.data.elementType && completion.data.elementType === 'gamelink') {
            completion.documentation = this.store.s2metadata.getGameLinkLocalizedName(completion.data.gameType, completion.insertText, true);
            completion.documentation += '\n<' + this.store.s2metadata.getGameLinkKind(completion.data.gameType, completion.insertText) + '>';
            return completion;
        }
        if (completion.data && completion.data.parentSymbol) {
            parentSymbolName = completion.data.parentSymbol;
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
            !(completion.data && completion.data.dontExpand)) {
            const decl = symbol.declarations[0];
            let funcArgs = [];
            // TODO: support funcrefs expansion
            if (decl.kind === 135 /* FunctionDeclaration */ && this.config.functionExpand !== 1 /* Parenthesis */) {
                funcArgs = this.expandFunctionArguments(decl);
            }
            if (funcArgs) {
                completion.insertTextFormat = lsp.InsertTextFormat.Snippet;
                funcArgs = funcArgs.map((item, index) => {
                    return `\${${index + 1}:${item}}`;
                });
                completion.insertText = completion.label + '(' + funcArgs.join(', ') + ')$0';
            }
            else {
                completion.insertTextFormat = lsp.InsertTextFormat.PlainText;
                completion.insertText = completion.label + '($1)$0';
            }
        }
        if (symbol) {
            completion.documentation = s2meta_1.getDocumentationOfSymbol(this.store, symbol);
            let node = symbol.declarations[0];
            switch (node.kind) {
                case 135 /* FunctionDeclaration */:
                    node = Object.create(node);
                    node.body = null;
                // pass through
                case 134 /* VariableDeclaration */:
                case 136 /* ParameterDeclaration */:
                case 137 /* PropertyDeclaration */:
                case 138 /* TypedefDeclaration */:
                    completion.detail = this.printer.printNode(node);
                    break;
            }
        }
        return completion;
    }
}
exports.CompletionsProvider = CompletionsProvider;
//# sourceMappingURL=completions.js.map