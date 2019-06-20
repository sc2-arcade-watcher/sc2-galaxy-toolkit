import * as util from 'util';
import * as path from 'path';
import * as vs from 'vscode';
import * as lsp from 'vscode-languageserver';
import URI from 'vscode-uri';
import { Store, createTextDocumentFromFs } from './index/store';
import { CompletionsProvider } from './services/completions';
import { languageId, DiagnosticCategory, XMLNode, languageExt } from './types';
import { AbstractProvider, createProvider, ILoggerConsole, IService, svcRequest } from './services/provider';
import { HoverProvider } from './services/hover';
import { SchemaRegistry } from './schema/base';
import { DefinitionProvider } from './services/definition';
import { objventries, globify } from './common';
import * as s2 from './index/s2mod';
import { NavigationProvider } from './services/navigation';
import { DiagnosticsProvider } from './services/diagnostics';
import { TreeViewProvider } from './services/dtree';
import { DocumentColorProvider } from './services/color';
import { ReferenceProvider } from './services/reference';
import { PropertiesViewProvider } from './services/propertiesTree';
import { SchemaLoader } from './schemaLoader';

export enum ExtCfgSchemaUpdateMode {
    Auto = 'auto',
    Manual = 'manual',
}

export interface ExtCfgSchema {
    updateMode: ExtCfgSchemaUpdateMode;
    localPath: string;
}

namespace ExtCfgSect {
    export type builtinMods = {[name: string]: boolean};
}

export enum ExtConfigCompletionTabStopKind {
    EOL,
    Attr,
}

export interface ExtConfigCompletion {
    tabStop: ExtConfigCompletionTabStopKind;
    stategroupDefaultState: boolean | string;
}

export interface ExtTreeView {
    visible: boolean;
}

export interface ExtConfig {
    schema: ExtCfgSchema;
    dataPath: string;
    builtinMods: ExtCfgSect.builtinMods;
    documentUpdateDelay: number;
    documentDiagnosticsDelay: number;
    completion: ExtConfigCompletion;
    treeview: ExtTreeView;
}

type ExtCfgKey = keyof ExtConfig;

export function createDocumentFromVS(vdocument: vs.TextDocument): lsp.TextDocument {
    return <lsp.TextDocument>{
        uri: vdocument.uri.toString(),
        languageId: languageId,
        version: vdocument.version,
        getText: (range?: lsp.Range) => {
            const vrange = range ? new vs.Range(
                new vs.Position(range.start.line, range.start.character),
                new vs.Position(range.end.line, range.end.character)
            ) : undefined;
            return vdocument.getText(vrange);
        },
    };
}

class DocumentUpdateRequest {
    updateTimer: NodeJS.Timer;
    diagnosticsTimer: NodeJS.Timer;
    completed = false;
    protected funcs: (() => void)[] = [];

    constructor(public readonly uri: string, public readonly version: number) {}

    wait() {
        if (this.completed) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            this.funcs.push(resolve);
        });
    }

    resolve() {
        this.completed = true;
        for (const tmp of this.funcs) {
            tmp();
        }
        this.funcs = [];
    }

    cancel() {
        if (this.updateTimer) {
            clearTimeout(this.updateTimer);
            this.updateTimer = void 0;
            this.completed = true;
            return;
        }
        if (this.diagnosticsTimer) {
            clearTimeout(this.diagnosticsTimer);
            this.diagnosticsTimer = void 0;
            return;
        }
    }
}

interface ProgressProxy {
    done: () => void;
    progress: vs.Progress<{ message?: string; increment?: number }>;
}

function createProgressNotification(options: vs.ProgressOptions) {
    let r = <ProgressProxy>{};
    vs.window.withProgress(
        options,
        (progress, token) => {
            r.progress = progress;

            return new Promise((resolve) => {
                r.done = resolve;
            });
        }
    );
    return r;
}

