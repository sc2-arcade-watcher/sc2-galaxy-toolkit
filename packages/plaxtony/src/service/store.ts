import * as gt from '../compiler/types';
import { SyntaxKind, SourceFile, Node, Symbol, SymbolTable } from '../compiler/types';
import { getSourceFileOfNode } from '../compiler/utils';
import { Parser } from '../compiler/parser';
import { S2WorkspaceMetadata } from './s2meta';
import { bindSourceFile, unbindSourceFile } from '../compiler/binder';
import { findSC2ArchiveDirectories, isSC2Archive, SC2Archive, SC2Workspace, openArchiveWorkspace } from '../sc2mod/archive';
import { Element } from '../sc2mod/trigger';
import * as lsp from 'vscode-languageserver';
import * as path from 'path';
import * as fs from 'fs';
import * as glob from 'glob';
import Uri from 'vscode-uri';
import { TypeChecker } from '../compiler/checker';
import URI from 'vscode-uri';

export function createTextDocument(uri: string, text: string): lsp.TextDocument {
    return <lsp.TextDocument>{
        uri: uri,
        languageId: 'galaxy',
        version: 0,
        getText: () => text,
    };
}

export function createTextDocumentFromFs(filepath: string): lsp.TextDocument {
    filepath = path.resolve(filepath);
    return createTextDocument(Uri.file(filepath).toString(), fs.readFileSync(filepath, 'utf8'));
}

export function createTextDocumentFromUri(uri: string): lsp.TextDocument {
    return createTextDocument(uri, fs.readFileSync(Uri.parse(uri).fsPath, 'utf8'));
}

export class IndexedDocument {
    textDocument: lsp.TextDocument;
    sourceNode: SourceFile;
}

export interface S2WorkspaceChangeEvent {
    src: string;
    workspace: SC2Workspace;
};

export class WorkspaceWatcher {
    public workspacePath: string;
    protected _onDidOpen: lsp.Emitter<lsp.TextDocumentChangeEvent>;

    constructor(workspacePath: string) {
        this.workspacePath = workspacePath;

        this._onDidOpen = new lsp.Emitter<lsp.TextDocumentChangeEvent>();
    }

    protected watchFiles() {
        // TODO: filewatch
        const files = glob.sync(path.join(path.resolve(this.workspacePath), '**/*.galaxy'));
        for (let filepath of files) {
            this._onDidOpen.fire({document: createTextDocumentFromFs(filepath)})
        }
    }

    public watch() {
        this.watchFiles();
    }

    public get onDidOpen(): lsp.Event<lsp.TextDocumentChangeEvent> {
        return this._onDidOpen.event;
    }
}

export class S2WorkspaceWatcher extends WorkspaceWatcher {
    protected _onDidOpenS2Workspace: lsp.Emitter<S2WorkspaceChangeEvent>;
    protected modSources: string[] = [];

    constructor(workspacePath: string, modSources: string[]) {
        super(workspacePath);
        this.modSources = modSources;
        this._onDidOpenS2Workspace = new lsp.Emitter<S2WorkspaceChangeEvent>();
    }

    public get onDidOpenS2Archive(): lsp.Event<S2WorkspaceChangeEvent> {
        return this._onDidOpenS2Workspace.event;
    }

    // public setSources(sources: string[]) {
    //     this.modSources = sources;
    // }

    public async watch() {
        super.watch();
        const rootArchive = new SC2Archive(path.basename(this.workspacePath), this.workspacePath);
        const workspace = await openArchiveWorkspace(rootArchive, this.modSources);

        for (const modArchive of workspace.dependencies) {
            for (const extSrc of await modArchive.findFiles('**/*.galaxy')) {
                this._onDidOpen.fire({document: createTextDocumentFromFs(path.join(modArchive.directory, extSrc))})
            }
        }

        this._onDidOpenS2Workspace.fire({
            src: this.workspacePath,
            workspace: workspace,
        });
    }
}

// export async function resolveWorkspaces(dir: string, modSources: string[]) {
//     const watchers: WorkspaceWatcher[] = [];
//     dir = path.resolve(dir);
//     const archives = await findSC2ArchiveDirectories(dir);
//     if (archives.length) {
//         for (const archive of archives) {
//             watchers.push(new S2WorkspaceWatcher(archive, modSources));
//         }
//     }
//     else {
//         watchers.push(new WorkspaceWatcher(dir))
//     }
//     return watchers;
// }

