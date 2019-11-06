import * as path from 'path';
import * as lsp from 'vscode-languageserver';
import URI from 'vscode-uri';
import { logIt, logger } from '../logger';
import { S2LConfig } from './config';
import { Store, createTextDocumentFromFs } from '../index/store';
import { SchemaLoader } from './schemaLoader';
import { SchemaRegistry } from '../schema/base';
import * as s2 from '../index/s2mod';
import { objventries, globify } from '../common';
import { languageExt, languageId } from '../types';
import { DiagnosticsProvider, formatDiagnosticTotal } from './providers/diagnostics';
import { DefinitionProvider } from './providers/definition';
import { HoverProvider } from './providers/hover';
import { NavigationProvider } from './providers/navigation';
import { ColorProvider } from './providers/color';
import { CompletionsProvider } from './providers/completions/completions';
import { DescTreeDataProvider } from './providers/descTreeData';
import { errGuard } from './provider';
import { ReferenceProvider } from './providers/reference';

const fileChangeTypeNames: { [key: number]: string } = {
    [lsp.FileChangeType.Created]: 'Created',
    [lsp.FileChangeType.Changed]: 'Changed',
    [lsp.FileChangeType.Deleted]: 'Deleted',
};

type DocumentUpdateProcess = (forced?: boolean) => void;

class DocumentUpdateRequest {
    updateTimer: NodeJS.Timer;
    diagnosticsTimer: NodeJS.Timer;
    completed = false;
    protected awaitersQueue: (() => void)[] = [];

    constructor(public readonly doc: lsp.TextDocument, public readonly doUpdate: DocumentUpdateProcess) {
    }

    wait() {
        if (this.completed) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            if (this.completed) {
                resolve();
            }
            else {
                this.awaitersQueue.push(resolve);
            }
        });
    }

    invokeImmediately() {
        if (!this.updateTimer) return;
        clearTimeout(this.updateTimer);
        this.updateTimer = void 0;
        this.doUpdate(true);
    }

    @logIt({
        level: 'verbose',
        scopeDump: (scope: DocumentUpdateRequest) => {
            return { uri: scope.doc.uri, ver: scope.doc.version, wq: scope.awaitersQueue.length };
        },
    })
    resolve() {
        this.completed = true;
        for (const tmp of this.awaitersQueue) {
            tmp();
        }
        this.awaitersQueue = [];
    }

    @logIt({
        level: 'verbose',
        scopeDump: (scope: DocumentUpdateRequest) => {
            return { uri: scope.doc.uri, ver: scope.doc.version, wq: scope.awaitersQueue.length };
        },
    })
    cancel() {
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
            this.updateTimer = void 0;
            this.completed = true;

            if (this.awaitersQueue.length > 0) {
                this.resolve();
                logger.warn(`awaitersQueue not empty`);
                // ideally we should reject all awaiters instead of faking completion
                // although it shouldn't be an issue either case, since update is invoked at first demand
                // furthermore reindexing runs in a synchronous function,
                // thus there's no risk of any pending routine resuming before requested resource is ready
            }
        }
        else if (this.diagnosticsTimer) {
            clearTimeout(this.diagnosticsTimer);
            this.diagnosticsTimer = void 0;
        }
    }
}

export const enum ServiceStateFlags {
    IndexingInProgress         = 1 << 0,

    StepWorkspaceDiscoveryDone = 1 << 1,
    StepModsDiscoveryDone      = 1 << 2,
    StepFilesDone              = 1 << 3,
    StepMetadataDone           = 1 << 4,

    StatusNone                 = 0,
    StatusReady                = StepWorkspaceDiscoveryDone | StepModsDiscoveryDone | StepFilesDone | StepMetadataDone,
    StatusBusy                 = IndexingInProgress,
}

type ProgressReportParams = {
    message?: string;
    increment?: number;
};