export const enum ServiceStateFlags {
    IndexingInProgress         = 1 << 0,

    StepWorkspaceDiscoveryDone = 1 << 1,
    StepModsDiscoveryDone      = 1 << 2,
    StepFilesDone              = 1 << 3,
    StepMetadataDone           = 1 << 4,

    StatusReady                = StepWorkspaceDiscoveryDone | StepModsDiscoveryDone | StepFilesDone | StepMetadataDone,
    StatusBusy                 = IndexingInProgress,
}

export class ServiceContext implements IService {
    console: ILoggerConsole;
    protected store: Store;
    errorOutputChannel: vs.OutputChannel;
    protected fsWatcher: vs.FileSystemWatcher;
    protected diagnosticCollection: vs.DiagnosticCollection;
    protected documentUpdateRequests = new Map<string, DocumentUpdateRequest>();
    config: ExtConfig;
    state: ServiceStateFlags = 0;

    protected schemaLoader: SchemaLoader;
    protected completionsProvider: CompletionsProvider;
    protected hoverProvider: HoverProvider;
    protected definitionProvider: DefinitionProvider;
    protected referenceProvider: ReferenceProvider;
    protected navigationProvider: NavigationProvider;
    protected colorProvider: DocumentColorProvider;
    public treeviewProvider: TreeViewProvider;
    public frameViewProvider: PropertiesViewProvider;
    protected diagnosticsProvider: DiagnosticsProvider;

    extContext: vs.ExtensionContext;

    getThemeIcon(name: string) {
        return {
            light: path.join(this.extContext.extensionPath, 'resources', 'light', `${name}`),
            dark: path.join(this.extContext.extensionPath, 'resources', 'dark', `${name}`)
        };
    }

    protected createProvider<T extends AbstractProvider>(cls: new () => T): T {
        return createProvider(cls, this, this.store, this.console);
    }

