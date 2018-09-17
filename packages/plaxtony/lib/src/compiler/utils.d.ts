import * as gt from './types';
/**
 * True if node is of some token syntax kind.
 * For example, this is true for an IfKeyword but not for an IfStatement.
 */
export declare function isToken(n: gt.Node): boolean;
export declare function isModifierKind(token: gt.SyntaxKind): boolean;
export declare function isKeywordTypeKind(token: gt.SyntaxKind): boolean;
export declare function isComplexTypeKind(token: gt.SyntaxKind): boolean;
export declare function isReferenceKeywordKind(token: gt.SyntaxKind): boolean;
export declare function isComparisonOperator(token: gt.SyntaxKind): boolean;
export declare function isAssignmentOperator(token: gt.SyntaxKind): boolean;
export declare function isAssignmentExpression(node: gt.Node): boolean;
export declare function isLeftHandSideExpressionKind(kind: gt.SyntaxKind): boolean;
export declare function isContainerKind(kind: gt.SyntaxKind): boolean;
export declare function isNamedDeclarationKind(kind: gt.SyntaxKind): boolean;
export declare function isDeclarationKind(kind: gt.SyntaxKind): boolean;
export declare function isLeftHandSideExpression(node: gt.Node): boolean;
export declare function isPartOfExpression(node: gt.Node): boolean;
export declare function isPartOfTypeNode(node: gt.Node): boolean;
export declare function isRightSideOfPropertyAccess(node: gt.Node): boolean;
export declare function getKindName(k: number | string): string;
export declare function sourceFileToJSON(file: gt.Node): string;
/**
 * Iterates through the parent chain of a node and performs the callback on each parent until the callback
 * returns a truthy value, then returns that value.
 * If no such value is found, it applies the callback until the parent pointer is undefined or the callback returns "quit"
 * At that point findAncestor returns undefined.
 */
export declare function findAncestor<T extends gt.Node>(node: gt.Node, callback: (element: gt.Node) => element is T): T | undefined;
export declare function findAncestor(node: gt.Node, callback: (element: gt.Node) => boolean | "quit"): gt.Node | undefined;
export declare function findAncestorByKind(node: gt.Node, kind: gt.SyntaxKind): gt.Node;
export declare function getSourceFileOfNode(node: gt.Node): gt.SourceFile;
export declare function fixupParentReferences(rootNode: gt.Node): void;
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
export declare function forEachChild<T>(node: gt.Node, cbNode: (node: gt.Node) => T | undefined, cbNodes?: (nodes: gt.NodeArray<gt.Node>) => T | undefined): T | undefined;
export declare function createDiagnosticForNode(node: gt.Node, category: gt.DiagnosticCategory, msg: string): gt.Diagnostic;
