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
// function createBooleanType(trueFalseTypes: Type[]): IntrinsicType & UnionType {
//     const type = <IntrinsicType & UnionType>getUnionType(trueFalseTypes);
//     type.flags |= gt.TypeFlags.Boolean;
//     type.intrinsicName = "boolean";
//     return type;
// }
function createStructType(symbol) {
    const type = createType(4096 /* Struct */);
    type.symbol = symbol;
    return type;
}
function createFunctionType(symbol) {
    const type = createType(8192 /* Function */);
    type.symbol = symbol;
    return type;
}
function createTypedefType(referencedType) {
    const type = createType(1048576 /* Typedef */);
    type.referencedType = referencedType;
    return type;
}
function createArrayType(elementType) {
    const type = createType(32768 /* Array */);
    type.elementType = elementType;
    return type;
}
function createMappedType(returnType, referencedType) {
    const type = createType(65536 /* Mapped */);
    type.returnType = returnType;
    type.referencedType = referencedType;
    return type;
}
function createComplexType(kind) {
    const type = createType(16384 /* Complex */);
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
const unknownType = createIntrinsicType(1 /* Any */, "unknown");
const nullType = createIntrinsicType(2048 /* Null */, "null");
const stringType = createIntrinsicType(2 /* String */, "string");
const integerType = createIntrinsicType(4 /* Integer */, "integer");
const fixedType = createIntrinsicType(8 /* Fixed */, "fixed");
const trueType = createIntrinsicType(256 /* BooleanLiteral */, "true");
const falseType = createIntrinsicType(256 /* BooleanLiteral */, "false");
// const booleanType = createBooleanType([trueType, falseType]);
const voidType = createIntrinsicType(1024 /* Void */, "void");
const funcrefType = createIntrinsicType(131072 /* Funcref */, "funcref");
const arrayrefType = createIntrinsicType(262144 /* Arrayref */, "arrayref");
const structrefType = createIntrinsicType(524288 /* Structref */, "structref");
const complexTypes = [];
complexTypes[97 /* UnitKeyword */] = createComplexType(97 /* UnitKeyword */);
// const undefinedSymbol = createSymbol(gt.SymbolFlags.None, "undefined")
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
    getTypeFromMappedTypeNode(node) {
        const links = this.getNodeLinks(node);
        if (!links.resolvedType) {
            links.resolvedType = createMappedType(this.getTypeFromTypeNode(node.returnType), this.getTypeFromTypeNode(node.typeArguments[0]));
        }
        return links.resolvedType;
    }
    resolveMappedReference(type) {
        if (type.flags & 65536 /* Mapped */ && (type.returnType.flags & 524288 /* Structref */ ||
            type.returnType.flags & 131072 /* Funcref */)) {
            type = type.referencedType;
        }
        return type;
    }
    getPropertyOfType(type, name) {
        type = this.resolveMappedReference(type);
        if (type && type.flags & 4096 /* Struct */) {
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
        if (symbol.flags & (64 /* Struct */)) {
            return this.getDeclaredTypeOfStruct(symbol);
        }
        else if (symbol.flags & (14 /* Variable */)) {
            return this.getTypeOfSymbol(symbol);
        }
        else if (symbol.flags & (32 /* Function */)) {
            // should we introduce SignatureType that describes fn declaration and return it instead?
            return this.getTypeOfFunction(symbol);
        }
        else if (symbol.flags & (128 /* Typedef */)) {
            return this.getTypeFromTypeNode(symbol.declarations[0].type);
        }
        return unknownType;
    }
    getTypeFromTypeNode(node) {
        switch (node.kind) {
            case 71 /* StringKeyword */:
                return stringType;
            case 69 /* IntKeyword */:
                return integerType;
            case 70 /* FixedKeyword */:
                return fixedType;
            // case gt.SyntaxKind.BooleanKeyword:
            //     return booleanType;
            case 101 /* VoidKeyword */:
                return voidType;
            case 64 /* NullKeyword */:
                return nullType;
            case 107 /* FuncrefKeyword */:
                return funcrefType;
            case 105 /* ArrayrefKeyword */:
                return arrayrefType;
            case 106 /* StructrefKeyword */:
                return structrefType;
            case 97 /* UnitKeyword */:
                return complexTypes[node.kind];
            // case gt.SyntaxKind.LiteralType:
            //     return getTypeFromLiteralTypeNode(<LiteralTypeNode>node);
            // case gt.SyntaxKind.TypeReference:
            //     return getTypeFromTypeReference(<TypeReferenceNode>node);
            case 112 /* ArrayType */:
                return this.getTypeFromArrayTypeNode(node);
            case 111 /* MappedType */:
                return this.getTypeFromMappedTypeNode(node);
            // case gt.SyntaxKind.IndexedAccessType:
            //     return getTypeFromIndexedAccessTypeNode(<IndexedAccessTypeNode>node);
            case 108 /* Identifier */:
                const symbol = this.getSymbolAtLocation(node);
                return symbol && this.getDeclaredTypeOfSymbol(symbol);
            default:
                return unknownType;
        }
    }
    getTypeOfSymbol(symbol) {
        if (symbol.flags & (14 /* Variable */ | 16 /* Property */)) {
            return this.getTypeOfVariableOrParameterOrProperty(symbol);
        }
        else if (symbol.flags & (32 /* Function */)) {
            return this.getTypeOfFunction(symbol);
        }
        else if (symbol.flags & (128 /* Typedef */)) {
            return this.getTypeOfTypedef(symbol);
        }
        return unknownType;
    }
    getTypeOfVariableOrParameterOrProperty(symbol) {
        return this.getTypeFromTypeNode(symbol.declarations[0].type);
    }
    getTypeOfFunction(symbol) {
        return createFunctionType(symbol);
    }
    getTypeOfTypedef(symbol) {
        const refType = this.getTypeFromTypeNode(symbol.declarations[0].type);
        return createTypedefType(refType);
    }
    getTypeOfNode(node, followRef = false) {
        // if (isPartOfTypeNode(node)) {
        //     return this.getTypeFromTypeNode(<TypeNode>node);
        // }
        if (utils_1.isPartOfExpression(node)) {
            let type = this.getRegularTypeOfExpression(node);
            if (followRef) {
                type = this.resolveMappedReference(type);
            }
            return type;
        }
        return unknownType;
    }
    getRegularTypeOfExpression(expr) {
        // if (isRightSideOfQualifiedNameOrPropertyAccess(expr)) {
        //     expr = <Expression>expr.parent;
        // }
        // return this.getRegularTypeOfLiteralType(this.getTypeOfExpression(expr));
        // TODO: ^
        return this.getTypeOfExpression(expr);
    }
    getTypeOfExpression(node, cache) {
        // if (node.kind === gt.CallExpression) {
        //     const funcType = checkNonNullExpression((<CallExpression>node).expression);
        //     const signature = getSingleCallSignature(funcType);
        //     if (signature && !signature.typeParameters) {
        //         return getReturnTypeOfSignature(signature);
        //     }
        // }
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
            case 123 /* Block */:
                return this.checkBlock(node);
            case 136 /* FunctionDeclaration */:
                return this.checkFunction(node);
            case 135 /* VariableDeclaration */:
            case 138 /* PropertyDeclaration */:
                return this.checkVariableDeclaration(node);
            case 134 /* StructDeclaration */:
                return this.checkStructDeclaration(node);
            case 132 /* ExpressionStatement */:
                return this.checkExpressionStatement(node);
            case 124 /* IfStatement */:
                return this.checkIfStatement(node);
            case 127 /* ForStatement */:
                return this.checkForStatement(node);
            case 126 /* WhileStatement */:
            case 125 /* DoStatement */:
                return this.checkWhileStatement(node);
            case 128 /* BreakStatement */:
            case 129 /* ContinueStatement */:
                return this.checkBreakOrContinueStatement(node);
            case 131 /* ReturnStatement */:
                return this.checkReturnStatement(node);
            case 111 /* MappedType */:
                return this.checkMappedType(node);
            case 112 /* ArrayType */:
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
        // TODO: report when used outside of loop
    }
    checkReturnStatement(node) {
        if (node.expression) {
            this.checkExpression(node.expression);
        }
        // TODO: report when used with expr on void func
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
        // type = this.instantiateTypeWithSingleGenericCallSignature(<gt.Expression>node, uninstantiatedType, checkMode);
        // return type;
        // TODO: ^
        return uninstantiatedType;
    }
    checkExpressionWorker(node, checkMode) {
        switch (node.kind) {
            case 108 /* Identifier */:
                return this.checkIdentifier(node);
            // case gt.SyntaxKind.NullKeyword:
            //     return nullWideningType;
            // case gt.SyntaxKind.StringLiteral:
            // case gt.SyntaxKind.NumericLiteral:
            // case gt.SyntaxKind.TrueKeyword:
            // case gt.SyntaxKind.FalseKeyword:
            //     return checkLiteralExpression(node);
            case 115 /* PropertyAccessExpression */:
                return this.checkPropertyAccessExpression(node);
            case 114 /* ElementAccessExpression */:
                return this.checkIndexedAccess(node);
            case 116 /* CallExpression */:
                return this.checkCallExpression(node);
            case 121 /* ParenthesizedExpression */:
                return this.checkParenthesizedExpression(node, checkMode);
            case 117 /* PrefixUnaryExpression */:
                return this.checkPrefixUnaryExpression(node);
            case 118 /* PostfixUnaryExpression */:
                return this.checkPostfixUnaryExpression(node);
            case 119 /* BinaryExpression */:
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
            let fnType = leftType;
            if (fnType.flags & 65536 /* Mapped */) {
                fnType = this.resolveMappedReference(fnType);
            }
            if (fnType.flags & 8192 /* Function */) {
                const func = fnType.symbol.declarations[0];
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
        const kind = type.flags & 2048 /* Nullable */;
        if (kind) {
            // TODO:
            // this.error(errorNode, 'cannot be null');
            // const t = getNonNullableType(type);
            // return t.flags & (gt.TypeFlags.Nullable | gt.TypeFlags.Never) ? unknownType : t;
        }
        return type;
    }
    checkIndexedAccess(node) {
        const objectType = this.checkNonNullExpression(node.expression);
        const indexType = this.checkExpression(node.argumentExpression);
        // TODO: check if index is number
        if (objectType.flags & 32768 /* Array */) {
            return objectType.elementType;
        }
        else {
            this.report(node, 'trying to access element on non-array type');
        }
        return unknownType;
    }
    checkPropertyAccessExpression(node) {
        const type = this.checkNonNullExpression(node.expression);
        const left = node.expression;
        const right = node.name;
        const prop = this.getPropertyOfType(type, node.name.name);
        if (!prop) {
            this.report(node.name, 'undeclared or unacessible property');
            return unknownType;
        }
        this.getNodeLinks(node).resolvedSymbol = prop;
        const propType = this.getTypeOfSymbol(prop);
        return propType;
    }
    resolveName(location, name, nameNotFoundMessage) {
        if (location) {
            const currentContext = utils_1.findAncestor(location, (element) => {
                return element.kind === 136 /* FunctionDeclaration */;
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
        // if (nodeIsMissing(entityName)) {
        //     return undefined;
        // }
        // TODO: ^
        let symbol;
        if (entityName.kind === 108 /* Identifier */) {
            symbol = this.resolveName(location || entityName, entityName.name, ignoreErrors ? undefined : 'symbol referenced but not declared');
            if (!symbol) {
                return undefined;
            }
        }
        // else if (name.kind === SyntaxKind.QualifiedName || name.kind === SyntaxKind.PropertyAccessExpression) {
        //     let left: EntityNameOrEntityNameExpression;
        //     if (name.kind === SyntaxKind.QualifiedName) {
        //         left = (<QualifiedName>name).left;
        //     }
        //     else if (name.kind === SyntaxKind.PropertyAccessExpression &&
        //         (name.expression.kind === SyntaxKind.ParenthesizedExpression || isEntityNameExpression(name.expression))) {
        //         left = name.expression;
        //     }
        //     else {
        //         // If the expression in property-access expression is not entity-name or parenthsizedExpression (e.g. it is a call expression), it won't be able to successfully resolve the name.
        //         // This is the case when we are trying to do any language service operation in heritage clauses. By return undefined, the getSymbolOfEntityNameOrPropertyAccessExpression
        //         // will attempt to checkPropertyAccessExpression to resolve symbol.
        //         // i.e class C extends foo()./*do language service operation here*/B {}
        //         return undefined;
        //     }
        //     const right = name.kind === SyntaxKind.QualifiedName ? name.right : name.name;
        //     const namespace = resolveEntityName(left, SymbolFlags.Namespace, ignoreErrors, /*dontResolveAlias*/ false, location);
        //     if (!namespace || nodeIsMissing(right)) {
        //         return undefined;
        //     }
        //     else if (namespace === unknownSymbol) {
        //         return namespace;
        //     }
        //     symbol = getSymbol(getExportsOfSymbol(namespace), right.escapedText, meaning);
        //     if (!symbol) {
        //         if (!ignoreErrors) {
        //             error(right, Diagnostics.Namespace_0_has_no_exported_member_1, getFullyQualifiedName(namespace), declarationNameToString(right));
        //         }
        //         return undefined;
        //     }
        // }
        // else if (name.kind === gt.SyntaxKind.ParenthesizedExpression) {
        //     // TODO:
        //     return undefined;
        // }
        return symbol;
    }
    // private resolvePropertySymbol(node: gt.PropertyAccessExpression): gt.Symbol | undefined {
    //     if (node.expression.kind === gt.SyntaxKind.Identifier) {
    //         return this.resolveName(<gt.Identifier>node.expression);
    //     }
    //     else if (node.expression.kind === gt.SyntaxKind.PropertyAccessExpression) {
    //         return this.resolvePropertySymbol(<gt.PropertyAccessExpression>node.expression);
    //     }
    // }
    getSymbolOfEntityNameOrPropertyAccessExpression(entityName) {
        // if (isDeclarationKind(entityName.parent.kind)) {
        //     return (<gt.Declaration>entityName.parent).symbol;
        // }
        // TODO: ^
        let type;
        if (utils_1.isRightSideOfPropertyAccess(entityName)) {
            entityName = entityName.parent;
        }
        if (utils_1.isPartOfExpression(entityName)) {
            if (entityName.kind === 108 /* Identifier */) {
                return this.resolveEntityName(entityName, null, false);
            }
            else if (entityName.kind === 115 /* PropertyAccessExpression */) {
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
    // public getRootSymbols(symbol: Symbol): Symbol[] {
    // }
    getSymbolAtLocation(node) {
        switch (node.kind) {
            case 108 /* Identifier */:
            case 115 /* PropertyAccessExpression */:
                return this.getSymbolOfEntityNameOrPropertyAccessExpression(node);
        }
        // if (node.kind === gt.SyntaxKind.Identifier) {
        //     return (<gt.Identifier>node).
        // }
    }
}
exports.TypeChecker = TypeChecker;
//# sourceMappingURL=checker.js.map