    async activate(context: vs.ExtensionContext) {
        this.extContext = context;

        // -
        const lselector = <vs.DocumentSelector>{
            language: languageId,
            scheme: 'file',
        };

        // -
        this.errorOutputChannel = vs.window.createOutputChannel(languageId);
        context.subscriptions.push(this.errorOutputChannel);
        const emitOutput = (msg: string, ...params: any[]) => {
            if (params.length) {
                msg += ' ' + util.inspect(params.length > 1 ? params : params[0], {
                    depth: 1,
                    colors: false,
                    showHidden: false,
                });
            }
            this.errorOutputChannel.appendLine(msg);
        };
        let errorCounter = 0;
        this.console = {
            error: (msg, ...params: string[]) => {
                if (errorCounter === 0) {
                    this.errorOutputChannel.show(true);
                    vs.window.showErrorMessage(`Whoops! An unhandled exception occurred within SC2Layouts extension. Please consider [reporting it](https://github.com/Talv/sc2-layouts/issues) with the log included. You'll not be notified about further errors within this session. However, it is possible that index state has been corrupted, and restat might be required if extension will stop function properly.`, { modal : false });
                }
                ++errorCounter;
                emitOutput(msg, params);
            },
            warn: emitOutput,
            info: emitOutput,
            log: emitOutput,
            debug: emitOutput,
        };
        if (process.env.SC2LDEBUG) {
            this.errorOutputChannel.show(false);
        }

        // -
        this.readConfig();

        // -
        this.schemaLoader = new SchemaLoader(this);
        context.subscriptions.push(this.schemaLoader);
        let schemaRegistry: SchemaRegistry;
        try {
            schemaRegistry = await this.schemaLoader.prepareSchema();
        }
        catch (e) {
            this.console.error('prepareSchema', e);
            this.console.error(`Fatal error`);
            return;
        }

        // -
        this.store = new Store(schemaRegistry);
        this.store.s2ws.logger = this.console;

        // -
        this.diagnosticCollection = vs.languages.createDiagnosticCollection(languageId);
        context.subscriptions.push(this.diagnosticCollection);

        // -
        this.completionsProvider = this.createProvider(CompletionsProvider);
        context.subscriptions.push(vs.languages.registerCompletionItemProvider(lselector, this.completionsProvider, '<', '"', '#', '$', '@', '/', '\\'));

        // -
        this.hoverProvider = this.createProvider(HoverProvider);
        context.subscriptions.push(vs.languages.registerHoverProvider(lselector, this.hoverProvider));

        // -
        this.definitionProvider = this.createProvider(DefinitionProvider);
        context.subscriptions.push(vs.languages.registerDefinitionProvider(lselector, this.definitionProvider));

        // -
        this.referenceProvider = this.createProvider(ReferenceProvider);
        context.subscriptions.push(vs.languages.registerReferenceProvider(lselector, this.referenceProvider));

        // -
        this.navigationProvider = this.createProvider(NavigationProvider);
        context.subscriptions.push(vs.languages.registerDocumentSymbolProvider(lselector, this.navigationProvider));
        context.subscriptions.push(vs.languages.registerWorkspaceSymbolProvider(this.navigationProvider));

        // -
        this.colorProvider = this.createProvider(DocumentColorProvider);
        context.subscriptions.push(vs.languages.registerColorProvider(lselector, this.colorProvider));

        // -
        this.treeviewProvider = this.createProvider(TreeViewProvider);
        if (this.config.treeview.visible) {
            context.subscriptions.push(this.treeviewProvider.register());
        }

        // -
        if (this.config.treeview.visible) {
            this.frameViewProvider = this.createProvider(PropertiesViewProvider);
            context.subscriptions.push(this.frameViewProvider);
        }

        // -
        this.hoverProvider.defProvider = this.definitionProvider;
        this.referenceProvider.defProvider = this.definitionProvider;

        // -
        this.diagnosticsProvider = this.createProvider(DiagnosticsProvider);
        context.subscriptions.push(vs.workspace.onDidChangeTextDocument(async ev => {
            if (ev.document.languageId !== languageId) return;
            if (!(this.state & ServiceStateFlags.StepFilesDone)) return;
            this.debounceDocumentSync(ev.document);
        }));
        context.subscriptions.push(vs.workspace.onDidOpenTextDocument(async document => {
            if (document.languageId !== languageId) return;
            if (!(this.state & ServiceStateFlags.StepFilesDone)) return;
            await this.syncVsDocument(document);
            await this.provideDiagnostics(document.uri.toString());
        }));
        context.subscriptions.push(vs.workspace.onDidSaveTextDocument(async document => {
            if (document.languageId !== languageId) return;
            if (!(this.state & ServiceStateFlags.StepFilesDone)) return;
            await this.syncVsDocument(document);
            await this.provideDiagnostics(document.uri.toString());
        }));
        context.subscriptions.push(vs.workspace.onDidCloseTextDocument(async document => {
            if (document.languageId !== languageId) return;
            this.diagnosticCollection.delete(document.uri);
            if (!(this.state & ServiceStateFlags.StepFilesDone)) return;
            if (document.isDirty) {
                await this.syncDocument(await createTextDocumentFromFs(document.uri.fsPath), true);
            }
        }));

        // -
        const workspaceMonitorSB = vs.window.createStatusBarItem(vs.StatusBarAlignment.Left);
        workspaceMonitorSB.hide();
        workspaceMonitorSB.text = 'SC2 Layout: Workspace not configured!';
        workspaceMonitorSB.tooltip = `Couldn't match currently active SC2Layout file to SC2Mod/SC2Map document it belongs to. Due to that certain Intellisense capabilities have been disabled or might not function properly. Use "File: Open folder" and point it to your SC2Mod/SC2Map component folder, or a parent folder that holds SC2Mod/SC2Map documents.`;
        workspaceMonitorSB.command = 'workbench.action.files.openFolder';
        workspaceMonitorSB.color = new vs.ThemeColor('errorForeground');

        vs.window.onDidChangeActiveTextEditor(ev => {
            workspaceMonitorSB.hide();
            if (!ev || ev.document.languageId !== languageId) return;
            if (!(this.state & ServiceStateFlags.StepModsDiscoveryDone)) return;

            if (vs.workspace.workspaceFolders !== void 0 && vs.workspace.workspaceFolders.length) {
                const nonNativeS2Documents = Array.from(this.store.s2ws.archives.values()).filter(i => !i.native)
                if (nonNativeS2Documents.length) return;
            }

            workspaceMonitorSB.show();
        });

        // -
        context.subscriptions.push(vs.workspace.onDidChangeWorkspaceFolders(async e => {
            this.console.debug('[onDidChangeWorkspaceFolders]', e);
            await this.reinitialize();
        }));


        // -
        context.subscriptions.push(vs.workspace.onDidChangeConfiguration(async e => {
            if (!e.affectsConfiguration(`${languageId}`)) return;
            this.console.debug('[onDidChangeConfiguration]');

            this.readConfig();

            if (e.affectsConfiguration(`${languageId}.builtinMods`) || e.affectsConfiguration(`${languageId}.dataPath`)) {
                await this.reinitialize();
            }
        }));

        // -
        context.subscriptions.push(this);
        this.store.s2ws.logger = this.console;

        // -
        this.initialize();
    }

