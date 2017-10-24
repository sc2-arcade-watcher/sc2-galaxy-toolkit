"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gt = require("./types");
const utils_1 = require("./utils");
let nextSymbolId = 1;
let nextNodeId = 1;
let nextMergeId = 1;
let nextFlowId = 1;
function getNodeId(node) {
    if (!node.id) {
        node.id = nextNodeId;
        nextNodeId++;
    }
    return node.id;
}
exports.getNodeId = getNodeId;
function getSymbolId(symbol) {
    if (!symbol.id) {
        symbol.id = nextSymbolId;
        nextSymbolId++;
    }
    return symbol.id;
}
exports.getSymbolId = getSymbolId;
var CheckMode;
(function (CheckMode) {
    CheckMode[CheckMode["Normal"] = 0] = "Normal";
    CheckMode[CheckMode["SkipContextSensitive"] = 1] = "SkipContextSensitive";
    CheckMode[CheckMode["Inferential"] = 2] = "Inferential";
})(CheckMode || (CheckMode = {}));
function createType(flags) {
    const result = {
        flags: flags,
    };
    return result;
}
function createIntrinsicType(kind, intrinsicName) {
    const type = createType(kind);
    type.intrinsicName = intrinsicName;
    return type;
}
function createStructType(symbol) {
    const type = createType(4096);
    type.symbol = symbol;
    return type;
}
function createFunctionType(symbol) {
    const type = createType(8192);
    type.symbol = symbol;
    return type;
}
function createArrayType(elementType) {
    const type = createType(16384);
    type.elementType = elementType;
    return type;
}
function createComplexType(kind) {
    const type = createType(32768);
    type.kind = kind;
    return type;
}
function createSymbol(flags, name) {
    const symbol = {
        flags: flags,
        escapedName: name,
    };
    return symbol;
}
const unknownType = createIntrinsicType(1, "unknown");
const nullType = createIntrinsicType(2048, "null");
const stringType = createIntrinsicType(2, "string");
const integerType = createIntrinsicType(4, "integer");
const fixedType = createIntrinsicType(8, "fixed");
const trueType = createIntrinsicType(256, "true");
const falseType = createIntrinsicType(256, "false");
const voidType = createIntrinsicType(1024, "void");
const complexTypes = [];
complexTypes[96] = createComplexType(96);
class TypeChecker {
    constructor(store) {
        this.nodeLinks = [];
        this.diagnostics = [];
        this.store = store;
    }
    report(location, msg, category = gt.DiagnosticCategory.Error) {
        this.diagnostics.push(utils_1.createDiagnosticForNode(location, category, msg));
    }
    getNodeLinks(node) {
        const nodeId = getNodeId(node);
        return this.nodeLinks[nodeId] || (this.nodeLinks[nodeId] = { flags: 0 });
    }
    getTypeFromArrayTypeNode(node) {
        const links = this.getNodeLinks(node);
        if (!links.resolvedType) {
            links.resolvedType = createArrayType(this.getTypeFromTypeNode(node.elementType));
        }
        return links.resolvedType;
    }
    getPropertyOfType(type, name) {
        if (type.flags & 4096) {
            if (type.symbol.members.has(name)) {
                return type.symbol.members.get(name);
            }
        }
        return undefined;
    }
    getDeclaredTypeOfStruct(symbol) {
        return createStructType(symbol);
    }
    getDeclaredTypeOfSymbol(symbol) {
        if (symbol.flags & (32)) {
            return this.getDeclaredTypeOfStruct(symbol);
        }
        return unknownType;
    }
    getTypeFromTypeNode(node) {
        switch (node.kind) {
            case 71:
                return stringType;
            case 69:
                return integerType;
            case 70:
                return fixedType;
            case 100:
                return voidType;
            case 64:
                return nullType;
            case 96:
                return complexTypes[node.kind];
            case 111:
                return this.getTypeFromArrayTypeNode(node);
            case 107:
                const symbol = this.getSymbolAtLocation(node);
                return symbol && this.getDeclaredTypeOfSymbol(symbol);
            default:
                return unknownType;
        }
    }
    getTypeOfSymbol(symbol) {
        if (symbol.flags & (6 | 8)) {
            return this.getTypeOfVariableOrParameterOrProperty(symbol);
        }
        else if (symbol.flags & (16)) {
            return this.getTypeOfFunction(symbol);
        }
        return unknownType;
    }
    getTypeOfVariableOrParameterOrProperty(symbol) {
        return this.getTypeFromTypeNode(symbol.declarations[0].type);
    }
    getTypeOfFunction(symbol) {
        return createFunctionType(symbol);
    }
    getTypeOfNode(node) {
        if (utils_1.isPartOfExpression(node)) {
            return this.getRegularTypeOfExpression(node);
        }
        return unknownType;
    }
    getRegularTypeOfExpression(expr) {
        return this.getTypeOfExpression(expr);
    }
    getTypeOfExpression(node, cache) {
        return this.checkExpression(node);
    }
    checkSourceFile(sourceFile) {
        this.diagnostics = [];
        for (const statement of sourceFile.statements) {
            this.checkSourceElement(statement);
        }
        return this.diagnostics;
    }
    checkSourceElement(node) {
        switch (node.kind) {
            case 122:
                return this.checkBlock(node);
            case 135:
                return this.checkFunction(node);
            case 134:
            case 137:
                return this.checkVariableDeclaration(node);
            case 133:
                return this.checkStructDeclaration(node);
            case 131:
                return this.checkExpressionStatement(node);
            case 123:
                return this.checkIfStatement(node);
            case 126:
                return this.checkForStatement(node);
            case 125:
            case 124:
                return this.checkWhileStatement(node);
            case 127:
            case 128:
                return this.checkBreakOrContinueStatement(node);
            case 130:
                return this.checkReturnStatement(node);
            case 110:
                return this.checkMappedType(node);
            case 111:
                return this.checkArrayType(node);
        }
    }
    checkFunction(node) {
        this.checkSourceElement(node.type);
        node.parameters.forEach(this.checkSourceElement.bind(this));
        if (node.body) {
            this.checkSourceElement(node.body);
        }
    }
    checkVariableDeclaration(node) {
        this.checkSourceElement(node.type);
        if (node.initializer) {
            this.checkExpression(node.initializer);
        }
    }
    checkStructDeclaration(node) {
        node.members.forEach(this.checkSourceElement.bind(this));
    }
    checkIfStatement(node) {
        this.checkExpression(node.expression);
        this.checkSourceElement(node.thenStatement);
        if (node.elseStatement) {
            this.checkSourceElement(node.elseStatement);
        }
    }
    checkForStatement(node) {
        if (node.initializer) {
            this.checkExpression(node.initializer);
        }
        if (node.condition) {
            this.checkExpression(node.condition);
        }
        if (node.incrementor) {
            this.checkExpression(node.incrementor);
        }
        this.checkSourceElement(node.statement);
    }
    checkWhileStatement(node) {
        if (node.expression) {
            this.checkExpression(node.expression);
        }
        this.checkSourceElement(node.statement);
    }
    checkBreakOrContinueStatement(node) {
    }
    checkReturnStatement(node) {
        if (node.expression) {
            this.checkExpression(node.expression);
        }
    }
    checkArrayType(node) {
        this.checkExpression(node.size);
        this.checkSourceElement(node.elementType);
    }
    checkMappedType(node) {
        this.checkExpression(node.returnType);
        if (node.typeArguments) {
            node.typeArguments.forEach(this.checkSourceElement.bind(this));
        }
    }
    checkBlock(node) {
        node.statements.forEach(this.checkSourceElement.bind(this));
    }
    checkExpressionStatement(node) {
        this.checkExpression(node.expression);
    }
    checkExpression(node, checkMode) {
        let type;
        const uninstantiatedType = this.checkExpressionWorker(node, checkMode);
        return uninstantiatedType;
    }
    checkExpressionWorker(node, checkMode) {
        switch (node.kind) {
            case 107:
                return this.checkIdentifier(node);
            case 114:
                return this.checkPropertyAccessExpression(node);
            case 113:
                return this.checkIndexedAccess(node);
            case 115:
                return this.checkCallExpression(node);
            case 120:
                return this.checkParenthesizedExpression(node, checkMode);
            case 116:
                return this.checkPrefixUnaryExpression(node);
            case 117:
                return this.checkPostfixUnaryExpression(node);
            case 118:
                return this.checkBinaryExpression(node, checkMode);
        }
        return unknownType;
    }
    checkBinaryExpression(node, checkMode) {
        const leftType = this.checkExpression(node.left);
        const rightType = this.checkExpression(node.right);
        return leftType;
    }
    checkParenthesizedExpression(node, checkMode) {
        return this.checkExpression(node.expression);
    }
    checkPrefixUnaryExpression(node, checkMode) {
        return this.checkExpression(node.operand);
    }
    checkPostfixUnaryExpression(node, checkMode) {
        return this.checkExpression(node.operand);
    }
    checkIdentifier(node) {
        const symbol = this.getSymbolOfEntityNameOrPropertyAccessExpression(node);
        if (!symbol) {
            this.report(node, 'undeclared symbol');
            return unknownType;
        }
        return this.getTypeOfSymbol(symbol);
    }
    checkCallExpression(node) {
        const leftType = this.checkExpression(node.expression);
        if (leftType != unknownType) {
            if (leftType.flags & 8192) {
                const func = leftType.symbol.declarations[0];
                if (node.arguments.length !== func.parameters.length) {
                    this.report(node, `expected ${func.parameters.length} arguments, got ${node.arguments.length}`);
                }
            }
            else {
                this.report(node, 'not calllable');
            }
        }
        node.arguments.forEach(this.checkExpression.bind(this));
        return leftType;
    }
    checkNonNullExpression(node) {
        return this.checkNonNullType(this.checkExpression(node), node);
    }
    checkNonNullType(type, errorNode) {
        const kind = type.flags & 2048;
        if (kind) {
        }
        return type;
    }
    checkIndexedAccess(node) {
        const objectType = this.checkNonNullExpression(node.expression);
        const indexType = this.checkExpression(node.argumentExpression);
        if (objectType.flags & 16384) {
            return objectType.elementType;
        }
        return unknownType;
    }
    checkPropertyAccessExpression(node) {
        const type = this.checkNonNullExpression(node.expression);
        const left = node.expression;
        const right = node.name;
        const prop = this.getPropertyOfType(type, node.name.name);
        if (!prop) {
            this.report(node.name, 'undeclared property');
            return unknownType;
        }
        this.getNodeLinks(node).resolvedSymbol = prop;
        const propType = this.getTypeOfSymbol(prop);
        return propType;
    }
    resolveName(location, name, nameNotFoundMessage) {
        if (location) {
            const currentContext = utils_1.findAncestor(location, (element) => {
                return element.kind === 135;
            });
            if (currentContext && currentContext.symbol.members.has(name)) {
                return currentContext.symbol.members.get(name);
            }
        }
        for (const document of this.store.documents.values()) {
            const symbol = document.symbol.members.get(name);
            if (symbol) {
                return symbol;
            }
        }
        return undefined;
    }
    resolveEntityName(entityName, meaning, ignoreErrors, location) {
        let symbol;
        if (entityName.kind === 107) {
            symbol = this.resolveName(location || entityName, entityName.name, ignoreErrors ? undefined : 'symbol referenced but not declared');
            if (!symbol) {
                return undefined;
            }
        }
        return symbol;
    }
    getSymbolOfEntityNameOrPropertyAccessExpression(entityName) {
        let type;
        if (utils_1.isRightSideOfPropertyAccess(entityName)) {
            entityName = entityName.parent;
        }
        if (utils_1.isPartOfExpression(entityName)) {
            if (entityName.kind === 107) {
                return this.resolveEntityName(entityName, null, false);
            }
            else if (entityName.kind === 114) {
                const links = this.getNodeLinks(entityName);
                if (links.resolvedSymbol) {
                    return links.resolvedSymbol;
                }
                this.checkPropertyAccessExpression(entityName).symbol;
                return links.resolvedSymbol;
            }
        }
        throw new Error('how did we get here?');
    }
    getSymbolAtLocation(node) {
        switch (node.kind) {
            case 107:
            case 114:
                return this.getSymbolOfEntityNameOrPropertyAccessExpression(node);
        }
    }
}
exports.TypeChecker = TypeChecker;
//# sourceMappingURL=checker.js.map