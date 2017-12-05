import * as util from 'util';
import * as gt from './types';
import { isComplexTypeKind } from '../compiler/utils';
import { isDeclarationKind, forEachChild, isPartOfExpression, isRightSideOfPropertyAccess, findAncestor, createDiagnosticForNode, isAssignmentOperator, isComparisonOperator, isReferenceKeywordKind, findAncestorByKind } from './utils';
import { Store } from '../service/store';
import { tokenToString } from './scanner';

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

export abstract class AbstractType implements gt.Type {
    flags: gt.TypeFlags;

    public abstract isAssignableTo(target: AbstractType): boolean;
    public abstract isComparableTo(target: AbstractType): boolean;
    public abstract isBoolExpression(negation: boolean): boolean;

    public isValidBinaryOperation(operation: gt.BinaryOperator, rightType: AbstractType) {
        return false;
    }

    public isValidPrefixOperation(operation: gt.PrefixUnaryOperator) {
        return false;
    }

    public isValidPostfixOperation(operation: gt.PostfixUnaryOperator) {
        return false;
    }

    public getName(): string {
        return this.constructor.name;
    }
}

export class UnknownType extends AbstractType {
    flags: gt.TypeFlags = gt.TypeFlags.Unknown;

    public isAssignableTo(target: AbstractType) {
        return false;
    }
    public isComparableTo(target: AbstractType) {
        return false;
    }
    public isBoolExpression(negation: boolean) {
        return false;
    }
}

export class IntrinsicType extends AbstractType {
    readonly name: string;

    constructor(flags: gt.TypeFlags, name: string) {
        super();
        this.flags = flags;
        this.name = name;
    }

    public isAssignableTo(target: AbstractType) {
        if (this === target) return true;

        if (target instanceof IntrinsicType) {
            if (target.flags & gt.TypeFlags.Fixed && (this.flags & gt.TypeFlags.Integer || this.flags & gt.TypeFlags.Byte)) return true;
            if (target.flags & gt.TypeFlags.Integer && (this.flags & gt.TypeFlags.Byte)) return true;
            if (target.flags & gt.TypeFlags.Byte && (this.flags & gt.TypeFlags.Integer)) return true;
            if (this.flags & gt.TypeFlags.Boolean && target.flags & gt.TypeFlags.Boolean) return true;
        }

        if (this.flags & gt.TypeFlags.Null && target.flags & gt.TypeFlags.Nullable) return true;

        return false;
    }

    public isComparableTo(target: AbstractType) {
        if (this === target) return true;

        if (target instanceof IntrinsicType) {
            if (
                (this.flags & gt.TypeFlags.Integer || this.flags & gt.TypeFlags.Byte || this.flags & gt.TypeFlags.Fixed) &&
                (target.flags & gt.TypeFlags.Integer || target.flags & gt.TypeFlags.Byte || target.flags & gt.TypeFlags.Fixed)
            ) {
                return true;
            }
            if (this.flags & gt.TypeFlags.Boolean && target.flags & gt.TypeFlags.Boolean) return true;
        }

        if (this.flags & gt.TypeFlags.Null && target.flags & gt.TypeFlags.Nullable) return true;

        return false;
    }

    public isBoolExpression(negation: boolean) {
        return true;
    }

    public isValidBinaryOperation(operation: gt.BinaryOperator, rightType: AbstractType) {
        if (this === rightType || (rightType instanceof LiteralType && rightType.value.kind === gt.SyntaxKind.StringLiteral)) {
            switch (operation) {
                case gt.SyntaxKind.PlusToken:
                    if (this.flags & gt.TypeFlags.String) return true;
            }
        }

        if (
            this === rightType ||
            (rightType.flags & gt.TypeFlags.Integer) ||
            (rightType.flags & gt.TypeFlags.Fixed) ||
            (rightType.flags & gt.TypeFlags.Byte) ||
            (rightType instanceof LiteralType && rightType.value.kind === gt.SyntaxKind.NumericLiteral)
        ) {
            switch (operation) {
                case gt.SyntaxKind.PlusToken:
                case gt.SyntaxKind.MinusToken:
                case gt.SyntaxKind.AsteriskToken:
                case gt.SyntaxKind.PercentToken:
                case gt.SyntaxKind.SlashToken:
                    if (this.flags & gt.TypeFlags.Integer || this.flags & gt.TypeFlags.Byte || this.flags & gt.TypeFlags.Fixed) return true;
            }
        }

        if (this === rightType || (rightType instanceof LiteralType && rightType.value.kind === gt.SyntaxKind.NumericLiteral)) {
            switch (operation) {
                case gt.SyntaxKind.AmpersandToken:
                case gt.SyntaxKind.BarToken:
                case gt.SyntaxKind.CaretToken:
                case gt.SyntaxKind.LessThanLessThanToken:
                case gt.SyntaxKind.GreaterThanGreaterThanToken:
                case gt.SyntaxKind.BarBarToken:
                case gt.SyntaxKind.AmpersandAmpersandToken:
                    if (this.flags & gt.TypeFlags.Integer) return true;
            }
        }

        return false;
    }

