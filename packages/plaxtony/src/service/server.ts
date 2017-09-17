import {
    IPCMessageReader, IPCMessageWriter, createConnection, IConnection, TextDocuments, TextDocument,
    Diagnostic, DiagnosticSeverity, InitializeResult, TextDocumentPositionParams, CompletionItem,
    CompletionItemKind
} from 'vscode-languageserver';
import * as Types from '../compiler/types';
import { Store } from './store';
import { DiagnosticsProvider } from './diagnostics';

function translateDiagnostics(origDiagnostics: Types.Diagnostic[]): Diagnostic[] {
    let lspDiagnostics: Diagnostic[] = [];

    for (let dg of origDiagnostics) {
        lspDiagnostics.push({
            severity: DiagnosticSeverity.Error,
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

export function createServer(): IConnection {
    let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

    let documents: TextDocuments = new TextDocuments();
    documents.listen(connection);

    let workspaceRoot: string;
    connection.onInitialize((params): InitializeResult => {
        workspaceRoot = params.rootPath;
        return {
            capabilities: {
                textDocumentSync: documents.syncKind,
                completionProvider: {
                    resolveProvider: true
                }
            }
        }
    });

    let store = new Store();
    let diagnosticsProvider = new DiagnosticsProvider(store);

    documents.onDidChangeContent((e) => {
        connection.console.log('update ' + e.document.uri);
        store.updateDocument(e.document);
        connection.console.log('preparing diagnostics');
        connection.sendDiagnostics({
            uri: e.document.uri,
            diagnostics: translateDiagnostics(diagnosticsProvider.diagnose()),
        });
        connection.console.log('done');
        // connection.console.log('onDidChangeContent');
        // validateTextDocument(e.document);
    });

    documents.onDidOpen((e) => {
        // store.addDocument(e.document);
        connection.console.log('open ' + e.document.uri);
    });

    interface Settings {
        plaxtony: ExampleSettings;
    }

    interface ExampleSettings {
        // maxNumberOfProblems: number;
    }

    // let maxNumberOfProblems: number;

    connection.onDidChangeConfiguration((change) => {
        let settings = <Settings>change.settings;
        // maxNumberOfProblems = settings.plaxtony.maxNumberOfProblems || 100;
        // Revalidate any open text documents
        // documents.all().forEach(validateTextDocument);
    });

    function validateTextDocument(textDocument: TextDocument): void {
        let diagnostics: Diagnostic[] = [];
        let lines = textDocument.getText().split(/\r?\n/g);
        for (var i = 0; i < lines.length; i++) {
            let line = lines[i];
            let index = line.indexOf('typescript');
            if (index >= 0) {
                diagnostics.push({
                    severity: DiagnosticSeverity.Warning,
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


    // This handler provides the initial list of the completion items.
    connection.onCompletion((_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
        return [
            {
                label: 'TypeScript',
                kind: CompletionItemKind.Text,
                data: 1
            },
            {
                label: 'JavaScript',
                kind: CompletionItemKind.Text,
                data: 2
            }
        ]
    });

    // This handler resolve additional information for the item selected in
    // the completion list.
    connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
        if (item.data === 1) {
            item.detail = 'TypeScript details',
                item.documentation = 'TypeScript documentation'
        } else if (item.data === 2) {
            item.detail = 'JavaScript details',
                item.documentation = 'JavaScript documentation'
        }
        return item;
    });

    /*
    connection.onDidOpenTextDocument((params) => {
        // A text document got opened in VSCode.
        // params.uri uniquely identifies the document. For documents store on disk this is a file URI.
        // params.text the initial full content of the document.
        connection.console.log(`${params.textDocument.uri} opened.`);
    });
    connection.onDidChangeTextDocument((params) => {
        // The content of a text document did change in VSCode.
        // params.uri uniquely identifies the document.
        // params.contentChanges describe the content changes to the document.
        connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
    });
    connection.onDidCloseTextDocument((params) => {
        // A text document got closed in VSCode.
        // params.uri uniquely identifies the document.
        connection.console.log(`${params.textDocument.uri} closed.`);
    });
    */

    return connection;
}
