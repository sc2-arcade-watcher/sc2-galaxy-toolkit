"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gt = require("../compiler/types");
const checker_1 = require("../compiler/checker");
const provider_1 = require("./provider");
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
    getFromSymbol(parentSymbol) {
        const completions = [];
        for (let symbol of parentSymbol.members.values()) {
            const node = (symbol.declarations[0]);
            if (node.name === undefined) {
                continue;
            }
            const item = {
                label: node.name.name,
            };
            switch (node.kind) {
                case 133:
                    item.kind = vs.CompletionItemKind.Class;
                    break;
                case 135:
                    item.kind = vs.CompletionItemKind.Function;
                    item.detail = this.printer.printNode(node.type);
                    break;
                case 134:
                case 136:
                    item.kind = vs.CompletionItemKind.Variable;
                    item.detail = this.printer.printNode(node.type);
                    break;
                case 137:
                    item.kind = vs.CompletionItemKind.Property;
                    item.detail = this.printer.printNode(node.type);
                    break;
                default:
                    item.kind = vs.CompletionItemKind.Text;
                    break;
            }
            completions.push(item);
        }
        return completions;
    }
    getCompletionsAt(uri, position) {
        let completions = [];
        const currentDocument = this.store.documents.get(uri);
        let currentToken = utils_2.findPrecedingToken(position, currentDocument);
        if (currentToken) {
            const checker = new checker_1.TypeChecker(this.store);
            if (currentToken.kind === 9 || currentToken.kind === 107) {
                if (currentToken.parent.kind === 114) {
                    currentToken = currentToken.parent.expression;
                    const type = checker.getTypeOfNode(currentToken);
                    if (type.flags & 4096) {
                        return this.getFromSymbol(type.symbol);
                    }
                }
            }
        }
        if (currentToken) {
            const currentContext = utils_1.findAncestor(currentToken, (element) => {
                return element.kind === 135;
            });
            if (currentContext) {
                completions = completions.concat(this.getFromSymbol(currentContext.symbol));
            }
        }
        for (const document of this.store.documents.values()) {
            completions = completions.concat(this.getFromSymbol(document.symbol));
        }
        return completions;
    }
    resolveCompletion(completion) {
        for (const sourceFile of this.store.documents.values()) {
            const symbol = sourceFile.symbol.members.get(completion.label);
            if (symbol) {
                completion.documentation = s2meta_1.getDocumentationOfSymbol(this.store, symbol);
                break;
            }
        }
        return completion;
    }
}
exports.CompletionsProvider = CompletionsProvider;
//# sourceMappingURL=completions.js.map