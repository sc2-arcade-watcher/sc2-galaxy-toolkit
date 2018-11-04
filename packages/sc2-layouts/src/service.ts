import * as util from 'util';
import * as path from 'path';
import * as glob from 'glob';
import * as vs from 'vscode';
import * as lsp from 'vscode-languageserver';
import URI from 'vscode-uri';
import { Store, createTextDocumentFromFs } from './index/store';
import { CompletionsProvider } from './services/completions';
import { languageId, DiagnosticCategory, XMLNode, languageExt } from './types';
import { AbstractProvider, createProvider, ILoggerConsole, IService, svcRequest } from './services/provider';
import { HoverProvider } from './services/hover';
import { ElementDefKind } from './schema/base';
import { generateSchema } from './schema/map';
import { DefinitionProvider } from './services/definition';
import { objventries } from './common';
import * as s2 from './index/s2mod';
import { NavigationProvider } from './services/navigation';
import { DiagnosticsProvider } from './services/diagnostics';

// const builtinMods = [
//     'campaigns/liberty.sc2campaign',
//     'campaigns/swarm.sc2campaign',
//     'campaigns/swarmstory.sc2campaign',
//     'campaigns/void.sc2campaign',
//     'campaigns/voidstory.sc2campaign',
//     'mods/alliedcommanders.sc2mod',
//     'mods/core.sc2mod',
//     'mods/missionpacks/novacampaign.sc2mod',
//     'mods/novastoryassets.sc2mod',
//     'mods/voidprologue.sc2mod',
//     'mods/war3data.sc2mod',
// ];

namespace ExtCfgSect {
    export type builtinMods = {[name: string]: boolean};
}

interface ExtConfig {
    builtinMods: ExtCfgSect.builtinMods;
    documentUpdateDelay: number;
    documentDiagnosticsDelay: number;
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
};

export class ServiceContext implements IService {
    console: ILoggerConsole;
    protected store: Store;
    protected output: vs.OutputChannel;
    protected fsWatcher: vs.FileSystemWatcher;
    protected diagnosticCollection: vs.DiagnosticCollection;
    protected documentUpdateRequests = new Map<string, DocumentUpdateRequest>();
    config: ExtConfig;

    protected completionsProvider: CompletionsProvider;
    protected hoverProvider: HoverProvider;
    protected definitionProvider: DefinitionProvider;
    protected navigationProvider: NavigationProvider;
    protected diagnosticsProvider: DiagnosticsProvider;

    extContext: vs.ExtensionContext

    protected createProvider<T extends AbstractProvider>(cls: new () => T): T {
        return createProvider(cls, this, this.store, this.console);
    }

