import * as lsp from 'vscode-languageserver';
import * as Types from '../compiler/types';
import { findAncestor } from '../compiler/utils';
import { Store, Workspace, S2Workspace } from './store';
import { getPositionOfLineAndCharacter } from './utils';
import { AbstractProvider, LoggerConsole, createProvider } from './provider';
import { DiagnosticsProvider } from './diagnostics';
import { NavigationProvider } from './navigation';
import { CompletionsProvider } from './completions';
import { SignaturesProvider } from './signatures';
import { DefinitionProvider } from './definitions';

function getNodeRange(node: Types.Node): lsp.Range {
    return {
        start: { line: node.line, character: node.char },
        end: { line: node.line, character: node.char }
    };
}

function translateDiagnostics(origDiagnostics: Types.Diagnostic[]): lsp.Diagnostic[] {
    let lspDiagnostics: lsp.Diagnostic[] = [];

    for (let dg of origDiagnostics) {
        lspDiagnostics.push({
            severity: lsp.DiagnosticSeverity.Error,
            range: {
                start: { line: dg.line, character: dg.col },
                end: { line: dg.line, character: dg.col }
            },
            message: dg.messageText,
        });
    }

    return lspDiagnostics;
}

function translateNodeKind(node: Types.Node): lsp.SymbolKind {
    switch (node.kind) {
        case Types.SyntaxKind.VariableDeclaration:
            const variable = <Types.VariableDeclaration>node;
            const isConstant = variable.modifiers.some((value: Types.Modifier): boolean => {
                return value.kind === Types.SyntaxKind.ConstKeyword;
            });
            return isConstant ? lsp.SymbolKind.Constant : lsp.SymbolKind.Variable;
        case Types.SyntaxKind.FunctionDeclaration:
            return lsp.SymbolKind.Function;
        case Types.SyntaxKind.StructDeclaration:
            return lsp.SymbolKind.Class;
        default:
            return lsp.SymbolKind.Field;
    }
}

function translateDeclaratons(origDeclarations: Types.NamedDeclaration[]): lsp.SymbolInformation[] {
    const symbols: lsp.SymbolInformation[] = [];
    let kind: lsp.SymbolKind;

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

function wrapRequest(msg?: string, showArg?: boolean, singleLine?: boolean) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const method = (<Function>descriptor.value);
        descriptor.value = function(...args: any[]) {
            const server = <Server>this;
            let log = [];
            args = args.map((value) => {
                if (!value) { return; }
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
                log.push(`results: ${ret.length}`)
            }
            server.log(log.join(' | '))
            return ret;
        }
    }
}

export class Server {
    private connection: lsp.IConnection;
    private store: Store = new Store();
    private diagnosticsProvider: DiagnosticsProvider;
    private navigationProvider: NavigationProvider;
    private completionsProvider: CompletionsProvider;
    private signaturesProvider: SignaturesProvider;
    private definitionsProvider: DefinitionProvider;
    private documents = new lsp.TextDocuments();
    private workspaces: Workspace[] = [];

    private createProvider<T extends AbstractProvider>(cls: new () => T): T {
        return createProvider(cls, this.store, this.connection.console);
    }

    public createConnection(connection?: lsp.IConnection): lsp.IConnection {
        this.connection = connection ? connection : lsp.createConnection(new lsp.IPCMessageReader(process), new lsp.IPCMessageWriter(process));

        this.diagnosticsProvider = this.createProvider(DiagnosticsProvider);
        this.navigationProvider = this.createProvider(NavigationProvider);
        this.completionsProvider = this.createProvider(CompletionsProvider);
        this.signaturesProvider = this.createProvider(SignaturesProvider);
        this.definitionsProvider = this.createProvider(DefinitionProvider);

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

        return this.connection;
    }

    public log(msg: string) {
        this.connection.console.log(msg);
    }

    @wrapRequest()
    private onInitialize(params: lsp.InitializeParams): lsp.InitializeResult {
        if (params.initializationOptions.sources) {
            for (const s2path of <string[]>params.initializationOptions.sources) {
                this.log('Indexing s2 sources: ' + s2path)
                const ws = new S2Workspace(s2path);
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
            const ws = new Workspace(params.rootPath);
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
                definitionProvider: true
            }
        }
    }

    @wrapRequest()
    private onDidChangeConfiguration(ev: lsp.DidChangeConfigurationParams) {
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
        this.store.updateDocument(ev.document);
        if (this.documents.keys().indexOf(ev.document.uri)) {
            this.connection.sendDiagnostics({
                uri: ev.document.uri,
                diagnostics: translateDiagnostics(this.diagnosticsProvider.diagnose(ev.document.uri)),
            });
        }
    }

    private onProvideDiagnostics() {
    }

    @wrapRequest()
    private onDidOpen(ev: lsp.TextDocumentChangeEvent) {
    }

    @wrapRequest()
    private onDidClose(ev: lsp.TextDocumentChangeEvent) {
    }

    @wrapRequest('Indexing: ', true, true)
    private onDidFindInWorkspace(ev: lsp.TextDocumentChangeEvent) {
        this.store.updateDocument(ev.document);
    }

    @wrapRequest()
    private onCompletion(params: lsp.TextDocumentPositionParams): lsp.CompletionItem[] {
        return this.completionsProvider.getCompletionsAt(
            params.textDocument.uri,
            getPositionOfLineAndCharacter(this.store.documents.get(params.textDocument.uri), params.position.line, params.position.character)
        );
    }

    @wrapRequest()
    private onCompletionResolve(params: lsp.CompletionItem): lsp.CompletionItem {
        return this.completionsProvider.resolveCompletion(params);
    }

    @wrapRequest()
    private onDocumentSymbol(params: lsp.DocumentSymbolParams): lsp.SymbolInformation[] {
        return translateDeclaratons(this.navigationProvider.getDocumentSymbols(params.textDocument.uri));
    }

    @wrapRequest()
    private onWorkspaceSymbol(params: lsp.WorkspaceSymbolParams): lsp.SymbolInformation[] {
        return translateDeclaratons(this.navigationProvider.getWorkspaceSymbols());
    }

    @wrapRequest()
    private onSignatureHelp(params: lsp.TextDocumentPositionParams): lsp.SignatureHelp {
        return this.signaturesProvider.getSignatureAt(
            params.textDocument.uri,
            getPositionOfLineAndCharacter(this.store.documents.get(params.textDocument.uri), params.position.line, params.position.character)
        );
    }

    @wrapRequest()
    private onDefinition(params: lsp.TextDocumentPositionParams): lsp.Definition {
        return this.definitionsProvider.getDefinitionAt(
            params.textDocument.uri,
            getPositionOfLineAndCharacter(
                this.store.documents.get(params.textDocument.uri), params.position.line, params.position.character)
        );
    }
}

export function createServer(): lsp.IConnection {
    return (new Server()).createConnection();
}
