"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../compiler/parser");
const s2meta_1 = require("./s2meta");
const binder_1 = require("../compiler/binder");
const archive_1 = require("../sc2mod/archive");
const lsp = require("vscode-languageserver");
const path = require("path");
const fs = require("fs");
const glob = require("glob");
const vscode_uri_1 = require("vscode-uri");
const checker_1 = require("../compiler/checker");
const vscode_uri_2 = require("vscode-uri");
function createTextDocument(uri, text) {
    return {
        uri: uri,
        languageId: 'galaxy',
        version: 0,
        getText: () => text,
    };
}
exports.createTextDocument = createTextDocument;
function createTextDocumentFromFs(filepath) {
    filepath = path.resolve(filepath);
    return createTextDocument(vscode_uri_1.default.file(filepath).toString(), fs.readFileSync(filepath, 'utf8'));
}
exports.createTextDocumentFromFs = createTextDocumentFromFs;
function createTextDocumentFromUri(uri) {
    return createTextDocument(uri, fs.readFileSync(vscode_uri_1.default.parse(uri).fsPath, 'utf8'));
}
exports.createTextDocumentFromUri = createTextDocumentFromUri;
class IndexedDocument {
}
exports.IndexedDocument = IndexedDocument;
;
class WorkspaceWatcher {
    constructor(workspacePath) {
        this.workspacePath = workspacePath;
        this._onDidOpen = new lsp.Emitter();
    }
    watchFiles() {
        // TODO: filewatch
        const files = glob.sync(path.join(path.resolve(this.workspacePath), '**/*.galaxy'));
        for (let filepath of files) {
            this._onDidOpen.fire({ document: createTextDocumentFromFs(filepath) });
        }
    }
    watch() {
        this.watchFiles();
    }
    get onDidOpen() {
        return this._onDidOpen.event;
    }
}
exports.WorkspaceWatcher = WorkspaceWatcher;
class S2WorkspaceWatcher extends WorkspaceWatcher {
    constructor(workspacePath, modSources) {
        super(workspacePath);
        this.modSources = [];
        this.modSources = modSources;
        this._onDidOpenS2Workspace = new lsp.Emitter();
    }
    get onDidOpenS2Archive() {
        return this._onDidOpenS2Workspace.event;
    }
    // public setSources(sources: string[]) {
    //     this.modSources = sources;
    // }
    watch() {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            _super("watch").call(this);
            const rootArchive = new archive_1.SC2Archive(path.basename(this.workspacePath), this.workspacePath);
            const workspace = yield archive_1.openArchiveWorkspace(rootArchive, this.modSources);
            for (const modArchive of workspace.dependencies) {
                for (const extSrc of yield modArchive.findFiles('**/*.galaxy')) {
                    this._onDidOpen.fire({ document: createTextDocumentFromFs(path.join(modArchive.directory, extSrc)) });
                }
            }
            this._onDidOpenS2Workspace.fire({
                src: this.workspacePath,
                workspace: workspace,
            });
        });
    }
}
exports.S2WorkspaceWatcher = S2WorkspaceWatcher;
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
function findWorkspaceArchive(rootPath) {
    return __awaiter(this, void 0, void 0, function* () {
        if (archive_1.isSC2Archive(rootPath)) {
            return rootPath;
        }
        const archives = yield archive_1.findSC2ArchiveDirectories(rootPath);
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
    });
}
exports.findWorkspaceArchive = findWorkspaceArchive;
class Store {
    constructor() {
        this.parser = new parser_1.Parser();
        this.documents = new Map();
        this.openDocuments = new Map();
    }
    // protected watchers = new Map<string, WorkspaceWatcher>();
    removeDocument(documentUri) {
        const currSorceFile = this.documents.get(documentUri);
        if (!currSorceFile)
            return;
        binder_1.unbindSourceFile(currSorceFile, this);
        this.documents.delete(documentUri);
    }
    getFirstMatchingDocument(partialname) {
        for (const [fullname, sourceFile] of this.documents.entries()) {
            if (fullname.endsWith(partialname)) {
                return sourceFile;
            }
        }
        return null;
    }
    updateDocument(document, check = false) {
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
            const checker = new checker_1.TypeChecker(this);
            sourceFile.additionalSyntacticDiagnostics = checker.checkSourceFile(sourceFile, true);
        }
        else {
            binder_1.bindSourceFile(sourceFile, this);
        }
    }
    updateS2Workspace(workspace, lang) {
        return __awaiter(this, void 0, void 0, function* () {
            this.s2workspace = workspace;
            this.s2metadata = new s2meta_1.S2WorkspaceMetadata(this.s2workspace);
            yield this.s2metadata.build(lang);
        });
    }
    isUriInWorkspace(documentUri, includeDepds = true) {
        const documentPath = vscode_uri_2.default.parse(documentUri).fsPath;
        if (this.rootPath && !this.s2workspace && documentPath.startsWith(this.rootPath)) {
            return true;
        }
        if (includeDepds && this.s2workspace) {
            for (const archive of this.s2workspace.allArchives) {
                if (documentPath.startsWith(archive.directory + path.sep))
                    return true;
            }
        }
        return false;
    }
    resolveGlobalSymbol(name) {
        for (const doc of this.documents.values()) {
            if (doc.symbol.members.has(name)) {
                return doc.symbol.members.get(name);
            }
        }
    }
}
exports.Store = Store;
//# sourceMappingURL=store.js.map