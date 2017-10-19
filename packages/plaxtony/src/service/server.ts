import * as lsp from 'vscode-languageserver';
import {
    IPCMessageReader, IPCMessageWriter, createConnection, IConnection, TextDocuments, TextDocument,
    Diagnostic, DiagnosticSeverity, InitializeResult, TextDocumentPositionParams, CompletionItem,
    CompletionItemKind, SymbolInformation, DocumentSymbolParams, SymbolKind, Range, WorkspaceSymbolParams,
    SignatureHelp
} from 'vscode-languageserver';
import * as Types from '../compiler/types';
import { findAncestor } from '../compiler/utils';
import { Store, Workspace } from './store';
import { getPositionOfLineAndCharacter } from './utils';
import { DiagnosticsProvider } from './diagnostics';
import { NavigationProvider } from './navigation';
import { CompletionsProvider } from './completions';
import { SignaturesProvider } from './signatures';

function getNodeRange(node: Types.Node): Range {
    return {
        start: { line: node.line, character: node.char },
        end: { line: node.line, character: node.char }
    };
}

function translateDiagnostics(origDiagnostics: Types.Diagnostic[]): Diagnostic[] {
    let lspDiagnostics: Diagnostic[] = [];

    for (let dg of origDiagnostics) {
        lspDiagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
                start: { line: dg.line, character: dg.col },
                end: { line: dg.line, character: dg.col }
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

var formatElapsed = function(start: [number, number], end: [number, number]): string {
    const diff = process.hrtime(start);
    var elapsed = diff[1] / 1000000; // divide by a million to get nano to milli
    let out = '';
    if (diff[0] > 0) {
        out += diff[0] + "s ";
    }
    out += elapsed.toFixed(3) + "ms";
    return out;
}

function wrapRequest(name?: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const method = (<Function>descriptor.value);
        name = name ? name : propertyKey;
        descriptor.value = function() {
            const server = <Server>this;
            server.log(`Processing request '${name}'`);
            var start = process.hrtime();
            const ret = method.bind(this)(...arguments);
            server.log(`Done! It took ${formatElapsed(start, process.hrtime())}`);
            if (ret && ret[Symbol.iterator]) {
                server.log(`Results: ${ret.length}`);
            }
            return ret;
        }
    }
}

class Server {
    private connection: lsp.IConnection;
    private store: Store;
    private diagnosticsProvider: DiagnosticsProvider;
    private navigationProvider: NavigationProvider;
    private completionsProvider: CompletionsProvider;
    private signaturesProvider: SignaturesProvider;
    private documents: lsp.TextDocuments;

    constructor() {
        this.documents = new lsp.TextDocuments();
        this.store = new Store();
        this.diagnosticsProvider = new DiagnosticsProvider(this.store);
        this.navigationProvider = new NavigationProvider(this.store);
        this.completionsProvider = new CompletionsProvider(this.store);
        this.signaturesProvider = new SignaturesProvider(this.store);
    }

    public createConnection(connection?: lsp.IConnection): lsp.IConnection {
        this.connection = connection ? connection : createConnection(new lsp.IPCMessageReader(process), new lsp.IPCMessageWriter(process));
        this.documents.listen(this.connection);
        this.documents.onDidChangeContent(this.onDidChangeContent.bind(this));
        this.documents.onDidOpen(this.onDidOpen.bind(this));
        this.documents.onDidClose(this.onDidClose.bind(this));

        this.connection.onInitialize(this.onInitialize.bind(this));
        this.connection.onDidChangeConfiguration(this.onDidChangeConfiguration.bind(this));
        this.connection.onCompletion(this.onCompletion.bind(this));
        this.connection.onDocumentSymbol(this.onDocumentSymbol.bind(this));
        this.connection.onWorkspaceSymbol(this.onWorkspaceSymbol.bind(this));
        this.connection.onSignatureHelp(this.onSignatureHelp.bind(this));

        return this.connection;
    }

    public log(msg: string) {
        this.connection.console.log(msg);
    }

    @wrapRequest()
    private onInitialize(params: lsp.InitializeParams): lsp.InitializeResult {
        if (params.rootPath) {
            new Workspace(params.rootPath, this.store);
        }
        return {
            capabilities: {
                textDocumentSync: this.documents.syncKind,
                documentSymbolProvider: true,
                workspaceSymbolProvider: true,
                completionProvider: {
                    triggerCharacters: ['.'],
                },
                signatureHelpProvider: {
                    triggerCharacters: ['(', ','],
                },
            }
        }
    }

    @wrapRequest()
    private onDidChangeConfiguration() {
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

    @wrapRequest()
    private onDidChangeContent(ev: lsp.TextDocumentChangeEvent) {
        // this.connection.console.log('processing ' + ev.document.uri);
        this.store.updateDocument(ev.document);
        this.connection.sendDiagnostics({
            uri: ev.document.uri,
            diagnostics: translateDiagnostics(this.diagnosticsProvider.diagnose(ev.document.uri)),
        });
        // connection.console.log('onDidChangeContent');
        // validateTextDocument(e.document);
    }

    @wrapRequest()
    private onDidOpen(ev: lsp.TextDocumentChangeEvent) {
    }

    @wrapRequest()
    private onDidClose(ev: lsp.TextDocumentChangeEvent) {
    }

    @wrapRequest()
    private onCompletion(params: TextDocumentPositionParams): CompletionItem[] {
        return this.completionsProvider.getCompletionsAt(
            params.textDocument.uri,
            getPositionOfLineAndCharacter(this.store.documents.get(params.textDocument.uri), params.position.line, params.position.character)
        );
    }

    @wrapRequest()
    private onDocumentSymbol(params: DocumentSymbolParams): SymbolInformation[] {
        return translateDeclaratons(this.navigationProvider.getDocumentSymbols(params.textDocument.uri));
    }

    @wrapRequest()
    private onWorkspaceSymbol(params: WorkspaceSymbolParams): SymbolInformation[] {
        return translateDeclaratons(this.navigationProvider.getWorkspaceSymbols());
    }

    @wrapRequest()
    private onSignatureHelp(params: TextDocumentPositionParams): SignatureHelp {
        return this.signaturesProvider.getSignatureAt(
            params.textDocument.uri,
            getPositionOfLineAndCharacter(this.store.documents.get(params.textDocument.uri), params.position.line, params.position.character)
        );
    }
}

export function createServer(): lsp.IConnection {
    return (new Server()).createConnection();
}