type ProgressReporter = {
    create: (params: ProgressReportParams) => void;
    report: (params: ProgressReportParams) => void;
    done: (params: ProgressReportParams) => void;
};

function installProgressReporter(lsvc: LangService): ProgressReporter {
    function progressCreate(params: ProgressReportParams) {
        lsvc.conn.sendNotification('progressCreate', params);
    }
    function progressReport(params: ProgressReportParams) {
        lsvc.conn.sendNotification('progressReport', params);
    }
    function progressDone(params: ProgressReportParams) {
        lsvc.conn.sendNotification('progressDone', params);
    }
    return {
        create: progressCreate,
        report: progressReport,
        done: progressDone,
    };
}

export type InitializationOptions = {
    defaultDataPath: string;
    globalStoragePath: string;
    wordPattern: string[];
    configuration: S2LConfig;
};

export type ErrorHandlerType = (params: {
    err: Error,
    self: any,
    propKey: string,
}) => void;

export interface ErrorReporter {
    errHandler: ErrorHandlerType;
}

export interface LangService {
    readonly conn: lsp.Connection;
}

export class S2LServer implements ErrorReporter, LangService {
    protected documents = new lsp.TextDocuments();
    protected documentUpdateRequests = new Map<string, DocumentUpdateRequest>();
    protected schemaLoader: SchemaLoader;
    protected progress = installProgressReporter(this);

    providers = {
        diagnostics: new DiagnosticsProvider(),
        completion: new CompletionsProvider(),
        definition: new DefinitionProvider(),
        hover: new HoverProvider(),
        references: new ReferenceProvider(),
        navigation: new NavigationProvider(),
        color: new ColorProvider(),
        descTreeData: new DescTreeDataProvider(),
    };

    initParams: lsp.InitializeParams;
    initOptions: InitializationOptions;
    wordPattern: RegExp;
    cfg: S2LConfig;
    store: Store;
    schema: SchemaRegistry;
    state: ServiceStateFlags = ServiceStateFlags.StatusNone;

    private errCounter = 0;
    errHandler: ErrorHandlerType = (params) => {
        if (this.errCounter === 0) {
            this.conn.window.showErrorMessage(`Whoops! An unhandled exception occurred within SC2Layouts extension. Please consider [reporting it](https://github.com/Talv/sc2-layouts/issues) with the log included. You'll not be notified about further errors within this session. However, it is possible that index state has been corrupted, and restart might be required if extension will stop function properly.`);
        }
        ++this.errCounter;
        logger.error(`Unhandled exception in ${params.self.constructor.name}:${params.propKey} (${this.errCounter})`, params.err);

        if (this.errCounter > 5) {
            process.exit(1);
        }
    }

    constructor(public readonly conn: lsp.IConnection) {
        if (!conn) return;

        this.documents.listen(this.conn);
        this.documents.onDidChangeContent(this.onDidChangeContent.bind(this));
        this.documents.onDidOpen(this.onDidOpen.bind(this));
        this.documents.onDidClose(this.onDidClose.bind(this));
        this.documents.onDidSave(this.onDidSave.bind(this));
        this.conn.onDidChangeWatchedFiles(this.onDidChangeWatchedFiles.bind(this));

        // -
        this.conn.onInitialize(this.onInitialize.bind(this));
        this.conn.onInitialized(this.onInitialized.bind(this));
        this.conn.onDidChangeConfiguration(this.onDidChangeConfiguration.bind(this));
        this.conn.onExecuteCommand(this.onExecuteCommand.bind(this));
    }

