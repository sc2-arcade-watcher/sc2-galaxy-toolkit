import * as lsp from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as Types from '../compiler/types';
import * as util from 'util';
import * as path from 'path';
import * as fs from 'fs-extra';
import { findAncestor } from '../compiler/utils';
import { Store, createTextDocumentFromFs, createTextDocumentFromUri } from './store';
import { getPositionOfLineAndCharacter, getLineAndCharacterOfPosition, getNodeRange, osNormalizePath } from './utils';
import { AbstractProvider, createProvider } from './provider';
import { DiagnosticsProvider, formatDiagnosticTotal } from './diagnostics';
import { NavigationProvider } from './navigation';
import { CompletionsProvider, CompletionConfig, CompletionFunctionExpand } from './completions';
import { SignaturesProvider } from './signatures';
import { DefinitionProvider } from './definitions';
import { HoverProvider } from './hover';
import { ReferencesProvider, ReferencesConfig } from './references';
import { RenameProvider } from './rename';
import { SC2Archive, SC2Workspace, resolveArchiveDirectory, resolveArchiveDependencyList, findSC2ArchiveDirectories } from '../sc2mod/archive';
import { setTimeout, clearTimeout } from 'timers';
import URI from 'vscode-uri';
import { logIt, logger } from '../common';

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

export enum MetadataLoadLevel {
    None = 'None',
    Core = 'Core',
    Builtin = 'Builtin',
    Default = 'Default',
}

export interface MetadataConfig {
    loadLevel: keyof typeof MetadataLoadLevel;
    localization: string;
}

interface PlaxtonyConfig {
    logLevel: string;
    documentUpdateDelay: number;
    documentDiagnosticsDelay: number | false;
    archivePath: string;
    dataPath: string;
    fallbackDependency: string;
    trace: {
        server: string;
        service: string;
    };
    metadata: MetadataConfig;
    s2mod: {
        sources: string[];
        overrides: {};
        extra: {};
    };
    completion: {
        functionExpand: string;
    };
    references: ReferencesConfig;
}

interface DocumentUpdateRequest {
    timer: NodeJS.Timer;
    promise: Promise<boolean>;
    content: string;
    isDirty: boolean;
    version: number;
}

interface InitializeParams extends lsp.InitializeParams {
    initializationOptions?: {
        defaultDataPath: string | null;
    };
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
    private referenceProvider: ReferencesProvider;
    private renameProvider: RenameProvider;
    private documents = new lsp.TextDocuments(TextDocument);
    private initParams: InitializeParams;
    private indexing = false;
    private ready = false;
    private config: PlaxtonyConfig;
    private documentUpdateRequests = new Map<string, DocumentUpdateRequest>();

    private createProvider<T extends AbstractProvider>(cls: new () => T): T {
        return createProvider(cls, this.store);
    }

