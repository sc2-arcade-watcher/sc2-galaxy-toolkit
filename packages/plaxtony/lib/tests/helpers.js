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
const parser_1 = require("../src/compiler/parser");
const store_1 = require("../src/service/store");
const path = require("path");
const fixturesPath = 'tests/fixtures';
function fixtureFilePath(...filepath) {
    return path.join(fixturesPath, ...filepath);
}
exports.fixtureFilePath = fixtureFilePath;
function mockupTextDocument(...filepath) {
    return store_1.createTextDocumentFromFs(fixtureFilePath(...filepath));
}
exports.mockupTextDocument = mockupTextDocument;
function mockupSourceFile(...filepath) {
    const parser = new parser_1.Parser();
    const completeFilePath = fixtureFilePath(...filepath);
    const document = store_1.createTextDocumentFromFs(completeFilePath);
    return parser.parseFile(path.basename(completeFilePath), document.getText());
}
exports.mockupSourceFile = mockupSourceFile;
function mockupStoreDocument(...filepath) {
    const store = new store_1.Store();
    const document = store_1.createTextDocumentFromFs(fixtureFilePath(...filepath));
    store.updateDocument(document);
    return store.documents.get(document.uri);
}
exports.mockupStoreDocument = mockupStoreDocument;
function mockupStore(...documents) {
    const store = new store_1.Store();
    for (const doc of documents) {
        store.updateDocument(doc);
    }
    return store;
}
exports.mockupStore = mockupStore;
function mockupStoreFromDirectory(directory) {
    return new Promise((resolve, reject) => {
        try {
            const store = new store_1.Store();
            store.rootPath = directory;
            const ws = new store_1.WorkspaceWatcher(directory);
            ws.onDidOpen((ev) => {
                store.updateDocument(ev.document);
            });
            ws.watch();
            resolve(store);
        }
        catch (err) {
            reject(err);
        }
    });
}
exports.mockupStoreFromDirectory = mockupStoreFromDirectory;
function mockupStoreFromS2Workspace(directory, modSources) {
    return __awaiter(this, void 0, void 0, function* () {
        const store = new store_1.Store();
        const ws = new store_1.S2WorkspaceWatcher(directory, modSources);
        const workspaces = [];
        ws.onDidOpen((ev) => {
            store.updateDocument(ev.document);
        });
        ws.onDidOpenS2Archive((ev) => {
            workspaces.push(ev.workspace);
        });
        yield ws.watch();
        for (const ws of workspaces) {
            yield store.updateS2Workspace(ws, 'enUS');
        }
        return store;
    });
}
exports.mockupStoreFromS2Workspace = mockupStoreFromS2Workspace;
function mapStoreFilesByBasename(store) {
    const m = new Map();
    for (const [fullname, sourceFile] of store.documents.entries()) {
        m.set(path.basename(fullname), sourceFile);
    }
    return m;
}
exports.mapStoreFilesByBasename = mapStoreFilesByBasename;
function printDiagnostics(diagnostics) {
    const r = [];
    for (const diag of diagnostics) {
        console.log(diag);
        r.push(diag.toString());
    }
    return r.join('\n');
}
//# sourceMappingURL=helpers.js.map