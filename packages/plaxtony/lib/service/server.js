"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const Types = require("../compiler/types");
const utils_1 = require("../compiler/utils");
const store_1 = require("./store");
const utils_2 = require("./utils");
const diagnostics_1 = require("./diagnostics");
const navigation_1 = require("./navigation");
const completions_1 = require("./completions");
function getNodeRange(node) {
    return {
        start: { line: node.line - 1, character: node.char - 1 },
        end: { line: node.line - 1, character: node.char - 1 }
    };
}
function translateDiagnostics(origDiagnostics) {
    let lspDiagnostics = [];
    for (let dg of origDiagnostics) {
        lspDiagnostics.push({
            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
            range: {
                start: { line: dg.line - 1, character: dg.col - 1 },
                end: { line: dg.line - 1, character: dg.col - 1 }
            },
            message: dg.messageText,
        });
    }
    return lspDiagnostics;
}
function translateNodeKind(node) {
    switch (node.kind) {
        case 134:
            const variable = node;
            const isConstant = variable.modifiers.some((value) => {
                return value.kind === 52;
            });
            return isConstant ? vscode_languageserver_1.SymbolKind.Constant : vscode_languageserver_1.SymbolKind.Variable;
        case 135:
            return vscode_languageserver_1.SymbolKind.Function;
        case 133:
            return vscode_languageserver_1.SymbolKind.Class;
        default:
            return vscode_languageserver_1.SymbolKind.Field;
    }
}
function translateDeclaratons(origDeclarations) {
    const symbols = [];
    let kind;
    for (let node of origDeclarations) {
        const sourceFile = utils_1.findAncestor(node, (element) => {
            return element.kind === 121;
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
function createServer() {
    let connection = vscode_languageserver_1.createConnection(new vscode_languageserver_1.IPCMessageReader(process), new vscode_languageserver_1.IPCMessageWriter(process));
    let documents = new vscode_languageserver_1.TextDocuments();
    documents.listen(connection);
    let workspaceRoot;
    connection.onInitialize((params) => {
        workspaceRoot = params.rootPath;
        return {
            capabilities: {
                textDocumentSync: documents.syncKind,
                documentSymbolProvider: true,
                workspaceSymbolProvider: true,
                completionProvider: {
                    triggerCharacters: ['.'],
                }
            }
        };
    });
    let store = new store_1.Store();
    let diagnosticsProvider = new diagnostics_1.DiagnosticsProvider(store);
    let navigationProvider = new navigation_1.NavigationProvider(store);
    const completionsProvider = new completions_1.CompletionsProvider(store);
    documents.onDidChangeContent((e) => {
        connection.console.log('update ' + e.document.uri);
        store.updateDocument(e.document);
        connection.console.log('preparing diagnostics');
        connection.sendDiagnostics({
            uri: e.document.uri,
            diagnostics: translateDiagnostics(diagnosticsProvider.diagnose()),
        });
        connection.console.log('done');
    });
    documents.onDidOpen((e) => {
        connection.console.log('open ' + e.document.uri);
    });
    connection.onDidChangeConfiguration((change) => {
        let settings = change.settings;
    });
    connection.onDidChangeWatchedFiles((_change) => {
        connection.console.log('We recevied an file change event');
    });
    connection.onCompletion((params) => {
        return completionsProvider.getCompletionsAt(params.textDocument.uri, utils_2.getPositionOfLineAndCharacter(store.documents.get(params.textDocument.uri), params.position.line, params.position.character));
    });
    connection.onDocumentSymbol((params) => {
        return translateDeclaratons(navigationProvider.getDocumentSymbols(params.textDocument.uri));
    });
    connection.onWorkspaceSymbol((params) => {
        return translateDeclaratons(navigationProvider.getWorkspaceSymbols());
    });
    return connection;
}
exports.createServer = createServer;
