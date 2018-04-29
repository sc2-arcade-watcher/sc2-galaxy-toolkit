import * as gt from './types';
import { Store } from '../service/store';
export declare function getNodeId(node: gt.Node): number;
export declare function getSymbolId(symbol: gt.Symbol): number;
export declare abstract class AbstractType implements gt.Type {
    flags: gt.TypeFlags;
    symbol: gt.Symbol;
    abstract isAssignableTo(target: AbstractType): boolean;
    abstract isComparableTo(target: AbstractType): boolean;
    abstract isBoolExpression(negation: boolean): boolean;
    isValidBinaryOperation(operation: gt.BinaryOperator, rightType: AbstractType): boolean;
    isValidPrefixOperation(operation: gt.PrefixUnaryOperator): boolean;
    isValidPostfixOperation(operation: gt.PostfixUnaryOperator): boolean;
    getName(): string;
}
export declare class UnknownType extends AbstractType {
    flags: gt.TypeFlags;
    isAssignableTo(target: AbstractType): boolean;
    isComparableTo(target: AbstractType): boolean;
    isBoolExpression(negation: boolean): boolean;
}
export declare class IntrinsicType extends AbstractType {
    readonly name: string;
    constructor(flags: gt.TypeFlags, name: string);
    isAssignableTo(target: AbstractType): boolean;
    isComparableTo(target: AbstractType): boolean;
    isBoolExpression(negation: boolean): boolean;
    isValidBinaryOperation(operation: gt.BinaryOperator, rightType: AbstractType): boolean;
    isValidPrefixOperation(operation: gt.PrefixUnaryOperator): boolean;
    isValidPostfixOperation(operation: gt.PostfixUnaryOperator): boolean;
    getName(): string;
}
export declare class ComplexType extends AbstractType implements gt.ComplexType {
    kind: gt.SyntaxKind;
    constructor(kind: gt.SyntaxKind);
    readonly extendsHandle: boolean;
    isAssignableTo(target: AbstractType): boolean;
    isComparableTo(target: AbstractType): boolean;
    isBoolExpression(negation: boolean): boolean;
    isValidBinaryOperation(operation: gt.BinaryOperator, rightType: AbstractType): boolean;
    isValidPrefixOperation(operation: gt.PrefixUnaryOperator): boolean;
    getName(): string;
}
export declare class LiteralType extends AbstractType {
    value: gt.Literal;
    constructor(flags: gt.TypeFlags, value: gt.Literal);
    isAssignableTo(target: AbstractType): boolean;
    isComparableTo(target: AbstractType): boolean;
    isBoolExpression(negation: boolean): boolean;
    isValidBinaryOperation(operation: gt.BinaryOperator, rightType: AbstractType): boolean;
    isValidPrefixOperation(operation: gt.PrefixUnaryOperator): boolean;
    getName(): string;
}
export declare class StructType extends AbstractType implements gt.StructType {
    symbol: gt.Symbol;
    constructor(symbol: gt.Symbol);
    isAssignableTo(target: AbstractType): boolean;
    isComparableTo(target: AbstractType): boolean;
    isBoolExpression(negation: boolean): boolean;
    getName(): string;
}
export declare class SignatureMeta {
    returnType: AbstractType;
    args: AbstractType[];
    constructor(returnType: AbstractType, args: AbstractType[]);
    match(other: SignatureMeta): boolean;
    toString(): string;
}
export declare class FunctionType extends AbstractType implements gt.FunctionType {
    symbol: gt.Symbol;
    signature: SignatureMeta;
    constructor(symbol: gt.Symbol, signature: SignatureMeta);
    isAssignableTo(target: AbstractType): boolean;
    isComparableTo(target: AbstractType): boolean;
    isBoolExpression(negation: boolean): boolean;
    getName(): string;
}
export declare type ReferenceKind = gt.SyntaxKind.FuncrefKeyword | gt.SyntaxKind.StructrefKeyword | gt.SyntaxKind.ArrayrefKeyword;
export declare class ReferenceType extends AbstractType {
    kind: ReferenceKind;
    declaredType: AbstractType;
    constructor(kind: ReferenceKind, declaredType: AbstractType);
    isAssignableTo(target: AbstractType): boolean;
    isComparableTo(target: AbstractType): boolean;
    isBoolExpression(negation: boolean): boolean;
    getName(): string;
}
export declare class ArrayType extends AbstractType implements gt.ArrayType {
    elementType: AbstractType;
    constructor(elementType: AbstractType);
    isAssignableTo(target: AbstractType): boolean;
    isComparableTo(target: AbstractType): boolean;
    isBoolExpression(negation: boolean): boolean;
    getName(): string;
}
export declare class TypedefType extends AbstractType implements gt.TypedefType {
    referencedType: AbstractType;
    constructor(referencedType: AbstractType);
    isAssignableTo(target: AbstractType): boolean;
    isComparableTo(target: AbstractType): boolean;
    isBoolExpression(negation: boolean): boolean;
    getName(): string;
}
export declare class TypeChecker {
    private store;
    private nodeLinks;
    private diagnostics;
    private currentSymbolContainer;
    constructor(store: Store);
    private report(location, msg, category?);
    private getNodeLinks(node);
    private checkTypeAssignableTo(source, target, node);
    private checkTypeComparableTo(source, target, node);
    private checkTypeBoolExpression(source, negation, node);
    private getTypeFromArrayTypeNode(node);
    private getTypeFromMappedTypeNode(node);
    private resolveMappedReference(type);
    private getPropertyOfType(type, name);
    private getDeclaredTypeOfStruct(symbol);
    getSignatureOfFunction(fnDecl: gt.FunctionDeclaration): SignatureMeta;
    private getTypeOfFunction(symbol);
    private getTypeOfTypedef(symbol);
    private getDeclaredTypeOfSymbol(symbol);
    private getTypeFromTypeNode(node);
    private getTypeOfSymbol(symbol);
    private getTypeOfVariableOrParameterOrProperty(symbol);
    getTypeOfNode(node: gt.Node, followRef?: boolean): AbstractType;
    private getRegularTypeOfExpression(expr);
    private getTypeOfExpression(node, cache?);
    checkSourceFile(sourceFile: gt.SourceFile, bindSymbols?: boolean): gt.Diagnostic[];
    private checkSourceElement(node);
    private checkFunction(node);
    private checkParameterDeclaration(node);
    private checkVariableDeclaration(node);
    private checkStructDeclaration(node);
    private checkIfStatement(node);
    private checkForStatement(node);
    private checkWhileStatement(node);
    private checkBreakOrContinueStatement(node);
    private checkReturnStatement(node);
    private checkArrayType(node);
    private checkMappedType(node);
    private checkBlock(node);
    private checkExpressionStatement(node);
    private checkExpression(node, checkMode?);
    private checkExpressionWorker(node, checkMode);
    private checkLiteralExpression(node);
    private checkBinaryExpression(node, checkMode?);
    private checkParenthesizedExpression(node, checkMode?);
    private checkPrefixUnaryExpression(node, checkMode?);
    private checkPostfixUnaryExpression(node, checkMode?);
    private checkIdentifier(node);
    private checkCallExpression(node);
    private checkIndexedAccess(node);
    private checkPropertyAccessExpression(node);
    private resolveName(location, name);
    private resolveEntityName(entityName, meaning, ignoreErrors?, location?);
    private getSymbolOfEntityNameOrPropertyAccessExpression(entityName);
    getSymbolAtLocation(node: gt.Node): gt.Symbol | undefined;
}
