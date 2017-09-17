import * as Types from './types';
import { SyntaxKind, Node, NodeArray } from './types';
export declare function formatStringFromArgs(text: string, args: {
    [index: number]: string;
}, baseIndex?: number): string;
export declare function createFileDiagnostic(file: Types.SourceFile, start: number, length: number, message: Types.DiagnosticMessage, ...args: (string | number)[]): Types.Diagnostic;
export declare function isModifierKind(token: SyntaxKind): boolean;
export declare function isKeywordTypeKind(token: SyntaxKind): boolean;
export declare function isAssignmentOperator(token: SyntaxKind): boolean;
export declare function isLeftHandSideExpression(node: Types.Node): boolean;
export declare function getKindName(k: number | string): string;
export declare function sourceFileToJSON(file: Types.Node): string;
export declare function findAncestor<T extends Node>(node: Node, callback: (element: Node) => element is T): T | undefined;
export declare function findAncestor(node: Node, callback: (element: Node) => boolean | "quit"): Node | undefined;
export declare function fixupParentReferences(rootNode: Node): void;
export declare function forEachChild<T>(node: Node, cbNode: (node: Node) => T | undefined, cbNodes?: (nodes: NodeArray<Node>) => T | undefined): T | undefined;
