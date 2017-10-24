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
const utils_1 = require("../compiler/utils");
const parser_1 = require("../compiler/parser");
const binder_1 = require("../compiler/binder");
const archive_1 = require("../sc2mod/archive");
const lsp = require("vscode-languageserver");
const path = require("path");
const fs = require("fs");
const glob = require("glob");
const vscode_uri_1 = require("vscode-uri");
function createTextDocument(uri, text) {
    return {
        uri: uri,
        languageId: 'galaxy',
        version: 1,
        getText: () => text,
    };
}
exports.createTextDocument = createTextDocument;
function createTextDocumentFromFs(filepath) {
    filepath = path.resolve(filepath);
    return createTextDocument(vscode_uri_1.default.file(filepath).toString(), fs.readFileSync(filepath, 'utf8'));
}
exports.createTextDocumentFromFs = createTextDocumentFromFs;
class IndexedDocument {
}
exports.IndexedDocument = IndexedDocument;
;
class Workspace {
    constructor(workspacePath) {
        this.workspacePath = workspacePath;
        this._onDidStart = new lsp.Emitter();
        this._onDidEnd = new lsp.Emitter();
        this._onDidOpen = new lsp.Emitter();
    }
    watch() {
        this._onDidStart.fire(this.workspacePath);
        const files = glob.sync(path.join(path.resolve(this.workspacePath), '**/*.galaxy'));
        for (let filepath of files) {
            this._onDidOpen.fire({ document: createTextDocumentFromFs(filepath) });
        }
        this._onDidEnd.fire(files.length);
    }
    get onDidStart() {
        return this._onDidStart.event;
    }
    get onDidEnd() {
        return this._onDidEnd.event;
    }
    get onDidOpen() {
        return this._onDidOpen.event;
    }
}
exports.Workspace = Workspace;
class S2Workspace extends Workspace {
    constructor(workspacePath) {
        super(workspacePath);
        this._onDidOpenS2Archive = new lsp.Emitter();
    }
    watch() {
        return __awaiter(this, void 0, void 0, function* () {
            this._onDidStart.fire(this.workspacePath);
            const files = glob.sync(path.join(path.resolve(this.workspacePath), '**/*.galaxy'));
            for (let filepath of files) {
                this._onDidOpen.fire({ document: createTextDocumentFromFs(filepath) });
            }
            if (archive_1.isSC2Archive(this.workspacePath)) {
                const modpath = path.resolve(this.workspacePath);
                const archive = new archive_1.SC2Archive();
                yield archive.openFromDirectory(modpath);
                this._onDidOpenS2Archive.fire({
                    localPath: '',
                    archive: archive
                });
            }
            for (let modpath of yield archive_1.findSC2Archives(path.resolve(this.workspacePath))) {
                const archive = new archive_1.SC2Archive();
                yield archive.openFromDirectory(modpath);
                this._onDidOpenS2Archive.fire({
                    localPath: '',
                    archive: archive
                });
            }
            this._onDidEnd.fire(files.length);
        });
    }
    get onDidOpenS2Archive() {
        return this._onDidOpenS2Archive.event;
    }
}
exports.S2Workspace = S2Workspace;
class Store {
    constructor() {
        this.documents = new Map();
        this.s2archives = new Map();
    }
    initialize() {
    }
    updateDocument(document) {
        let p = new parser_1.Parser();
        let sourceFile = p.parseFile(document.uri, document.getText());
        binder_1.bindSourceFile(sourceFile);
        this.documents.set(document.uri, sourceFile);
    }
    updateArchive(archive) {
        this.s2archives.set(archive.directory, archive);
    }
    getArchiveOfSourceFile(sourceFile) {
        for (const archive of this.s2archives.values()) {
            const filePath = vscode_uri_1.default.parse(sourceFile.fileName).fsPath;
            if (filePath.indexOf(archive.directory) === 0) {
                return archive;
            }
        }
    }
    getSymbolMetadata(symbol) {
        const sourceFile = utils_1.getSourceFileOfNode(symbol.declarations[0]);
        const archive = this.getArchiveOfSourceFile(sourceFile);
        if (!archive) {
            return undefined;
        }
        return archive.trigLibs.findElementByName(symbol.escapedName);
    }
}
exports.Store = Store;
//# sourceMappingURL=store.js.map