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
const Types = require("../compiler/types");
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
const archive_1 = require("../sc2mod/archive");
function getNodeRange(node) {
    return {
        start: { line: node.line, character: node.char },
        end: { line: node.line, character: node.char }
    };
}
function translateDiagnostics(sourceFile, origDiagnostics) {
    let lspDiagnostics = [];
    for (let dg of origDiagnostics) {
        lspDiagnostics.push({
            severity: lsp.DiagnosticSeverity.Error,
            range: {
                start: utils_2.getLineAndCharacterOfPosition(sourceFile, dg.start),
                end: utils_2.getLineAndCharacterOfPosition(sourceFile, dg.start + dg.length)
            },
            message: dg.messageText,
        });
    }
    return lspDiagnostics;
}
function translateNodeKind(node) {
    switch (node.kind) {
        case 135 /* VariableDeclaration */:
            const variable = node;
            const isConstant = variable.modifiers.some((value) => {
                return value.kind === 52 /* ConstKeyword */;
            });
            return isConstant ? lsp.SymbolKind.Constant : lsp.SymbolKind.Variable;
        case 136 /* FunctionDeclaration */:
            return lsp.SymbolKind.Function;
        case 134 /* StructDeclaration */:
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
            return element.kind === 122 /* SourceFile */;
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
function wrapRequest(msg, showArg, singleLine) {
    return function (target, propertyKey, descriptor) {
        const method = descriptor.value;
        descriptor.value = function (...args) {
            const server = this;
            let log = [];
            // args = args.map((value) => {
            //     if (!value) { return; }
            //     if (value['document']) {
            //         return value.document.uri;
            //     }
            //     else if (value['name']) {
            //         return value.name;
            //     }
            //     else {
            //         return value.toString();
            //     }
            // });
            if (msg) {
                log.push(`${msg}: ${util.inspect(args, true, 2)}`);
            }
            else {
                log.push(`### Processing '${propertyKey}'`);
            }
            var start = process.hrtime();
            let ret;
            try {
                ret = method.bind(this)(...arguments);
            }
            catch (e) {
                server.connection.console.error('[' + e.name + '] ' + e.message + '\n' + e.stack);
            }
            log.push(formatElapsed(start, process.hrtime()));
            if (ret && ret[Symbol.iterator]) {
                log.push(`results: ${ret.length}`);
            }
            server.log(log.join(' | '));
            return ret;
        };
    };
}
class Server {
    constructor() {
        this.store = new store_1.Store();
        this.documents = new lsp.TextDocuments();
    }
    createProvider(cls) {
        return provider_1.createProvider(cls, this.store, this.connection.console);
    }
    createConnection(connection) {
        this.connection = connection ? connection : lsp.createConnection(new lsp.IPCMessageReader(process), new lsp.IPCMessageWriter(process));
        this.diagnosticsProvider = this.createProvider(diagnostics_1.DiagnosticsProvider);
        this.navigationProvider = this.createProvider(navigation_1.NavigationProvider);
        this.completionsProvider = this.createProvider(completions_1.CompletionsProvider);
        this.signaturesProvider = this.createProvider(signatures_1.SignaturesProvider);
        this.definitionsProvider = this.createProvider(definitions_1.DefinitionProvider);
        this.hoverProvider = this.createProvider(hover_1.HoverProvider);
        this.documents.listen(this.connection);
        this.documents.onDidChangeContent(this.onDidChangeContent.bind(this));
        this.documents.onDidOpen(this.onDidOpen.bind(this));
        this.documents.onDidClose(this.onDidClose.bind(this));
        this.connection.onInitialize(this.onInitialize.bind(this));
        this.connection.onDidChangeConfiguration(this.onDidChangeConfiguration.bind(this));
        this.connection.onCompletion(this.onCompletion.bind(this));
        this.connection.onCompletionResolve(this.onCompletionResolve.bind(this));
        this.connection.onDocumentSymbol(this.onDocumentSymbol.bind(this));
        this.connection.onWorkspaceSymbol(this.onWorkspaceSymbol.bind(this));
        this.connection.onSignatureHelp(this.onSignatureHelp.bind(this));
        this.connection.onDefinition(this.onDefinition.bind(this));
        this.connection.onHover(this.onHover.bind(this));
        return this.connection;
    }
    log(msg) {
        this.connection.console.log(msg);
    }
    reindex(rootPath, modSources) {
        return __awaiter(this, void 0, void 0, function* () {
            let archivePath;
            let workspace;
            if (rootPath) {
                archivePath = yield store_1.findWorkspaceArchive(rootPath);
            }
            if (archivePath) {
                this.workspaceWatcher = new store_1.WorkspaceWatcher(archivePath);
                try {
                    workspace = yield archive_1.openArchiveWorkspace(new archive_1.SC2Archive(path.basename(archivePath), archivePath), modSources);
                }
                catch (e) {
                    this.connection.console.error('Trigger data couldn\'t be loaded: ' + e.message);
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
            yield this.store.updateS2Workspace(workspace);
            for (const modArchive of workspace.dependencies) {
                for (const extSrc of yield modArchive.findFiles('*.galaxy')) {
                    this.onDidFindInWorkspace({ document: store_1.createTextDocumentFromFs(path.join(modArchive.directory, extSrc)) });
                }
            }
            if (this.workspaceWatcher) {
                this.workspaceWatcher.onDidOpen(this.onDidFindInWorkspace.bind(this));
                // workspace.onDidOpenS2Archive(this.onDidFindS2Workspace.bind(this));
                yield this.workspaceWatcher.watch();
            }
        });
    }
    onInitialize(params) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.reindex(params.rootPath, params.initializationOptions.sources);
            this.log('ready');
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
                    hoverProvider: true
                }
            };
        });
    }
    onDidChangeConfiguration(ev) {
        // interface Settings {
        //     plaxtony: ExampleSettings;
        // }
        // interface ExampleSettings {
        //     // maxNumberOfProblems: number;
        // }
        // let maxNumberOfProblems: number;
        // let settings = <Settings>change.settings;
        // maxNumberOfProblems = settings.plaxtony.maxNumberOfProblems || 100;
        // Revalidate any open text documents
        // documents.all().forEach(validateTextDocument);
    }
    onDidChangeContent(ev) {
        this.store.updateDocument(ev.document);
        if (this.documents.keys().indexOf(ev.document.uri) !== undefined) {
            this.connection.sendDiagnostics({
                uri: ev.document.uri,
                diagnostics: translateDiagnostics(this.store.documents.get(ev.document.uri), this.diagnosticsProvider.diagnose(ev.document.uri)),
            });
        }
    }
    onDidOpen(ev) {
    }
    onDidClose(ev) {
        this.connection.sendDiagnostics({
            uri: ev.document.uri,
            diagnostics: [],
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
        return this.completionsProvider.getCompletionsAt(params.textDocument.uri, utils_2.getPositionOfLineAndCharacter(this.store.documents.get(params.textDocument.uri), params.position.line, params.position.character));
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
        return this.signaturesProvider.getSignatureAt(params.textDocument.uri, utils_2.getPositionOfLineAndCharacter(this.store.documents.get(params.textDocument.uri), params.position.line, params.position.character));
    }
    onDefinition(params) {
        return this.definitionsProvider.getDefinitionAt(params.textDocument.uri, utils_2.getPositionOfLineAndCharacter(this.store.documents.get(params.textDocument.uri), params.position.line, params.position.character));
    }
    onHover(params) {
        return this.hoverProvider.getHoverAt(params);
    }
}
__decorate([
    wrapRequest()
], Server.prototype, "onInitialize", null);
__decorate([
    wrapRequest()
], Server.prototype, "onDidChangeConfiguration", null);
__decorate([
    wrapRequest()
], Server.prototype, "onDidChangeContent", null);
__decorate([
    wrapRequest()
], Server.prototype, "onDidOpen", null);
__decorate([
    wrapRequest()
], Server.prototype, "onDidClose", null);
__decorate([
    wrapRequest('Indexing: ', true, true)
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
exports.Server = Server;
function createServer() {
    return (new Server()).createConnection();
}
exports.createServer = createServer;
//# sourceMappingURL=server.js.map