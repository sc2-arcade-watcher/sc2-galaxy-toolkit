import * as lsp from 'vscode-languageserver';
import * as Types from '../compiler/types';
import * as util from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { findAncestor } from '../compiler/utils';
import { Store, WorkspaceWatcher, S2WorkspaceWatcher, findWorkspaceArchive, S2WorkspaceChangeEvent, createTextDocumentFromFs, createTextDocumentFromUri } from './store';
import { getPositionOfLineAndCharacter, getLineAndCharacterOfPosition, getNodeRange } from './utils';
import { AbstractProvider, LoggerConsole, createProvider } from './provider';
import { DiagnosticsProvider } from './diagnostics';
import { NavigationProvider } from './navigation';
import { CompletionsProvider, CompletionConfig, CompletionFunctionExpand } from './completions';
import { SignaturesProvider } from './signatures';
import { DefinitionProvider } from './definitions';
import { HoverProvider } from './hover';
import { ReferencesProvider, ReferencesConfig } from './references';
import { RenameProvider } from './rename';
import { SC2Archive, SC2Workspace, resolveArchiveDirectory, openArchiveWorkspace, isSC2Archive, resolveArchiveDependencyList } from '../sc2mod/archive';
import { setTimeout, clearTimeout } from 'timers';
import URI from 'vscode-uri';

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

