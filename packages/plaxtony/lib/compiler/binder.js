"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gt = require("./types");
const utils_1 = require("./utils");
function bindSourceFile(sourceFile) {
    let currentScope;
    let currentContainer;
    bind(sourceFile);
    function bind(node) {
        let parentScope = currentScope;
        let parentContainer = currentContainer;
        if (utils_1.isDeclarationKind(node.kind)) {
            switch (node.kind) {
                case 121:
                    {
                        declareSymbol(node, null);
                        break;
                    }
                case 115:
                case 114:
                    {
                        declareSymbol(node, null);
                        break;
                    }
                default:
                    {
                        declareSymbol(node, currentContainer.symbol);
                        break;
                    }
            }
        }
        if (utils_1.isContainerKind(node.kind)) {
            currentContainer = node;
        }
        if (utils_1.isDeclarationKind(node.kind)) {
            currentScope = node;
        }
        utils_1.forEachChild(node, child => bind(child));
        currentScope = parentScope;
        currentContainer = parentContainer;
    }
    function getDeclarationName(node) {
        switch (node.kind) {
            case 121:
                {
                    return node.fileName;
                    break;
                }
            case 134:
            case 135:
            case 133:
            case 136:
            case 137:
                {
                    return node.name.name;
                    break;
                }
            case 114:
                {
                    return '__prop__' + node.name.name;
                    break;
                }
            case 115:
                {
                    const call = node;
                    if (call.expression.kind === 107) {
                        return call.expression.name;
                    }
                    else {
                        return '__()';
                    }
                    break;
                }
        }
    }
    function declareSymbol(node, parentSymbol) {
        let scopedSymbolTable;
        let nodeSymbol;
        let name;
        name = getDeclarationName(node);
        if (parentSymbol && parentSymbol.members.has(name)) {
            nodeSymbol = parentSymbol.members.get(name);
        }
        else {
            nodeSymbol = {
                escapedName: name,
                declarations: [],
                valueDeclaration: undefined,
                isAssigned: false,
                isReferenced: false,
                members: new Map(),
                parent: undefined,
            };
            switch (node.kind) {
                case 134:
                    nodeSymbol.flags = ((parentSymbol && parentSymbol.declarations[0].kind == 121) ?
                        4 : 2);
                    break;
                case 135:
                    nodeSymbol.flags = 16;
                    break;
                case 133:
                    nodeSymbol.flags = 32;
                    break;
                case 137:
                    nodeSymbol.flags = 8;
                    break;
            }
            if (parentSymbol) {
                parentSymbol.members.set(name, nodeSymbol);
            }
        }
        node.symbol = nodeSymbol;
        nodeSymbol.declarations.push(node);
        return nodeSymbol;
    }
}
exports.bindSourceFile = bindSourceFile;
//# sourceMappingURL=binder.js.map