    protected debounceDocumentSync(inDoc: lsp.TextDocument) {
        const prevReq = this.documentUpdateRequests.get(inDoc.uri);
        if (prevReq && (prevReq.updateTimer || prevReq.diagnosticsTimer)) {
            prevReq.cancel();
            this.documentUpdateRequests.delete(inDoc.uri);
        }

        const req = new DocumentUpdateRequest(inDoc, (forced: boolean) => {
            req.updateTimer = void 0;

            logger.verbose(`[debounceDocumentSync:processUpdate]`, {
                uri: inDoc.uri,
                ver: inDoc.version,
                forced,
            });

            if (this.documentUpdateRequests.get(inDoc.uri) !== req) {
                logger.verbose(`[debounceDocumentSync:processUpdate] discarded`);
                req.cancel();
                return;
            }

            this.updateDocument(req.doc);
            req.resolve();

            if (this.cfg.documentDiagnosticsDelay !== false) {
                req.diagnosticsTimer = setTimeout(() => {
                    req.diagnosticsTimer = void 0;
                    this.documentUpdateRequests.delete(req.doc.uri);
                    this.postDiagnostics(req.doc);
                }, this.cfg.documentDiagnosticsDelay);
            }
            else {
                this.documentUpdateRequests.delete(req.doc.uri);
            }
        });

        req.updateTimer = setTimeout(req.doUpdate.bind(this, false), this.cfg.documentUpdateDelay);
        this.documentUpdateRequests.set(inDoc.uri, req);
    }

    public async flushDocumentByUri(documentUri: string) {
        const req = this.documentUpdateRequests.get(documentUri);
        if (req && !req.completed) {
            if (req.updateTimer) {
                req.invokeImmediately();
            }
            else {
                await req.wait();
            }
        }
        return this.store.documents.get(documentUri);
    }

    @errGuard()
    @logIt({ argsDump: (doc: lsp.TextDocument, force: boolean) => {
        return { uri: doc.uri, ver: doc.version, force: force };
    }})
    public async syncDocument(doc: lsp.TextDocument, force = false) {
        const req = this.documentUpdateRequests.get(doc.uri);
        if (req && (doc.version >= req.doc.version || doc.version === 0 || force)) {
            if (req.updateTimer && doc.version === req.doc.version) {
                return this.flushDocumentByUri(doc.uri);
            }
            else {
                req.cancel();
                this.documentUpdateRequests.delete(doc.uri);
            }
        }

        return this.updateDocument(doc);
    }

    @errGuard()
    @logIt()
    protected updateDocument(doc: lsp.TextDocument) {
        return this.store.updateDocument(doc.uri, doc.getText(), doc.version);
    }

    @errGuard()
    protected async loadSchema() {
        let schemaRegistry: SchemaRegistry;
        try {
            schemaRegistry = await this.schemaLoader.prepareSchema();
        }
        catch (e) {
            logger.error('prepareSchema', e);
            this.conn.window.showErrorMessage(`Fatal error, failed to load schema files. ${(<Error>e).message}`);
            return;
        }
        return schemaRegistry;
    }

    @logIt()
    protected async requestReindex() {
        if (!(this.state & ServiceStateFlags.StepWorkspaceDiscoveryDone)) {
            logger.info('[reindex] aborted: !StepWorkspaceDiscoveryDone');
            return;
        }

        const choice = await this.conn.window.showInformationMessage(
            (`Workspace configuration has changed, reindex might be required. Would you like to do that now?`),
            { title: 'Yes' },
            { title: 'No' }
        );
        if (!choice || choice.title !== 'Yes') return;

        if ((this.state & ServiceStateFlags.StatusReady) !== ServiceStateFlags.StatusReady) {
            logger.info('[reindex] aborted: !StatusReady');

            if (this.state === ServiceStateFlags.StatusNone) {
                logger.error('[reindex] current status = StatusNone. softlock?');
            }

            return;
        }

        logger.info('[reindex] begin');
        this.state = ServiceStateFlags.StatusNone;
        await this.store.clear();
        this.reindex();
    }

