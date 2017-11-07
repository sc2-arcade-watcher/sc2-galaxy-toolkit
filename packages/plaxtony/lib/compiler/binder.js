"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gt = require("./types");
const utils_1 = require("./utils");
function bindSourceFile(sourceFile, store) {
    let currentScope;
    let currentContainer;
    bind(sourceFile);
    function bind(node) {
        let parentScope = currentScope;
        let parentContainer = currentContainer;
        if (utils_1.isDeclarationKind(node.kind)) {
            switch (node.kind) {
                case 121 /* SourceFile */:
                    {
                        declareSymbol(node, null);
                        break;
                    }
                case 115 /* CallExpression */:
                case 114 /* PropertyAccessExpression */:
                    {
                        // TODO: to be reomved?
                        // declareSymbol(<gt.Declaration>node, null);
                        break;
                    }
                default:
                    {
                        declareSymbol(node, currentContainer.symbol);
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
    function getDeclarationName(node) {
        switch (node.kind) {
            case 121 /* SourceFile */:
                {
                    return node.fileName;
                    break;
                }
            case 134 /* VariableDeclaration */:
            case 135 /* FunctionDeclaration */:
            case 133 /* StructDeclaration */:
            case 136 /* ParameterDeclaration */:
            case 137 /* PropertyDeclaration */:
                {
                    return node.name.name;
                    break;
                }
            case 114 /* PropertyAccessExpression */:
                {
                    return '__prop__' + node.name.name;
                    break;
                }
            case 115 /* CallExpression */:
                {
                    const call = node;
                    if (call.expression.kind === 107 /* Identifier */) {
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
    // function createSymbolTable(symbols?: ReadonlyArray<Symbol>): SymbolTable {
    //     const result = new Map<string, Symbol>() as SymbolTable;
    //     if (symbols) {
    //         for (const symbol of symbols) {
    //             result.set(symbol.escapedName, symbol);
    //         }
    //     }
    //     return result;
    // }
    function declareSymbol(node, parentSymbol) {
        let scopedSymbolTable;
        let nodeSymbol;
        let name;
        name = getDeclarationName(node);
        if (parentSymbol && parentSymbol.members.has(name)) {
            nodeSymbol = parentSymbol.members.get(name);
        }
        else {
            if (parentSymbol && parentSymbol.declarations[0].kind === 121 /* SourceFile */) {
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
                    case 136 /* ParameterDeclaration */:
                        nodeSymbol.flags = 4 /* FunctionParameter */;
                        break;
                    case 134 /* VariableDeclaration */:
                        nodeSymbol.flags = ((parentSymbol && parentSymbol.declarations[0].kind == 121 /* SourceFile */) ?
                            8 /* GlobalVariable */ : 2 /* LocalVariable */);
                        break;
                    case 135 /* FunctionDeclaration */:
                        nodeSymbol.flags = 32 /* Function */;
                        break;
                    case 133 /* StructDeclaration */:
                        nodeSymbol.flags = 64 /* Struct */;
                        break;
                    case 137 /* PropertyDeclaration */:
                        nodeSymbol.flags = 16 /* Property */;
                        break;
                }
            }
            if (parentSymbol) {
                parentSymbol.members.set(name, nodeSymbol);
            }
        }
        node.symbol = nodeSymbol;
        nodeSymbol.declarations.push(node);
        if (!node.symbol.valueDeclaration && ((node.kind === 135 /* FunctionDeclaration */ && node.body) ||
            (node.kind === 134 /* VariableDeclaration */ && node.initializer))) {
            node.symbol.valueDeclaration = node;
        }
        return nodeSymbol;
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