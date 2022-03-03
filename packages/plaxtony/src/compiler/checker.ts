import * as util from 'util';
import * as path from 'path';
import URI from 'vscode-uri';
import * as gt from './types';
import { isComplexTypeKind } from '../compiler/utils';
import { isDeclarationKind, forEachChild, isPartOfExpression, isRightSideOfPropertyAccess, findAncestor, createDiagnosticForNode, isAssignmentOperator, isComparisonOperator, isReferenceKeywordKind, findAncestorByKind } from './utils';
import { Store, QualifiedSourceFile } from '../service/store';
import { tokenToString } from './scanner';
import { Printer } from './printer';
import { declareSymbol, unbindSourceFile } from './binder';
import { getLineAndCharacterOfPosition } from '../service/utils';

let nextSymbolId = 1;
let nextNodeId = 1;
const printer = new Printer();

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
}

export abstract class AbstractType implements gt.Type {
    flags: gt.TypeFlags;
    symbol: gt.Symbol;

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
        else if (target instanceof ComplexType) {
            if (this.flags & gt.TypeFlags.String && target.kind === gt.SyntaxKind.HandleKeyword) return true;
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
            (rightType.flags & gt.TypeFlags.Numeric) ||
            (rightType instanceof LiteralType && rightType.value.kind === gt.SyntaxKind.NumericLiteral)
        ) {
            switch (operation) {
                case gt.SyntaxKind.PlusToken:
                case gt.SyntaxKind.MinusToken:
                case gt.SyntaxKind.AsteriskToken:
                case gt.SyntaxKind.PercentToken:
                case gt.SyntaxKind.SlashToken:
                    if (this.flags & gt.TypeFlags.Numeric) {
                        return true;
                    }
                    break;

                case gt.SyntaxKind.AmpersandToken:
                case gt.SyntaxKind.BarToken:
                case gt.SyntaxKind.CaretToken:
                    if ((this.flags & gt.TypeFlags.IntLike) === (rightType.flags & gt.TypeFlags.IntLike)) {
                        return true;
                    }
                    break;

                case gt.SyntaxKind.LessThanLessThanToken:
                case gt.SyntaxKind.GreaterThanGreaterThanToken:
                case gt.SyntaxKind.BarBarToken:
                case gt.SyntaxKind.AmpersandAmpersandToken:
                    if (this.flags & gt.TypeFlags.IntLike) {
                        return true;
                    }
                    break;
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
                if (this.flags & gt.TypeFlags.Integer || this.flags & gt.TypeFlags.Byte || this.flags & gt.TypeFlags.Fixed || this.flags & gt.TypeFlags.Boolean || this.flags & gt.TypeFlags.String) return true;
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

    get extendsHandle() {
        switch (this.kind) {
            case gt.SyntaxKind.AbilcmdKeyword:
            case gt.SyntaxKind.ActorKeyword:
            case gt.SyntaxKind.ActorscopeKeyword:
            case gt.SyntaxKind.AifilterKeyword:
            case gt.SyntaxKind.BankKeyword:
            case gt.SyntaxKind.BitmaskKeyword:
            case gt.SyntaxKind.CamerainfoKeyword:
            case gt.SyntaxKind.DatetimeKeyword:
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

    public isAssignableTo(target: AbstractType): boolean {
        if (this === target) return true;

        if (target instanceof ComplexType) {
            if (target.kind === gt.SyntaxKind.HandleKeyword) return this.extendsHandle;
            if (this.kind === gt.SyntaxKind.HandleKeyword) return target.extendsHandle;
        }
        else {
            if (this.kind === gt.SyntaxKind.HandleKeyword && target.flags & gt.TypeFlags.String) return true;
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

    public toString() {
        const params = [];
        for (const p of this.args) {
            params.push(p.getName());
        }
        return `${this.returnType.getName()} (${params.join(',')})`;
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
            if (!(target.declaredType.flags & gt.TypeFlags.Function)) return false;
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
    declaredType: AbstractType;

    constructor(kind: ReferenceKind, declaredType: AbstractType) {
        super();
        this.flags = gt.TypeFlags.Reference;
        this.kind = kind;
        this.declaredType = declaredType;
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

    public isAssignableTo(target: AbstractType): boolean {
        if (target instanceof ReferenceType && target.kind === gt.SyntaxKind.ArrayrefKeyword) {
            // multi-dimensional array
            if (this.elementType instanceof ArrayType) {
                return this.getName() === target.declaredType.getName();
            }
            // intrinsic type / whatever else
            if (this.elementType === (<ArrayType>target.declaredType).elementType) return true;
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

export class TypeChecker {
    private store: Store;
    private nodeLinks: gt.NodeLinks[] = [];
    private diagnostics = new Map<string, gt.Diagnostic[]>();
    private currentSymbolContainer: gt.Symbol = null;
    private currentSymbolReferences = new Map<gt.Symbol, Set<gt.Identifier>>();
    private currentDocuments = new Map<string, gt.SourceFile>();

    constructor(store: Store) {
        this.store = store;
        this.currentDocuments = this.store.documents;
    }

    private report(location: gt.Node, msg: string, category: gt.DiagnosticCategory = gt.DiagnosticCategory.Error): void {
        const d = createDiagnosticForNode(location, category, msg);
        const c = this.diagnostics.get(d.file.fileName);
        if (c) c.push(d);
    }

    private getNodeLinks(node: gt.Node): gt.NodeLinks {
        const nodeId = getNodeId(node);
        return this.nodeLinks[nodeId] || (this.nodeLinks[nodeId] = { flags: 0 });
    }

    private checkTypeAssignableTo(source: AbstractType, target: AbstractType, node: gt.Node) {
        // TODO: error when using local var as reference
        if (source === unknownType || target === unknownType) return;
        if (!source.isAssignableTo(target)) {
            this.report(node, 'Type \'' + source.getName() + '\' is not assignable to type \'' + target.getName() + '\'');
        }
    }

    private checkTypeComparableTo(source: AbstractType, target: AbstractType, node: gt.Node) {
        if (source === unknownType || target === unknownType) return;
        if (!source.isComparableTo(target)) {
            this.report(node, 'Type \'' + source.getName() + '\' is not comparable to type \'' + target.getName() + '\'');
        }
    }

    private checkTypeBoolExpression(source: AbstractType, negation: boolean, node: gt.Node) {
        if (source === unknownType) return;
        if (!source.isBoolExpression(negation)) {
            this.report(node, 'Type \'' + source.getName() + '\' can not be used as boolean expression');
        }
    }

    private getTypeFromArrayTypeNode(node: gt.ArrayTypeNode): ArrayType {
        const links = this.getNodeLinks(node);
        if (!links.resolvedType) {
            links.resolvedType = new ArrayType(this.getTypeFromTypeNode(node.elementType));
        }
        return <ArrayType>links.resolvedType;
    }

    private getTypeFromMappedTypeNode(node: gt.MappedTypeNode): ReferenceType {
        const links = this.getNodeLinks(node);
        if (!links.resolvedType) {
            links.resolvedType = new ReferenceType(
                <ReferenceKind>node.returnType.kind,
                node.typeArguments.length ? this.getTypeFromTypeNode(node.typeArguments[0]) : unknownType
            );
        }
        return <ReferenceType>links.resolvedType;
    }

    private resolveMappedReference(type: AbstractType) {
        if (type.flags & gt.TypeFlags.Reference) {
            type = (<ReferenceType>type).declaredType;
        }
        return type;
    }

    private getPropertyOfType(type: AbstractType, name: string): gt.Symbol | undefined {
        if (type && type.flags & gt.TypeFlags.Struct) {
            if (type.symbol.members.has(name)) {
                return type.symbol.members.get(name);
            }
        }
    }

    private getDeclaredTypeOfStruct(symbol: gt.Symbol) {
        // TODO: persist in map<symbol,type>
        return new StructType(symbol);
    }

    public getSignatureOfFunction(fnDecl: gt.FunctionDeclaration) {
        return new SignatureMeta(
            this.getTypeFromTypeNode(fnDecl.type),
            fnDecl.parameters.map((param) => {
                return this.getTypeFromTypeNode(param.type);
            })
        );
    }

    private getTypeOfFunction(symbol: gt.Symbol) {
        const fnDecl = <gt.FunctionDeclaration>symbol.declarations[0];
        // TODO: persist in map<symbol,type>
        return new FunctionType(symbol, this.getSignatureOfFunction(fnDecl));
    }

    private getTypeOfTypedef(symbol: gt.Symbol): AbstractType {
        const refType = this.getTypeFromTypeNode((<gt.TypedefDeclaration>symbol.declarations[0]).type);
        return new TypedefType(refType);
    }

    private getDeclaredTypeOfSymbol(symbol: gt.Symbol): AbstractType {
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

    private getTypeFromTypeNode(node: gt.TypeNode): AbstractType {
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

    private getTypeOfSymbol(symbol: gt.Symbol): AbstractType {
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

    private getTypeOfVariableOrParameterOrProperty(symbol: gt.Symbol): AbstractType {
        return this.getTypeFromTypeNode((<gt.VariableDeclaration>symbol.declarations[0]).type);
    }

    public getTypeOfNode(node: gt.Node, followRef: boolean = false): AbstractType {
        // TODO:
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

    private getRegularTypeOfExpression(expr: gt.Expression): AbstractType {
        return this.getTypeOfExpression(expr);
    }

    private getTypeOfExpression(node: gt.Expression, cache?: boolean): AbstractType {
        return this.checkExpression(node);
    }

    private clear() {
        this.diagnostics.clear();
        this.currentSymbolReferences.clear();
    }

    public checkSourceFile(sourceFile: gt.SourceFile, bindSymbols = false) {
        this.clear();
        this.diagnostics.set(sourceFile.fileName, []);
        this.currentDocuments = this.store.documents;
        if (bindSymbols) {
            this.currentSymbolContainer = declareSymbol(sourceFile, {resolveGlobalSymbol: this.resolveGlobalSymbol.bind(this)}, null);
        }
        sourceFile.statements.forEach(this.checkSourceElement.bind(this));
        return Array.from(this.diagnostics.values()).pop();
    }

    protected checkSourceFileRecursivelyWorker(sourceFile: gt.SourceFile) {
        unbindSourceFile(sourceFile, {resolveGlobalSymbol: this.resolveGlobalSymbol.bind(this)});
        this.currentSymbolContainer = declareSymbol(sourceFile, {resolveGlobalSymbol: this.resolveGlobalSymbol.bind(this)}, null);
        this.diagnostics.set(sourceFile.fileName, []);
        this.currentDocuments.set(sourceFile.fileName, sourceFile);

        for (const statement of sourceFile.statements) {
            if (statement.kind === gt.SyntaxKind.IncludeStatement) {
                const qsFile = this.checkIncludeStatement(<gt.IncludeStatement>statement);
                if (qsFile && !this.currentDocuments.has(qsFile.fileName)) {
                    const currentSymbolContainer = this.currentSymbolContainer;
                    this.checkSourceFileRecursivelyWorker(qsFile);
                    this.currentSymbolContainer = currentSymbolContainer;
                }
                continue;
            }
            this.checkSourceElement(statement);
        }
    }

    public checkSourceFileRecursively(sourceFile: gt.SourceFile) {
        this.clear();
        this.currentDocuments = new Map<string, gt.SourceFile>();

        if (this.store.s2workspace) {
            const coreMod = this.store.s2workspace.allArchives.find((archive) => archive.name === 'mods/core.sc2mod');
            if (coreMod) {
                const fsp = path.join(coreMod.directory, 'base.sc2data', 'TriggerLibs', 'natives_missing.galaxy');
                const smNatives = this.store.documents.get(URI.file(fsp).toString());
                if (smNatives) {
                    this.checkSourceFileRecursivelyWorker(smNatives);
                }
            }
        }

        this.checkSourceFileRecursivelyWorker(sourceFile);
        this.checkSymbolDefinitions();

        return {
            success: Array.from(this.diagnostics.values()).findIndex((value, index) => value.length > 0) === -1,
            diagnostics: this.diagnostics,
            sourceFiles: <Map<string, QualifiedSourceFile>>this.currentDocuments,
        };
    }

    private checkSymbolDefinitions() {
        for (const [symbol, symRef] of this.currentSymbolReferences) {
            if ((symbol.flags & gt.SymbolFlags.Function)) {
                if ((symbol.flags & gt.SymbolFlags.Native)) continue;
                if (!symRef.size) continue;
                if (symbol.valueDeclaration) continue;

                for (const identifier of symRef) {
                    this.report(identifier, `Referenced function '${identifier.name}' hasn't been defined.`);
                }
            }
        }
    }

    private checkSourceElement(node: gt.Node) {
        let prevSymbolContainer = null;
        if (this.currentSymbolContainer && isDeclarationKind(node.kind)) {
            prevSymbolContainer = this.currentSymbolContainer;
            this.currentSymbolContainer = declareSymbol(node, {resolveGlobalSymbol: this.resolveGlobalSymbol.bind(this)}, prevSymbolContainer);
            if (this.currentSymbolContainer.declarations.length > 1) {
                let previousDeclaration: gt.Declaration;
                if (node.kind === gt.SyntaxKind.FunctionDeclaration) {
                    for (const pd of this.currentSymbolContainer.declarations) {
                        if (pd === node) continue;
                        if (pd.kind === gt.SyntaxKind.FunctionDeclaration && (
                            !(<gt.FunctionDeclaration>pd).body || !(<gt.FunctionDeclaration>node).body
                        )) {
                            continue;
                        }
                        previousDeclaration = pd;
                        break;
                    }
                }
                else if (node.kind === gt.SyntaxKind.ParameterDeclaration) {
                    for (const pd of this.currentSymbolContainer.declarations) {
                        if (pd === node) continue;
                        if (pd.parent !== node.parent) continue;
                        previousDeclaration = pd;
                        break;
                    }
                }
                else {
                    previousDeclaration = this.currentSymbolContainer.declarations[this.currentSymbolContainer.declarations.length - 2];
                }

                if (previousDeclaration) {
                    const prevSourceFile = <gt.SourceFile>findAncestorByKind(previousDeclaration, gt.SyntaxKind.SourceFile);
                    const prevPos = getLineAndCharacterOfPosition(prevSourceFile, previousDeclaration.pos);
                    this.report((<gt.NamedDeclaration>node).name, `Symbol redeclared, previous declaration in ${prevSourceFile.fileName}:${prevPos.line + 1},${prevPos.character + 1}`);
                }
            }
        }

        switch (node.kind) {
            case gt.SyntaxKind.IncludeStatement:
                this.checkIncludeStatement(<gt.IncludeStatement>node);
                break;
            case gt.SyntaxKind.TypedefDeclaration:
                this.checkTypedefDeclaration(<gt.TypedefDeclaration>node);
                break;
            case gt.SyntaxKind.Block:
                this.checkBlock(<gt.Block>node);
                break;
            case gt.SyntaxKind.FunctionDeclaration:
                this.checkFunction(<gt.FunctionDeclaration>node);
                break;
            case gt.SyntaxKind.VariableDeclaration:
            case gt.SyntaxKind.PropertyDeclaration:
                this.checkVariableDeclaration(<gt.VariableDeclaration>node);
                break;
            case gt.SyntaxKind.ParameterDeclaration:
                this.checkParameterDeclaration(<gt.ParameterDeclaration>node);
                break;
            case gt.SyntaxKind.StructDeclaration:
                this.checkStructDeclaration(<gt.StructDeclaration>node);
                break;
            case gt.SyntaxKind.ExpressionStatement:
                this.checkExpressionStatement(<gt.ExpressionStatement>node);
                break;
            case gt.SyntaxKind.IfStatement:
                this.checkIfStatement(<gt.IfStatement>node);
                break;
            case gt.SyntaxKind.ForStatement:
                this.checkForStatement(<gt.ForStatement>node);
                break;
            case gt.SyntaxKind.WhileStatement:
            case gt.SyntaxKind.DoStatement:
                this.checkWhileStatement(<gt.WhileStatement>node);
                break;
            case gt.SyntaxKind.BreakStatement:
            case gt.SyntaxKind.ContinueStatement:
                this.checkBreakOrContinueStatement(<gt.BreakOrContinueStatement>node);
                break;
            case gt.SyntaxKind.ReturnStatement:
                this.checkReturnStatement(<gt.ReturnStatement>node);
                break;
        }

        if (prevSymbolContainer) {
            this.currentSymbolContainer = prevSymbolContainer;
        }
    }

    private checkIncludeStatement(node: gt.IncludeStatement) {
        let path = node.path.value.toLowerCase();
        let segments = path.split('.');
        if (segments.length > 1 && segments[segments.length - 1] !== 'galaxy') {
            this.report(node.path, `Dot in a script name is not allowed, unless path ends with ".galaxy"`, gt.DiagnosticCategory.Warning);
        }
        else {
            path = path.replace(/\.galaxy$/, '');
        }
        const qsMap = this.store.qualifiedDocuments.get(path);
        if (!qsMap) {
            this.report(node.path, `Given filename couldn't be matched`);
            return;
        }

        const qsFile = Array.from(qsMap.values())[0];
        const currCourceFile = <gt.SourceFile>findAncestorByKind(node, gt.SyntaxKind.SourceFile);
        if (currCourceFile === qsFile) {
            this.report(node, `Self-include`, gt.DiagnosticCategory.Warning);
            return;
        }

        return qsFile;
    }

    private checkTypedefDeclaration(node: gt.TypedefDeclaration) {
        this.checkDeclarationType(node.type);
        this.checkIdentifier(node.name);
    }

    private checkDeclarationType(node: gt.TypeNode) {
        switch (node.kind) {
            case gt.SyntaxKind.MappedType:
                return this.checkMappedType(<gt.MappedTypeNode>node);
            case gt.SyntaxKind.ArrayType:
                return this.checkArrayType(<gt.ArrayTypeNode>node);
            case gt.SyntaxKind.Identifier:
                return this.checkIdentifier(<gt.Identifier>node, false, false);
        }
    }

    private checkFunction(node: gt.FunctionDeclaration) {
        this.checkDeclarationType(node.type);

        const currentSignature = this.getSignatureOfFunction(node);
        for (const prevDecl of node.symbol.declarations) {
            if (node === prevDecl) continue;
            if (prevDecl.kind !== gt.SyntaxKind.FunctionDeclaration) break;
            const previousSignature = this.getSignatureOfFunction(<gt.FunctionDeclaration>prevDecl);
            if (!currentSignature.match(previousSignature)) {
                this.report(node, `Function signature doesn't match it's previous declaration '${previousSignature.toString()}'`);
                break;
            }
        }

        node.parameters.forEach(this.checkSourceElement.bind(this));

        if (node.body && node.body.kind === gt.SyntaxKind.Block) {
            const rtype = this.getTypeFromTypeNode(node.type);
            this.checkBlock(node.body)

            if (!(rtype.flags & gt.TypeFlags.Void) && !node.body.hasReturn) {
                this.report(node.name, 'Expected return statement');
            }
        }
    }

    private checkParameterDeclaration(node: gt.ParameterDeclaration) {
        this.checkDeclarationType(node.type);

        const globalSym = this.resolveName(null, node.name.name);
        if (globalSym && (globalSym.flags & gt.SymbolFlags.Function)) {
            this.report(node, `Name clash with '${node.name}' function.`);
        }

        const type = this.getTypeFromTypeNode(node.type);
        if (type instanceof StructType || type instanceof FunctionType) {
            this.report(node.type, 'Can only pass basic types');
        }
    }

    private checkVariableDeclaration(node: gt.VariableDeclaration) {
        const declType = this.checkDeclarationType(node.type);
        this.checkIdentifier(node.name, true);

        if (node.initializer) {
            const varType = this.getTypeFromTypeNode(node.type);
            const exprType = this.checkExpression(node.initializer);
            this.checkTypeAssignableTo(exprType, varType, node.initializer);
        }

        const isConstant = node.modifiers?.some((value) => value.kind === gt.SyntaxKind.ConstKeyword);
        if (isConstant && declType instanceof TypedefType) {
            this.report(node.type, `Constant variables cannot reference Typedefs`);
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
            node.hasReturn = (<gt.Block>node.thenStatement).hasReturn && (<gt.Block>node.elseStatement).hasReturn;
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
            this.report(node, 'Unexpected value returned for void function');
        }
        else if (!(rtype.flags & gt.TypeFlags.Void) && !node.expression) {
            this.report(node, 'Expected a return value');
        }

        if (node.expression) {
            const exprType = this.checkExpression(node.expression);
            this.checkTypeAssignableTo(exprType, rtype, node.expression);
        }
    }

    private checkArrayType(node: gt.ArrayTypeNode) {
        this.checkExpression(node.size);
        this.checkDeclarationType(node.elementType);
    }

    private checkMappedType(node: gt.MappedTypeNode) {
        if (!isReferenceKeywordKind(node.returnType.kind)) {
            this.report(node.returnType, 'Invalid keyword for reference type provided - use funcref, arrayref or structref');
        }
        else {
            switch (node.returnType.kind) {
                case gt.SyntaxKind.StructrefKeyword:
                case gt.SyntaxKind.ArrayrefKeyword:
                {
                    let invalid = false;
                    switch (node.parent.kind) {
                        case gt.SyntaxKind.PropertyDeclaration:
                            invalid = true;
                            break;

                        case gt.SyntaxKind.FunctionDeclaration:
                            if ((<gt.FunctionDeclaration>node.parent).type === node) {
                                invalid = true;
                            }
                            break;

                        case gt.SyntaxKind.VariableDeclaration:
                            if (node.parent.parent.kind === gt.SyntaxKind.SourceFile) {
                                invalid = true;
                            }
                            break;
                    }
                    if (invalid) {
                        this.report(node, 'Can not use arrayref/structref as a global, a field, or a return value (only as a local or a parameter).');
                    }
                    break;
                }
            }
        }

        if (node.typeArguments.length !== 1) {
            this.report(node, 'Expected exactly 1 argument');
        }
        node.typeArguments.forEach(this.checkDeclarationType.bind(this));

        if (node.typeArguments.length > 0) {
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
                this.report(node, 'Type \'' + type.declaredType.getName() + '\' is not a valid reference for \'' + tokenToString(node.returnType.kind) + '\'');
            }
        }
    }

    private checkBlock(node: gt.Block) {
        let returnFound = false;
        let returnFoundExplict = false;
        node.statements.forEach((child) => {
            this.checkSourceElement(child);

            switch (child.kind) {
                case gt.SyntaxKind.ReturnStatement:
                    returnFoundExplict = returnFound = true;
                    break;

                case gt.SyntaxKind.IfStatement:
                    // if (returnFoundExplict === true) break;
                    returnFound = (<gt.IfStatement>child).hasReturn;
                    break;
            }
        });
        node.hasReturn = returnFound;
    }

    private checkExpressionStatement(node: gt.ExpressionStatement) {
        this.checkExpression(node.expression);
    }

    private checkExpression(node: gt.Expression, checkMode?: CheckMode): AbstractType {
        return this.checkExpressionWorker(<gt.Expression>node, checkMode);
    }

    private checkExpressionWorker(node: gt.Expression, checkMode: CheckMode): AbstractType {
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
        }
        return unknownType;
    }

    private checkLiteralExpression(node: gt.Expression): AbstractType {
        switch (node.kind) {
            case gt.SyntaxKind.StringLiteral:
                return new LiteralType(gt.TypeFlags.StringLiteral | gt.TypeFlags.String | gt.TypeFlags.Nullable, node);
            case gt.SyntaxKind.NumericLiteral:
                if ((<gt.NumericLiteral>node).text.indexOf('.') !== -1) {
                    return new LiteralType(gt.TypeFlags.NumericLiteral | gt.TypeFlags.Fixed, node);
                }
                else {
                    return new LiteralType(gt.TypeFlags.NumericLiteral | gt.TypeFlags.Integer, node);
                }
            case gt.SyntaxKind.TrueKeyword:
                return trueType;
            case gt.SyntaxKind.FalseKeyword:
                return falseType;
        }
    }

    private checkBinaryExpression(node: gt.BinaryExpression, checkMode?: CheckMode) {
        const leftType = this.checkExpression(node.left);
        const rightType = this.checkExpression(node.right);

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

            switch (node.operatorToken.kind) {
                case gt.SyntaxKind.PlusToken:
                case gt.SyntaxKind.MinusToken:
                case gt.SyntaxKind.AsteriskToken:
                case gt.SyntaxKind.PercentToken:
                case gt.SyntaxKind.SlashToken:
                    if (leftType.flags & gt.TypeFlags.Integer || rightType.flags & gt.TypeFlags.Integer) {
                        return integerType;
                    }
                    break;

                case gt.SyntaxKind.AmpersandToken:
                case gt.SyntaxKind.BarToken:
                case gt.SyntaxKind.CaretToken:
                    break;

                case gt.SyntaxKind.LessThanLessThanToken:
                case gt.SyntaxKind.GreaterThanGreaterThanToken:
                    break;
            }
        }

        return leftType;
    }

    private checkParenthesizedExpression(node: gt.ParenthesizedExpression, checkMode?: CheckMode) {
        return this.checkExpression(node.expression);
    }

    private checkPrefixUnaryExpression(node: gt.PrefixUnaryExpression, checkMode?: CheckMode) {
        const type = this.checkExpression(node.operand);
        if (!type.isValidPrefixOperation(node.operator.kind)) {
            this.report(node, `Prefix '${tokenToString(node.operator.kind)}' operation not supported for '${type.getName()}' type`);
        }
        return type;
    }

    private checkPostfixUnaryExpression(node: gt.PostfixUnaryExpression, checkMode?: CheckMode) {
        return this.checkExpression(node.operand);
    }

    private checkIdentifier(node: gt.Identifier, checkSymbol = false, definitionReferenced = true): AbstractType {
        const symbol = this.getSymbolOfEntityNameOrPropertyAccessExpression(node);
        if (!symbol) {
            this.report(node, `Undeclared symbol: '${node.name}'`);
            return unknownType;
        }

        if (definitionReferenced) {
            let symRef = this.currentSymbolReferences.get(symbol);
            if (!symRef) {
                symRef = new Set();
                this.currentSymbolReferences.set(symbol, symRef);
            }
            symRef.add(node);
        }

        if (checkSymbol && (symbol.flags & gt.SymbolFlags.FunctionScopedVariable)) {
            const globalSym = this.resolveName(null, node.name);
            if (globalSym && (globalSym.flags & gt.SymbolFlags.Function)) {
                this.report(node, `Name clash for '${node.name}'. Name already in use in global scope.`);
            }
        }
        if ((symbol.flags & gt.SymbolFlags.Static)) {
            const sourceFile = <gt.SourceFile>findAncestorByKind(node, gt.SyntaxKind.SourceFile);
            if (symbol.parent && symbol.parent.declarations[0] !== sourceFile) {
                this.report(node, `Attempting to reference symbol with static modifier outside the scope of its definition.`);
            }
        }
        return this.getTypeOfSymbol(symbol);
    }

    private checkCallExpression(node: gt.CallExpression): AbstractType {
        const leftType = this.checkExpression(node.expression);
        let returnType = leftType;
        let func: gt.FunctionDeclaration;
        if (leftType != unknownType) {
            let fnType = <FunctionType>leftType;
            if (fnType.flags & gt.TypeFlags.Reference) {
                fnType = <FunctionType>this.resolveMappedReference(fnType);
            }
            if (fnType.flags & gt.TypeFlags.Function) {
                func = <gt.FunctionDeclaration>fnType.symbol.declarations[0];
                if (node.arguments.length !== func.parameters.length) {
                    this.report(node, `Expected ${func.parameters.length} arguments, got ${node.arguments.length}`);
                }
                returnType = this.getTypeFromTypeNode(func.type);
            }
            else {
                this.report(node, `Type '${fnType.getName()}' is not calllable`);
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

    private checkIndexedAccess(node: gt.ElementAccessExpression): AbstractType {
        let objectType = this.checkExpression(node.expression);
        const indexType = this.checkExpression(node.argumentExpression);

        if (!(indexType.flags & gt.TypeFlags.Integer) && !(indexType.flags & gt.TypeFlags.NumericLiteral)) {
            this.report(node.argumentExpression, 'Array index require an integer value');
        }

        if (objectType.flags & gt.TypeFlags.Reference) {
            objectType = this.resolveMappedReference(objectType);
        }

        if (objectType.flags & gt.TypeFlags.Array) {
            return (<ArrayType>objectType).elementType;
        }
        else {
            this.report(node, 'Index access on non-array type');
        }

        return unknownType;
    }

    private checkPropertyAccessExpression(node: gt.PropertyAccessExpression): AbstractType {
        let type = this.checkExpression(node.expression);

        type = this.resolveMappedReference(type);
        if (!(type.flags & gt.TypeFlags.Struct)) {
            this.report(node.name, 'Cannot access property on \'' + type.getName() + '\' type');
        }
        else {
            const prop = this.getPropertyOfType(type, node.name.name);
            if (prop) {
                this.getNodeLinks(node).resolvedSymbol = prop;
                const propType = this.getTypeOfSymbol(prop);
                return propType;
            }
            else {
                this.report(node.name, 'Undeclared property');
            }
        }

        return unknownType;
    }

    private resolveName(location: gt.Node | undefined, name: string): gt.Symbol | undefined {
        if (location) {
            const currentContext = <gt.NamedDeclaration>findAncestor(location, (element: gt.Node): boolean => {
                return element.kind === gt.SyntaxKind.FunctionDeclaration || element.kind === gt.SyntaxKind.StructDeclaration;
            })
            if (currentContext && currentContext.symbol.members.has(name)) {
                return currentContext.symbol.members.get(name);
            }

            const sourceFile = <gt.SourceFile>findAncestorByKind(location, gt.SyntaxKind.SourceFile)
            if (sourceFile.symbol.members.has(name)) {
                return sourceFile.symbol.members.get(name);
            }
        }

        return this.resolveGlobalSymbol(name);
    }

    private resolveGlobalSymbol(name: string) {
        for (const document of this.currentDocuments.values()) {
            const symbol = document.symbol.members.get(name);
            if (symbol) {
                return symbol;
            }
        }

        return undefined;
    }

    private resolveEntityName(entityName: gt.EntityNameExpression, meaning: gt.SymbolFlags, ignoreErrors?: boolean, location?: gt.Node): gt.Symbol | undefined {
        let symbol: gt.Symbol;
        if (entityName.kind === gt.SyntaxKind.Identifier) {
            symbol = this.resolveName(location || entityName, entityName.name);
            if (!symbol) {
                return undefined;
            }
        }
        return symbol;
    }

    private getSymbolOfEntityNameOrPropertyAccessExpression(entityName: gt.Identifier | gt.PropertyAccessExpression): gt.Symbol | undefined {
        if (isRightSideOfPropertyAccess(entityName)) {
            entityName = <gt.PropertyAccessExpression>entityName.parent;
        }

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

    public getSymbolAtLocation(node: gt.Node): gt.Symbol | undefined {
        switch (node.kind) {
            case gt.SyntaxKind.Identifier:
            case gt.SyntaxKind.PropertyAccessExpression:
                return this.getSymbolOfEntityNameOrPropertyAccessExpression(<gt.Identifier | gt.PropertyAccessExpression>node);
        }
    }
}
