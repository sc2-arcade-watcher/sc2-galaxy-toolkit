import * as gt from '../compiler/types';
import * as lsp from 'vscode-languageserver';
export declare function getNodeChildren(node: gt.Node): gt.Node[];
export declare function getNodeTokens(node: gt.Node): gt.Node[];
export declare function nodeHasTokens(node: gt.Node): boolean;
export declare function findPrecedingToken(position: number, sourceFile: gt.SourceFile, startNode?: gt.Node): gt.Node | undefined;
export declare function getTokenAtPosition(position: number, sourceFile: gt.SourceFile, includeEndPosition?: boolean): gt.Node;
export declare function getPositionOfLineAndCharacter(sourceFile: gt.SourceFile, line: number, character: number): number;
export declare function getLineAndCharacterOfPosition(sourceFile: gt.SourceFile, pos: number): lsp.Position;
