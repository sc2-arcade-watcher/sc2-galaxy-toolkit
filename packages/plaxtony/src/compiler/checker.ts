import * as gt from './types';
import { isDeclarationKind, forEachChild, isPartOfExpression, isRightSideOfPropertyAccess, findAncestor, createDiagnosticForNode } from './utils';
import { Store } from '../service/store';

let nextSymbolId = 1;
let nextNodeId = 1;
let nextMergeId = 1;
let nextFlowId = 1;

export function getNodeId(node: gt.Node): number {
    if (!node.id) {
        node.id = nextNodeId;
        nextNodeId++;
    }
    return node.id;
}

export function getSymbolId(symbol: gt.Symbol): number {
    if (!symbol.id) {
        symbol.id = nextSymbolId;
        nextSymbolId++;
    }

    return symbol.id;
}

const enum CheckMode {
    Normal = 0,                // Normal type checking
    SkipContextSensitive = 1,  // Skip context sensitive function expressions
    Inferential = 2,           // Inferential typing
}

function createType(flags: gt.TypeFlags): gt.Type {
    const result = <gt.Type>{
        flags: flags,
    };
    return result;
}

function createIntrinsicType(kind: gt.TypeFlags, intrinsicName: string): gt.IntrinsicType {
    const type = <gt.IntrinsicType>createType(kind);
    type.intrinsicName = intrinsicName;
    return type;
}

// function createBooleanType(trueFalseTypes: Type[]): IntrinsicType & UnionType {
//     const type = <IntrinsicType & UnionType>getUnionType(trueFalseTypes);
//     type.flags |= gt.TypeFlags.Boolean;
//     type.intrinsicName = "boolean";
//     return type;
// }

function createStructType(symbol?: gt.Symbol): gt.StructType {
    const type = <gt.StructType>createType(gt.TypeFlags.Struct);
    type.symbol = symbol;
    return type;
}

function createFunctionType(symbol?: gt.Symbol): gt.FunctionType {
    const type = <gt.FunctionType>createType(gt.TypeFlags.Function);
    type.symbol = symbol;
    return type;
}

function createTypedefType(referencedType: gt.Type): gt.TypedefType {
    const type = <gt.TypedefType>createType(gt.TypeFlags.Typedef);
    type.referencedType = referencedType;
    return type;
}

function createArrayType(elementType: gt.Type): gt.ArrayType {
    const type = <gt.ArrayType>createType(gt.TypeFlags.Array);
    type.elementType = elementType;
    return type;
}

function createMappedType(returnType: gt.Type, referencedType: gt.Type): gt.MappedType {
    const type = <gt.MappedType>createType(gt.TypeFlags.Mapped);
    type.returnType = returnType;
    type.referencedType = referencedType;
    return type;
}

function createComplexType(kind: gt.SyntaxKind): gt.ComplexType {
    const type = <gt.ComplexType>createType(gt.TypeFlags.Complex);
    type.kind = kind;
    return type;
}

function createSymbol(flags: gt.SymbolFlags, name: string): gt.Symbol {
    const symbol = <gt.Symbol>{
        flags: flags,
        escapedName: name,
    };
    return symbol;
}

const unknownType = createIntrinsicType(gt.TypeFlags.Any, "unknown");
const nullType = createIntrinsicType(gt.TypeFlags.Null, "null");
const stringType = createIntrinsicType(gt.TypeFlags.String, "string");
const integerType = createIntrinsicType(gt.TypeFlags.Integer, "integer");
const fixedType = createIntrinsicType(gt.TypeFlags.Fixed, "fixed");
const trueType = createIntrinsicType(gt.TypeFlags.BooleanLiteral, "true");
const falseType = createIntrinsicType(gt.TypeFlags.BooleanLiteral, "false");
// const booleanType = createBooleanType([trueType, falseType]);
const voidType = createIntrinsicType(gt.TypeFlags.Void, "void");
const funcrefType = createIntrinsicType(gt.TypeFlags.Funcref, "funcref");
const arrayrefType = createIntrinsicType(gt.TypeFlags.Arrayref, "arrayref");
const structrefType = createIntrinsicType(gt.TypeFlags.Structref, "structref");