    @errGuard()
    @logIt()
    protected async reindex() {
        const archives: s2.Archive[] = [];
        const wsArchives: s2.Archive[] = [];

        let projFolders = await this.conn.workspace.getWorkspaceFolders();
        if (!projFolders) projFolders = [];

        this.progress.create({ message: 'Indexing layouts' });
        this.state = ServiceStateFlags.IndexingInProgress;

        // -
        if (typeof this.cfg.builtinMods === 'object') {
            for (const [mod, enabled] of objventries(this.cfg.builtinMods)) {
                if (!enabled) continue;
                const uri = URI.file(path.resolve(this.cfg.dataPath ? this.cfg.dataPath : this.initOptions.defaultDataPath, <string>mod));
                archives.push(new s2.Archive(<string>mod, uri, true));
            }
        }

        // -
        if (projFolders !== void 0 && projFolders.length) {
            logger.info('processing workspace folders..', projFolders);

            for (const wsFolder of projFolders) {
                for (const fsPath of (await s2.findArchiveDirectories(URI.parse(wsFolder.uri).fsPath))) {
                    let name = path.basename(fsPath);
                    if (name !== wsFolder.name) {
                        name = `${wsFolder.name}/${path.basename(fsPath)}`;
                    }
                    wsArchives.push(new s2.Archive(name, URI.file(fsPath)));
                }
            }

            // -
            if (wsArchives.length) {
                logger.info('s2mods found in workspace:', wsArchives.map(item => {
                    return {name: item.name, fsPath: item.uri.fsPath};
                }));
            }
            else {
                logger.info('No s2mods found in workspace folders.');
            }
        }
        else {
            logger.info('No folders in workspace.');
        }

        // -
        this.progress.report({ message: 'Workspace discovery' });
        const mArchives = archives.concat(wsArchives);
        this.store.presetArchives(...mArchives);
        this.state |= ServiceStateFlags.StepWorkspaceDiscoveryDone;
        const fileList: string[] = [].concat(...await Promise.all(mArchives.map(async (sa) => {
            const tmp = await this.fetchFilelist(sa.uri);
            logger.debug(`${sa.uri.fsPath} [${tmp.length}]`);
            return tmp;
        })));
        this.state |= ServiceStateFlags.StepModsDiscoveryDone;

        // -
        this.conn.sendNotification('sc2layout/workspaceStatus', { s2ArchiveWsCount: wsArchives.length });

        // -
        logger.info(`Indexing layouts files..`);
        let index = 0;
        let partialFileList: string[];
        const chunkLength = 25;
        while ((partialFileList = fileList.slice(index, index + chunkLength)).length) {
            index += chunkLength;
            this.progress.report({
                increment: 0,
                message: path.basename(partialFileList[0])
            });
            await Promise.all(partialFileList.map(async fsPath => {
                const content = await createTextDocumentFromFs(fsPath);
                await this.syncDocument(content);
            }));
            this.progress.report({
                increment: 50.0 / (fileList.length - 1) * chunkLength,
            });
        }
        this.state |= ServiceStateFlags.StepFilesDone;

        // -
        this.progress.report({ message: 's2mods metadata' });
        logger.info(`Indexing s2mods metadata..`);
        for (const sa of this.store.s2ws.archives.values()) {
            this.progress.report({
                message: sa.name,
                increment: 0,
            });
            await this.store.s2ws.reloadArchive(sa);
            this.progress.report({
                increment: 50.0 / (this.store.s2ws.archives.size - 1),
            });
        }
        this.state |= ServiceStateFlags.StepMetadataDone;

        // -
        for (const document of this.documents.all()) {
            if (document.languageId !== languageId) continue;
            if (!this.store.s2ws.matchFileWorkspace(URI.parse(document.uri))) continue;
            const sourceFile = await this.syncDocument(document);
            await this.postDiagnostics(sourceFile.tdoc);
        }

        this.progress.done({ message: 'SC2Layout: indexing completed!' });
        this.state &= ~ServiceStateFlags.IndexingInProgress;

        this.providers.descTreeData.sendWorkspaceChange();
    }

    protected async fetchFilelist(uri: URI) {
        const r = await globify(`**/*.${languageExt}`, {
            cwd: uri.fsPath,
            absolute: true,
            nodir: true,
            nocase: true,
        });
        return r;
    }

