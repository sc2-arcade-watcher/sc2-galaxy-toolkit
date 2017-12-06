import * as Types from './types';
import { SyntaxKind, Node, NodeArray } from './types';
/**
 * True if node is of some token syntax kind.
 * For example, this is true for an IfKeyword but not for an IfStatement.
 */
export declare function isToken(n: Node): boolean;
export declare function isModifierKind(token: SyntaxKind): boolean;
export declare function isKeywordTypeKind(token: SyntaxKind): boolean;
export declare function isComplexTypeKind(token: SyntaxKind): boolean;
export declare function isReferenceKeywordKind(token: SyntaxKind): boolean;
export declare function isComparisonOperator(token: SyntaxKind): boolean;
export declare function isAssignmentOperator(token: SyntaxKind): boolean;
export declare function isLeftHandSideExpressionKind(kind: SyntaxKind): boolean;
export declare function isContainerKind(kind: SyntaxKind): boolean;
export declare function isNamedDeclarationKind(kind: SyntaxKind): boolean;
export declare function isDeclarationKind(kind: SyntaxKind): boolean;
export declare function isLeftHandSideExpression(node: Types.Node): boolean;
export declare function isPartOfExpression(node: Node): boolean;
export declare function isPartOfTypeNode(node: Node): boolean;
export declare function isRightSideOfPropertyAccess(node: Node): boolean;
export declare function getKindName(k: number | string): string;
export declare function sourceFileToJSON(file: Types.Node): string;
/**
 * Iterates through the parent chain of a node and performs the callback on each parent until the callback
 * returns a truthy value, then returns that value.
 * If no such value is found, it applies the callback until the parent pointer is undefined or the callback returns "quit"
 * At that point findAncestor returns undefined.
 */
export declare function findAncestor<T extends Node>(node: Node, callback: (element: Node) => element is T): T | undefined;
export declare function findAncestor(node: Node, callback: (element: Node) => boolean | "quit"): Node | undefined;
export declare function findAncestorByKind(node: Node, kind: SyntaxKind): Types.Node;
export declare function getSourceFileOfNode(node: Node): Types.SourceFile;
export declare function fixupParentReferences(rootNode: Node): void;
/**
 * Invokes a callback for each child of the given node. The 'cbNode' callback is invoked for all child nodes
 * stored in properties. If a 'cbNodes' callback is specified, it is invoked for embedded arrays; otherwise,
 * embedded arrays are flattened and the 'cbNode' callback is invoked for each element. If a callback returns
 * a truthy value, iteration stops and that value is returned. Otherwise, undefined is returned.
 *
 * @param node a given node to visit its children
 * @param cbNode a callback to be invoked for all child nodes
 * @param cbNodes a callback to be invoked for embedded array
 *
 * @remarks `forEachChild` must visit the children of a node in the order
 * that they appear in the source code.
 */
export declare function forEachChild<T>(node: Node, cbNode: (node: Node) => T | undefined, cbNodes?: (nodes: NodeArray<Node>) => T | undefined): T | undefined;
export declare function createDiagnosticForNode(node: Types.Node, category: Types.DiagnosticCategory, msg: string): Types.Diagnostic;