const complexTypes: gt.ComplexType[] = [];
complexTypes[gt.SyntaxKind.UnitKeyword] = createComplexType(gt.SyntaxKind.UnitKeyword);

function generateComplexTypes() {
    const map = new Map<gt.ComplexTypeKeyword, gt.ComplexType>();

    for (let i = gt.SyntaxKindMarker.FirstComplexType; i <= gt.SyntaxKindMarker.LastComplexType; i++) {
        const ckind = <gt.ComplexTypeKeyword>(<any>i);
        map.set(ckind, createComplexType(ckind));
    }
}

// const undefinedSymbol = createSymbol(gt.SymbolFlags.None, "undefined")

export class TypeChecker {
    private store: Store;
    private nodeLinks: gt.NodeLinks[] = [];
    private diagnostics: gt.Diagnostic[] = [];

    constructor(store: Store) {
        this.store = store;
    }

    private report(location: gt.Node, msg: string, category: gt.DiagnosticCategory = gt.DiagnosticCategory.Error): void {
        this.diagnostics.push(createDiagnosticForNode(location, category, msg));
    }

    private getNodeLinks(node: gt.Node): gt.NodeLinks {
        const nodeId = getNodeId(node);
        return this.nodeLinks[nodeId] || (this.nodeLinks[nodeId] = { flags: 0 });
    }

    private getTypeFromArrayTypeNode(node: gt.ArrayTypeNode): gt.Type {
        const links = this.getNodeLinks(node);
        if (!links.resolvedType) {
            links.resolvedType = createArrayType(this.getTypeFromTypeNode(node.elementType));
        }
        return links.resolvedType;
    }

    private getTypeFromMappedTypeNode(node: gt.MappedTypeNode): gt.Type {
        const links = this.getNodeLinks(node);
        if (!links.resolvedType) {
            links.resolvedType = createMappedType(
                this.getTypeFromTypeNode(node.returnType),
                this.getTypeFromTypeNode(node.typeArguments[0])
            );
        }
        return links.resolvedType;
    }

    private resolveMappedReference(type: gt.Type) {
        if (type.flags & gt.TypeFlags.Mapped && (
            (<gt.MappedType>type).returnType.flags & gt.TypeFlags.Structref ||
            (<gt.MappedType>type).returnType.flags & gt.TypeFlags.Funcref
        )) {
            type = (<gt.MappedType>type).referencedType;
        }
        return type;
    }

    private getPropertyOfType(type: gt.Type, name: string): gt.Symbol | undefined {
        type = this.resolveMappedReference(type);
        if (type && type.flags & gt.TypeFlags.Struct) {
            if (type.symbol.members.has(name)) {
                return type.symbol.members.get(name);
            }
        }
        return undefined;
    }

    private getDeclaredTypeOfStruct(symbol: gt.Symbol): gt.StructType {
        return createStructType(symbol);
    }

    private getDeclaredTypeOfSymbol(symbol: gt.Symbol): gt.Type {
        if (symbol.flags & (gt.SymbolFlags.Struct)) {
            return this.getDeclaredTypeOfStruct(symbol);
        }
        else if (symbol.flags & (gt.SymbolFlags.Variable)) {
            return this.getTypeOfSymbol(symbol);
        }
        else if (symbol.flags & (gt.SymbolFlags.Function)) {
            // should we introduce SignatureType that describes fn declaration and return it instead?
            return this.getTypeOfFunction(symbol);
        }
        else if (symbol.flags & (gt.SymbolFlags.Typedef)) {
            return this.getTypeFromTypeNode((<gt.TypedefDeclaration>symbol.declarations[0]).type);
        }
        return unknownType;
    }

