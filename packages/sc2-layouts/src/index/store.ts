import * as util from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as lsp from 'vscode-languageserver';
import URI from 'vscode-uri';
import * as sch from '../schema/base';
import { languageId, XMLElement, DiagnosticReport, XMLDocument } from '../types';
import { parse } from '../parser/parser';
import { DescIndex } from './desc';
import { LayoutProcessor } from './processor';

export function createTextDocument(uri: string, text: string): lsp.TextDocument {
    return <lsp.TextDocument>{
        uri: uri,
        languageId: languageId,
        version: 0,
        getText: () => text,
    };
}

export function createTextDocumentFromFs(filepath: string): lsp.TextDocument {
    filepath = path.resolve(filepath);
    return createTextDocument(URI.file(filepath).toString(), fs.readFileSync(filepath, 'utf8'));
}

// export function createTextDocumentFromUri(uri: string): lsp.TextDocument {
//     return createTextDocument(uri, fs.readFileSync(Uri.parse(uri).fsPath, 'utf8'));
// }

export type LayoutDocument = XMLDocument;

export class SWorkspace {
    protected docmap = new Map<string, XMLDocument>();

    constructor(public readonly uri: URI, public readonly name: string) {
    }

    get documents() {
        return <ReadonlyMap<string, XMLDocument>>this.docmap;
    }
}

export class Store {
    protected workspaces = new Map<string, SWorkspace>();
    protected workspaceDocUri = new Map<string, SWorkspace>();

    documents = new Map<string, XMLDocument>();
    index = new DescIndex();
    processor: LayoutProcessor;

    constructor(public readonly schema: sch.SchemaRegistry) {
        this.processor = new LayoutProcessor(this, this.index);
    }

    protected parseLayout(uri: string, text: string) {
        const r = parse(text, {schema: this.schema});
        r.root.uri = URI.parse(uri);
        r.root.parseDiagnostics = r.diagnostics;
        return r.root;
    }

    protected addWorkspace(uri: URI, name?: string) {
        if (!name) name = uri.fragment;
        const wsp = new SWorkspace(uri, name);
    }

    // protected removeWorkspace(uri: URI) {
    // }

    public removeDocument(documentUri: string) {
        const currSorceFile = this.documents.get(documentUri);
        if (!currSorceFile) return;
        this.index.unbindDocument(currSorceFile);
        this.documents.delete(documentUri);
    }

    public clear() {
        this.index.clear();
        this.documents.clear();
    }

    public updateDocument(document: lsp.TextDocument, forceBind = false) {
        if (this.documents.has(document.uri)) {
            const ldoc = this.documents.get(document.uri);

            if (document.getText().length === ldoc.text.length && document.getText().valueOf() === ldoc.text.valueOf()) {
                if (forceBind) {
                    this.index.unbindDocument(ldoc);
                    this.index.bindDocument(ldoc);
                }
                return ldoc;
            }

            this.removeDocument(document.uri);
        }
        let ldoc = this.parseLayout(document.uri, document.getText());
        this.documents.set(document.uri, ldoc);
        this.index.bindDocument(ldoc);
        return ldoc;
    }

    public validateDocument(documentUri: string) {
        const ldoc = this.documents.get(documentUri);
        const pdiag = this.processor.checkFile(ldoc);
        return ldoc.parseDiagnostics.concat(pdiag);
    }
}