    public dispose() {
        if (this.fsWatcher) {
            this.fsWatcher.dispose();
            this.fsWatcher = void 0;
        }
    }

    protected async reinitialize() {
        const choice = await vs.window.showInformationMessage(`Workspace configuration has changed, reindex might be required. Would you like to do that now?`, 'Yes', 'No');
        if (choice !== 'Yes') return;
        if ((this.state & ServiceStateFlags.StatusReady) !== ServiceStateFlags.StatusReady) return;
        this.console.log('[reinitialize]');
        this.dispose();
        this.state = 0;
        await this.store.clear();
        await this.initialize();
    }

    protected getOpenDocument(uri: string) {
        return vs.workspace.textDocuments.find((item) => {
            if (item.uri.toString() !== uri) return false;
            if (item.isClosed) return false;
            return true;
        });
    }

    protected debounceDocumentSync(vsDocument: vs.TextDocument) {
        const uri = vsDocument.uri.toString();
        const prevReq = this.documentUpdateRequests.get(uri);

        if (prevReq && (prevReq.updateTimer || prevReq.diagnosticsTimer)) {
            prevReq.cancel();
        }

        const req = new DocumentUpdateRequest(uri, vsDocument.version);
        req.updateTimer = setTimeout(async () => {
            req.updateTimer = void 0;
            if (this.documentUpdateRequests.get(uri) !== req) {
                this.console.log(`[debounceDocumentSync] discarded`, {uri: prevReq.uri, version: prevReq.version});
                return;
            }
            const currVsDoc = this.getOpenDocument(uri);
            if (!currVsDoc || currVsDoc.version !== req.version) {
                this.console.log(`[debounceDocumentSync] discarded (corrupted state?)`, {
                    uri: prevReq.uri, version: prevReq.version, currVer: currVsDoc ? currVsDoc.version : null
                });
                return;
            }
            const xDoc = await this.syncVsDocument(currVsDoc);
            req.resolve();
            if (this.documentUpdateRequests.get(uri) !== req) return;

            req.diagnosticsTimer = setTimeout(() => {
                req.diagnosticsTimer = void 0;
                this.provideDiagnostics(req.uri);
                this.documentUpdateRequests.delete(uri);
            }, this.config.documentDiagnosticsDelay);
        }, this.config.documentUpdateDelay);
        this.documentUpdateRequests.set(uri, req);
    }

    protected async provideDiagnostics(uri: string) {
        const req = this.documentUpdateRequests.get(uri);
        if (req && req.diagnosticsTimer) {
            req.cancel();
            this.documentUpdateRequests.delete(uri);
        }

        this.diagnosticCollection.set(vs.Uri.parse(uri), await this.diagnosticsProvider.provideDiagnostics(uri));
        // this.diagnosticCollection.delete(vs.Uri.parse(uri));
    }

