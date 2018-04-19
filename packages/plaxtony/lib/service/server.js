"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const lsp = require("vscode-languageserver");
const util = require("util");
const path = require("path");
const utils_1 = require("../compiler/utils");
const store_1 = require("./store");
const utils_2 = require("./utils");
const provider_1 = require("./provider");
const diagnostics_1 = require("./diagnostics");
const navigation_1 = require("./navigation");
const completions_1 = require("./completions");
const signatures_1 = require("./signatures");
const definitions_1 = require("./definitions");
const hover_1 = require("./hover");
const references_1 = require("./references");
const rename_1 = require("./rename");
const archive_1 = require("../sc2mod/archive");
const timers_1 = require("timers");
function getNodeRange(node) {
    return {
        start: { line: node.line, character: node.char },
        end: { line: node.line, character: node.char }
    };
}
function translateNodeKind(node) {
    switch (node.kind) {
        case 137 /* VariableDeclaration */:
            const variable = node;
            const isConstant = variable.modifiers.some((value) => {
                return value.kind === 52 /* ConstKeyword */;
            });
            return isConstant ? lsp.SymbolKind.Constant : lsp.SymbolKind.Variable;
        case 138 /* FunctionDeclaration */:
            return lsp.SymbolKind.Function;
        case 136 /* StructDeclaration */:
            return lsp.SymbolKind.Class;
        default:
            return lsp.SymbolKind.Field;
    }
}
function translateDeclaratons(origDeclarations) {
    const symbols = [];
    let kind;
    for (let node of origDeclarations) {
        const sourceFile = utils_1.findAncestor(node, (element) => {
            return element.kind === 124 /* SourceFile */;
        });
        symbols.push({
            kind: translateNodeKind(node),
            name: node.name.name,
            location: {
                uri: sourceFile.fileName,
                range: getNodeRange(node)
            },
        });
    }
    return symbols;
}
var formatElapsed = function (start, end) {
    const diff = process.hrtime(start);
    var elapsed = diff[1] / 1000000; // divide by a million to get nano to milli
    let out = '';
    if (diff[0] > 0) {
        out += diff[0] + "s ";
    }
    out += elapsed.toFixed(3) + "ms";
    return out;
};
function wrapRequest(msg, showArg, argFormatter) {
    return function (target, propertyKey, descriptor) {
        const method = descriptor.value;
        descriptor.value = function (...args) {
            return __awaiter(this, arguments, void 0, function* () {
                const server = this;
                let log = [];
                log.push('### ' + (msg ? msg : propertyKey));
                var start = process.hrtime();
                let ret;
                try {
                    ret = method.bind(this)(...arguments);
                    if (ret instanceof Promise) {
                        ret = yield ret;
                    }
                }
                catch (e) {
                    server.connection.console.error('[' + e.name + '] ' + e.message + '\n' + e.stack);
                }
                log.push(formatElapsed(start, process.hrtime()));
                if (ret && ret[Symbol.iterator]) {
                    log.push(`results: ${ret.length}`);
                }
                server.log(log.join(' | '));
                if (argFormatter) {
                    server.log(util.inspect(argFormatter(arguments[0])));
                }
                return ret;
            });
        };
    };
}
function mapFromObject(stuff) {
    const m = new Map();
    Object.keys(stuff).forEach((key) => {
        m.set(key, stuff[key]);
    });
    return m;
}
;
;
class Server {
    constructor() {
        this.store = new store_1.Store();
        this.documents = new lsp.TextDocuments();
        this.indexing = false;
        this.ready = false;
        this.documentUpdateRequests = new Map();
    }
    createProvider(cls) {
        return provider_1.createProvider(cls, this.store, this.connection.console);
    }
    createConnection(connection) {
        this.connection = connection ? connection : lsp.createConnection();
        this.diagnosticsProvider = this.createProvider(diagnostics_1.DiagnosticsProvider);
        this.navigationProvider = this.createProvider(navigation_1.NavigationProvider);
        this.completionsProvider = this.createProvider(completions_1.CompletionsProvider);
        this.signaturesProvider = this.createProvider(signatures_1.SignaturesProvider);
        this.definitionsProvider = this.createProvider(definitions_1.DefinitionProvider);
        this.hoverProvider = this.createProvider(hover_1.HoverProvider);
        this.referenceProvider = this.createProvider(references_1.ReferencesProvider);
        this.renameProvider = this.createProvider(rename_1.RenameProvider);
        this.renameProvider.referencesProvider = this.referenceProvider;
        this.documents.listen(this.connection);
        this.documents.onDidChangeContent(this.onDidChangeContent.bind(this));
        this.documents.onDidOpen(this.onDidOpen.bind(this));
        this.documents.onDidClose(this.onDidClose.bind(this));
        this.documents.onDidSave(this.onDidSave.bind(this));
        this.connection.onInitialize(this.onInitialize.bind(this));
        this.connection.onInitialized(this.onInitialized.bind(this));
        this.connection.onDidChangeConfiguration(this.onDidChangeConfiguration.bind(this));
        this.connection.onCompletion(this.onCompletion.bind(this));
        this.connection.onCompletionResolve(this.onCompletionResolve.bind(this));
        this.connection.onDocumentSymbol(this.onDocumentSymbol.bind(this));
        this.connection.onWorkspaceSymbol(this.onWorkspaceSymbol.bind(this));
        this.connection.onSignatureHelp(this.onSignatureHelp.bind(this));
        this.connection.onDefinition(this.onDefinition.bind(this));
        this.connection.onHover(this.onHover.bind(this));
        this.connection.onReferences(this.onReferences.bind(this));
        this.connection.onRenameRequest(this.onRenameRequest.bind(this));
        return this.connection;
    }
    log(msg) {
        this.connection.console.log(msg);
    }
    flushDocument(documentUri, isDirty = true) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.ready)
                return false;
            const req = this.documentUpdateRequests.get(documentUri);
            if (!req)
                return;
            if (req.promise) {
                yield req.promise;
            }
            else {
                timers_1.clearTimeout(req.timer);
                req.isDirty = isDirty;
                yield this.onUpdateContent(documentUri, req);
            }
        });
    }
    reindex(rootPath, modSources) {
        return __awaiter(this, void 0, void 0, function* () {
            let archivePath;
            let workspace;
            this.indexing = true;
            this.connection.sendNotification("indexStart");
            this.store.rootPath = rootPath;
            if (rootPath) {
                archivePath = yield store_1.findWorkspaceArchive(rootPath);
            }
            if (archivePath) {
                this.workspaceWatcher = new store_1.WorkspaceWatcher(archivePath);
                try {
                    workspace = yield archive_1.openArchiveWorkspace(new archive_1.SC2Archive(path.basename(archivePath), archivePath), modSources, mapFromObject(this.config.s2mod.overrides), mapFromObject(this.config.s2mod.extra));
                    this.log('Resolved archives:\n' + workspace.allArchives.map(item => {
                        return `${item.name}: ${item.directory}`;
                    }).join('\n'));
                }
                catch (e) {
                    this.connection.console.error('SC2 data couldn\'t be loaded: ' + e.message);
                    workspace = null;
                }
            }
            else if (rootPath) {
                this.workspaceWatcher = new store_1.WorkspaceWatcher(rootPath);
            }
            if (!workspace) {
                workspace = new archive_1.SC2Workspace(null, [new archive_1.SC2Archive('untitled.sc2mod', archive_1.resolveArchiveDirectory('mods/core.sc2mod', modSources))]);
            }
            this.log('Indexing s2workspace: ' + archivePath);
            yield this.store.updateS2Workspace(workspace, this.config.localization);
            for (const modArchive of workspace.dependencies) {
                for (const extSrc of yield modArchive.findFiles('**/*.galaxy')) {
                    this.onDidFindInWorkspace({ document: store_1.createTextDocumentFromFs(path.join(modArchive.directory, extSrc)) });
                }
            }
            if (this.workspaceWatcher) {
                this.workspaceWatcher.onDidOpen(this.onDidFindInWorkspace.bind(this));
                // workspace.onDidOpenS2Archive(this.onDidFindS2Workspace.bind(this));
                yield this.workspaceWatcher.watch();
            }
            for (const documentUri of this.documentUpdateRequests.keys()) {
                yield this.flushDocument(documentUri);
            }
            this.indexing = false;
            this.ready = true;
            this.connection.sendNotification("indexEnd");
        });
    }
    onInitialize(params) {
        return __awaiter(this, void 0, void 0, function* () {
            this.initParams = params;
            return {
                capabilities: {
                    textDocumentSync: this.documents.syncKind,
                    documentSymbolProvider: true,
                    workspaceSymbolProvider: true,
                    completionProvider: {
                        triggerCharacters: ['.'],
                        resolveProvider: true,
                    },
                    signatureHelpProvider: {
                        triggerCharacters: ['(', ','],
                    },
                    definitionProvider: true,
                    hoverProvider: true,
                    referencesProvider: true,
                    renameProvider: true,
                }
            };
        });
    }
    onInitialized(params) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    onDidChangeConfiguration(ev) {
        return __awaiter(this, void 0, void 0, function* () {
            this.log(util.inspect(ev.settings.sc2galaxy));
            this.config = ev.settings.sc2galaxy;
            switch (this.config.completion.functionExpand) {
                case "None":
                    this.completionsProvider.config.functionExpand = 0 /* None */;
                    break;
                case "Parenthesis":
                    this.completionsProvider.config.functionExpand = 1 /* Parenthesis */;
                    break;
                case "ArgumentsNull":
                    this.completionsProvider.config.functionExpand = 2 /* ArgumentsNull */;
                    break;
                case "ArgumentsDefault":
                    this.completionsProvider.config.functionExpand = 3 /* ArgumentsDefault */;
                    break;
            }
            this.referenceProvider.config = this.config.references;
            if (!this.indexing) {
                this.reindex(this.initParams.rootPath, this.initParams.initializationOptions.sources);
            }
        });
    }
    onDidChangeContent(ev) {
        return __awaiter(this, void 0, void 0, function* () {
            let req = this.documentUpdateRequests.get(ev.document.uri);
            if (req) {
                if (req.promise) {
                    yield req.promise;
                }
                else {
                    if (req.timer) {
                        timers_1.clearTimeout(req.timer);
                    }
                    this.documentUpdateRequests.delete(ev.document.uri);
                }
                req = null;
            }
            if (!req) {
                req = {
                    content: ev.document.getText(),
                    timer: null,
                    promise: null,
                    isDirty: true,
                    version: ev.document.version,
                };
            }
            if (!this.indexing && this.ready) {
                req.timer = timers_1.setTimeout(this.onUpdateContent.bind(this, ev.document.uri, req), this.config.documentUpdateDelay);
            }
            this.documentUpdateRequests.set(ev.document.uri, req);
        });
    }
    onUpdateContent(documentUri, req) {
        return __awaiter(this, void 0, void 0, function* () {
            req.promise = new Promise((resolve) => {
                this.store.updateDocument({
                    uri: documentUri,
                    getText: () => {
                        return req.content;
                    }
                });
                timers_1.setTimeout(this.onDiagnostics.bind(this, documentUri, req), req.isDirty ? this.config.documentDiagnosticsDelay : 1);
                this.documentUpdateRequests.delete(documentUri);
                resolve(true);
            });
            yield req.promise;
        });
    }
    onDiagnostics(documentUri, req) {
        if (this.documentUpdateRequests.has(documentUri))
            return;
        if (this.documents.keys().indexOf(documentUri) === -1)
            return;
        if (this.documents.get(documentUri).version > req.version)
            return;
        this.diagnosticsProvider.checkFile(documentUri);
        this.connection.sendDiagnostics({
            uri: documentUri,
            diagnostics: this.diagnosticsProvider.provideDiagnostics(documentUri),
        });
    }
    onDidOpen(ev) {
        this.store.openDocuments.set(ev.document.uri, true);
    }
    onDidClose(ev) {
        this.store.openDocuments.delete(ev.document.uri);
        if (!this.store.isDocumentInWorkspace(ev.document.uri)) {
            this.store.removeDocument(ev.document.uri);
            this.log('removed from store');
        }
        this.connection.sendDiagnostics({
            uri: ev.document.uri,
            diagnostics: [],
        });
    }
    onDidSave(ev) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.flushDocument(ev.document.uri, true);
        });
    }
    onDidFindInWorkspace(ev) {
        this.store.updateDocument(ev.document);
    }
    // @wrapRequest('Indexing workspace ', true, true)
    // private async onDidFindS2Workspace(ev: S2WorkspaceChangeEvent) {
    //     this.log('Updating archives');
    //     await this.store.updateS2Workspace(ev.workspace);
    //     this.log('Archives: ' + util.inspect(ev.workspace.allArchives, false, 1));
    // }
    onCompletion(params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.store.documents.has(params.textDocument.uri))
                return null;
            yield this.flushDocument(params.textDocument.uri);
            return this.completionsProvider.getCompletionsAt(params.textDocument.uri, utils_2.getPositionOfLineAndCharacter(this.store.documents.get(params.textDocument.uri), params.position.line, params.position.character));
        });
    }
    onCompletionResolve(params) {
        return this.completionsProvider.resolveCompletion(params);
    }
    onDocumentSymbol(params) {
        return translateDeclaratons(this.navigationProvider.getDocumentSymbols(params.textDocument.uri));
    }
    onWorkspaceSymbol(params) {
        return translateDeclaratons(this.navigationProvider.getWorkspaceSymbols(params.query));
    }
    onSignatureHelp(params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.store.documents.has(params.textDocument.uri))
                return null;
            yield this.flushDocument(params.textDocument.uri);
            return this.signaturesProvider.getSignatureAt(params.textDocument.uri, utils_2.getPositionOfLineAndCharacter(this.store.documents.get(params.textDocument.uri), params.position.line, params.position.character));
        });
    }
    onDefinition(params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.store.documents.has(params.textDocument.uri))
                return null;
            yield this.flushDocument(params.textDocument.uri);
            return this.definitionsProvider.getDefinitionAt(params.textDocument.uri, utils_2.getPositionOfLineAndCharacter(this.store.documents.get(params.textDocument.uri), params.position.line, params.position.character));
        });
    }
    onHover(params) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.flushDocument(params.textDocument.uri);
            return this.hoverProvider.getHoverAt(params);
        });
    }
    onReferences(params) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.flushDocument(params.textDocument.uri);
            return this.referenceProvider.onReferences(params);
        });
    }
    onRenameRequest(params) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.flushDocument(params.textDocument.uri);
            return this.renameProvider.onRenameRequest(params);
        });
    }
}
__decorate([
    wrapRequest()
], Server.prototype, "reindex", null);
__decorate([
    wrapRequest()
], Server.prototype, "onInitialize", null);
__decorate([
    wrapRequest()
], Server.prototype, "onInitialized", null);
__decorate([
    wrapRequest()
], Server.prototype, "onDidChangeConfiguration", null);
__decorate([
    wrapRequest()
], Server.prototype, "onDidChangeContent", null);
__decorate([
    wrapRequest()
], Server.prototype, "onUpdateContent", null);
__decorate([
    wrapRequest()
], Server.prototype, "onDiagnostics", null);
__decorate([
    wrapRequest('Opened', true, (payload) => payload.document.uri)
], Server.prototype, "onDidOpen", null);
__decorate([
    wrapRequest('Closed', true, (payload) => payload.document.uri)
], Server.prototype, "onDidClose", null);
__decorate([
    wrapRequest()
], Server.prototype, "onDidSave", null);
__decorate([
    wrapRequest('Indexing', true, (payload) => {
        return payload.document.uri;
    })
], Server.prototype, "onDidFindInWorkspace", null);
__decorate([
    wrapRequest()
], Server.prototype, "onCompletion", null);
__decorate([
    wrapRequest()
], Server.prototype, "onCompletionResolve", null);
__decorate([
    wrapRequest()
], Server.prototype, "onDocumentSymbol", null);
__decorate([
    wrapRequest()
], Server.prototype, "onWorkspaceSymbol", null);
__decorate([
    wrapRequest()
], Server.prototype, "onSignatureHelp", null);
__decorate([
    wrapRequest()
], Server.prototype, "onDefinition", null);
__decorate([
    wrapRequest()
], Server.prototype, "onHover", null);
__decorate([
    wrapRequest()
], Server.prototype, "onReferences", null);
__decorate([
    wrapRequest()
], Server.prototype, "onRenameRequest", null);
exports.Server = Server;
function createServer() {
    return (new Server()).createConnection();
}
exports.createServer = createServer;
//# sourceMappingURL=server.js.map