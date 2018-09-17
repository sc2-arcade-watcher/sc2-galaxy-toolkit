"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../compiler/utils");
const utils_2 = require("./utils");
const provider_1 = require("./provider");
function collectDeclarations(sourceFile) {
    let declarations = [];
    function registerDeclaration(node) {
        declarations.push(node);
    }
    function visitNode(node) {
        if (node.kind === 139 /* VariableDeclaration */ ||
            node.kind === 140 /* FunctionDeclaration */ ||
            node.kind === 138 /* StructDeclaration */) {
            registerDeclaration(node);
        }
        if (node.kind === 126 /* SourceFile */) {
            utils_1.forEachChild(node, child => visitNode(child));
        }
    }
    visitNode(sourceFile);
    return declarations;
}
class NavigationProvider extends provider_1.AbstractProvider {
    getDocumentSymbols(uri) {
        const sourceFile = this.store.documents.get(uri);
        if (!sourceFile)
            return [];
        return collectDeclarations(sourceFile);
    }
    getWorkspaceSymbols(query) {
        let declarations = [];
        outer: for (const document of this.store.documents.values()) {
            for (const decl of collectDeclarations(document)) {
                if (!query || utils_2.fuzzysearch(query, decl.name.name)) {
                    declarations.push(decl);
                    if (declarations.length >= 1000) {
                        break outer;
                    }
                }
            }
        }
        return declarations;
    }
}
exports.NavigationProvider = NavigationProvider;
//# sourceMappingURL=navigation.js.map