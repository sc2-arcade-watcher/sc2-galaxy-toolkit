import * as gt from '../compiler/types';
import { SourceFile } from '../compiler/types';
import { SC2Archive } from '../sc2mod/archive';
import { Element } from '../sc2mod/trigger';
import * as lsp from 'vscode-languageserver';
export declare function createTextDocument(uri: string, text: string): lsp.TextDocument;
export declare function createTextDocumentFromFs(filepath: string): lsp.TextDocument;
export declare class IndexedDocument {
    textDocument: lsp.TextDocument;
    sourceNode: SourceFile;
}
export interface S2ArchiveChangeEvent {
    localPath: string;
    archive: SC2Archive;
}
export declare class Workspace {
    protected workspacePath: string;
    protected _onDidStart: lsp.Emitter<string>;
    protected _onDidEnd: lsp.Emitter<number>;
    protected _onDidOpen: lsp.Emitter<lsp.TextDocumentChangeEvent>;
    constructor(workspacePath: string);
    watch(): void;
    readonly onDidStart: lsp.Event<string>;
    readonly onDidEnd: lsp.Event<number>;
    readonly onDidOpen: lsp.Event<lsp.TextDocumentChangeEvent>;
}
export declare class S2Workspace extends Workspace {
    protected _onDidOpenS2Archive: lsp.Emitter<S2ArchiveChangeEvent>;
    constructor(workspacePath: string);
    watch(): Promise<void>;
    readonly onDidOpenS2Archive: lsp.Event<S2ArchiveChangeEvent>;
}
export declare class Store {
    documents: Map<string, gt.SourceFile>;
    s2archives: Map<string, SC2Archive>;
    initialize(): void;
    updateDocument(document: lsp.TextDocument): void;
    updateArchive(archive: SC2Archive): void;
    getArchiveOfSourceFile(sourceFile: SourceFile): SC2Archive | undefined;
    getSymbolMetadata(symbol: gt.Symbol): Element | undefined;
}
