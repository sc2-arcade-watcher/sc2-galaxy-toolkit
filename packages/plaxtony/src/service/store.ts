import * as Types from '../compiler/types';
import { SyntaxKind, SourceFile, Node, Symbol, SymbolTable } from '../compiler/types';
import { Parser } from '../compiler/parser';
import { bindSourceFile } from '../compiler/binder';
import { TextDocument } from 'vscode-languageserver';
import * as path from 'path';
import * as fs from 'fs';
import * as glob from 'glob';

export function createTextDocument(uri: string, text: string): TextDocument {
    return <TextDocument>{
        uri: uri,
        languageId: 'galaxy',
        version: 1,
        getText: () => text,
    };
}

export function createTextDocumentFromFs(filepath: string): TextDocument {
    filepath = path.resolve(filepath);
    return createTextDocument(`file://${filepath}`, fs.readFileSync(filepath, 'utf8'));
}

export class IndexedDocument {
    textDocument: TextDocument;
    sourceNode: SourceFile;
}

export class Workspace {
    // private documents: Map<string, IndexedDocument>;
    private workspacePath: string;
    private store: Store;

    constructor(workspacePath: string, store: Store) {
        this.workspacePath = path.join(path.resolve(workspacePath), '**/*.galaxy');
        this.store = store;

        // TODO: filewatch
        for (let filepath of glob.sync(this.workspacePath)) {
            this.store.updateDocument(createTextDocumentFromFs(filepath));
        }
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

    public updateDocument(document: TextDocument) {
        let p = new Parser();
        let sourceFile = p.parseFile(document.uri, document.getText());
        bindSourceFile(sourceFile);
        this.documents.set(document.uri, sourceFile);
    }
}
