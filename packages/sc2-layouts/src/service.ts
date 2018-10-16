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

namespace S2LConfig {
    export type builtinMods = {[name: string]: boolean};
}

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

export class ServiceContext implements IService {
    console: ILoggerConsole;
    protected store: Store;
    protected output: vs.OutputChannel;
    protected fsWatcher: vs.FileSystemWatcher;
    protected diagnosticCollection: vs.DiagnosticCollection;

    protected completionsProvider: CompletionsProvider;
    protected hoverProvider: HoverProvider;
    protected definitionProvider: DefinitionProvider;

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
        context.subscriptions.push(vs.languages.registerCompletionItemProvider(lselector, this.completionsProvider, '<', '\"', '#', '$', '@', '\/'));

        // -
        this.hoverProvider = this.createProvider(HoverProvider);
        context.subscriptions.push(vs.languages.registerHoverProvider(lselector, this.hoverProvider));

        // -
        this.definitionProvider = this.createProvider(DefinitionProvider);
        context.subscriptions.push(vs.languages.registerDefinitionProvider(lselector, this.definitionProvider));

        // -
        context.subscriptions.push(vs.languages.registerDocumentSymbolProvider(lselector, {
            provideDocumentSymbols: this.provideDocumentSymbols.bind(this),
        }));

        // -
        context.subscriptions.push(vs.workspace.onDidChangeTextDocument(async e => {
            if (e.document.languageId !== languageId) return;
            if (e.document.isDirty) return;
            this.console.info(`onDidChangeTextDocument ${e.document.uri.fsPath} [${e.document.version}]`);
            await this.syncVsDocument(e.document);
            const diag = this.store.validateDocument(e.document.uri.toString());
            if (diag.length) {
                this.diagnosticCollection.set(e.document.uri, diag.map(item => {
                    return new vs.Diagnostic(
                        new vs.Range(e.document.positionAt(item.start), e.document.positionAt(item.end)),
                        item.message,
                        <any>item.category,
                    );
                }));
            }
            else {
                this.diagnosticCollection.delete(e.document.uri);
            }
        }));

        // -
        context.subscriptions.push(vs.workspace.onDidOpenTextDocument(async document => {
            if (document.languageId !== languageId) return;
            await this.syncVsDocument(document);
        }));

        // -
        context.subscriptions.push(vs.workspace.onDidCloseTextDocument(document => {
            if (document.languageId !== languageId) return;
            // this.syncDocument(createDocumentFromVS(document));
            this.diagnosticCollection.delete(document.uri);
        }));

        // -
        context.subscriptions.push(vs.workspace.onDidChangeConfiguration(e => {
            if (!e.affectsConfiguration(`${languageId}.builtinMods`)) return;
            this.store.clear();
            this.reinitialize();
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

    protected reinitialize() {
        this.dispose();
        this.initialize();
    }

    @svcRequest(false)
    protected async initialize() {
        const archives: s2.Archive[] = [];
        const wsArchives: s2.Archive[] = [];

        // -
        const builtinMods = <S2LConfig.builtinMods>vs.workspace.getConfiguration(languageId).get('builtinMods');
        for (const [mod, enabled] of objventries(builtinMods)) {
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
        this.extContext.subscriptions.push(this.fsWatcher);
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
    protected async syncDocument(doc: lsp.TextDocument) {
        const ldoc = this.store.updateDocument(doc);
        // if (vs.workspace.textDocuments.find())
        return ldoc;
    }

    @svcRequest(
        false,
        (ev: vs.FileChangeEvent) => `${vs.FileChangeType[ev.type]}: ${ev.uri.fsPath}`,
        (r: boolean) => r
    )
    protected async onFileChange(ev: vs.FileChangeEvent) {
        if (path.extname(ev.uri.fsPath) === '.SC2Layout') {
            switch (ev.type) {
                case vs.FileChangeType.Deleted:
                {
                    if (!this.store.documents.has(ev.uri.toString())) break;
                    this.store.removeDocument(ev.uri.toString());
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
        if (!ndoc || ndoc.text.length !== vdoc.getText().length || ndoc.text !== vdoc.getText()) {
            ndoc = await this.syncDocument(createDocumentFromVS(vdoc));
        }
        return ndoc;
    }

    @svcRequest(false, (doc: lsp.TextDocument) => vs.Uri.parse(doc.uri).fsPath)
    protected provideDocumentSymbols(document: vs.TextDocument, token: vs.CancellationToken): vs.SymbolInformation[] {
        const symbols: vs.SymbolInformation[] = [];
        const sfile = this.store.updateDocument(createDocumentFromVS(document));

        function processNode(node: XMLNode, parentName?: string) {
            if (!node.children) return;
            outer: for (const child of node.children) {
                if (!child.sdef) continue;

                let tsym: vs.SymbolInformation = <vs.SymbolInformation>{};

                switch (child.sdef.nodeKind) {
                    case ElementDefKind.Constant:
                        tsym.kind = vs.SymbolKind.Constant;
                        break;
                    case ElementDefKind.Frame:
                        tsym.kind = vs.SymbolKind.Struct;
                        break;
                    case ElementDefKind.Animation:
                        tsym.kind = vs.SymbolKind.Object;
                        break;
                    case ElementDefKind.StateGroup:
                        tsym.kind = vs.SymbolKind.Class;
                        break;
                    case ElementDefKind.StateGroupState:
                        tsym.kind = vs.SymbolKind.Function;
                        break;
                    default:
                        continue outer;
                }

                tsym.name = `${child.getAttributeValue('name')}`;
                if (child.sdef.nodeKind === ElementDefKind.StateGroupState) {
                    tsym.name = `${parentName} - ${tsym.name}`;
                }
                // if (parentName) {
                //     tsym.name = `${parentName}/${tsym.name}`;
                // }
                tsym.location = new vs.Location(document.uri, new vs.Range(
                    document.positionAt(child.start),
                    document.positionAt(typeof child.startTagEnd !== 'undefined' ? child.startTagEnd : child.end)
                ));
                tsym.containerName = parentName;
                symbols.push(tsym);

                switch (child.sdef.nodeKind) {
                    case ElementDefKind.Frame:
                    case ElementDefKind.StateGroup:
                    {
                        // processNode(child, parentName ? `${parentName}/${tsym.name}` : tsym.name);
                        processNode(child, tsym.name);
                        break;
                    }
                }
            }
        }

        processNode(sfile.getDescNode());

        return symbols;
    }
}