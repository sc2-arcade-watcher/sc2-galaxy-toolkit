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
            return path.extname(dir).toLowerCase() === 'sc2map';
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

export class Store {
    private parser = new Parser();
    public documents = new Map<string, SourceFile>();
    public s2workspace: SC2Workspace;
    public s2metadata: S2WorkspaceMetadata;
    // protected watchers = new Map<string, WorkspaceWatcher>();

    public updateDocument(document: lsp.TextDocument) {
        if (this.documents.has(document.uri)) {
            const currSorceFile = this.documents.get(document.uri);
            if (document.getText().length === currSorceFile.text.length && document.getText().valueOf() === currSorceFile.text.valueOf()) {
                return;
            }

            unbindSourceFile(currSorceFile, this);
            this.documents.delete(document.uri);
        }
        let sourceFile = this.parser.parseFile(document.uri, document.getText());
        bindSourceFile(sourceFile, this);
        this.documents.set(document.uri, sourceFile);
    }

    public async updateS2Workspace(workspace: SC2Workspace, lang: string) {
        this.s2workspace = workspace;
        this.s2metadata = new S2WorkspaceMetadata(this.s2workspace);
        await this.s2metadata.build(lang);
    }

    public resolveGlobalSymbol(name: string): gt.Symbol | undefined {
        for (const doc of this.documents.values()) {
            if (doc.symbol.members.has(name)) {
                return doc.symbol.members.get(name);
            }
        }
    }
}