    private getTypeFromTypeNode(node: gt.TypeNode): gt.Type {
        switch (node.kind) {
            case gt.SyntaxKind.StringKeyword:
                return stringType;
            case gt.SyntaxKind.IntKeyword:
                return integerType;
            case gt.SyntaxKind.FixedKeyword:
                return fixedType;
            // case gt.SyntaxKind.BooleanKeyword:
            //     return booleanType;
            case gt.SyntaxKind.VoidKeyword:
                return voidType;
            case gt.SyntaxKind.NullKeyword:
                return nullType;
            case gt.SyntaxKind.FuncrefKeyword:
                return funcrefType;
            case gt.SyntaxKind.ArrayrefKeyword:
                return arrayrefType;
            case gt.SyntaxKind.StructrefKeyword:
                return structrefType;
            case gt.SyntaxKind.UnitKeyword:
                return complexTypes[node.kind];
            // case gt.SyntaxKind.LiteralType:
            //     return getTypeFromLiteralTypeNode(<LiteralTypeNode>node);
            // case gt.SyntaxKind.TypeReference:
            //     return getTypeFromTypeReference(<TypeReferenceNode>node);
            case gt.SyntaxKind.ArrayType:
                return this.getTypeFromArrayTypeNode(<gt.ArrayTypeNode>node);
            case gt.SyntaxKind.MappedType:
                return this.getTypeFromMappedTypeNode(<gt.MappedTypeNode>node);
            // case gt.SyntaxKind.IndexedAccessType:
            //     return getTypeFromIndexedAccessTypeNode(<IndexedAccessTypeNode>node);
            case gt.SyntaxKind.Identifier:
                const symbol = this.getSymbolAtLocation(node);
                if (symbol) {
                    return this.getDeclaredTypeOfSymbol(symbol);
                }
                else {
                    return unknownType;
                }
            default:
                return unknownType;
        }
    }

    private getTypeOfSymbol(symbol: gt.Symbol): gt.Type {
        if (symbol.flags & (gt.SymbolFlags.Variable | gt.SymbolFlags.Property)) {
            return this.getTypeOfVariableOrParameterOrProperty(symbol);
        }
        else if (symbol.flags & (gt.SymbolFlags.Function)) {
            return this.getTypeOfFunction(symbol);
        }
        else if (symbol.flags & (gt.SymbolFlags.Typedef)) {
            return this.getTypeOfTypedef(symbol);
        }
        return unknownType;
    }

    private getTypeOfVariableOrParameterOrProperty(symbol: gt.Symbol): gt.Type {
        return this.getTypeFromTypeNode((<gt.VariableDeclaration>symbol.declarations[0]).type);
    }

    private getTypeOfFunction(symbol: gt.Symbol): gt.Type {
        return createFunctionType(symbol);
    }

    private getTypeOfTypedef(symbol: gt.Symbol): gt.Type {
        const refType = this.getTypeFromTypeNode((<gt.TypedefDeclaration>symbol.declarations[0]).type);
        return createTypedefType(refType);
    }

    public getTypeOfNode(node: gt.Node, followRef: boolean = false): gt.Type {
        // if (isPartOfTypeNode(node)) {
        //     return this.getTypeFromTypeNode(<TypeNode>node);
        // }

        if (isPartOfExpression(node)) {
            let type = this.getRegularTypeOfExpression(<gt.Expression>node);
            if (followRef) {
                type = this.resolveMappedReference(type);
            }
            return type;
        }

        return unknownType;
    }

    private getRegularTypeOfExpression(expr: gt.Expression): gt.Type {
        // if (isRightSideOfQualifiedNameOrPropertyAccess(expr)) {
        //     expr = <Expression>expr.parent;
        // }
        // return this.getRegularTypeOfLiteralType(this.getTypeOfExpression(expr));
        // TODO: ^
        return this.getTypeOfExpression(expr);
    }

