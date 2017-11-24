import * as lsp from 'vscode-languageserver';
import * as Types from '../compiler/types';
import * as util from 'util';
import * as path from 'path';
import { findAncestor } from '../compiler/utils';
import { Store, WorkspaceWatcher, S2WorkspaceWatcher, findWorkspaceArchive, S2WorkspaceChangeEvent, createTextDocumentFromFs } from './store';
import { getPositionOfLineAndCharacter, getLineAndCharacterOfPosition } from './utils';
import { AbstractProvider, LoggerConsole, createProvider } from './provider';
import { DiagnosticsProvider } from './diagnostics';
import { NavigationProvider } from './navigation';
import { CompletionsProvider } from './completions';
import { SignaturesProvider } from './signatures';
import { DefinitionProvider } from './definitions';
import { HoverProvider } from './hover';
import { SC2Archive, SC2Workspace, resolveArchiveDirectory, openArchiveWorkspace } from '../sc2mod/archive';

function getNodeRange(node: Types.Node): lsp.Range {
    return {
        start: { line: node.line, character: node.char },
        end: { line: node.line, character: node.char }
    };
}

function translateDiagnostics(sourceFile: Types.SourceFile, origDiagnostics: Types.Diagnostic[]): lsp.Diagnostic[] {
    let lspDiagnostics: lsp.Diagnostic[] = [];

    for (let dg of origDiagnostics) {
        lspDiagnostics.push({
            severity: lsp.DiagnosticSeverity.Error,
            range: {
                start: getLineAndCharacterOfPosition(sourceFile, dg.start),
                end: getLineAndCharacterOfPosition(sourceFile, dg.start + dg.length)
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
                server.connection.console.error('[' + (<Error>e).name + '] ' + (<Error>e).message + '\n' + (<Error>e).stack);
            }
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
    public connection: lsp.IConnection;
    private store: Store = new Store();
    private diagnosticsProvider: DiagnosticsProvider;
    private navigationProvider: NavigationProvider;
    private completionsProvider: CompletionsProvider;
    private signaturesProvider: SignaturesProvider;
    private definitionsProvider: DefinitionProvider;
    private hoverProvider: HoverProvider;
    private documents = new lsp.TextDocuments();
    private workspaceWatcher: WorkspaceWatcher;

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
        this.hoverProvider = this.createProvider(HoverProvider);

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

    public log(msg: string) {
        this.connection.console.log(msg);
    }

    private async reindex(rootPath: string, modSources: string[]) {
        let archivePath: string;
        let workspace: SC2Workspace;
        if (rootPath) {
            archivePath = await findWorkspaceArchive(rootPath);
        }

        if (archivePath) {
            this.workspaceWatcher = new WorkspaceWatcher(archivePath);
            try {
                workspace = await openArchiveWorkspace(new SC2Archive(path.basename(archivePath), archivePath), modSources);
            }
            catch (e) {
                this.connection.console.error('Trigger data couldn\'t be loaded: ' + e.message);
                workspace = null;
            }
        }
        else if (rootPath) {
            this.workspaceWatcher = new WorkspaceWatcher(rootPath);
        }

        if (!workspace) {
            workspace = new SC2Workspace(null, [new SC2Archive('untitled.sc2mod', resolveArchiveDirectory('mods/core.sc2mod', modSources))]);
        }

        this.log('Indexing s2workspace: ' + archivePath);
        await this.store.updateS2Workspace(workspace);
        for (const modArchive of workspace.dependencies) {
            for (const extSrc of await modArchive.findFiles('*.galaxy')) {
                this.onDidFindInWorkspace({document: createTextDocumentFromFs(path.join(modArchive.directory, extSrc))});
            }
        }

        if (this.workspaceWatcher) {
            this.workspaceWatcher.onDidOpen(this.onDidFindInWorkspace.bind(this));
            // workspace.onDidOpenS2Archive(this.onDidFindS2Workspace.bind(this));
            await this.workspaceWatcher.watch();
        }
    }

    @wrapRequest()
    private async onInitialize(params: lsp.InitializeParams): Promise<lsp.InitializeResult> {
        await this.reindex(params.rootPath, params.initializationOptions.sources)
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
        if (this.documents.keys().indexOf(ev.document.uri) !== undefined) {
            this.connection.sendDiagnostics({
                uri: ev.document.uri,
                diagnostics: translateDiagnostics(this.store.documents.get(ev.document.uri), this.diagnosticsProvider.diagnose(ev.document.uri)),
            });
        }
    }

    @wrapRequest()
    private onDidOpen(ev: lsp.TextDocumentChangeEvent) {
    }

    @wrapRequest()
    private onDidClose(ev: lsp.TextDocumentChangeEvent) {
        this.connection.sendDiagnostics({
            uri: ev.document.uri,
            diagnostics: [],
        })
    }

    @wrapRequest('Indexing: ', true, true)
    private onDidFindInWorkspace(ev: lsp.TextDocumentChangeEvent) {
        this.store.updateDocument(ev.document);
    }

    // @wrapRequest('Indexing workspace ', true, true)
    // private async onDidFindS2Workspace(ev: S2WorkspaceChangeEvent) {
    //     this.log('Updating archives');
    //     await this.store.updateS2Workspace(ev.workspace);
    //     this.log('Archives: ' + util.inspect(ev.workspace.allArchives, false, 1));
    // }

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
        return translateDeclaratons(this.navigationProvider.getWorkspaceSymbols(params.query));
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

    @wrapRequest()
    private onHover(params: lsp.TextDocumentPositionParams): lsp.Hover {
        return this.hoverProvider.getHoverAt(params);
    }
}

export function createServer(): lsp.IConnection {
    return (new Server()).createConnection();
}
