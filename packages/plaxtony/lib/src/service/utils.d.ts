/// <reference types="glob" />
import * as glob from 'glob';
import * as gt from '../compiler/types';
import * as lsp from 'vscode-languageserver';
export declare function getNodeChildren(node: gt.Node): gt.Node[];
export declare function getNodeTokens(node: gt.Node): gt.Node[];
export declare function nodeHasTokens(node: gt.Node): boolean;
export declare function findPrecedingToken(position: number, sourceFile: gt.SourceFile, startNode?: gt.Node): gt.Node | undefined;
export declare function getTokenAtPosition(position: number, sourceFile: gt.SourceFile, preferFollowing?: boolean): gt.Node;
export declare function getAdjacentIdentfier(position: number, sourceFile: gt.SourceFile): gt.Identifier;
export declare function getAdjacentToken(position: number, sourceFile: gt.SourceFile): gt.Node;
export declare function getPositionOfLineAndCharacter(sourceFile: gt.SourceFile, line: number, character: number): number;
export declare function getLineAndCharacterOfPosition(sourceFile: gt.SourceFile, pos: number): lsp.Position;
export declare function fuzzysearch(needle: string, haystack: string): boolean;
export declare const globify: typeof glob.__promisify__;
