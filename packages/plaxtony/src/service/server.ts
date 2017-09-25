import {
    IPCMessageReader, IPCMessageWriter, createConnection, IConnection, TextDocuments, TextDocument,
    Diagnostic, DiagnosticSeverity, InitializeResult, TextDocumentPositionParams, CompletionItem,
    CompletionItemKind, SymbolInformation, DocumentSymbolParams, SymbolKind, Range, WorkspaceSymbolParams
} from 'vscode-languageserver';
import * as Types from '../compiler/types';
import { findAncestor } from '../compiler/utils';
import { Store } from './store';
import { getPositionOfLineAndCharacter } from './utils';
import { DiagnosticsProvider } from './diagnostics';
import { NavigationProvider } from './navigation';
import { CompletionsProvider } from './completions';

function getNodeRange(node: Types.Node): Range {
    return {
        start: { line: node.line - 1, character: node.char - 1 },
        end: { line: node.line - 1, character: node.char - 1 }
    };
}

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
        });
    }

    return lspDiagnostics;
}

function translateNodeKind(node: Types.Node): SymbolKind {
    switch (node.kind) {
        case Types.SyntaxKind.VariableDeclaration:
            const variable = <Types.VariableDeclaration>node;
            const isConstant = variable.modifiers.some((value: Types.Modifier): boolean => {
                return value.kind === Types.SyntaxKind.ConstKeyword;
            });
            return isConstant ? SymbolKind.Constant : SymbolKind.Variable;
        case Types.SyntaxKind.FunctionDeclaration:
            return SymbolKind.Function;
        case Types.SyntaxKind.StructDeclaration:
            return SymbolKind.Class;
        default:
            return SymbolKind.Field;
    }
}

function translateDeclaratons(origDeclarations: Types.NamedDeclaration[]): SymbolInformation[] {
    const symbols: SymbolInformation[] = [];
    let kind: SymbolKind;

    for (let node of origDeclarations) {
        const sourceFile = <Types.SourceFile>findAncestor(node, (element: Types.Node): boolean => {
            return element.kind === Types.SyntaxKind.SourceFile;
        })
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
                documentSymbolProvider: true,
                workspaceSymbolProvider: true,
                completionProvider: {
                    triggerCharacters: ['.'],
                }
            }
        }
    });

    let store = new Store();
    let diagnosticsProvider = new DiagnosticsProvider(store);
    let navigationProvider = new NavigationProvider(store);
    const completionsProvider = new CompletionsProvider(store);

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

    connection.onDidChangeWatchedFiles((_change) => {
        connection.console.log('We recevied an file change event');
    });


    connection.onCompletion((params: TextDocumentPositionParams): CompletionItem[] => {
        return completionsProvider.getCompletionsAt(
            params.textDocument.uri,
            getPositionOfLineAndCharacter(store.documents.get(params.textDocument.uri), params.position.line, params.position.character)
        );
    });

    connection.onDocumentSymbol((params: DocumentSymbolParams): SymbolInformation[] => {
        return translateDeclaratons(navigationProvider.getDocumentSymbols(params.textDocument.uri));
    });

    connection.onWorkspaceSymbol((params: WorkspaceSymbolParams): SymbolInformation[] => {
        return translateDeclaratons(navigationProvider.getWorkspaceSymbols());
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
