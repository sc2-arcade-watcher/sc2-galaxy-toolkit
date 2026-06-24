import * as path from 'path';
import * as lsp from 'vscode-languageserver';
import URI from 'vscode-uri';
import * as sch from '../schema/base';
import { XMLDocument, TextDocument } from '../types';
import { parseDocument } from '../parser/parser';
import { DescIndex, DescNamespace } from './desc';
import * as s2 from '../index/s2mod';
import { readFileAsync } from '../common';

export async function createTextDocumentFromFs(filepath: string): Promise<lsp.TextDocument> {
    return new TextDocument(URI.file(path.resolve(filepath)).toString(), await readFileAsync(filepath, 'utf8'));
}

export type LayoutDocument = XMLDocument;

export interface FileDescEventData {
    archive: s2.Archive;
    xDoc: XMLDocument;
    fDesc: DescNamespace;
}

export interface IStoreEvents {
    readonly onDidFileDescCreate: lsp.Event<FileDescEventData>;
    readonly onDidFileDescChange: lsp.Event<FileDescEventData>;
    readonly onDidFileDescDelete: lsp.Event<FileDescEventData>;

    readonly onDidArchiveAdd: lsp.Event<s2.Archive>;
    readonly onDidArchiveDelete: lsp.Event<s2.Archive>;
}

export class Store implements IStoreEvents {
    protected _onDidFileDescCreate = new lsp.Emitter<FileDescEventData>();
    protected _onDidFileDescChange = new lsp.Emitter<FileDescEventData>();
    protected _onDidFileDescDelete = new lsp.Emitter<FileDescEventData>();
    readonly onDidFileDescCreate = this._onDidFileDescCreate.event;
    readonly onDidFileDescChange = this._onDidFileDescChange.event;
    readonly onDidFileDescDelete = this._onDidFileDescDelete.event;

    protected _onDidArchiveAdd = new lsp.Emitter<s2.Archive>();
    protected _onDidArchiveDelete = new lsp.Emitter<s2.Archive>();
    readonly onDidArchiveAdd = this._onDidArchiveAdd.event;
    readonly onDidArchiveDelete = this._onDidArchiveDelete.event;

    readonly s2ws = new s2.Workspace();
    readonly documents = new Map<string, XMLDocument>();
    readonly index = new DescIndex(this.schema);

    constructor(public readonly schema: sch.SchemaRegistry) {
    }

    async clear() {
        for (const sa of this.s2ws.archives) {
            await this.deleteArchive(sa);
        }

        for (const docUri of this.documents.keys()) {
            this.removeDocument(docUri);
        }


        await this.s2ws.clear();
        this.index.clear();
        this.documents.clear();
    }

    async presetArchives(...archives: s2.Archive[]) {
        this.s2ws.presetArchives(...archives);
        archives.forEach(sa => this._onDidArchiveAdd.fire(sa));
    }

    async addArchive(...archives: s2.Archive[]) {
        for (const sa of archives) {
            await this.s2ws.addArchive(sa);
            this._onDidArchiveAdd.fire(sa);
        }
    }

    async deleteArchive(...archives: s2.Archive[]) {
        for (const sa of archives) {
            await this.s2ws.deleteArchive(sa);
            this._onDidArchiveDelete.fire(sa);
        }
    }

    public updateDocument(documentUri: string, text: string, version: number = null, forceBind = false) {
        let xDoc = this.documents.get(documentUri);
        let tdoc: TextDocument;
        const alreadyExists = xDoc !== void 0;

        if (xDoc) {
            if (text.length === xDoc.text.length && text.valueOf() === xDoc.text.valueOf()) {
                if (forceBind) {
                    this.index.unbindDocument(xDoc);
                    this.index.bindDocument(xDoc);
                }
                xDoc.tdoc.version = version;
                return xDoc;
            }

            this.index.unbindDocument(xDoc);

            tdoc = xDoc.tdoc;
            tdoc.updateContent(text, version);
        }
        else {
            tdoc = new TextDocument(documentUri, text);
        }

        xDoc = parseDocument(tdoc, {schema: this.schema});
        this.documents.set(documentUri, xDoc);
        const fDesc = this.index.bindDocument(xDoc);
        const sa = this.s2ws.matchFileWorkspace(URI.parse(xDoc.tdoc.uri));

        if (sa) {
            if (alreadyExists) {
                this._onDidFileDescChange.fire({
                    archive: sa,
                    fDesc: fDesc,
                    xDoc: xDoc,
                });
            }
            else {
                this._onDidFileDescCreate.fire({
                    archive: sa,
                    fDesc: fDesc,
                    xDoc: xDoc,
                });
            }
        }

        return xDoc;
    }

    public removeDocument(documentUri: string) {
        const xDoc = this.documents.get(documentUri);
        if (!xDoc) return;

        const fDesc = this.index.resolveElementDesc(xDoc);
        if (fDesc) {
            const sa = this.s2ws.matchFileWorkspace(URI.parse(xDoc.tdoc.uri));
            if (sa) {
                this._onDidFileDescDelete.fire({
                    archive: sa,
                    fDesc: fDesc,
                    xDoc: xDoc,
                });
            }
        }

        this.index.unbindDocument(xDoc);
        this.documents.delete(documentUri);
    }

    public getDocumentsInArchive(sa: s2.Archive) {
        const docList: XMLDocument[] = [];

        for (const xDoc of this.documents.values()) {
            if (!xDoc.tdoc.uri.startsWith(sa.uri.toString())) continue;
            docList.push(xDoc);
        }

        return docList;
    }
}
