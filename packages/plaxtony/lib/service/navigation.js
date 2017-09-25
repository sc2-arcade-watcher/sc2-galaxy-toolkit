"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../compiler/utils");
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
class NavigationProvider {
    constructor(store) {
        this.store = store;
    }
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