    public isValidPrefixOperation(operation: gt.PrefixUnaryOperator) {
        switch (operation) {
            case gt.SyntaxKind.PlusToken:
            case gt.SyntaxKind.MinusToken:
                if (this.flags & gt.TypeFlags.Integer || this.flags & gt.TypeFlags.Byte || this.flags & gt.TypeFlags.Fixed) return true;
            case gt.SyntaxKind.TildeToken:
                if (this.flags & gt.TypeFlags.Integer || this.flags & gt.TypeFlags.Byte) return true;
            case gt.SyntaxKind.ExclamationToken:
                if (this.flags & gt.TypeFlags.Integer || this.flags & gt.TypeFlags.Byte || this.flags & gt.TypeFlags.Fixed || this.flags & gt.TypeFlags.Boolean) return true;
        }
    }

    public isValidPostfixOperation(operation: gt.PostfixUnaryOperator) {
        return false;
    }

    public getName() {
        return this.name;
    }
}

export class ComplexType extends AbstractType implements gt.ComplexType {
    kind: gt.SyntaxKind;

    constructor(kind: gt.SyntaxKind) {
        super();
        this.flags = gt.TypeFlags.Complex;
        this.kind = kind;

        switch (this.kind) {
            case gt.SyntaxKind.ColorKeyword:
                break;
            default:
                this.flags |= gt.TypeFlags.Nullable;
                break;
        }
    }

    public isAssignableTo(target: AbstractType) {
        if (this === target) return true;

        if (target instanceof ComplexType) {
            const cmpKind = target.kind === gt.SyntaxKind.HandleKeyword ? this.kind : target.kind;
            switch (cmpKind) {
                case gt.SyntaxKind.AbilcmdKeyword:
                case gt.SyntaxKind.ActorKeyword:
                case gt.SyntaxKind.ActorscopeKeyword:
                case gt.SyntaxKind.AifilterKeyword:
                case gt.SyntaxKind.BankKeyword:
                case gt.SyntaxKind.BitmaskKeyword:
                case gt.SyntaxKind.CamerainfoKeyword:
                case gt.SyntaxKind.GenerichandleKeyword:
                case gt.SyntaxKind.EffecthistoryKeyword:
                case gt.SyntaxKind.MarkerKeyword:
                case gt.SyntaxKind.OrderKeyword:
                case gt.SyntaxKind.PlayergroupKeyword:
                case gt.SyntaxKind.PointKeyword:
                case gt.SyntaxKind.RegionKeyword:
                case gt.SyntaxKind.SoundKeyword:
                case gt.SyntaxKind.SoundlinkKeyword:
                case gt.SyntaxKind.TextKeyword:
                case gt.SyntaxKind.TimerKeyword:
                case gt.SyntaxKind.TransmissionsourceKeyword:
                case gt.SyntaxKind.UnitfilterKeyword:
                case gt.SyntaxKind.UnitgroupKeyword:
                case gt.SyntaxKind.UnitrefKeyword:
                case gt.SyntaxKind.WaveinfoKeyword:
                case gt.SyntaxKind.WavetargetKeyword:
                    return true;
                default:
                    return false;
            }
        }

        // if (target.flags && gt.TypeFlags.Null && this.flags & gt.TypeFlags.Nullable) return true;

        return false;
    }

    public isComparableTo(target: AbstractType) {
        if (this === target) return true;
        if (target.flags && gt.TypeFlags.Null && this.flags & gt.TypeFlags.Nullable) return true;
        return false;
    }

    public isBoolExpression(negation: boolean) {
        if (negation) {
            switch (this.kind) {
                case gt.SyntaxKind.TriggerKeyword:
                case gt.SyntaxKind.UnitKeyword:
                    return false;
            }
        }

        return true;
    }