    public createConnection() {
        this.connection = lsp.createConnection();

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
            for (const p of params) {
                this.connection.console.log(util.inspect(p, {
                    breakLength: 80,
                    compact: false,
                }));
            }
        }
    }

    public showErrorMessage(msg: string) {
        logger.error(`${msg}`);
        this.connection.window.showErrorMessage(msg);
    }

    private async flushDocument(documentUri: string, isDirty = true) {
        if (!this.ready) {
            logger.info('Busy indexing..', { documentUri });
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

    protected async requestReindex() {
        if (this.indexing) return;

        const choice = await this.connection.window.showInformationMessage(
            (`Workspace configuration has changed, reindex might be required. Would you like to do that now?`),
            {
                title: 'Yes',
            },
            {
                title: 'No'
            }
        );
        if (!choice || choice.title !== 'Yes') return;
        await this.reindex();
    }

    @logIt()
    private async reindex() {
        let archivePath: string;
        let workspace: SC2Workspace;

        // signal begining of indexing
        this.indexing = true;
        this.connection.sendNotification('indexStart');
        this.store.clear();

        let projFolders = await this.connection.workspace.getWorkspaceFolders();
        if (!projFolders) projFolders = [];
        const archivePathToWsFolder = new Map<string, lsp.WorkspaceFolder>();

        // attempt to determine active document (archivePath) for non-empty project workspace
        if (projFolders.length) {
            const s2archives: string[] = [];

            if (this.config.archivePath) {
                if (path.isAbsolute(this.config.archivePath)) {
                    if ((await fs.pathExists(archivePath))) {
                        archivePath = this.config.archivePath;
                    }
                    else {
                        this.showErrorMessage(`Specified archivePath '${this.config.archivePath}' resolved to '${archivePath}', but it doesn't exist.`);
                    }
                }
                else {
                    const archiveOsNormalPath = osNormalizePath(this.config.archivePath);
                    const candidates = (await Promise.all(projFolders.map(async (x) => {
                        const testedPath = path.join(URI.parse(x.uri).fsPath, archiveOsNormalPath);
                        const exists = await fs.pathExists(testedPath);
                        if (exists) {
                            return await fs.realpath(testedPath)
                        }
                    }))).filter(x => typeof x === 'string');
                    if (candidates.length) {
                        archivePath = candidates[0];
                        logger.info(`Configured archivePath '${archiveOsNormalPath}' resolved to ${archivePath}`);
                        if (candidates.length > 1) {
                            logger.info(`Complete list of candidates:`, ...candidates);
                        }
                    }
                    else {
                        this.showErrorMessage(`Specified archivePath '${archiveOsNormalPath}' couldn't be found.`);
                    }
                }
            }

            if (!archivePath) {
                const cfgFilesExclude: {[key: string]: boolean} = await this.connection.workspace.getConfiguration('files.exclude');
                const excludePatterns = Object.entries(cfgFilesExclude).filter(x => x[1] === true).map(x => x[0]);
                logger.info('searching workspace for s2archives..');
                logger.verbose('exclude patterns', ...excludePatterns);
                (await Promise.all(
                    projFolders.map(async wsFolder => {
                        return { wsFolder, foundArchivePaths: (await findSC2ArchiveDirectories(
                            URI.parse(wsFolder.uri).fsPath,
                            {
                                exclude: excludePatterns,
                            }
                        )) };
                    }))
                ).forEach(result => {
                    for (const currArchivePath of result.foundArchivePaths) {
                        archivePathToWsFolder.set(currArchivePath, result.wsFolder);
                    }
                    s2archives.push(...result.foundArchivePaths);
                });
                logger.info('s2archives in workspace', ...s2archives);
            }

            if (!archivePath) {
                const s2maps = s2archives.filter(v => path.extname(v).toLowerCase() === '.sc2map');
                logger.info(`s2maps in workspace`, ...s2maps);

                if (s2maps.length === 1) {
                    archivePath = s2maps.pop();
                }
                else if (s2archives.length === 1) {
                    archivePath = s2archives.pop();
                }
                else {
                    this.connection.window.showInformationMessage(`Couldn't find applicable sc2map/sc2mod in the workspace. Set it manually under "sc2galaxy.archivePath" in projects configuration.`);
                }
            }
        }

        // build list of mod sources - directories with dependencies to lookup
        const modSources: string[] = [];
        if (this.config.dataPath) {
            if (path.isAbsolute(this.config.dataPath)) {
                modSources.push(this.config.dataPath);
            }
            else if (projFolders.length) {
                for (const wsFolder of projFolders) {
                    const resolvedDataPath = path.join(URI.parse(wsFolder.uri).fsPath, this.config.dataPath);
                    if (await fs.pathExists(resolvedDataPath)) {
                        modSources.push(resolvedDataPath);
                    }
                }
            }
        }
        if (!modSources.length) {
            modSources.push(this.initParams.initializationOptions.defaultDataPath);
        }
        modSources.push(...this.config.s2mod.sources);
        logger.info(`Workspace discovery`, ...modSources, { archivePath });

        // setup s2workspace
        let wsArchive: SC2Archive;
        if (archivePath) {
            const matchingWsFolder = archivePathToWsFolder.get(archivePath);
            const name = matchingWsFolder ? path.relative(URI.parse(matchingWsFolder.uri).fsPath, archivePath) : path.basename(archivePath);
            wsArchive = new SC2Archive(name, archivePath);
            logger.info(`wsArchive`, wsArchive.name, wsArchive.directory, matchingWsFolder);
        }

        this.connection.sendNotification('indexProgress', `Resolving dependencies..`);
        const fallbackDep = new SC2Archive(this.config.fallbackDependency, await resolveArchiveDirectory(this.config.fallbackDependency, modSources));
        const depLinks = await resolveArchiveDependencyList(wsArchive ? wsArchive : fallbackDep, modSources, {
            overrides: mapFromObject(this.config.s2mod.overrides),
            fallbackResolve: async (depName: string) => {
                while (depName.length) {
                    for (const wsFolder of projFolders) {
                        const fsPath = URI.parse(wsFolder.uri).fsPath;

                        if (depName.toLowerCase() === wsFolder.name.toLowerCase()) {
                            return fsPath;
                        }
                        else {
                            const result = await resolveArchiveDirectory(depName, [fsPath]);
                            if (result) return result;
                        }
                    }

                    depName = depName.split('/').slice(1).join('/');
                }

                return void 0;
            }
        });

        for (const [name, src] of mapFromObject(this.config.s2mod.extra)) {
            if (!fs.existsSync(src)) {
                this.showErrorMessage(`Extra archive [${name}] '${src}' doesn't exist. Skipping.`);
                continue;
            }
            depLinks.list.push({
                name: name,
                src: src
            });
        }
        if (depLinks.unresolvedNames.length > 0) {
            this.showErrorMessage(
                `Some SC2 archives couldn't be found [${depLinks.unresolvedNames.map((s) => `'${s}'`).join(', ')}]. By a result certain intellisense capabilities might not function properly.`
            );
        }

        let depList = depLinks.list.map((item) => new SC2Archive(item.name, item.src));
        if (!wsArchive && !depList.find((item) => item.name === fallbackDep.name)) {
            depList.push(fallbackDep);
        }
        workspace = new SC2Workspace(wsArchive, depList);
        logger.info('Resolved archives', ...workspace.allArchives.map(item => {
            return `${item.name} => ${item.directory}`;
        }));

        // process metadata files etc.
        this.connection.sendNotification('indexProgress', 'Indexing trigger libraries and data catalogs..');
        await this.store.updateS2Workspace(workspace);
        await this.store.rebuildS2Metadata(this.config.metadata);

        // process .galaxy files in the workspace
        this.connection.sendNotification('indexProgress', `Indexing Galaxy files..`);
        for (const modArchive of workspace.allArchives) {
            for (const extSrc of await modArchive.findFiles('**/*.galaxy')) {
                await this.syncSourceFile({document: createTextDocumentFromFs(path.join(modArchive.directory, extSrc))});
            }
        }

        // almost done
        this.connection.sendNotification('indexProgress', 'Finalizing..');

        // apply overdue updates to files issued during initial indexing
        for (const documentUri of this.documentUpdateRequests.keys()) {
            await this.flushDocument(documentUri);
        }

        // signal done
        this.indexing = false;
        this.ready = true;
        this.connection.sendNotification('indexEnd');
    }

    @logIt({ level: 'verbose', profiling: false, argsDump: true, resDump: true })
    private onInitialize(params: lsp.InitializeParams): lsp.InitializeResult {
        this.initParams = params;
        return {
            capabilities: {
                workspace: {
                    workspaceFolders: {
                        supported: true,
                        changeNotifications: true,
                    },
                },
                textDocumentSync: {
                    change: lsp.TextDocumentSyncKind.Incremental,
                    openClose: true,
                },
                documentSymbolProvider: true,
                workspaceSymbolProvider: true,
                completionProvider: {
                    triggerCharacters: ['.', '/'],
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
        };
    }

    @logIt({ level: 'verbose', profiling: false, argsDump: true })
    private onInitialized(params: lsp.InitializedParams) {
        if (this.initParams.capabilities.workspace.workspaceFolders) {
            this.connection.workspace.onDidChangeWorkspaceFolders(this.onDidChangeWorkspaceFolders.bind(this));
        }
    }

    @logIt({ level: 'verbose', profiling: false, argsDump: ev => ev.settings.sc2galaxy })
    private onDidChangeConfiguration(ev: lsp.DidChangeConfigurationParams) {
        const newConfig = <PlaxtonyConfig>ev.settings.sc2galaxy;
        let reindexRequired = false;
        let firstInit = !this.config;

        if (
            !this.config ||
            this.config.archivePath !== newConfig.archivePath ||
            this.config.dataPath !== newConfig.dataPath ||
            this.config.fallbackDependency !== newConfig.fallbackDependency ||
            (JSON.stringify(this.config.trace) !== JSON.stringify(newConfig.trace)) ||
            (JSON.stringify(this.config.metadata) !== JSON.stringify(newConfig.metadata)) ||
            (JSON.stringify(this.config.s2mod) !== JSON.stringify(newConfig.s2mod))
        ) {
            logger.warn('Config changed, reindex required');
            reindexRequired = true;
        }

        this.config = newConfig;
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

        if (firstInit) {
            this.reindex();
        }
        else if (reindexRequired) {
            this.requestReindex();
        }
    }

    @logIt({ profiling: false, argsDump: true })
    private onDidChangeWorkspaceFolders(ev: lsp.WorkspaceFoldersChangeEvent) {
        this.requestReindex();
    }

    @logIt({ level: 'verbose', profiling: false, argsDump: ev => {
        return { uri: ev.document.uri, ver: ev.document.version };
    }})
    private async onDidChangeContent(ev: lsp.TextDocumentChangeEvent<TextDocument>) {
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

    @logIt({ level: 'verbose', argsDump: (docUri: string, req: DocumentUpdateRequest) => {
        return { uri: docUri, ver: req.version };
    }})
    private async onUpdateContent(documentUri: string, req: DocumentUpdateRequest) {
        req.promise = new Promise((resolve) => {
            this.store.updateDocument(<TextDocument>{
                uri: documentUri,
                getText: () => {
                    return req.content;
                }
            });
            this.documentUpdateRequests.delete(documentUri);
            const diagDelay = this.config.documentDiagnosticsDelay ? this.config.documentDiagnosticsDelay : 1;
            if (this.config.documentDiagnosticsDelay !== false || !req.isDirty) {
                setTimeout(this.onDiagnostics.bind(this, documentUri, req), req.isDirty ? diagDelay : 1);
            }
            resolve(true);
        });
        await req.promise;
    }

    @logIt({ level: 'verbose', argsDump: (docUri: string, req: DocumentUpdateRequest) => {
        return { uri: docUri, ver: req.version };
    }})
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

    @logIt({ level: 'verbose', profiling: false, argsDump: ev => ev.document.uri })
    private onDidOpen(ev: lsp.TextDocumentChangeEvent<TextDocument>) {
        this.store.openDocuments.add(ev.document.uri);
    }

    @logIt({ level: 'verbose', profiling: false, argsDump: ev => ev.document.uri })
    private onDidClose(ev: lsp.TextDocumentChangeEvent<TextDocument>) {
        this.store.openDocuments.delete(ev.document.uri);
        if (!this.store.isUriInWorkspace(ev.document.uri)) {
            this.store.removeDocument(ev.document.uri);
            logger.verbose('removed from store', ev.document.uri);
        }
        this.connection.sendDiagnostics({
            uri: ev.document.uri,
            diagnostics: [],
        });
    }

    @logIt({ level: 'verbose', profiling: false, argsDump: ev => ev.document.uri })
    private async onDidSave(ev: lsp.TextDocumentChangeEvent<TextDocument>) {
        await this.flushDocument(ev.document.uri, true);
    }

    @logIt({ level: 'verbose', profiling: false })
    private async onDidChangeWatchedFiles(ev: lsp.DidChangeWatchedFilesParams) {
        for (const x of ev.changes) {
            const xUri = URI.parse(x.uri);
            if (xUri.scheme !== 'file') continue;
            if (xUri.fsPath.match(/sc2\w+\.(temp|orig)/gi)) continue;
            if (!this.store.isUriInWorkspace(x.uri)) continue;
            logger.verbose(`${fileChangeTypeNames[x.type]} '${x.uri}'`);
            switch (x.type) {
                case lsp.FileChangeType.Created:
                case lsp.FileChangeType.Changed:
                {
                    if (!this.store.openDocuments.has(x.uri)) {
                        this.syncSourceFile({document: createTextDocumentFromUri(x.uri)});
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

    @logIt({ level: 'verbose', argsDump: (ev: lsp.TextDocumentChangeEvent<TextDocument>) => {
        return { uri: ev.document.uri, ver: ev.document.version };
    }})
    private syncSourceFile(ev: lsp.TextDocumentChangeEvent<TextDocument>) {
        this.store.updateDocument(ev.document);
    }

    private async onCompletion(params: lsp.TextDocumentPositionParams) {
        if (!this.store.documents.has(params.textDocument.uri)) return;
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

    private onCompletionResolve(params: lsp.CompletionItem): lsp.CompletionItem {
        return this.completionsProvider.resolveCompletion(params);
    }

    private onDocumentSymbol(params: lsp.DocumentSymbolParams): lsp.SymbolInformation[] {
        if (!this.ready) return null;
        return translateDeclaratons(this.navigationProvider.getDocumentSymbols(params.textDocument.uri));
    }

    private onWorkspaceSymbol(params: lsp.WorkspaceSymbolParams): lsp.SymbolInformation[] {
        if (!this.ready) return null;
        return translateDeclaratons(this.navigationProvider.getWorkspaceSymbols(params.query));
    }

    private async onSignatureHelp(params: lsp.TextDocumentPositionParams): Promise<lsp.SignatureHelp> {
        if (!this.store.documents.has(params.textDocument.uri)) return null;
        await this.flushDocument(params.textDocument.uri);
        return this.signaturesProvider.getSignatureAt(
            params.textDocument.uri,
            getPositionOfLineAndCharacter(this.store.documents.get(params.textDocument.uri), params.position.line, params.position.character)
        );
    }

    private async onDefinition(params: lsp.TextDocumentPositionParams): Promise<lsp.DefinitionLink[]> {
        if (!this.store.documents.has(params.textDocument.uri)) return null;
        await this.flushDocument(params.textDocument.uri);
        return this.definitionsProvider.getDefinitionAt(
            params.textDocument.uri,
            getPositionOfLineAndCharacter(
                this.store.documents.get(params.textDocument.uri), params.position.line, params.position.character)
        );
    }

    private async onHover(params: lsp.TextDocumentPositionParams): Promise<lsp.Hover> {
        await this.flushDocument(params.textDocument.uri);
        return this.hoverProvider.getHoverAt(params);
    }

    private async onReferences(params: lsp.ReferenceParams): Promise<lsp.Location[]> {
        await this.flushDocument(params.textDocument.uri);
        return this.referenceProvider.onReferences(params);
    }

    private async onRenameRequest(params: lsp.RenameParams) {
        await this.flushDocument(params.textDocument.uri);
        return this.renameProvider.onRenameRequest(params);
    }

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

    private async onRenamePrefetch(params: lsp.TextDocumentPositionParams) {
        await this.flushDocument(params.textDocument.uri);
        return this.renameProvider.prefetchLocations();
    }

    private async onDiagnoseDocumentRecursively(params: lsp.TextDocumentIdentifier) {
        await this.flushDocument(params.uri);
        const dtotal = this.diagnosticsProvider.checkFileRecursively(params.uri);
        return formatDiagnosticTotal(dtotal);
    }
}

export function createServer() {
    return (new Server()).createConnection();
}