    @logIt({ level: 'verbose', profiling: false, argsDump: true, resDump: true })
    protected async onInitialize(params: lsp.InitializeParams): Promise<lsp.InitializeResult> {
        this.initParams = params;
        this.initOptions = params.initializationOptions;
        this.wordPattern = new RegExp(this.initOptions.wordPattern[0], this.initOptions.wordPattern[1]);

        this.cfg = this.initOptions.configuration;

        this.schemaLoader = new SchemaLoader(this);
        this.schema = await this.loadSchema();

        return {
            capabilities: {
                workspace: {
                    workspaceFolders: {
                        supported: true,
                        changeNotifications: true,
                    },
                },
                textDocumentSync: {
                    change: this.documents.syncKind,
                    openClose: true,
                },
                documentSymbolProvider: true,
                workspaceSymbolProvider: true,
                completionProvider: {
                    triggerCharacters: ['<', '"', '#', '$', '@', '/', '\\', ':', '.'],
                    resolveProvider: false,
                },
                definitionProvider: true,
                hoverProvider: true,
                referencesProvider: true,
                colorProvider: true,
                executeCommandProvider: {
                    commands: [
                        'sc2layout.updateSchemaFiles',
                        'sc2layout.analyzeWorkspace',
                    ],
                },
            }
        };
    }

    @logIt({ level: 'verbose', profiling: false, argsDump: true })
    protected onInitialized(params: lsp.InitializedParams) {
        this.postInit();
    }

    @logIt({ profiling: false, argsDump: true })
    private onDidChangeWorkspaceFolders(ev: lsp.WorkspaceFoldersChangeEvent) {
        this.requestReindex();
    }

    @errGuard()
    @logIt({ level: 'verbose', profiling: false, argsDump: ev => ev.settings.sc2layout })
    protected onDidChangeConfiguration(ev: lsp.DidChangeConfigurationParams) {
        let reindexRequired = false;

        const newCfg = JSON.parse(JSON.stringify(ev.settings.sc2layout)) as S2LConfig;
        if (
            this.cfg.dataPath !== newCfg.dataPath ||
            JSON.stringify(this.cfg.builtinMods) !== JSON.stringify(newCfg.builtinMods)
        ) {
            reindexRequired = true;
        }
        this.cfg = newCfg;

        if (reindexRequired && this.store) {
            this.requestReindex();
        }
    }

    @logIt()
    protected async postInit() {
        this.store = new Store(this.schema);

        if (this.initParams.capabilities.workspace.workspaceFolders) {
            this.conn.workspace.onDidChangeWorkspaceFolders(this.onDidChangeWorkspaceFolders.bind(this));
        }

        // - init providers
        for (const [pvName, pvObj] of objventries(this.providers)) {
            pvObj.init(this, this.store);
        }
        // - install providers
        for (const [pvName, pvObj] of objventries(this.providers)) {
            pvObj.install();
        }

        // -
        this.reindex();
    }

    @errGuard()
    @logIt({ level: 'verbose', profiling: false, argsDump: ev => {
        return { uri: ev.document.uri, ver: ev.document.version };
    }})
    protected onDidChangeContent(ev: lsp.TextDocumentChangeEvent) {
        if (!(this.state & ServiceStateFlags.StepFilesDone)) {
            logger.verbose('Busy..');
            return;
        }
        this.debounceDocumentSync(ev.document);
    }

    @logIt({ level: 'debug', profiling: false, argsDump: ev => ev.document.uri })
    private async onDidOpen(ev: lsp.TextDocumentChangeEvent) {
        if (!(this.state & ServiceStateFlags.StepFilesDone)) {
            logger.verbose('Busy..');
            return;
        }
        await this.syncDocument(ev.document);
        await this.postDiagnostics(ev.document);
    }

