import * as Types from '../compiler/types';
export declare function getNodeChildren(node: Types.Node): Types.Node[];
export declare function getNodeTokens(node: Types.Node): Types.Node[];
export declare function nodeHasTokens(node: Types.Node): boolean;
export declare function findPrecedingToken(position: number, sourceFile: Types.SourceFile, startNode?: Types.Node): Types.Node | undefined;
export declare function getTouchingToken(sourceFile: Types.SourceFile, position: number, includePrecedingTokenAtEndPosition?: (n: Types.Node) => boolean): Types.Node;
export declare function getTokenAtPosition(sourceFile: Types.SourceFile, position: number, includeEndPosition?: boolean): Types.Node;
export declare function getPositionOfLineAndCharacter(sourceFile: Types.SourceFile, line: number, character: number): number;
