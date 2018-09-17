import * as gt from './types';
import { SourceFile, Node, Symbol } from './types';
import { IStoreSymbols } from '../service/store';
export declare function getDeclarationName(node: Node): string;
export declare function declareSymbol(node: gt.Declaration, store: IStoreSymbols, parentSymbol?: Symbol): Symbol;
export declare function bindSourceFile(sourceFile: SourceFile, store: IStoreSymbols): void;
export declare function unbindSourceFile(sourceFile: SourceFile, store: IStoreSymbols): void;
