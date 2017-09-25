"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../compiler/utils");
const utils_2 = require("./utils");
const vs = require("vscode-languageserver");
class CompletionsProvider {
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
                    break;
                case 134:
                case 136:
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
    constructor(store) {
        this.store = store;
    }
    getCompletionsAt(uri, position) {
        let completions = [];
        const currentDocument = this.store.documents.get(uri);
        const currentToken = utils_2.findPrecedingToken(position, currentDocument);
        const currentContext = utils_1.findAncestor(currentToken, (element) => {
            return element.kind === 135;
        });
        if (currentContext) {
            completions = completions.concat(this.getFromSymbol(currentContext.symbol));
        }
        for (const document of this.store.documents.values()) {
            completions = completions.concat(this.getFromSymbol(document.symbol));
        }
        return completions;
    }
}
exports.CompletionsProvider = CompletionsProvider;