    protected readConfig() {
        const wsConfig = vs.workspace.getConfiguration(languageId);
        this.config = {
            schema: wsConfig.get('schema'),
            dataPath: wsConfig.get('dataPath'),
            builtinMods: wsConfig.get<ExtCfgSect.builtinMods>('builtinMods'),
            documentUpdateDelay: wsConfig.get<number>('documentUpdateDelay', 100),
            documentDiagnosticsDelay: wsConfig.get<number>('documentDiagnosticsDelay', -1),
            completion: {
                tabStop: <any>ExtConfigCompletionTabStopKind[<any>wsConfig.get<string>('completion.tabStop')],
                stategroupDefaultState: wsConfig.get('completion.stategroupDefaultState'),
            },
            treeview: {
                visible: wsConfig.get('treeview.visible'),
            }
        };
        if (!this.config.dataPath) {
            this.config.dataPath = path.join(this.extContext.extensionPath, 'sc2-data');
        }
        this.console.log('[readConfig]', this.config);
    }

    @svcRequest(false)
    protected async initialize() {
        const archives: s2.Archive[] = [];
        const wsArchives: s2.Archive[] = [];

        const progressCtrl = createProgressNotification({ title: 'Indexing layouts', location: vs.ProgressLocation.Notification });
        this.state = ServiceStateFlags.IndexingInProgress;

        // -
        if (typeof this.config.builtinMods === 'object') {
            for (const [mod, enabled] of objventries(this.config.builtinMods)) {
                if (!enabled) continue;
                const uri = URI.file(path.join(this.config.dataPath, <string>mod));
                archives.push(new s2.Archive(<string>mod, uri, true));
            }
        }

        // -
        if (vs.workspace.workspaceFolders !== void 0 && vs.workspace.workspaceFolders.length) {
            this.console.info('processing workspace folders..', vs.workspace.workspaceFolders);

            for (const wsFolder of vs.workspace.workspaceFolders) {
                for (const fsPath of (await s2.findArchiveDirectories(wsFolder.uri.fsPath))) {
                    let name = path.basename(fsPath);
                    if (name !== wsFolder.name) {
                        name = `${wsFolder.name}/${path.basename(fsPath)}`;
                    }
                    wsArchives.push(new s2.Archive(name, URI.file(fsPath)));
                }
            }

            // -
            if (wsArchives.length) {
                this.console.info('s2mods found in workspace:', wsArchives.map(item => {
                    return {name: item.name, fsPath: item.uri.fsPath};
                }));
            }
            else {
                this.console.info('No s2mods found in workspace folders. Using workspace rootPath as a base for indexing.');
                wsArchives.push(new s2.Archive(vs.workspace.workspaceFolders[0].name, vs.workspace.workspaceFolders[0].uri));
            }
        }
        else {
            this.console.info('No folders in workspace.');
        }

        // -
        progressCtrl.progress.report({ message: 'Workspace discovery' });
        const mArchives = archives.concat(wsArchives);
        this.store.presetArchives(...mArchives);
        this.state |= ServiceStateFlags.StepWorkspaceDiscoveryDone;
        const fileList: string[] = [].concat(...await Promise.all(mArchives.map(async (sa) => {
            const tmp = await this.fetchFilelist(sa.uri);
            this.console.debug(`${sa.uri.fsPath} [${tmp.length}]`);
            return tmp;
        })));
        this.state |= ServiceStateFlags.StepModsDiscoveryDone;

        // -
        this.console.info(`Indexing layouts files..`);
        let index = 0;
        let partialFileList: string[];
        const chunkLength = 25;
        while ((partialFileList = fileList.slice(index, index + chunkLength)).length) {
            index += chunkLength;
            progressCtrl.progress.report({
                increment: 0,
                message: path.basename(partialFileList[0])
            });
            await Promise.all(partialFileList.map(async fsPath => {
                const content = await createTextDocumentFromFs(fsPath);
                await this.syncDocument(content);
            }));
            progressCtrl.progress.report({
                increment: 50.0 / (fileList.length - 1) * chunkLength,
            });
        }
        this.state |= ServiceStateFlags.StepFilesDone;

        // -
        progressCtrl.progress.report({ message: 's2mods metadata' });
        this.console.info(`Indexing s2mods metadata..`);
        for (const sa of this.store.s2ws.archives.values()) {
            progressCtrl.progress.report({
                message: sa.name,
                increment: 0,
            });
            await this.store.s2ws.reloadArchive(sa);
            progressCtrl.progress.report({
                increment: 50.0 / (this.store.s2ws.archives.size - 1),
            });
        }
        this.state |= ServiceStateFlags.StepMetadataDone;

        // -
        this.fsWatcher = vs.workspace.createFileSystemWatcher('**/{GameStrings.txt,GameHotkeys.txt,Assets.txt,AssetsProduct.txt,FontStyles.SC2Style,*.SC2Layout}');
        this.fsWatcher.onDidCreate(e => this.onFileChange({type: vs.FileChangeType.Created, uri: e}));
        this.fsWatcher.onDidDelete(e => this.onFileChange({type: vs.FileChangeType.Deleted, uri: e}));
        this.fsWatcher.onDidChange(e => this.onFileChange({type: vs.FileChangeType.Changed, uri: e}));

        // -
        for (const item of vs.window.visibleTextEditors) {
            if (item.document.languageId !== languageId) continue;
            if (item.document.isClosed) continue;
            if (!this.store.s2ws.matchFileWorkspace(item.document.uri)) continue;
            await this.syncVsDocument(item.document);
            await this.provideDiagnostics(item.document.uri.toString());
        }

        progressCtrl.done();
        this.state &= ~ServiceStateFlags.IndexingInProgress;
    }