let reqDepth = 0;
function wrapRequest(showArg = false, argFormatter?: (payload: any) => any, msg?: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const method = (<Function>descriptor.value);
        descriptor.value = async function(...args: any[]) {
            const server = <Server>this;
            server.connection.console.info('>'.repeat(++reqDepth) + ' ' + (msg ? msg : propertyKey));
            if (showArg) {
                server.connection.console.log(util.inspect(args[0], true, 1, false));
            }
            else if (argFormatter) {
                server.connection.console.log(util.inspect(argFormatter(args[0])));
            }

            var start = process.hrtime();
            let ret;
            try {
                ret = method.bind(this)(...arguments);
                if (ret instanceof Promise) {
                    ret = await ret;
                }
            }
            catch (e) {
                ret = null;
                server.connection.console.error('[' + (<Error>e).name + '] ' + (<Error>e).message + '\n' + (<Error>e).stack);
            }

            server.connection.console.info('='.repeat(reqDepth--) + ' ' + `${formatElapsed(start, process.hrtime())}`);

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

const fileChangeTypeNames: { [key: number]: string } = {
    [lsp.FileChangeType.Created]: 'Created',
    [lsp.FileChangeType.Changed]: 'Changed',
    [lsp.FileChangeType.Deleted]: 'Deleted',
};

interface PlaxtonyConfig {
    logLevel: string;
    localization: string;
    documentUpdateDelay: number;
    documentDiagnosticsDelay: number;
    archivePath: string;
    s2mod: {
        sources: string[],
        overrides: {},
        extra: {},
    },
    completion: {
        functionExpand: string,
    };
    references: ReferencesConfig
};

interface DocumentUpdateRequest {
    timer: NodeJS.Timer;
    promise: Promise<boolean>;
    content: string;
    isDirty: boolean;
    version: number;
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
    private referenceProvider: ReferencesProvider;
    private renameProvider: RenameProvider;
    private documents = new lsp.TextDocuments();
    private workspaceWatcher: WorkspaceWatcher;
    private initParams: lsp.InitializeParams;
    private indexing = false;
    private ready = false;
    private config: PlaxtonyConfig;
    private documentUpdateRequests = new Map<string, DocumentUpdateRequest>();

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
        this.referenceProvider = this.createProvider(ReferencesProvider);
        this.renameProvider = this.createProvider(RenameProvider);
        this.renameProvider.referencesProvider = this.referenceProvider;

        this.documents.listen(this.connection);
        this.documents.onDidChangeContent(this.onDidChangeContent.bind(this));
        this.documents.onDidOpen(this.onDidOpen.bind(this));
        this.documents.onDidClose(this.onDidClose.bind(this));
        this.documents.onDidSave(this.onDidSave.bind(this));
        this.connection.onDidChangeWatchedFiles(this.onDidChangeWatchedFiles.bind(this));

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
        this.connection.onReferences(this.onReferences.bind(this));
        this.connection.onRenameRequest(this.onRenameRequest.bind(this));
        this.connection.onPrepareRename(this.onPrepareRename.bind(this));

        this.connection.onRequest('document/checkRecursively', this.onDiagnoseDocumentRecursively.bind(this));

        return this.connection;
    }

    public log(msg: string, ...params: any[]) {
        this.connection.console.log(msg);
        if (params.length) {
            this.connection.console.log(util.inspect(params));
        }
    }

    public showErrorMessage(msg: string) {
        this.log(`[ERROR MSG]\n${msg}`);
        this.connection.window.showErrorMessage(msg);
    }

    private async flushDocument(documentUri: string, isDirty = true) {
        if (!this.ready) {
            this.log('Busy indexing..');
            return false;
        }
        const req = this.documentUpdateRequests.get(documentUri);
        if (!req) return;
        if (req.promise) {
            await req.promise;
        }
        else {
            clearTimeout(req.timer);
            req.isDirty = isDirty;
            await this.onUpdateContent(documentUri, req);
        }
    }

    @wrapRequest()
    private async reindex(rootPath: string, modSources: string[]) {
        let archivePath: string;
        let workspace: SC2Workspace;

        this.indexing = true;
        this.connection.sendNotification("indexStart");

        this.store.rootPath = rootPath;
        if (this.config.archivePath) {
            if (path.isAbsolute(this.config.archivePath)) {
                archivePath = this.config.archivePath;
            }
            else if (rootPath) {
                archivePath = path.join(rootPath, this.config.archivePath);
            }

            if (!fs.existsSync(archivePath)) {
                this.showErrorMessage(`Specified archivePath '${this.config.archivePath}' resolved to '${archivePath}', but it doesn't exist.`);
                archivePath = null;
            }
            else if (!isSC2Archive(archivePath)) {
                this.showErrorMessage(`Specified archivePath '${archivePath}', doesn't appear to be valid archive.`);
                archivePath = null;
            }
        }
        if (!archivePath && rootPath) {
            archivePath = await findWorkspaceArchive(rootPath);
        }

        if (archivePath) {
            const wsArchive = new SC2Archive(path.basename(archivePath), archivePath);
            this.workspaceWatcher = new WorkspaceWatcher(archivePath);

            this.log(`SC2 archive for this workspace set to: ${archivePath}`);
            this.connection.sendNotification('indexProgress', `Resolving dependencies of [${wsArchive.name}]`);

            const depList = await resolveArchiveDependencyList(
                wsArchive,
                modSources,
                mapFromObject(this.config.s2mod.overrides)
            );
            for (const [name, src] of mapFromObject(this.config.s2mod.extra)) {
                if (!fs.existsSync(src)) {
                    this.showErrorMessage(`Extra archive [${name}] '${src}' doesn't exist. Skipping.`);
                    continue;
                }
                depList.list.push({
                    name: name,
                    src: src
                });
            }
            if (depList.unresolvedNames.length > 0) {
                this.showErrorMessage(
                    `Some SC2 archives couldn't be found [${depList.unresolvedNames.map((s) => `'${s}'`).join(', ')}]. By a result certain intellisense capabilities might not function properly.`
                );
            }

            workspace = new SC2Workspace(wsArchive, depList.list.map((item) => new SC2Archive(item.name, item.src)));
            this.log('Resolved archives:\n' + workspace.allArchives.map(item => {
                return `${item.name} => ${item.directory}`;
            }).join('\n'));
        }
        else if (rootPath) {
            this.log(`SC2 workspace set to project root`);
            this.workspaceWatcher = new WorkspaceWatcher(rootPath);
        }

        if (!workspace) {
            workspace = new SC2Workspace(null, [new SC2Archive('mods/core.sc2mod', await resolveArchiveDirectory('mods/core.sc2mod', modSources))]);
        }

        this.connection.sendNotification('indexProgress', 'Indexing trigger libraries and data catalogs..');
        await this.store.updateS2Workspace(workspace, this.config.localization);

        this.connection.sendNotification('indexProgress', `Indexing Galaxy files..`);
        for (const modArchive of workspace.dependencies) {
            for (const extSrc of await modArchive.findFiles('**/*.galaxy')) {
                // this.connection.sendNotification('indexProgress', `Indexing: ${extSrc}`);
                this.onDidFindInWorkspace({document: createTextDocumentFromFs(path.join(modArchive.directory, extSrc))});
            }
        }

        if (this.workspaceWatcher) {
            this.workspaceWatcher.onDidOpen((ev) => {
                const extSrc = URI.parse(ev.document.uri).fsPath.substr(this.workspaceWatcher.workspacePath.length);
                // this.connection.sendNotification('indexProgress', `Indexing: ${extSrc}`);
                this.onDidFindInWorkspace(ev);
            });
            // workspace.onDidOpenS2Archive(this.onDidFindS2Workspace.bind(this));
            await this.workspaceWatcher.watch();
        }

        this.connection.sendNotification('indexProgress', 'Finalizing..');

        for (const documentUri of this.documentUpdateRequests.keys()) {
            await this.flushDocument(documentUri);
        }

        this.indexing = false;
        this.ready = true;
        this.connection.sendNotification("indexEnd");
    }

    @wrapRequest()
    private async onInitialize(params: lsp.InitializeParams): Promise<lsp.InitializeResult> {
        this.initParams = params;
        return {
            capabilities: {
                textDocumentSync: {
                    change: this.documents.syncKind,
                    openClose: true,
                },
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
                hoverProvider: true,
                referencesProvider: true,
                renameProvider: {
                    prepareProvider: true,
                },
            }
        }
    }

    @wrapRequest()
    private async onInitialized(params: lsp.InitializedParams) {
    }

    @wrapRequest()
    private async onDidChangeConfiguration(ev: lsp.DidChangeConfigurationParams) {
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

        this.referenceProvider.config = this.config.references;

        if (!this.indexing) {
            this.reindex(this.initParams.rootPath, this.initParams.initializationOptions.sources);
        }
    }

    @wrapRequest()
    private async onDidChangeContent(ev: lsp.TextDocumentChangeEvent) {
        let req = this.documentUpdateRequests.get(ev.document.uri);
        if (req) {
            if (req.promise) {
                await req.promise;
            }
            else {
                if (req.timer) {
                    clearTimeout(req.timer);
                }
                this.documentUpdateRequests.delete(ev.document.uri);
            }
            req = null;
        }

        if (!req) {
            req = <DocumentUpdateRequest>{
                content: ev.document.getText(),
                timer: null,
                promise: null,
                isDirty: true,
                version: ev.document.version,
            };
        }

        if (!this.indexing && this.ready) {
            req.timer = setTimeout(this.onUpdateContent.bind(this, ev.document.uri, req), this.config.documentUpdateDelay);
        }

        this.documentUpdateRequests.set(ev.document.uri, req);
    }

    @wrapRequest()
    private async onUpdateContent(documentUri: string, req: DocumentUpdateRequest) {
        req.promise = new Promise((resolve) => {
            this.store.updateDocument(<lsp.TextDocument>{
                uri: documentUri,
                getText: () => {
                    return req.content;
                }
            });
            setTimeout(this.onDiagnostics.bind(this, documentUri, req), req.isDirty ? this.config.documentDiagnosticsDelay : 1);
            this.documentUpdateRequests.delete(documentUri);
            resolve(true);
        });
        await req.promise;
    }

    @wrapRequest()
    private onDiagnostics(documentUri: string, req: DocumentUpdateRequest) {
        if (this.documentUpdateRequests.has(documentUri)) return;
        if (this.documents.keys().indexOf(documentUri) === -1) return;
        if (this.documents.get(documentUri).version > req.version) return;

        if (this.store.isUriInWorkspace(documentUri)) {
            this.diagnosticsProvider.checkFile(documentUri);
        }

        this.connection.sendDiagnostics({
            uri: documentUri,
            diagnostics: this.diagnosticsProvider.provideDiagnostics(documentUri),
        });
    }

    @wrapRequest(false, (payload: lsp.TextDocumentChangeEvent) => { return {document: payload.document.uri}})
    private onDidOpen(ev: lsp.TextDocumentChangeEvent) {
        this.store.openDocuments.set(ev.document.uri, true);
    }

    @wrapRequest(false, (payload: lsp.TextDocumentChangeEvent) => { return {document: payload.document.uri}})
    private onDidClose(ev: lsp.TextDocumentChangeEvent) {
        this.store.openDocuments.delete(ev.document.uri);
        if (!this.store.isUriInWorkspace(ev.document.uri)) {
            this.store.removeDocument(ev.document.uri)
            this.log('removed from store');
        }
        this.connection.sendDiagnostics({
            uri: ev.document.uri,
            diagnostics: [],
        })
    }

    @wrapRequest(false, (payload: lsp.TextDocumentChangeEvent) => { return {document: payload.document.uri}})
    private async onDidSave(ev: lsp.TextDocumentChangeEvent) {
        await this.flushDocument(ev.document.uri, true);
    }

    @wrapRequest(true)
    private async onDidChangeWatchedFiles(ev: lsp.DidChangeWatchedFilesParams) {
        for (const x of ev.changes) {
            if (URI.parse(x.uri).fsPath.match(/sc2map\.(temp|orig)/gi)) continue;
            if (!this.store.isUriInWorkspace(x.uri)) continue;
            this.log(`${fileChangeTypeNames[x.type]} ${x.uri}`);
            switch (x.type) {
                case lsp.FileChangeType.Created:
                case lsp.FileChangeType.Changed:
                {
                    if (!this.store.openDocuments.has(x.uri)) {
                        this.onDidFindInWorkspace({document: createTextDocumentFromUri(x.uri)});
                    }
                    break;
                }
                case lsp.FileChangeType.Deleted:
                {
                    this.store.removeDocument(x.uri)
                    break;
                }
            }
        }
    }

    @wrapRequest(false, (payload: lsp.TextDocumentChangeEvent) => { return {document: payload.document.uri}})
    private onDidFindInWorkspace(ev: lsp.TextDocumentChangeEvent) {
        this.store.updateDocument(ev.document);
    }

    // @wrapRequest('Indexing workspace ', true, true)
    // private async onDidFindS2Workspace(ev: S2WorkspaceChangeEvent) {
    //     this.log('Updating archives');
    //     await this.store.updateS2Workspace(ev.workspace);
    //     this.log('Archives: ' + util.inspect(ev.workspace.allArchives, false, 1));
    // }

    @wrapRequest(true)
    private async onCompletion(params: lsp.TextDocumentPositionParams) {
        if (!this.store.documents.has(params.textDocument.uri)) return null;
        await this.flushDocument(params.textDocument.uri);

        let context: lsp.CompletionContext = null;
        try {
            if (this.initParams.capabilities.textDocument.completion.contextSupport) {
                context = (<lsp.CompletionParams>params).context;
            }
        }
        catch (e) {}

        return this.completionsProvider.getCompletionsAt(
            params.textDocument.uri,
            getPositionOfLineAndCharacter(this.store.documents.get(params.textDocument.uri), params.position.line, params.position.character),
            context
        );
    }

    @wrapRequest(true)
    private onCompletionResolve(params: lsp.CompletionItem): lsp.CompletionItem {
        return this.completionsProvider.resolveCompletion(params);
    }

    @wrapRequest(true)
    private onDocumentSymbol(params: lsp.DocumentSymbolParams): lsp.SymbolInformation[] {
        if (!this.ready) return null;
        return translateDeclaratons(this.navigationProvider.getDocumentSymbols(params.textDocument.uri));
    }

    @wrapRequest(true)
    private onWorkspaceSymbol(params: lsp.WorkspaceSymbolParams): lsp.SymbolInformation[] {
        if (!this.ready) return null;
        return translateDeclaratons(this.navigationProvider.getWorkspaceSymbols(params.query));
    }

    @wrapRequest(true)
    private async onSignatureHelp(params: lsp.TextDocumentPositionParams): Promise<lsp.SignatureHelp> {
        if (!this.store.documents.has(params.textDocument.uri)) return null;
        await this.flushDocument(params.textDocument.uri);
        return this.signaturesProvider.getSignatureAt(
            params.textDocument.uri,
            getPositionOfLineAndCharacter(this.store.documents.get(params.textDocument.uri), params.position.line, params.position.character)
        );
    }

    @wrapRequest(true)
    private async onDefinition(params: lsp.TextDocumentPositionParams): Promise<lsp.DefinitionLink[]> {
        if (!this.store.documents.has(params.textDocument.uri)) return null;
        await this.flushDocument(params.textDocument.uri);
        return this.definitionsProvider.getDefinitionAt(
            params.textDocument.uri,
            getPositionOfLineAndCharacter(
                this.store.documents.get(params.textDocument.uri), params.position.line, params.position.character)
        );
    }

    @wrapRequest(true)
    private async onHover(params: lsp.TextDocumentPositionParams): Promise<lsp.Hover> {
        await this.flushDocument(params.textDocument.uri);
        return this.hoverProvider.getHoverAt(params);
    }

    @wrapRequest(true)
    private async onReferences(params: lsp.ReferenceParams): Promise<lsp.Location[]> {
        await this.flushDocument(params.textDocument.uri);
        return this.referenceProvider.onReferences(params);
    }

    @wrapRequest(true)
    private async onRenameRequest(params: lsp.RenameParams) {
        await this.flushDocument(params.textDocument.uri);
        return this.renameProvider.onRenameRequest(params);
    }

    @wrapRequest(true)
    private async onPrepareRename(params: lsp.TextDocumentPositionParams) {
        await this.flushDocument(params.textDocument.uri);
        const r = this.renameProvider.onPrepareRename(params);
        if (r && (<any>r).range) {
            setTimeout(() => {
                this.onRenamePrefetch(params);
            }, 5);
        }
        return r;
    }

    @wrapRequest()
    private async onRenamePrefetch(params: lsp.TextDocumentPositionParams) {
        await this.flushDocument(params.textDocument.uri);
        return this.renameProvider.prefetchLocations();
    }

    @wrapRequest()
    private async onDiagnoseDocumentRecursively(params: lsp.TextDocumentIdentifier) {
        await this.flushDocument(params.uri);
        const dg = this.diagnosticsProvider.checkFileRecursively(params.uri);
        for (const item of dg.diagnostics) {
            this.connection.sendDiagnostics(item);
        }
        return dg.success;
    }
}

export function createServer(): lsp.IConnection {
    return (new Server()).createConnection();
}