export async function findWorkspaceArchive(rootPath: string) {
    if (isSC2Archive(rootPath)) {
        return rootPath;
    }
    const archives = await findSC2ArchiveDirectories(rootPath);
    if (archives.length > 0) {
        const map = archives.find((dir) => {
            return path.extname(dir).toLowerCase() === '.sc2map';
        });
        if (map) {
            return map;
        }
        else {
            return archives[0];
        }
    }
    return null;
}

export interface SourceFileMeta {
    absoluteName: string;
    relativeName?: string;
    archive?: SC2Archive;
}

export class Store {
    private parser = new Parser();
    public rootPath?: string;
    public documents = new Map<string, SourceFile>();
    public openDocuments = new Map<string, boolean>();
    public s2workspace: SC2Workspace;
    public s2metadata: S2WorkspaceMetadata;
    // protected watchers = new Map<string, WorkspaceWatcher>();

    public removeDocument(documentUri: string) {
        const currSorceFile = this.documents.get(documentUri);
        if (!currSorceFile) return;
        unbindSourceFile(currSorceFile, this);
        this.documents.delete(documentUri);
    }

    public getFirstMatchingDocument(partialname: string) {
        for (const [fullname, sourceFile] of this.documents.entries()) {
            if (fullname.endsWith(partialname)) {
                return sourceFile;
            }
        }
        return null;
    }

    public updateDocument(document: lsp.TextDocument, check = false) {
        if (this.documents.has(document.uri)) {
            const currSorceFile = this.documents.get(document.uri);
            if (document.getText().length === currSorceFile.text.length && document.getText().valueOf() === currSorceFile.text.valueOf()) {
                return;
            }

            this.removeDocument(document.uri);
        }
        let sourceFile = this.parser.parseFile(document.uri, document.getText());
        this.documents.set(document.uri, sourceFile);
        if (check) {
            const checker = new TypeChecker(this);
            sourceFile.additionalSyntacticDiagnostics = checker.checkSourceFile(sourceFile, true);
        }
        else {
            bindSourceFile(sourceFile, this);
        }
    }

    public async updateS2Workspace(workspace: SC2Workspace, lang: string) {
        this.s2workspace = workspace;
        this.s2metadata = new S2WorkspaceMetadata(this.s2workspace);
        await this.s2metadata.build(lang);
    }

    public getDocumentMeta(documentUri: string) {
        let documentPath = URI.parse(documentUri).fsPath;
        let meta: SourceFileMeta = {
            absoluteName: documentPath,
        };

        const isWin = process.platform === 'win32';
        if (isWin) {
            documentPath = documentPath.toLowerCase();
        }

        if (this.rootPath && (!this.s2workspace || !this.s2workspace.rootArchive) && documentPath.startsWith((isWin ? this.rootPath.toLowerCase() : this.rootPath) + path.sep)) {
            meta.relativeName = documentPath.substr(this.rootPath.length + 1);
        }
        else if (this.s2workspace) {
            for (const archive of this.s2workspace.allArchives) {
                if (documentPath.startsWith((isWin ? archive.directory.toLowerCase() : archive.directory) + path.sep)) {
                    meta.relativeName = documentPath.substr(archive.directory.length + 1);
                    meta.relativeName = meta.relativeName.replace(/^base\.sc2data[\/\\]/i, '');
                    meta.archive = archive;
                    break;
                }
            }
        }

        if (meta.relativeName) {
            meta.relativeName = meta.relativeName.replace(/\.galaxy$/i, '');
            if (isWin) {
                meta.relativeName = meta.relativeName.replace(/\\/g, '/');
            }
        }

        return meta;
    }

    public isUriInWorkspace(documentUri: string) {
        return typeof this.getDocumentMeta(documentUri).relativeName !== 'undefined';
    }

    public resolveGlobalSymbol(name: string): gt.Symbol | undefined {
        for (const doc of this.documents.values()) {
            if (doc.symbol.members.has(name)) {
                return doc.symbol.members.get(name);
            }
        }
    }
}