    protected async fetchFilelist(uri: vs.Uri) {
        const r = await globify(`**/*.${languageExt}`, {
            cwd: uri.fsPath,
            absolute: true,
            nodir: true,
            nocase: true,
        });
        return r;
    }

    @svcRequest(false, (doc: lsp.TextDocument) => vs.Uri.parse(doc.uri).fsPath)
    protected async syncDocument(doc: lsp.TextDocument, force = false) {
        const req = this.documentUpdateRequests.get(doc.uri);
        if (req && (doc.version > req.version || doc.version === 0 || force)) {
            req.cancel();
            this.documentUpdateRequests.delete(doc.uri);
        }

        const xDoc = this.store.updateDocument(doc.uri, doc.getText(), doc.version);
        return xDoc;
    }

    @svcRequest(
        false,
        (ev: vs.FileChangeEvent) => `${vs.FileChangeType[ev.type]}: ${ev.uri.fsPath}`,
        (r: boolean) => r
    )
    protected async onFileChange(ev: vs.FileChangeEvent) {
        if (ev.uri.fsPath.match(/(sc2map|sc2mod)\.(temp|orig)/gi)) return false;
        if (!this.store.s2ws.matchFileWorkspace(ev.uri)) {
            this.console.log('not in workspace');
            return false;
        }

        if (!(this.state & ServiceStateFlags.StepFilesDone)) return false;

        if (path.extname(ev.uri.fsPath).toLowerCase() === '.sc2layout') {
            switch (ev.type) {
                case vs.FileChangeType.Deleted:
                {
                    if (!this.store.documents.has(ev.uri.toString())) break;
                    this.store.removeDocument(ev.uri.toString());
                    return true;
                }
                case vs.FileChangeType.Created:
                case vs.FileChangeType.Changed:
                {
                    const vsDoc = this.getOpenDocument(ev.uri.toString());
                    if (vsDoc) break;
                    this.syncVsDocument(vsDoc);
                    return true;
                }
            }
        }
        else {
            if (ev.type === vs.FileChangeType.Changed) {
                return await this.store.s2ws.handleFileUpdate(ev.uri);
            }
        }
        return false;
    }

    public async syncVsDocument(vdoc: vs.TextDocument) {
        let ndoc = this.store.documents.get(vdoc.uri.toString());
        if (!ndoc || ndoc.tdoc.version < vdoc.version) {
            ndoc = await this.syncDocument(createDocumentFromVS(vdoc));
        }
        return ndoc;
    }
}
