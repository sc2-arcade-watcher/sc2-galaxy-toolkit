import * as util from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as lsp from 'vscode-languageserver';
import URI from 'vscode-uri';
import * as sch from '../schema/base';
import { languageId, XMLElement, DiagnosticReport, XMLDocument, TextDocument } from '../types';
import { parse, parseDocument } from '../parser/parser';
import { DescIndex } from './desc';
import { LayoutChecker } from './processor';
import * as s2 from '../index/s2mod';

export function createTextDocumentFromFs(filepath: string): lsp.TextDocument {
    filepath = path.resolve(filepath);
    const tdoc = new TextDocument(URI.file(filepath).toString(), fs.readFileSync(filepath, 'utf8'));
    return tdoc;
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
    s2ws = new s2.Workspace([]);

    documents = new Map<string, XMLDocument>();
    index = new DescIndex();
    processor: LayoutChecker;

    constructor(public readonly schema: sch.SchemaRegistry) {
        this.processor = new LayoutChecker(this, this.index);
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

    public updateDocument(documentUri: string, text: string, version: number = null, forceBind = false) {
        let xdoc = this.documents.get(documentUri);
        let tdoc: TextDocument;

        if (xdoc) {
            if (text.length === xdoc.text.length && text.valueOf() === xdoc.text.valueOf()) {
                if (forceBind) {
                    this.index.unbindDocument(xdoc);
                    this.index.bindDocument(xdoc);
                }
                return xdoc;
            }

            this.index.unbindDocument(xdoc);

            tdoc = xdoc.tdoc;
            tdoc.updateContent(text, version);
        }
        else {
            tdoc = new TextDocument(documentUri, text);
        }

        xdoc = parseDocument(tdoc, {schema: this.schema});
        this.documents.set(documentUri, xdoc);
        this.index.bindDocument(xdoc);

        return xdoc;
    }

    public validateDocument(documentUri: string) {
        const ldoc = this.documents.get(documentUri);
        const pdiag = this.processor.checkFile(ldoc);
        return ldoc.parseDiagnostics.concat(pdiag);
    }
}
