"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gt = require("./types");
const utils_1 = require("./utils");
// import { SignatureMeta, TypeChecker } from './checker';
function getDeclarationName(node) {
    switch (node.kind) {
        case 124 /* SourceFile */:
            {
                return node.fileName;
                break;
            }
        case 137 /* VariableDeclaration */:
        case 138 /* FunctionDeclaration */:
        case 136 /* StructDeclaration */:
        case 139 /* ParameterDeclaration */:
        case 140 /* PropertyDeclaration */:
        case 141 /* TypedefDeclaration */:
            {
                return node.name.name;
                break;
            }
        case 117 /* PropertyAccessExpression */:
            {
                return '__prop__' + node.name.name;
                break;
            }
        case 118 /* CallExpression */:
            {
                const call = node;
                if (call.expression.kind === 110 /* Identifier */) {
                    return call.expression.name;
                }
                else {
                    // TODO: properly named call expressions such as: st.member_fns[12]();
                    return '__()';
                }
                break;
            }
    }
}
exports.getDeclarationName = getDeclarationName;
// function createSymbolTable(symbols?: ReadonlyArray<Symbol>): SymbolTable {
//     const result = new Map<string, Symbol>() as SymbolTable;
//     if (symbols) {
//         for (const symbol of symbols) {
//             result.set(symbol.escapedName, symbol);
//         }
//     }
//     return result;
// }
function declareSymbol(node, store, parentSymbol) {
    let scopedSymbolTable;
    let nodeSymbol;
    let name;
    name = getDeclarationName(node);
    if (!name) {
        name = '__anonymous';
    }
    if (parentSymbol && parentSymbol.members.has(name)) {
        nodeSymbol = parentSymbol.members.get(name);
    }
    else {
        if (parentSymbol && parentSymbol.declarations[0].kind === 124 /* SourceFile */) {
            nodeSymbol = store.resolveGlobalSymbol(name);
        }
        if (!nodeSymbol) {
            nodeSymbol = {
                escapedName: name,
                declarations: [],
                valueDeclaration: undefined,
                isAssigned: false,
                isReferenced: false,
                members: new Map(),
                parent: parentSymbol,
            };
            switch (node.kind) {
                case 139 /* ParameterDeclaration */:
                    nodeSymbol.flags = 4 /* FunctionParameter */;
                    break;
                case 137 /* VariableDeclaration */:
                    nodeSymbol.flags = ((parentSymbol && parentSymbol.declarations[0].kind == 124 /* SourceFile */) ?
                        8 /* GlobalVariable */ : 2 /* LocalVariable */);
                    break;
                case 138 /* FunctionDeclaration */:
                    nodeSymbol.flags = 32 /* Function */;
                    break;
                case 136 /* StructDeclaration */:
                    nodeSymbol.flags = 64 /* Struct */;
                    break;
                case 140 /* PropertyDeclaration */:
                    nodeSymbol.flags = 16 /* Property */;
                    break;
                case 141 /* TypedefDeclaration */:
                    nodeSymbol.flags = 128 /* Typedef */;
                    break;
            }
            switch (node.kind) {
                case 137 /* VariableDeclaration */:
                case 138 /* FunctionDeclaration */:
                    {
                        if (node.modifiers.some((value) => value.kind === 51 /* StaticKeyword */)) {
                            nodeSymbol.flags |= 1024 /* Static */;
                        }
                        break;
                    }
            }
        }
        if (parentSymbol) {
            parentSymbol.members.set(name, nodeSymbol);
        }
    }
    node.symbol = nodeSymbol;
    nodeSymbol.declarations.push(node);
    if (!node.symbol.valueDeclaration && ((node.kind === 138 /* FunctionDeclaration */ && node.body) ||
        (node.kind === 137 /* VariableDeclaration */ && node.initializer))) {
        node.symbol.valueDeclaration = node;
    }
    return nodeSymbol;
}
exports.declareSymbol = declareSymbol;
function bindSourceFile(sourceFile, store) {
    let currentScope;
    let currentContainer;
    bind(sourceFile);
    function bind(node) {
        let parentScope = currentScope;
        let parentContainer = currentContainer;
        if (utils_1.isDeclarationKind(node.kind)) {
            switch (node.kind) {
                case 124 /* SourceFile */:
                    {
                        declareSymbol(node, store, null);
                        break;
                    }
                default:
                    {
                        declareSymbol(node, store, currentContainer.symbol);
                        break;
                    }
            }
        }
        // if (node.kind === SyntaxKind.SourceFile || node.kind === SyntaxKind.FunctionDeclaration || node.kind === SyntaxKind.StructDeclaration) {
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
}
exports.bindSourceFile = bindSourceFile;
function unbindSourceFile(sourceFile, store) {
    function unbindSymbol(parentSymbol) {
        for (const symbol of parentSymbol.members.values()) {
            symbol.declarations = symbol.declarations.filter((decl) => {
                return utils_1.getSourceFileOfNode(decl) !== sourceFile;
            });
            if (symbol.declarations.length) {
                unbindSymbol(symbol);
            }
            else {
                parentSymbol.members.delete(symbol.escapedName);
            }
        }
    }
    unbindSymbol(sourceFile.symbol);
}
exports.unbindSourceFile = unbindSourceFile;
//# sourceMappingURL=binder.js.map