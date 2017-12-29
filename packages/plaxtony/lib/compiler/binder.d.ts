import * as gt from './types';
import { SourceFile, Node, Symbol } from './types';
import { Store } from '../service/store';
export declare function getDeclarationName(node: Node): string;
export declare function declareSymbol(node: gt.Declaration, store: Store, parentSymbol?: Symbol): Symbol;
export declare function bindSourceFile(sourceFile: SourceFile, store: Store): void;
export declare function unbindSourceFile(sourceFile: SourceFile, store: Store): void;
