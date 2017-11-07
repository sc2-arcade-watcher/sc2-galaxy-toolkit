"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const lsp = require("vscode-languageserver");
const Types = require("../compiler/types");
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
        case 134 /* VariableDeclaration */:
            const variable = node;
            const isConstant = variable.modifiers.some((value) => {
                return value.kind === 52 /* ConstKeyword */;
            });
            return isConstant ? lsp.SymbolKind.Constant : lsp.SymbolKind.Variable;
        case 135 /* FunctionDeclaration */:
            return lsp.SymbolKind.Function;
        case 133 /* StructDeclaration */:
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
            return element.kind === 121 /* SourceFile */;
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
            args = args.map((value) => {
                if (!value) {
                    return;
                }
                if (value['document']) {
                    return value.document.uri;
                }
                else {
                    return value.toString();
                }
            });
            if (msg) {
                log.push(`${msg}: ${args.toLocaleString()}`);
            }
            else {
                log.push(`### Processing '${propertyKey}'`);
            }
            var start = process.hrtime();
            const ret = method.bind(this)(...arguments);
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
        this.workspaces = [];
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
    onInitialize(params) {
        if (params.initializationOptions.sources) {
            for (const s2path of params.initializationOptions.sources) {
                this.log('Indexing s2 sources: ' + s2path);
                const ws = new store_1.S2Workspace(s2path);
                ws.onDidOpen(this.onDidFindInWorkspace.bind(this));
                // ws.onDidOpen((ev) => {
                //     this.log('Indexing archive galaxy: ' + ev.document.uri);
                //     // this.store.updateArchive(ev.archive);
                // });
                ws.onDidOpenS2Archive((ev) => {
                    this.log('Indexed archive: ' + ev.archive.directory);
                    this.store.updateArchive(ev.archive);
                });
                ws.watch().then(() => {
                    this.log('ready');
                }, (err) => {
                    this.log('e: ' + err);
                });
            }
        }
        if (params.rootPath) {
            const ws = new store_1.Workspace(params.rootPath);
            ws.onDidOpen(this.onDidFindInWorkspace.bind(this));
            this.workspaces.push(ws);
            ws.watch();
        }
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