    public isValidBinaryOperation(operation: gt.BinaryOperator, rightType: AbstractType) {
        if (this !== rightType) return false;

        switch (operation) {
            case gt.SyntaxKind.PlusToken:
            {
                switch (this.kind) {
                    case gt.SyntaxKind.TextKeyword:
                    case gt.SyntaxKind.PointKeyword:
                        return true;
                }
                break;
            }
            case gt.SyntaxKind.MinusToken:
            {
                switch (this.kind) {
                    case gt.SyntaxKind.PointKeyword:
                        return true;
                }
                break;
            }
        }

        return false;
    }

    public isValidPrefixOperation(operation: gt.PrefixUnaryOperator) {
        switch (operation) {
            case gt.SyntaxKind.ExclamationToken:
                return this.isBoolExpression(true);
        }
        return false;
    }

    public getName() {
        return tokenToString(this.kind);
    }
}

export class LiteralType extends AbstractType {
    value: gt.Literal;

    constructor(flags: gt.TypeFlags, value: gt.Literal) {
        super();
        this.flags = flags;
        this.value = value;
    }

    public isAssignableTo(target: AbstractType) {
        if (this === target) return true;

        if (this.value.kind === gt.SyntaxKind.StringLiteral && target.flags & gt.TypeFlags.String) {
            return true;
        }
        if (this.value.kind === gt.SyntaxKind.NumericLiteral && (
            target.flags & gt.TypeFlags.Byte ||
            target.flags & gt.TypeFlags.Integer ||
            target.flags & gt.TypeFlags.Fixed
        )) {
            if (this.value.text.indexOf('.') !== -1 && !(target.flags & gt.TypeFlags.Fixed)) {
                return false;
            }
            return true;
        }
        if (this.flags & gt.TypeFlags.Null && target.flags & gt.TypeFlags.Nullable) {
            return true;
        }

        return false;
    }

    public isComparableTo(target: AbstractType) {
        if (this === target) return true;

        if (this.value.kind === gt.SyntaxKind.NumericLiteral && (
            target.flags & gt.TypeFlags.Byte ||
            target.flags & gt.TypeFlags.Integer ||
            target.flags & gt.TypeFlags.Fixed
        )) {
            return true;
        }

        if (target instanceof LiteralType && this.value.kind === target.value.kind) return true;

        return this.isAssignableTo(target);
    }

    public isBoolExpression(negation: boolean) {
        return true;
    }

    public isValidBinaryOperation(operation: gt.BinaryOperator, rightType: AbstractType) {
        let type: IntrinsicType;
        if (this.value.kind === gt.SyntaxKind.NumericLiteral) {
            if (this.value.text.indexOf('.') !== -1) {
                type = fixedType;
            }
            else {
                type = integerType;
            }
        }
        else if (this.value.kind === gt.SyntaxKind.StringLiteral) {
            type = stringType;
        }
        else {
            return false;
        }

        return type.isValidBinaryOperation(operation, rightType);
    }

    public isValidPrefixOperation(operation: gt.PrefixUnaryOperator) {
        let type: IntrinsicType;
        if (this.value.kind === gt.SyntaxKind.NumericLiteral) {
            if (this.value.text.indexOf('.') !== -1) {
                type = fixedType;
            }
            else {
                type = integerType;
            }
        }
        else if (this.value.kind === gt.SyntaxKind.StringLiteral) {
            type = stringType;
        }
        else {
            return false;
        }

        return type.isValidPrefixOperation(operation);
    }

    public getName() {
        return `${this.value.text}`;
    }
}

export class StructType extends AbstractType implements gt.StructType {
    symbol: gt.Symbol;

    constructor(symbol: gt.Symbol) {
        super();
        this.flags = gt.TypeFlags.Struct;
        this.symbol = symbol;
    }

    public isAssignableTo(target: AbstractType) {
        if (target instanceof ReferenceType && target.kind === gt.SyntaxKind.StructrefKeyword && this.symbol === (<StructType>target.declaredType).symbol) {
            return true;
        }
        return false;
    }

    public isComparableTo(target: AbstractType) {
        if (this === target) return true;
        if (target instanceof StructType && target.symbol === this.symbol) return true;
        return false;
    }

    public isBoolExpression(negation: boolean) {
        return false;
    }

    public getName() {
        return this.symbol.escapedName;
    }
}

