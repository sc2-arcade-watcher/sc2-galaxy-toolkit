"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../compiler/utils");
const provider_1 = require("./provider");
function collectDeclarations(sourceFile) {
    let declarations = [];
    function registerDeclaration(node) {
        declarations.push(node);
    }
    function visitNode(node) {
        if (node.kind === 134 ||
            node.kind === 135 ||
            node.kind === 133) {
            registerDeclaration(node);
        }
        if (node.kind === 121) {
            utils_1.forEachChild(node, child => visitNode(child));
        }
    }
    visitNode(sourceFile);
    return declarations;
}
class NavigationProvider extends provider_1.AbstractProvider {
    getDocumentSymbols(uri) {
        return collectDeclarations(this.store.documents.get(uri));
    }
    getWorkspaceSymbols() {
        let declarations = [];
        for (let document of this.store.documents.values()) {
            declarations = declarations.concat(collectDeclarations(document));
        }
        return declarations;
    }
}
exports.NavigationProvider = NavigationProvider;
//# sourceMappingURL=navigation.js.map