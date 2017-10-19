import * as Types from '../compiler/types';
import { SyntaxKind, SourceFile, Node, Symbol, SymbolTable } from '../compiler/types';
import { Parser } from '../compiler/parser';
import { bindSourceFile } from '../compiler/binder';
import * as lsp from 'vscode-languageserver';
import * as path from 'path';
import * as fs from 'fs';
import * as glob from 'glob';

export function createTextDocument(uri: string, text: string): lsp.TextDocument {
    return <lsp.TextDocument>{
        uri: uri,
        languageId: 'galaxy',
        version: 1,
        getText: () => text,
    };
}

export function createTextDocumentFromFs(filepath: string): lsp.TextDocument {
    filepath = path.resolve(filepath);
    return createTextDocument(`file://${filepath}`, fs.readFileSync(filepath, 'utf8'));
}

export class IndexedDocument {
    textDocument: lsp.TextDocument;
    sourceNode: SourceFile;
}

export class Workspace {
    // private documents: Map<string, IndexedDocument>;
    private workspacePath: string;
    private store: Store;
    private _onDidStart: lsp.Emitter<string>;
    private _onDidEnd: lsp.Emitter<number>;
    private _onDidOpen: lsp.Emitter<lsp.TextDocumentChangeEvent>;

    constructor(workspacePath: string, store: Store) {
        this.workspacePath = path.join(path.resolve(workspacePath), '**/*.galaxy');
        this.store = store;

        this._onDidStart = new lsp.Emitter<string>();
        this._onDidEnd = new lsp.Emitter<number>();
        this._onDidOpen = new lsp.Emitter<lsp.TextDocumentChangeEvent>();
    }

    public watch() {
        // TODO: filewatch
        this._onDidStart.fire(this.workspacePath);
        const files = glob.sync(this.workspacePath);
        for (let filepath of files) {
            // this.store.updateDocument(createTextDocumentFromFs(filepath));
            this._onDidOpen.fire({document: createTextDocumentFromFs(filepath)})
        }
        this._onDidEnd.fire(files.length);
    }

    public get onDidStart(): lsp.Event<string> {
        return this._onDidStart.event;
    }

    public get onDidEnd(): lsp.Event<number> {
        return this._onDidEnd.event;
    }

    public get onDidOpen(): lsp.Event<lsp.TextDocumentChangeEvent> {
        return this._onDidOpen.event;
    }
}

export class Store {
    // private documents: Store;
    public documents: Map<string, SourceFile>;

    constructor() {
        this.documents = new Map<string, SourceFile>();
    }

    public initialize() {
    }

    public updateDocument(document: lsp.TextDocument) {
        let p = new Parser();
        let sourceFile = p.parseFile(document.uri, document.getText());
        bindSourceFile(sourceFile);
        this.documents.set(document.uri, sourceFile);
    }
}
