import { SourceFile } from '../compiler/types';
import { TextDocument } from 'vscode-languageserver';
export declare function createTextDocument(uri: string, text: string): TextDocument;
export declare function createTextDocumentFromFs(filepath: string): TextDocument;
export declare class IndexedDocument {
    textDocument: TextDocument;
    sourceNode: SourceFile;
}
export declare class Workspace {
    private workspacePath;
    private store;
    constructor(workspacePath: string, store: Store);
}
export declare class Store {
    documents: Map<string, SourceFile>;
    constructor();
    initialize(): void;
    updateDocument(document: TextDocument): void;
}