    @logIt({ level: 'verbose', profiling: false, argsDump: ev => ev.document.uri })
    private onDidClose(ev: lsp.TextDocumentChangeEvent) {
        if (!this.store.s2ws.matchFileWorkspace(URI.parse(ev.document.uri))) {
            this.store.removeDocument(ev.document.uri);
            logger.verbose('removed from store', ev.document.uri);
        }
        this.conn.sendDiagnostics({
            uri: ev.document.uri,
            diagnostics: [],
        });
    }

    @logIt({ level: 'debug', profiling: false, argsDump: ev => ev.document.uri })
    private async onDidSave(ev: lsp.TextDocumentChangeEvent) {
        await this.syncDocument(ev.document);
        await this.postDiagnostics(ev.document);
    }

    @errGuard()
    @logIt()
    private async onDidChangeWatchedFiles(ev: lsp.DidChangeWatchedFilesParams) {
        for (const item of ev.changes) {
            await this.onDidChangeFile(item);
        }
    }

    @logIt({
        level: 'debug',
        profiling: true,
        argsDump: (ev: lsp.FileEvent) => {
            return {
                type: fileChangeTypeNames[ev.type],
                uri: ev.uri,
            };
        },
        resDump: true,
    })
    protected async onDidChangeFile(ev: lsp.FileEvent) {
        if (URI.parse(ev.uri).fsPath.match(/sc2\w+\.(temp|orig)/gi)) return false;
        if (!this.store.s2ws.matchFileWorkspace(URI.parse(ev.uri))) return false;

        if (path.extname(URI.parse(ev.uri).fsPath).toLowerCase() === '.sc2layout') {
            if (!(this.state & ServiceStateFlags.StepFilesDone)) {
                logger.debug('state not StepFilesDone');
                return false;
            }

            switch (ev.type) {
                case lsp.FileChangeType.Created:
                case lsp.FileChangeType.Changed:
                {
                    if (this.documents.get(ev.uri)) return false;
                    await this.syncDocument(await createTextDocumentFromFs(URI.parse(ev.uri).fsPath));
                    return true;
                }
                case lsp.FileChangeType.Deleted:
                {
                    if (!this.store.documents.has(ev.uri)) return false;
                    this.store.removeDocument(ev.uri);
                    return true;
                }
            }

            return true;
        }
        else {
            if (!(this.state & ServiceStateFlags.StepMetadataDone)) {
                logger.debug('state not StepMetadataDone');
                return false;
            }

            const r = await this.store.s2ws.handleFileUpdate(URI.parse(ev.uri));
            if (!r) logger.info('handleFileUpdate failed');

            return true;
        }

        return false;
    }

    @errGuard()
    @logIt({ level: 'debug', profiling: false, argsDump: (doc: lsp.TextDocument) => {
        return { uri: doc.uri, ver: doc.version };
    }})
    private async postDiagnostics(doc: lsp.TextDocument) {
        if (this.documentUpdateRequests.has(doc.uri)) return;
        if (!this.documents.get(doc.uri)) return;
        if (this.documents.get(doc.uri).version > doc.version) return;

        if (this.store.s2ws.matchFileWorkspace(URI.parse(doc.uri))) {
            this.conn.sendDiagnostics({
                uri: doc.uri,
                diagnostics: await this.providers.diagnostics.analyzeFile(doc.uri),
            });
        }
    }

    @errGuard()
    @logIt({ level: 'verbose', profiling: true })
    protected async onExecuteCommand(params: lsp.ExecuteCommandParams) {
        switch (params.command) {
            case 'sc2layout.updateSchemaFiles': {
                await this.schemaLoader.performUpdate(true);
                break;
            }

            case 'sc2layout.analyzeWorkspace': {
                this.conn.sendNotification('sc2layout/workspaceDiagnostics', {
                    content: formatDiagnosticTotal(this.providers.diagnostics.analyzeWorkspace()),
                });
                break;
            }
        }
    }
}
