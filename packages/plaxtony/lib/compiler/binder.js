"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
function bindSourceFile(sourceFile) {
    let currentContainer;
    bind(sourceFile);
    function bind(node) {
        let parentContainer = currentContainer;
        switch (node.kind) {
            case 121:
            case 134:
            case 135:
            case 133:
            case 136:
                addDeclaration(node);
                break;
        }
        if (node.kind === 121 || node.kind === 135 || node.kind === 133) {
            currentContainer = node;
        }
        utils_1.forEachChild(node, child => bind(child));
        currentContainer = parentContainer;
    }
    function addDeclaration(node) {
        let symbol;
        let name;
        if (node.kind === 121) {
            name = node.fileName;
        }
        else {
            name = node.name.name;
        }
        if (currentContainer !== undefined && currentContainer.symbol !== undefined) {
            if (currentContainer.symbol.members.has(name)) {
                symbol = currentContainer.symbol.members.get(name);
            }
        }
        if (symbol === undefined) {
            symbol = {
                escapedName: name,
                declarations: [],
                valueDeclaration: undefined,
                isAssigned: false,
                isReferenced: false,
                members: new Map(),
                parent: undefined,
            };
            if (currentContainer !== undefined) {
                currentContainer.symbol.members.set(name, symbol);
            }
        }
        node.symbol = symbol;
        symbol.declarations.push(node);
        return symbol;
    }
}
exports.bindSourceFile = bindSourceFile;