export class SignatureMeta {
    returnType: AbstractType;
    args: AbstractType[];

    constructor(returnType: AbstractType, args: AbstractType[]) {
        this.returnType = returnType;
        this.args = args;
    }

    public match(other: SignatureMeta) {
        if (this.returnType !== other.returnType) return false;
        if (this.args.length !== other.args.length) return false;
        for (const [key, arg] of this.args.entries()) {
            if (this.args[key] !== arg) return false;
        }
        return true;
    }
}

export class FunctionType extends AbstractType implements gt.FunctionType {
    symbol: gt.Symbol;
    signature: SignatureMeta;

    constructor(symbol: gt.Symbol, signature: SignatureMeta) {
        super();
        this.flags = gt.TypeFlags.Function;
        this.symbol = symbol;
        this.signature = signature;
    }

    public isAssignableTo(target: AbstractType) {
        if (target instanceof ReferenceType && target.kind === gt.SyntaxKind.FuncrefKeyword) {
            if (this.symbol === (<FunctionType>target.declaredType).symbol) return true;
            if (this.signature.match((<FunctionType>target.declaredType).signature)) return true;
        }
        return false;
    }

    public isComparableTo(target: AbstractType) {
        if (this === target) return true;
        if (target instanceof FunctionType && target.symbol === this.symbol) return true;
        return false;
    }

    public isBoolExpression(negation: boolean) {
        if (negation) return false;
        return true;
    }

    public getName() {
        return this.symbol.escapedName;
    }
}

export type ReferenceKind = gt.SyntaxKind.FuncrefKeyword | gt.SyntaxKind.StructrefKeyword | gt.SyntaxKind.ArrayrefKeyword;

export class ReferenceType extends AbstractType {
    kind: ReferenceKind;
    // symbol: gt.Symbol;
    declaredType: AbstractType;

    constructor(kind: ReferenceKind, declaredType: AbstractType) {
        super();
        this.flags = gt.TypeFlags.Reference;
        this.kind = kind;
        this.declaredType = declaredType;
        // this.symbol = symbol;
    }

    public isAssignableTo(target: AbstractType): boolean {
        if (target instanceof ReferenceType && this.kind === target.kind) {
            return this.declaredType.isAssignableTo(this);
        }
        return false;
    }

    public isComparableTo(target: AbstractType) {
        return false;
    }

    public isBoolExpression(negation: boolean) {
        return false;
    }

    public getName() {
        return tokenToString(this.kind) + '<' + this.declaredType.getName() + '>';
    }
}

export class ArrayType extends AbstractType implements gt.ArrayType {
    elementType: AbstractType;

    constructor(elementType: AbstractType) {
        super();
        this.flags = gt.TypeFlags.Array;
        this.elementType = elementType;
    }

    public isAssignableTo(target: AbstractType) {
        if (target instanceof ReferenceType && target.kind === gt.SyntaxKind.ArrayrefKeyword) {
            if (this.elementType === (<ArrayType>target.declaredType).elementType) return true;
        }
    }

    public isComparableTo(target: AbstractType) {
        return false;
    }

    public isBoolExpression(negation: boolean) {
        return false;
    }

    public getName() {
        return this.elementType.getName() + '[]';
    }
}

export class TypedefType extends AbstractType implements gt.TypedefType {
    referencedType: AbstractType;

    constructor(referencedType: AbstractType) {
        super();
        this.flags = gt.TypeFlags.Typedef;
        this.referencedType = referencedType;
    }

    public isAssignableTo(target: AbstractType) {
        return false;
    }

    public isComparableTo(target: AbstractType) {
        return false;
    }

    public isBoolExpression(negation: boolean) {
        return false;
    }

    public getName() {
        return this.referencedType.getName();
    }
}

function createSymbol(flags: gt.SymbolFlags, name: string): gt.Symbol {
    const symbol = <gt.Symbol>{
        flags: flags,
        escapedName: name,
    };
    return symbol;
}

const unknownType = new UnknownType();
const nullType = new IntrinsicType(gt.TypeFlags.Null | gt.TypeFlags.Nullable, "null");
const boolType = new IntrinsicType(gt.TypeFlags.Boolean, "bool");
const trueType = new IntrinsicType(gt.TypeFlags.Boolean, "true");
const falseType = new IntrinsicType(gt.TypeFlags.Boolean, "false");
const stringType = new IntrinsicType(gt.TypeFlags.String | gt.TypeFlags.Nullable, "string");
const integerType = new IntrinsicType(gt.TypeFlags.Integer, "integer");
const byteType = new IntrinsicType(gt.TypeFlags.Byte, "byte");
const fixedType = new IntrinsicType(gt.TypeFlags.Fixed, "fixed");
const voidType = new IntrinsicType(gt.TypeFlags.Void, "void");

