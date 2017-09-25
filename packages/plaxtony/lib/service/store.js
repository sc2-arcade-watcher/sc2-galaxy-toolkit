"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("../compiler/parser");
const binder_1 = require("../compiler/binder");
const path = require("path");
const fs = require("fs");
const glob = require("glob");
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
    return createTextDocument(`file://${filepath}`, fs.readFileSync(filepath, 'utf8'));
}
exports.createTextDocumentFromFs = createTextDocumentFromFs;
class IndexedDocument {
}
exports.IndexedDocument = IndexedDocument;
class Workspace {
    constructor(workspacePath, store) {
        this.workspacePath = path.join(path.resolve(workspacePath), '**/*.galaxy');
        this.store = store;
        for (let filepath of glob.sync(this.workspacePath)) {
            this.store.updateDocument(createTextDocumentFromFs(filepath));
        }
    }
}
exports.Workspace = Workspace;
class Store {
    constructor() {
        this.documents = new Map();
    }
    initialize() {
    }
    updateDocument(document) {
        let p = new parser_1.Parser();
        let sourceFile = p.parseFile(document.uri, document.getText());
        binder_1.bindSourceFile(sourceFile);
        this.documents.set(document.uri, sourceFile);
    }
}
exports.Store = Store;
