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
import { CompletionsProvider, CompletionConfig, CompletionFunctionExpand } from './completions';
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

function wrapRequest(msg?: string, showArg?: boolean, argFormatter?: (payload: any) => any) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const method = (<Function>descriptor.value);
        descriptor.value = async function(...args: any[]) {
            const server = <Server>this;
            let log = [];
            log.push('### ' + (msg ? msg : propertyKey));

            var start = process.hrtime();
            let ret;
            try {
                ret = method.bind(this)(...arguments);
                if (ret instanceof Promise) {
                    ret = await ret;
                }
            }
            catch (e) {
                server.connection.console.error('[' + (<Error>e).name + '] ' + (<Error>e).message + '\n' + (<Error>e).stack);
            }

            log.push(formatElapsed(start, process.hrtime()));
            if (ret && ret[Symbol.iterator]) {
                log.push(`results: ${ret.length}`)
            }
            server.log(log.join(' | '));

            if (argFormatter) {
                server.log(util.inspect(argFormatter(arguments[0])));
            }

            return ret;
        }
    }
}

function mapFromObject(stuff: any) {
    const m = new Map<string,string>();
    Object.keys(stuff).forEach((key) => {
        m.set(key, stuff[key]);
    });
    return m;
}

interface PlaxtonyConfig {
    logLevel: string;
    localization: string;
    s2mod: {
        sources: string[],
        overrides: {},
        extra: {},
    },
    completion: {
        functionExpand: string
    };
};

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
    private initParams: lsp.InitializeParams;
    private indexing = false;
    private config: PlaxtonyConfig;

    private createProvider<T extends AbstractProvider>(cls: new () => T): T {
        return createProvider(cls, this.store, this.connection.console);
    }

    public createConnection(connection?: lsp.IConnection): lsp.IConnection {
        this.connection = connection ? connection : lsp.createConnection();

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
        this.connection.onInitialized(this.onInitialized.bind(this));
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

    @wrapRequest()
    private async reindex(rootPath: string, modSources: string[]) {
        let archivePath: string;
        let workspace: SC2Workspace;

        this.indexing = true;
        this.connection.sendNotification("indexStart");

        if (rootPath) {
            archivePath = await findWorkspaceArchive(rootPath);
        }

        if (archivePath) {
            this.workspaceWatcher = new WorkspaceWatcher(archivePath);
            try {
                workspace = await openArchiveWorkspace(
                    new SC2Archive(path.basename(archivePath), archivePath),
                    modSources,
                    mapFromObject(this.config.s2mod.overrides),
                    mapFromObject(this.config.s2mod.extra)
                );
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
            this.workspaceWatcher = new WorkspaceWatcher(rootPath);
        }

        if (!workspace) {
            workspace = new SC2Workspace(null, [new SC2Archive('untitled.sc2mod', resolveArchiveDirectory('mods/core.sc2mod', modSources))]);
        }

        this.log('Indexing s2workspace: ' + archivePath);
        await this.store.updateS2Workspace(workspace, this.config.localization);
        for (const modArchive of workspace.dependencies) {
            for (const extSrc of await modArchive.findFiles('**/*.galaxy')) {
                this.onDidFindInWorkspace({document: createTextDocumentFromFs(path.join(modArchive.directory, extSrc))});
            }
        }

        if (this.workspaceWatcher) {
            this.workspaceWatcher.onDidOpen(this.onDidFindInWorkspace.bind(this));
            // workspace.onDidOpenS2Archive(this.onDidFindS2Workspace.bind(this));
            await this.workspaceWatcher.watch();
        }

        this.indexing = false;
        this.connection.sendNotification("indexEnd");
    }

    @wrapRequest()
    private async onInitialize(params: lsp.InitializeParams): Promise<lsp.InitializeResult> {
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
                hoverProvider: true
            }
        }
    }

    @wrapRequest()
    private async onInitialized(params: lsp.InitializeParams) {
        await this.reindex(this.initParams.rootPath, this.initParams.initializationOptions.sources);
    }

    @wrapRequest()
    private onDidChangeConfiguration(ev: lsp.DidChangeConfigurationParams) {
        this.log(util.inspect(ev.settings.sc2galaxy));
        this.config = <PlaxtonyConfig>ev.settings.sc2galaxy;
        switch (this.config.completion.functionExpand) {
            case "None":
                this.completionsProvider.config.functionExpand = CompletionFunctionExpand.None;
                break;
            case "Parenthesis":
                this.completionsProvider.config.functionExpand = CompletionFunctionExpand.Parenthesis;
                break;
            case "ArgumentsNull":
                this.completionsProvider.config.functionExpand = CompletionFunctionExpand.ArgumentsNull;
                break;
            case "ArgumentsDefault":
                this.completionsProvider.config.functionExpand = CompletionFunctionExpand.ArgumentsDefault;
                break;
        }
    }

    @wrapRequest()
    private onDidChangeContent(ev: lsp.TextDocumentChangeEvent) {
        if (this.indexing) return;
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

    @wrapRequest('Indexing', true, (payload: lsp.TextDocumentChangeEvent) => {
        return payload.document.uri;
    })
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
        if (!this.store.documents.has(params.textDocument.uri)) return null;
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
        if (!this.store.documents.has(params.textDocument.uri)) return null;
        return this.signaturesProvider.getSignatureAt(
            params.textDocument.uri,
            getPositionOfLineAndCharacter(this.store.documents.get(params.textDocument.uri), params.position.line, params.position.character)
        );
    }

    @wrapRequest()
    private onDefinition(params: lsp.TextDocumentPositionParams): lsp.Definition {
        if (!this.store.documents.has(params.textDocument.uri)) return null;
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
