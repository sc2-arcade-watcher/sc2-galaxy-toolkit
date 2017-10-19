import * as gt from './types';
import { isDeclarationKind, forEachChild, isPartOfExpression, isRightSideOfPropertyAccess } from './utils';
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

function createArrayType(elementType: gt.Type): gt.ArrayType {
    const type = <gt.ArrayType>createType(gt.TypeFlags.Array);
    type.elementType = elementType;
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

const complexTypes: gt.ComplexType[] = [];
complexTypes[gt.SyntaxKind.UnitKeyword] = createComplexType(gt.SyntaxKind.UnitKeyword);

const undefinedSymbol = createSymbol(gt.SymbolFlags.None, "undefined")

export class TypeChecker {
    private store: Store;
    private nodeLinks: gt.NodeLinks[] = [];

    constructor(store: Store) {
        this.store = store;
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

    private getPropertyOfType(type: gt.Type, name: string): gt.Symbol | undefined {
        if (type.flags & gt.TypeFlags.Struct) {
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
        // TODO: resolve typedefs
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
            case gt.SyntaxKind.UnitKeyword:
                return complexTypes[node.kind];
            // case gt.SyntaxKind.LiteralType:
            //     return getTypeFromLiteralTypeNode(<LiteralTypeNode>node);
            // case gt.SyntaxKind.TypeReference:
            //     return getTypeFromTypeReference(<TypeReferenceNode>node);
            case gt.SyntaxKind.ArrayType:
                return this.getTypeFromArrayTypeNode(<gt.ArrayTypeNode>node);
            // case gt.SyntaxKind.IndexedAccessType:
            //     return getTypeFromIndexedAccessTypeNode(<IndexedAccessTypeNode>node);
            case gt.SyntaxKind.Identifier:
                const symbol = this.getSymbolAtLocation(node);
                return symbol && this.getDeclaredTypeOfSymbol(symbol);
            default:
                return unknownType;
        }
    }

    private getTypeOfSymbol(symbol: gt.Symbol): gt.Type {
        if (symbol.flags & (gt.SymbolFlags.Variable | gt.SymbolFlags.Property)) {
            return this.getTypeOfVariableOrParameterOrProperty(symbol);
        }
        // if (symbol.flags & (gt.SymbolFlags.Function)) {
        //     return this.getTypeOfFuncClassEnumModule(symbol);
        // }
        return unknownType;
    }

    private getTypeOfVariableOrParameterOrProperty(symbol: gt.Symbol): gt.Type {
        return this.getTypeFromTypeNode((<gt.VariableDeclaration>symbol.declarations[0]).type);
    }

    public getTypeOfNode(node: gt.Node): gt.Type {
        // if (isPartOfTypeNode(node)) {
        //     return this.getTypeFromTypeNode(<TypeNode>node);
        // }

        if (isPartOfExpression(node)) {
            return this.getRegularTypeOfExpression(<gt.Expression>node);
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
            // case gt.SyntaxKind.ThisKeyword:
            //     return checkThisExpression(node);
            // case gt.SyntaxKind.SuperKeyword:
            //     return checkSuperExpression(node);
            // case gt.SyntaxKind.NullKeyword:
            //     return nullWideningType;
            // case gt.SyntaxKind.StringLiteral:
            // case gt.SyntaxKind.NumericLiteral:
            // case gt.SyntaxKind.TrueKeyword:
            // case gt.SyntaxKind.FalseKeyword:
            //     return checkLiteralExpression(node);
            // case gt.SyntaxKind.TemplateExpression:
            //     return checkTemplateExpression(<TemplateExpression>node);
            // case gt.SyntaxKind.NoSubstitutionTemplateLiteral:
            //     return stringType;
            // case gt.SyntaxKind.RegularExpressionLiteral:
            //     return globalRegExpType;
            // case gt.SyntaxKind.ArrayLiteralExpression:
            //     return checkArrayLiteral(<ArrayLiteralExpression>node, checkMode);
            // case gt.SyntaxKind.ObjectLiteralExpression:
            //     return checkObjectLiteral(<ObjectLiteralExpression>node, checkMode);
            case gt.SyntaxKind.PropertyAccessExpression:
                return this.checkPropertyAccessExpression(<gt.PropertyAccessExpression>node);
            case gt.SyntaxKind.ElementAccessExpression:
                return this.checkIndexedAccess(<gt.ElementAccessExpression>node);
            // case gt.SyntaxKind.CallExpression:
            //     if ((<CallExpression>node).expression.kind === gt.SyntaxKind.ImportKeyword) {
            //         return checkImportCallExpression(<ImportCall>node);
            //     }
            //     return checkCallExpression(<CallExpression>node);
            // case gt.SyntaxKind.ParenthesizedExpression:
            //     return checkParenthesizedExpression(<ParenthesizedExpression>node, checkMode);
            // case gt.SyntaxKind.VoidExpression:
            //     return checkVoidExpression(<VoidExpression>node);
            // case gt.SyntaxKind.PrefixUnaryExpression:
            //     return checkPrefixUnaryExpression(<PrefixUnaryExpression>node);
            // case gt.SyntaxKind.PostfixUnaryExpression:
            //     return checkPostfixUnaryExpression(<PostfixUnaryExpression>node);
            // case gt.SyntaxKind.BinaryExpression:
            //     return checkBinaryExpression(<BinaryExpression>node, checkMode);
            // case gt.SyntaxKind.ConditionalExpression:
            //     return checkConditionalExpression(<ConditionalExpression>node, checkMode);
            // case gt.SyntaxKind.OmittedExpression:
            //     return undefinedWideningType;
        }
        return unknownType;
    }

    private checkIdentifier(node: gt.Identifier): gt.Type {
        const symbol = this.getSymbolOfEntityNameOrPropertyAccessExpression(node);
        if (!symbol) {
            return unknownType;
        }
        return this.getTypeOfSymbol(symbol);
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

        return unknownType;
    }

    private checkPropertyAccessExpression(node: gt.PropertyAccessExpression): gt.Type {
        const type = this.checkNonNullExpression(node.expression);
        const left = node.expression;
        const right = node.name;


        const prop = this.getPropertyOfType(type, node.name.name);
        if (!prop) {
            //  if (right.escapedText && !checkAndReportErrorForExtendingInterface(node)) {
            //     reportNonexistentProperty(right, type.flags & TypeFlags.TypeParameter && (type as TypeParameter).isThisType ? apparentType : type);
            // }
            return unknownType;
        }

        this.getNodeLinks(node).resolvedSymbol = prop;

        const propType = this.getTypeOfSymbol(prop);

        return propType;
    }

    private resolveName(location: gt.Node | undefined, name: string, nameNotFoundMessage: string): gt.Symbol {
        // TODO: locals

        for (const document of this.store.documents.values()) {
            const symbol = document.symbol.members.get(name);
            if (symbol) {
                return symbol;
            }
        }

        return undefinedSymbol;
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
        let type: gt.Type;

        if (isRightSideOfPropertyAccess(entityName)) {
            entityName = <gt.PropertyAccessExpression>entityName.parent;
        }
        // TODO: ^

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

        return undefined;
    }

    // public getRootSymbols(symbol: Symbol): Symbol[] {
    // }

    private getSymbolAtLocation(node: gt.Node): gt.Symbol | undefined {
        switch (node.kind) {
            case gt.SyntaxKind.Identifier:
            case gt.SyntaxKind.PropertyAccessExpression:
                return this.getSymbolOfEntityNameOrPropertyAccessExpression(<gt.Identifier | gt.PropertyAccessExpression>node);
        }
        // if (node.kind === gt.SyntaxKind.Identifier) {
        //     return (<gt.Identifier>node).
        // }
    }

    // getTypeAtLocation(node: Node): Type;
    // getTypeFromTypeNode(node: TypeNode): Type;
    // signatureToString(signature: Signature, enclosingDeclaration?: Node, flags?: TypeFormatFlags, kind?: SignatureKind): string;
    // typeToString(type: Type, enclosingDeclaration?: Node, flags?: TypeFormatFlags): string;
    // symbolToString(symbol: Symbol, enclosingDeclaration?: Node, meaning?: SymbolFlags): string;

    public computeSymbolTargets(rootNode: gt.Node) {
        let selectionElements: gt.Node[] = [];
        let selectionDepth = 0;
        let resolvedSelection = false;
        let selectedScope = null;
        const self = this;

        function resolveIdentifierSymbol(identifier: gt.Identifier) {
            console.log('resolved', identifier.name, 'to', selectionElements[selectionElements.length - 1 - selectionDepth]);
        }

        function visitNode(node: gt.Node) {
            switch (node.kind) {
                case gt.SyntaxKind.PropertyAccessExpression: {
                    const propertyAccess = <gt.PropertyAccessExpression> node;

                    if (
                        propertyAccess.expression.kind !== gt.SyntaxKind.PropertyAccessExpression &&
                        propertyAccess.expression.kind !== gt.SyntaxKind.Identifier
                    ) {
                        self.computeSymbolTargets((<gt.ElementAccessExpression>propertyAccess.expression).argumentExpression);
                    }

                    selectionElements.push(propertyAccess.name);

                    if (propertyAccess.expression.kind === gt.SyntaxKind.Identifier) {
                        selectionElements.push(propertyAccess.expression);
                        // console.log('final', selectionScopes.length);
                        // console.log('::: ', selectionScopes);
                        // selectionScopes = [];
                        // resolvedSelection = true;
                    }
                    // if (resolvedSelection) {
                    //     console.log('resolved');
                    // }
                    visitNode(propertyAccess.expression);

                    if (propertyAccess.expression.kind === gt.SyntaxKind.Identifier) {
                        resolveIdentifierSymbol(<gt.Identifier>(propertyAccess.expression));
                        ++selectionDepth;
                    }
                    resolveIdentifierSymbol(propertyAccess.name);
                    ++selectionDepth;

                    return true;
                }

                case gt.SyntaxKind.Identifier: {
                    // console.log('ident: ', (<gt.Identifier>node).name);
                    // console.log(selectionScopes.length);
                    // if (scopes.length) {
                    //     console.log('::: ', scopes);
                    //     scopes = [];
                    // }
                    break;
                }
            }

            forEachChild(node, visitNode);
        }

        visitNode(rootNode);
        // forEachChild(rootNode, child => visitNode(child));
    }
}
