import * as gt from '../compiler/types';
import { SyntaxKind, SourceFile, Node, Symbol, SymbolTable } from '../compiler/types';
import { getSourceFileOfNode } from '../compiler/utils';
import { Parser } from '../compiler/parser';
import { bindSourceFile } from '../compiler/binder';
import { findSC2Archives, isSC2Archive, SC2Archive } from '../sc2mod/archive';
import { Element } from '../sc2mod/trigger';
import * as lsp from 'vscode-languageserver';
import * as path from 'path';
import * as fs from 'fs';
import * as glob from 'glob';
import Uri from 'vscode-uri';

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
    return createTextDocument(Uri.file(filepath).toString(), fs.readFileSync(filepath, 'utf8'));
}

export class IndexedDocument {
    textDocument: lsp.TextDocument;
    sourceNode: SourceFile;
}

export interface S2ArchiveChangeEvent {
    localPath: string;
    archive: SC2Archive;
};

export class Workspace {
    protected workspacePath: string;
    protected _onDidStart: lsp.Emitter<string>;
    protected _onDidEnd: lsp.Emitter<number>;
    protected _onDidOpen: lsp.Emitter<lsp.TextDocumentChangeEvent>;

    constructor(workspacePath: string) {
        this.workspacePath = workspacePath;

        this._onDidStart = new lsp.Emitter<string>();
        this._onDidEnd = new lsp.Emitter<number>();
        this._onDidOpen = new lsp.Emitter<lsp.TextDocumentChangeEvent>();
    }

    public watch() {
        // TODO: filewatch
        this._onDidStart.fire(this.workspacePath);
        const files = glob.sync(path.join(path.resolve(this.workspacePath), '**/*.galaxy'));
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

export class S2Workspace extends Workspace {
    protected _onDidOpenS2Archive: lsp.Emitter<S2ArchiveChangeEvent>;

    constructor(workspacePath: string) {
        super(workspacePath);
        this._onDidOpenS2Archive = new lsp.Emitter<S2ArchiveChangeEvent>();
    }

    public async watch() {
        this._onDidStart.fire(this.workspacePath);

        const files = glob.sync(path.join(path.resolve(this.workspacePath), '**/*.galaxy'));
        for (let filepath of files) {
            this._onDidOpen.fire({document: createTextDocumentFromFs(filepath)})
        }

        if (isSC2Archive(this.workspacePath)) {
            const modpath = path.resolve(this.workspacePath);
            const archive = new SC2Archive();
            await archive.openFromDirectory(modpath);
            this._onDidOpenS2Archive.fire({
                localPath: '',
                archive: archive
            });
        }

        for (let modpath of await findSC2Archives(path.resolve(this.workspacePath))) {
            const archive = new SC2Archive();
            await archive.openFromDirectory(modpath);
            this._onDidOpenS2Archive.fire({
                localPath: '',
                archive: archive
            });
        }

        this._onDidEnd.fire(files.length);
    }

    public get onDidOpenS2Archive(): lsp.Event<S2ArchiveChangeEvent> {
        return this._onDidOpenS2Archive.event;
    }
}

export class Store {
    // private documents: Store;
    public documents = new Map<string, SourceFile>();
    public s2archives = new Map<string, SC2Archive>();

    public initialize() {
    }

    public updateDocument(document: lsp.TextDocument) {
        let p = new Parser();
        let sourceFile = p.parseFile(document.uri, document.getText());
        bindSourceFile(sourceFile);
        this.documents.set(document.uri, sourceFile);
    }

    public updateArchive(archive: SC2Archive) {
        this.s2archives.set(archive.directory, archive);
    }

    public getArchiveOfSourceFile(sourceFile: SourceFile): SC2Archive | undefined {
        for (const archive of this.s2archives.values()) {
            const filePath = Uri.parse(sourceFile.fileName).fsPath;
            if (filePath.indexOf(archive.directory) === 0) {
                return archive;
            }
        }
    }

    public getSymbolMetadata(symbol: gt.Symbol): Element | undefined {
        const sourceFile = getSourceFileOfNode(symbol.declarations[0]);
        const archive = this.getArchiveOfSourceFile(sourceFile);
        if (!archive) {
            return undefined;
        }
        return archive.trigLibs.findElementByName(symbol.escapedName);
    }
}