    private getTypeOfExpression(node: gt.Expression, cache?: boolean): gt.Type {
        // if (node.kind === gt.CallExpression) {
        //     const funcType = checkNonNullExpression((<CallExpression>node).expression);
        //     const signature = getSingleCallSignature(funcType);
        //     if (signature && !signature.typeParameters) {
        //         return getReturnTypeOfSignature(signature);
        //     }
        // }

        return this.checkExpression(node);
    }

    public checkSourceFile(sourceFile: gt.SourceFile) {
        this.diagnostics = [];
        for (const statement of sourceFile.statements) {
            this.checkSourceElement(statement);
        }
        return this.diagnostics;
    }

    private checkSourceElement(node: gt.Node) {
        switch (node.kind) {
            case gt.SyntaxKind.Block:
                return this.checkBlock(<gt.Block>node);
            case gt.SyntaxKind.FunctionDeclaration:
                return this.checkFunction(<gt.FunctionDeclaration>node);
            case gt.SyntaxKind.VariableDeclaration:
            case gt.SyntaxKind.PropertyDeclaration:
                return this.checkVariableDeclaration(<gt.VariableDeclaration>node);
            case gt.SyntaxKind.StructDeclaration:
                return this.checkStructDeclaration(<gt.StructDeclaration>node);
            case gt.SyntaxKind.ExpressionStatement:
                return this.checkExpressionStatement(<gt.ExpressionStatement>node);
            case gt.SyntaxKind.IfStatement:
                return this.checkIfStatement(<gt.IfStatement>node);
            case gt.SyntaxKind.ForStatement:
                return this.checkForStatement(<gt.ForStatement>node);
            case gt.SyntaxKind.WhileStatement:
            case gt.SyntaxKind.DoStatement:
                return this.checkWhileStatement(<gt.WhileStatement>node);
            case gt.SyntaxKind.BreakStatement:
            case gt.SyntaxKind.ContinueStatement:
                return this.checkBreakOrContinueStatement(<gt.BreakOrContinueStatement>node);
            case gt.SyntaxKind.ReturnStatement:
                return this.checkReturnStatement(<gt.ReturnStatement>node);
            case gt.SyntaxKind.MappedType:
                return this.checkMappedType(<gt.MappedTypeNode>node);
            case gt.SyntaxKind.ArrayType:
                return this.checkArrayType(<gt.ArrayTypeNode>node);
        }
    }

    private checkFunction(node: gt.FunctionDeclaration) {
        this.checkSourceElement(node.type);

        node.parameters.forEach(this.checkSourceElement.bind(this));

        if (node.body) {
            this.checkSourceElement(node.body);
        }
    }

    private checkVariableDeclaration(node: gt.VariableDeclaration) {
        this.checkSourceElement(node.type);

        if (node.initializer) {
            this.checkExpression(node.initializer);
        }
    }

    private checkStructDeclaration(node: gt.StructDeclaration) {
        node.members.forEach(this.checkSourceElement.bind(this));
    }

    private checkIfStatement(node: gt.IfStatement) {
        this.checkExpression(node.expression);
        this.checkSourceElement(node.thenStatement);
        if (node.elseStatement) {
            this.checkSourceElement(node.elseStatement);
        }
    }

