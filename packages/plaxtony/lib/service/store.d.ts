import * as gt from '../compiler/types';
import { SourceFile } from '../compiler/types';
import { S2WorkspaceMetadata } from './s2meta';
import { SC2Workspace } from '../sc2mod/archive';
import * as lsp from 'vscode-languageserver';
export declare function createTextDocument(uri: string, text: string): lsp.TextDocument;
export declare function createTextDocumentFromFs(filepath: string): lsp.TextDocument;
export declare class IndexedDocument {
    textDocument: lsp.TextDocument;
    sourceNode: SourceFile;
}
export interface S2WorkspaceChangeEvent {
    src: string;
    workspace: SC2Workspace;
}
export declare class WorkspaceWatcher {
    workspacePath: string;
    protected _onDidOpen: lsp.Emitter<lsp.TextDocumentChangeEvent>;
    constructor(workspacePath: string);
    protected watchFiles(): void;
    watch(): void;
    readonly onDidOpen: lsp.Event<lsp.TextDocumentChangeEvent>;
}
export declare class S2WorkspaceWatcher extends WorkspaceWatcher {
    protected _onDidOpenS2Workspace: lsp.Emitter<S2WorkspaceChangeEvent>;
    protected modSources: string[];
    constructor(workspacePath: string, modSources: string[]);
    readonly onDidOpenS2Archive: lsp.Event<S2WorkspaceChangeEvent>;
    watch(): Promise<void>;
}
export declare function findWorkspaceArchive(rootPath: string): Promise<string>;
export declare class Store {
    private parser;
    rootPath?: string;
    documents: Map<string, gt.SourceFile>;
    openDocuments: Map<string, boolean>;
    s2workspace: SC2Workspace;
    s2metadata: S2WorkspaceMetadata;
    removeDocument(documentUri: string): void;
    getFirstMatchingDocument(partialname: string): gt.SourceFile;
    updateDocument(document: lsp.TextDocument, check?: boolean): void;
    updateS2Workspace(workspace: SC2Workspace, lang: string): Promise<void>;
    isDocumentInWorkspace(documentUri: string, includeDepds?: boolean): boolean;
    resolveGlobalSymbol(name: string): gt.Symbol | undefined;
}
