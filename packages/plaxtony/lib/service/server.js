"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const store_1 = require("./store");
const diagnostics_1 = require("./diagnostics");
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
            source: 'ex'
        });
    }
    return lspDiagnostics;
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
                completionProvider: {
                    resolveProvider: true
                }
            }
        };
    });
    let store = new store_1.Store();
    let diagnosticsProvider = new diagnostics_1.DiagnosticsProvider(store);
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
    function validateTextDocument(textDocument) {
        let diagnostics = [];
        let lines = textDocument.getText().split(/\r?\n/g);
        for (var i = 0; i < lines.length; i++) {
            let line = lines[i];
            let index = line.indexOf('typescript');
            if (index >= 0) {
                diagnostics.push({
                    severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
                    range: {
                        start: { line: i, character: index },
                        end: { line: i, character: index + 10 }
                    },
                    message: `${line.substr(index, 10)} should be spelled TypeScript`,
                    source: 'ex'
                });
            }
        }
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    }
    connection.onDidChangeWatchedFiles((_change) => {
        connection.console.log('We recevied an file change event');
    });
    connection.onCompletion((_textDocumentPosition) => {
        return [
            {
                label: 'TypeScript',
                kind: vscode_languageserver_1.CompletionItemKind.Text,
                data: 1
            },
            {
                label: 'JavaScript',
                kind: vscode_languageserver_1.CompletionItemKind.Text,
                data: 2
            }
        ];
    });
    connection.onCompletionResolve((item) => {
        if (item.data === 1) {
            item.detail = 'TypeScript details',
                item.documentation = 'TypeScript documentation';
        }
        else if (item.data === 2) {
            item.detail = 'JavaScript details',
                item.documentation = 'JavaScript documentation';
        }
        return item;
    });
    return connection;
}
exports.createServer = createServer;