    private checkForStatement(node: gt.ForStatement) {
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

    private checkWhileStatement(node: gt.WhileStatement) {
        if (node.expression) {
            this.checkExpression(node.expression);
        }
        this.checkSourceElement(node.statement);
    }

    private checkBreakOrContinueStatement(node: gt.BreakOrContinueStatement) {
        // TODO: report when used outside of loop
    }

    private checkReturnStatement(node: gt.ReturnStatement) {
        if (node.expression) {
            this.checkExpression(node.expression);
        }
        // TODO: report when used with expr on void func
    }

    private checkArrayType(node: gt.ArrayTypeNode) {
        this.checkExpression(node.size);
        this.checkSourceElement(node.elementType);
    }

    private checkMappedType(node: gt.MappedTypeNode) {
        this.checkExpression(node.returnType);
        if (node.typeArguments) {
            node.typeArguments.forEach(this.checkSourceElement.bind(this));
        }
    }

    private checkBlock(node: gt.Block) {
        node.statements.forEach(this.checkSourceElement.bind(this));
    }

    private checkExpressionStatement(node: gt.ExpressionStatement) {
        this.checkExpression(node.expression);
    }

    private checkExpression(node: gt.Expression, checkMode?: CheckMode): gt.Type {
        let type: gt.Type;
        const uninstantiatedType = this.checkExpressionWorker(<gt.Expression>node, checkMode);
        // type = this.instantiateTypeWithSingleGenericCallSignature(<gt.Expression>node, uninstantiatedType, checkMode);
        // return type;
        // TODO: ^

        return uninstantiatedType;
    }

    private checkExpressionWorker(node: gt.Expression, checkMode: CheckMode): gt.Type {
        switch (node.kind) {
            case gt.SyntaxKind.Identifier:
                return this.checkIdentifier(<gt.Identifier>node);
            // case gt.SyntaxKind.NullKeyword:
            //     return nullWideningType;
            // case gt.SyntaxKind.StringLiteral:
            // case gt.SyntaxKind.NumericLiteral:
            // case gt.SyntaxKind.TrueKeyword:
            // case gt.SyntaxKind.FalseKeyword:
            //     return checkLiteralExpression(node);
            case gt.SyntaxKind.PropertyAccessExpression:
                return this.checkPropertyAccessExpression(<gt.PropertyAccessExpression>node);
            case gt.SyntaxKind.ElementAccessExpression:
                return this.checkIndexedAccess(<gt.ElementAccessExpression>node);
            case gt.SyntaxKind.CallExpression:
                return this.checkCallExpression(<gt.CallExpression>node);
            case gt.SyntaxKind.ParenthesizedExpression:
                return this.checkParenthesizedExpression(<gt.ParenthesizedExpression>node, checkMode);
            case gt.SyntaxKind.PrefixUnaryExpression:
                return this.checkPrefixUnaryExpression(<gt.PrefixUnaryExpression>node);
            case gt.SyntaxKind.PostfixUnaryExpression:
                return this.checkPostfixUnaryExpression(<gt.PostfixUnaryExpression>node);
            case gt.SyntaxKind.BinaryExpression:
                return this.checkBinaryExpression(<gt.BinaryExpression>node, checkMode);
            // case gt.SyntaxKind.OmittedExpression:
            //     return undefinedWideningType;
        }
        return unknownType;
    }

    private checkBinaryExpression(node: gt.BinaryExpression, checkMode?: CheckMode) {
        const leftType = this.checkExpression(node.left);
        const rightType = this.checkExpression(node.right);

        return leftType;
    }

    private checkParenthesizedExpression(node: gt.ParenthesizedExpression, checkMode?: CheckMode) {
        return this.checkExpression(node.expression);
    }

    private checkPrefixUnaryExpression(node: gt.PrefixUnaryExpression, checkMode?: CheckMode) {
        return this.checkExpression(node.operand);
    }

    private checkPostfixUnaryExpression(node: gt.PostfixUnaryExpression, checkMode?: CheckMode) {
        return this.checkExpression(node.operand);
    }

    private checkIdentifier(node: gt.Identifier): gt.Type {
        const symbol = this.getSymbolOfEntityNameOrPropertyAccessExpression(node);
        if (!symbol) {
            this.report(node, 'undeclared symbol');
            return unknownType;
        }
        return this.getTypeOfSymbol(symbol);
    }

    private checkCallExpression(node: gt.CallExpression): gt.Type {
        const leftType = this.checkExpression(node.expression);
        if (leftType != unknownType) {
            let fnType: gt.FunctionType = leftType;
            if (fnType.flags & gt.TypeFlags.Mapped) {
                fnType = this.resolveMappedReference(fnType);
            }
            if (fnType.flags & gt.TypeFlags.Function) {
                const func = <gt.FunctionDeclaration>fnType.symbol.declarations[0];
                if (node.arguments.length !== func.parameters.length) {
                    this.report(node, `expected ${func.parameters.length} arguments, got ${node.arguments.length}`);
                }
            }
            else {
                this.report(node, 'not calllable');
            }
        }
        node.arguments.forEach(this.checkExpression.bind(this))
        return leftType;
    }

    private checkNonNullExpression(node: gt.Expression): gt.Type {
        return this.checkNonNullType(this.checkExpression(node), node);
    }

    private checkNonNullType(type: gt.Type, errorNode: gt.Node): gt.Type {
        const kind = type.flags & gt.TypeFlags.Nullable;
        if (kind) {
            // TODO:
            // this.error(errorNode, 'cannot be null');
            // const t = getNonNullableType(type);
            // return t.flags & (gt.TypeFlags.Nullable | gt.TypeFlags.Never) ? unknownType : t;
        }
        return type;
    }

    private checkIndexedAccess(node: gt.ElementAccessExpression): gt.Type {
        const objectType = this.checkNonNullExpression(node.expression);
        const indexType = this.checkExpression(node.argumentExpression);
        // TODO: check if index is number

        if (objectType.flags & gt.TypeFlags.Array) {
            return (<gt.ArrayType>objectType).elementType;
        }
        else {
            this.report(node, 'trying to access element on non-array type');
        }

        return unknownType;
    }

    private checkPropertyAccessExpression(node: gt.PropertyAccessExpression): gt.Type {
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

    private resolveName(location: gt.Node | undefined, name: string, nameNotFoundMessage: string): gt.Symbol | undefined {
        if (location) {
            const currentContext = <gt.FunctionDeclaration>findAncestor(location, (element: gt.Node): boolean => {
                return element.kind === gt.SyntaxKind.FunctionDeclaration;
            })
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

    private resolveEntityName(entityName: gt.EntityNameExpression, meaning: gt.SymbolFlags, ignoreErrors?: boolean, location?: gt.Node): gt.Symbol | undefined {
        // if (nodeIsMissing(entityName)) {
        //     return undefined;
        // }
        // TODO: ^

        let symbol: gt.Symbol;
        if (entityName.kind === gt.SyntaxKind.Identifier) {
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

    private getSymbolOfEntityNameOrPropertyAccessExpression(entityName: gt.Identifier | gt.PropertyAccessExpression): gt.Symbol | undefined {
        // if (isDeclarationKind(entityName.parent.kind)) {
        //     return (<gt.Declaration>entityName.parent).symbol;
        // }
        // TODO: ^
        let type: gt.Type;

        if (isRightSideOfPropertyAccess(entityName)) {
            entityName = <gt.PropertyAccessExpression>entityName.parent;
        }

        if (isPartOfExpression(entityName)) {
            if (entityName.kind === gt.SyntaxKind.Identifier) {
                return this.resolveEntityName(entityName, null, false);
            }
            else if (entityName.kind === gt.SyntaxKind.PropertyAccessExpression) {
                const links = this.getNodeLinks(entityName);
                if (links.resolvedSymbol) {
                    return links.resolvedSymbol;
                }
                this.checkPropertyAccessExpression(<gt.PropertyAccessExpression>entityName).symbol;
                return links.resolvedSymbol;
            }
        }

        throw new Error('how did we get here?');
    }

    // public getRootSymbols(symbol: Symbol): Symbol[] {
    // }

    public getSymbolAtLocation(node: gt.Node): gt.Symbol | undefined {
        switch (node.kind) {
            case gt.SyntaxKind.Identifier:
            case gt.SyntaxKind.PropertyAccessExpression:
                return this.getSymbolOfEntityNameOrPropertyAccessExpression(<gt.Identifier | gt.PropertyAccessExpression>node);
        }
        // if (node.kind === gt.SyntaxKind.Identifier) {
        //     return (<gt.Identifier>node).
        // }
    }
}