    activate(context: vs.ExtensionContext) {
        this.extContext = context;
        this.store = new Store(generateSchema(path.join(context.extensionPath, 'schema')));

        // -
        const lselector = <vs.DocumentSelector>{
            language: languageId,
            scheme: 'file',
        };

        // -
        this.output = vs.window.createOutputChannel(languageId);
        context.subscriptions.push(this.output);
        const emitOutput = (msg: string, ...params: any[]) => {
            if (params.length) {
                msg += ' ' + util.inspect(params.length > 1 ? params : params[0], {
                    depth: 1,
                    colors: false,
                    showHidden: false,
                });
            }
            this.output.appendLine(msg);
        };
        this.console = {
            error: emitOutput,
            warn: emitOutput,
            info: emitOutput,
            log: emitOutput,
            debug: emitOutput,
        };
        // this.output.show();

        // -
        this.diagnosticCollection = vs.languages.createDiagnosticCollection(languageId);
        context.subscriptions.push(this.diagnosticCollection);

        // -
        this.completionsProvider = this.createProvider(CompletionsProvider);
        context.subscriptions.push(vs.languages.registerCompletionItemProvider(lselector, this.completionsProvider, '<', '"', '#', '$', '@', '/'));

        // -
        this.hoverProvider = this.createProvider(HoverProvider);
        context.subscriptions.push(vs.languages.registerHoverProvider(lselector, this.hoverProvider));

        // -
        this.definitionProvider = this.createProvider(DefinitionProvider);
        context.subscriptions.push(vs.languages.registerDefinitionProvider(lselector, this.definitionProvider));

        // -
        this.navigationProvider = this.createProvider(NavigationProvider);
        context.subscriptions.push(vs.languages.registerDocumentSymbolProvider(lselector, this.navigationProvider));
        context.subscriptions.push(vs.languages.registerWorkspaceSymbolProvider(this.navigationProvider));

        // -
        this.diagnosticsProvider = this.createProvider(DiagnosticsProvider);
        context.subscriptions.push(vs.workspace.onDidChangeTextDocument(async ev => {
            if (ev.document.languageId !== languageId) return;
            this.debounceDocumentSync(ev.document);
        }));
        context.subscriptions.push(vs.workspace.onDidOpenTextDocument(async document => {
            if (document.languageId !== languageId) return;
            await this.syncVsDocument(document);
            await this.provideDiagnostics(document.uri.toString());
        }));
        context.subscriptions.push(vs.workspace.onDidSaveTextDocument(async document => {
            if (document.languageId !== languageId) return;
            await this.syncVsDocument(document);
            await this.provideDiagnostics(document.uri.toString());
        }));
        context.subscriptions.push(vs.workspace.onDidCloseTextDocument(async document => {
            if (document.languageId !== languageId) return;
            this.diagnosticCollection.delete(document.uri);
            await this.syncDocument(createTextDocumentFromFs(document.uri.fsPath), true);
        }));

        // -
        context.subscriptions.push(vs.workspace.onDidChangeConfiguration(async e => {
            if (!e.affectsConfiguration(`${languageId}`)) return;
            this.readConfig();
            if (e.affectsConfiguration(`${languageId}.builtinMods`)) {
                await this.reinitialize();
            }
        }));

        // -
        context.subscriptions.push(this);

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
        this.store.clear();
        this.dispose();
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
            builtinMods: wsConfig.get<ExtCfgSect.builtinMods>('builtinMods', {}),
            documentUpdateDelay: wsConfig.get<number>('documentUpdateDelay', 100),
            documentDiagnosticsDelay: wsConfig.get<number>('documentDiagnosticsDelay', -1),
        };
        this.console.log('[readConfig]', this.config);
    }

    @svcRequest(false)
    protected async initialize() {
        const archives: s2.Archive[] = [];
        const wsArchives: s2.Archive[] = [];

        // -
        this.readConfig();

        // -
        for (const [mod, enabled] of objventries(this.config.builtinMods)) {
            if (!enabled) continue;
            const uri = URI.file(path.join(this.extContext.extensionPath, 'sc2-data', <string>mod));
            archives.push(new s2.Archive(<string>mod, uri));
        }

        // -
        for (const sa of archives) {
            await this.indexDirectory(sa.uri);
        }

        // -
        if (vs.workspace.workspaceFolders) {
            for (const wsFolder of vs.workspace.workspaceFolders) {
                // const r = await vs.workspace.findFiles(`**/*.${languageExt}`, uri.fsPath);
                await this.indexDirectory(wsFolder.uri);

                for (const fsPath of (await s2.findArchiveDirectories(wsFolder.uri.fsPath))) {
                    wsArchives.push(new s2.Archive(`${wsFolder.name}/${path.basename(fsPath)}`, URI.file(fsPath)));
                }
            }
            this.console.info('S2Archives in workspace:', wsArchives.map(item => {
                return {name: item.name, fsPath: item.uri.fsPath};
            }));
        }

        // -
        this.store.s2ws = new s2.Workspace(archives.concat(wsArchives), this.console);
        await this.store.s2ws.reload();

        // -
        // vs.workspace.findFiles(`**/*.${languageExt}`).then(e => {
        //     this.output.appendLine(`findFiles ${e.length}`)
        //     for (const item of e) {
        //         this.indexDocument(createTextDocumentFromFs(item.fsPath));
        //     }
        // });

        // -
        this.fsWatcher = vs.workspace.createFileSystemWatcher('**/{GameStrings.txt,GameHotkeys.txt,Assets.txt,AssetsProduct.txt,FontStyles.SC2Style,*.SC2Layout}');
        this.fsWatcher.onDidCreate(e => this.onFileChange({type: vs.FileChangeType.Created, uri: e}));
        this.fsWatcher.onDidDelete(e => this.onFileChange({type: vs.FileChangeType.Deleted, uri: e}));
        this.fsWatcher.onDidChange(e => this.onFileChange({type: vs.FileChangeType.Changed, uri: e}));
    }

    @svcRequest(false, (uri: vs.Uri) => uri.fsPath)
    protected async indexDirectory(uri: vs.Uri) {
        const r = await new Promise<string[]>((resolve, reject) => {
            glob(`**/*.${languageExt}`, {
                cwd: uri.fsPath,
                absolute: true,
                nodir: true,
            }, (err, matches) => {
                if (err) reject(err)
                else resolve(matches);
            })
        });
        this.output.appendLine(`results ${r.length}`)
        for (const item of r) {
            await this.syncDocument(createTextDocumentFromFs(item));
        }
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
