"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gt = require("../compiler/types");
const checker_1 = require("../compiler/checker");
const provider_1 = require("./provider");
const scanner_1 = require("../compiler/scanner");
const utils_1 = require("../compiler/utils");
const utils_2 = require("./utils");
const printer_1 = require("../compiler/printer");
const vs = require("vscode-languageserver");
const s2meta_1 = require("./s2meta");
class CompletionsProvider extends provider_1.AbstractProvider {
    constructor() {
        super(...arguments);
        this.printer = new printer_1.Printer();
    }
    buildFromSymbolDecl(symbol) {
        const node = (symbol.declarations[0]);
        if (node.name === undefined) {
            return null;
        }
        const item = {
            label: node.name.name,
        };
        switch (node.kind) {
            case 134 /* StructDeclaration */:
                item.kind = vs.CompletionItemKind.Class;
                break;
            case 136 /* FunctionDeclaration */:
                item.kind = vs.CompletionItemKind.Function;
                break;
            case 135 /* VariableDeclaration */:
            case 137 /* ParameterDeclaration */:
                item.kind = vs.CompletionItemKind.Variable;
                break;
            case 138 /* PropertyDeclaration */:
                item.kind = vs.CompletionItemKind.Property;
                break;
            case 139 /* TypedefDeclaration */:
                item.kind = vs.CompletionItemKind.Interface;
                break;
            default:
                item.kind = vs.CompletionItemKind.Text;
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
    getCompletionsAt(uri, position) {
        let completions = [];
        const currentDocument = this.store.documents.get(uri);
        let currentToken = utils_2.findPrecedingToken(position, currentDocument);
        if (currentToken && (currentToken.kind === 2 /* StringLiteral */ ||
            currentToken.kind === 1 /* NumericLiteral */)) {
            return completions;
        }
        // query
        let query = null;
        if (currentToken && currentToken.pos <= position && currentToken.end >= position && currentToken.kind === 108 /* Identifier */) {
            const offset = position -= currentToken.pos;
            query = currentToken.name.substr(0, offset);
        }
        if (currentToken) {
            // properties
            if ((currentToken.kind === 9 /* DotToken */ || currentToken.kind === 108 /* Identifier */) &&
                (currentToken.parent.kind === 115 /* PropertyAccessExpression */ && currentToken.parent.expression !== currentToken)) {
                const checker = new checker_1.TypeChecker(this.store);
                currentToken = currentToken.parent.expression;
                const type = checker.getTypeOfNode(currentToken, true);
                if (type.flags & 4096 /* Struct */) {
                    return this.buildFromSymbolMembers(type.symbol);
                }
            }
            // local variables
            const currentContext = utils_1.findAncestor(currentToken, (element) => {
                return element.kind === 136 /* FunctionDeclaration */;
            });
            if (currentContext) {
                completions = completions.concat(this.buildFromSymbolMembers(currentContext.symbol, query));
            }
        }
        // keyword types
        if (!currentToken || !utils_1.isPartOfExpression(currentToken)) {
            for (let i = 66 /* FirstBasicType */; i <= 71 /* LastBasicType */; i++) {
                completions.push({
                    label: scanner_1.tokenToString(i),
                    kind: vs.CompletionItemKind.Keyword
                });
            }
            for (let i = 72 /* FirstComplexType */; i <= 104 /* LastComplexType */; i++) {
                completions.push({
                    label: scanner_1.tokenToString(i),
                    kind: vs.CompletionItemKind.Keyword
                });
            }
        }
        // global symbols
        const processedSymbols = new Map();
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
        if (symbol) {
            completion.documentation = s2meta_1.getDocumentationOfSymbol(this.store, symbol);
            let node = symbol.declarations[0];
            switch (node.kind) {
                case 136 /* FunctionDeclaration */:
                    node = Object.create(node);
                    node.body = null;
                // pass through
                case 135 /* VariableDeclaration */:
                case 137 /* ParameterDeclaration */:
                case 138 /* PropertyDeclaration */:
                case 139 /* TypedefDeclaration */:
                    completion.detail = this.printer.printNode(node);
                    break;
            }
        }
        return completion;
    }
}
exports.CompletionsProvider = CompletionsProvider;
//# sourceMappingURL=completions.js.map