const complexTypes = generateComplexTypes();

function generateComplexTypes() {
    const map = new Map<gt.SyntaxKind, ComplexType>();

    for (let i = gt.SyntaxKindMarker.FirstComplexType; i <= gt.SyntaxKindMarker.LastComplexType; i++) {
        const ckind = <gt.SyntaxKind>(<any>i);
        map.set(ckind, new ComplexType(ckind));
    }

    return map;
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

    private checkTypeAssignableTo(source: gt.Type, target: gt.Type, node: gt.Node) {
        if (!(<AbstractType>source).isAssignableTo(<AbstractType>target)) {
            this.report(node, 'Type \'' + (<AbstractType>source).getName() + '\' is not assignable to type \'' + (<AbstractType>target).getName() + '\'');
        }
    }

    private checkTypeComparableTo(source: gt.Type, target: gt.Type, node: gt.Node) {
        if (!(<AbstractType>source).isComparableTo(<AbstractType>target)) {
            this.report(node, 'Type \'' + (<AbstractType>source).getName() + '\' is not comparable to type \'' + (<AbstractType>target).getName() + '\'');
        }
    }

    private checkTypeBoolExpression(source: gt.Type, negation: boolean, node: gt.Node) {
        if (!(<AbstractType>source).isBoolExpression(negation)) {
            this.report(node, 'Type \'' + (<AbstractType>source).getName() + '\' can not be used as boolean expression');
        }
    }

    private getTypeFromArrayTypeNode(node: gt.ArrayTypeNode): gt.ArrayType {
        const links = this.getNodeLinks(node);
        if (!links.resolvedType) {
            links.resolvedType = new ArrayType(<AbstractType>this.getTypeFromTypeNode(node.elementType));
        }
        return <ArrayType>links.resolvedType;
    }

    private getTypeFromMappedTypeNode(node: gt.MappedTypeNode): ReferenceType {
        const links = this.getNodeLinks(node);
        if (!links.resolvedType) {
            links.resolvedType = new ReferenceType(
                <ReferenceKind>node.returnType.kind,
                node.typeArguments.length ? <AbstractType>this.getTypeFromTypeNode(node.typeArguments[0]) : unknownType
            );
        }
        return <ReferenceType>links.resolvedType;
    }

    private resolveMappedReference(type: gt.Type) {
        if (type.flags & gt.TypeFlags.Reference) {
            type = (<ReferenceType>type).declaredType;
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

    private getDeclaredTypeOfStruct(symbol: gt.Symbol) {
        // TODO: persist in map<symbol,type>
        return new StructType(symbol);
    }

    private getTypeOfFunction(symbol: gt.Symbol) {
        const fnDecl = <gt.FunctionDeclaration>symbol.declarations[0];
        const signature = new SignatureMeta(
            <AbstractType>this.getTypeFromTypeNode(fnDecl.type),
            fnDecl.parameters.map((param) => {
                return <AbstractType>this.getTypeFromTypeNode(param.type);
            })
        );

        // TODO: persist in map<symbol,type>
        return new FunctionType(symbol, signature);
    }

    private getTypeOfTypedef(symbol: gt.Symbol): gt.Type {
        const refType = this.getTypeFromTypeNode((<gt.TypedefDeclaration>symbol.declarations[0]).type);
        return new TypedefType(<AbstractType>refType);
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
            case gt.SyntaxKind.ByteKeyword:
                return byteType;
            case gt.SyntaxKind.FixedKeyword:
                return fixedType;
            case gt.SyntaxKind.BoolKeyword:
                return boolType;
            case gt.SyntaxKind.VoidKeyword:
                return voidType;
            case gt.SyntaxKind.NullKeyword:
                return nullType;
            // case gt.SyntaxKind.LiteralType:
            //     return getTypeFromLiteralTypeNode(<LiteralTypeNode>node);
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
                if (isComplexTypeKind(node.kind)) {
                    return complexTypes.get(node.kind);
                }
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
            case gt.SyntaxKind.ParameterDeclaration:
                return this.checkParameterDeclaration(<gt.ParameterDeclaration>node);
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
            case gt.SyntaxKind.Identifier:
                return this.checkIdentifier(<gt.Identifier>node);
        }
    }

    private checkFunction(node: gt.FunctionDeclaration) {
        this.checkSourceElement(node.type);

        node.parameters.forEach(this.checkSourceElement.bind(this));

        if (node.body) {
            this.checkSourceElement(node.body);
        }
    }

    private checkParameterDeclaration(node: gt.ParameterDeclaration) {
        this.checkSourceElement(node.type);
        const type = this.getTypeFromTypeNode(node.type);
        if (type instanceof StructType || type instanceof FunctionType) {
            this.report(node.type, 'Can only pass basic types');
        }
    }

    private checkVariableDeclaration(node: gt.VariableDeclaration) {
        this.checkSourceElement(node.type);

        if (node.initializer) {
            const varType = this.getTypeFromTypeNode(node.type);
            const exprType = this.checkExpression(node.initializer);
            this.checkTypeAssignableTo(exprType, varType, node.initializer);
        }
    }

    private checkStructDeclaration(node: gt.StructDeclaration) {
        node.members.forEach(this.checkSourceElement.bind(this));
    }

    private checkIfStatement(node: gt.IfStatement) {
        const exprType = this.checkExpression(node.expression);
        this.checkTypeBoolExpression(exprType, false, node.expression);
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
            const exprType = this.checkExpression(node.condition);
            this.checkTypeBoolExpression(exprType, false, node.condition);
        }
        if (node.incrementor) {
            this.checkExpression(node.incrementor);
        }
        this.checkSourceElement(node.statement);
    }

    private checkWhileStatement(node: gt.WhileStatement) {
        if (node.expression) {
            const exprType = this.checkExpression(node.expression);
            this.checkTypeBoolExpression(exprType, false, node.expression);
        }
        this.checkSourceElement(node.statement);
    }

    private checkBreakOrContinueStatement(node: gt.BreakOrContinueStatement) {
        const loop = <gt.IterationStatement>findAncestor(node, (parent) => {
            switch (parent.kind) {
                case gt.SyntaxKind.ForStatement:
                case gt.SyntaxKind.WhileStatement:
                case gt.SyntaxKind.DoStatement:
                    return true;
            }
            return false;
        });
        if (!loop) {
            this.report(node, `${tokenToString(node.syntaxTokens[0].kind)} statement used outside of loop boundaries`);
        }
    }

    private checkReturnStatement(node: gt.ReturnStatement) {
        const fn = <gt.FunctionDeclaration>findAncestorByKind(node, gt.SyntaxKind.FunctionDeclaration);
        const rtype = this.getTypeFromTypeNode(fn.type);

        if (rtype.flags & gt.TypeFlags.Void && node.expression) {
            this.report(node.expression, 'Unexpected value returned for void function');
        }
        else if (!(rtype.flags & gt.TypeFlags.Void) && !node.expression) {
            this.report(node.expression, 'Expected a return value');
        }

        if (node.expression) {
            const exprType = this.checkExpression(node.expression);
            this.checkTypeAssignableTo(exprType, rtype, node.expression);
        }
    }

    private checkArrayType(node: gt.ArrayTypeNode) {
        this.checkExpression(node.size);
        this.checkSourceElement(node.elementType);
    }

    private checkMappedType(node: gt.MappedTypeNode) {
        if (!isReferenceKeywordKind(node.returnType.kind)) {
            this.report(node.returnType, 'Invalid keyword for reference type provided. Use funcref, arrayref or structref');
        }
        if (node.typeArguments.length !== 1) {
            this.report(node, 'Expected exactly 1 argument');
        }
        node.typeArguments.forEach(this.checkSourceElement.bind(this));

        const type = this.getTypeFromMappedTypeNode(node);
        let invalid = false;
        switch (type.kind) {
            case gt.SyntaxKind.StructrefKeyword:
                invalid = !(type.declaredType.flags & gt.TypeFlags.Struct);
                break;
            case gt.SyntaxKind.FuncrefKeyword:
                invalid = !(type.declaredType.flags & gt.TypeFlags.Function);
                break;
            case gt.SyntaxKind.ArrayrefKeyword:
                invalid = !(type.declaredType.flags & gt.TypeFlags.Array);
                break;
        }
        if (invalid) {
            this.report(node, 'Type \'' + type.declaredType.getName() + '\' cannot be used here.');
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
            case gt.SyntaxKind.NullKeyword:
                return nullType;
            case gt.SyntaxKind.StringLiteral:
            case gt.SyntaxKind.NumericLiteral:
            case gt.SyntaxKind.TrueKeyword:
            case gt.SyntaxKind.FalseKeyword:
                return this.checkLiteralExpression(node);
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

    private checkLiteralExpression(node: gt.Expression): gt.Type {
        switch (node.kind) {
            case gt.SyntaxKind.StringLiteral:
                return new LiteralType(gt.TypeFlags.StringLiteral, node);
            case gt.SyntaxKind.NumericLiteral:
                return new LiteralType(gt.TypeFlags.NumericLiteral, node);
            case gt.SyntaxKind.TrueKeyword:
                return trueType;
            case gt.SyntaxKind.FalseKeyword:
                return falseType;
        }
    }

    private checkBinaryExpression(node: gt.BinaryExpression, checkMode?: CheckMode) {
        const leftType = <AbstractType>this.checkExpression(node.left);
        const rightType = <AbstractType>this.checkExpression(node.right);

        if (isAssignmentOperator(node.operatorToken.kind)) {
            this.checkTypeAssignableTo(rightType, leftType, node.right);
        }
        else if (isComparisonOperator(node.operatorToken.kind)) {
            this.checkTypeComparableTo(rightType, leftType, node.right);
            return boolType;
        }
        else if (node.operatorToken.kind === gt.SyntaxKind.BarBarToken || node.operatorToken.kind === gt.SyntaxKind.AmpersandAmpersandToken) {
            this.checkTypeAssignableTo(leftType, boolType, node.left);
            this.checkTypeAssignableTo(rightType, boolType, node.right);
            return boolType;
        }
        else {
            const valid = leftType.isValidBinaryOperation(node.operatorToken.kind, rightType);
            if (!valid) {
                this.report(node, `Binary '${tokenToString(node.operatorToken.kind)}' operation not supported between '${leftType.getName()}' type and '${rightType.getName()}' type`);
            }
        }

        return leftType;
    }

    private checkParenthesizedExpression(node: gt.ParenthesizedExpression, checkMode?: CheckMode) {
        return this.checkExpression(node.expression);
    }

    private checkPrefixUnaryExpression(node: gt.PrefixUnaryExpression, checkMode?: CheckMode) {
        const type = <AbstractType>this.checkExpression(node.operand);
        if (!type.isValidPrefixOperation(node.operator.kind)) {
            this.report(node, `Prefix '${tokenToString(node.operator.kind)}' operation not supported for '${type.getName()}' type`);
        }
        // if (node.operator.kind === gt.SyntaxKind.ExclamationToken) {
        //     this.checkTypeBoolExpression(type, true, node.operand);
        // }
        return type;
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
        let returnType = leftType;
        let func: gt.FunctionDeclaration;
        if (leftType != unknownType) {
            let fnType: gt.FunctionType = leftType;
            if (fnType.flags & gt.TypeFlags.Reference) {
                fnType = this.resolveMappedReference(fnType);
            }
            if (fnType.flags & gt.TypeFlags.Function) {
                func = <gt.FunctionDeclaration>fnType.symbol.declarations[0];
                if (node.arguments.length !== func.parameters.length) {
                    this.report(node, `expected ${func.parameters.length} arguments, got ${node.arguments.length}`);
                }
                returnType = this.getTypeFromTypeNode(func.type);
            }
            else {
                this.report(node, 'not calllable');
                returnType = unknownType;
            }
        }
        if (func) {
            for (const [key, arg] of node.arguments.entries()) {
                const exprType = this.checkExpression(arg);
                if (func.parameters.length > key) {
                    const expectedType = this.getTypeFromTypeNode(func.parameters[key].type);
                    this.checkTypeAssignableTo(exprType, expectedType, arg)
                }
            }
        }
        return returnType;
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
        let objectType = this.checkNonNullExpression(node.expression);
        const indexType = this.checkExpression(node.argumentExpression);

        if (!(indexType.flags & gt.TypeFlags.Integer) && !(indexType.flags & gt.TypeFlags.NumericLiteral)) {
            this.report(node.argumentExpression, 'Array index require an integer value');
        }

        if (objectType.flags & gt.TypeFlags.Reference) {
            objectType = this.resolveMappedReference(objectType);
        }

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
