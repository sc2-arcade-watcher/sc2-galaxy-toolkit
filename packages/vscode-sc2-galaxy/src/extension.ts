import * as path from 'path';
import * as vs from 'vscode';
import * as lspc from 'vscode-languageclient/node';
import { TreeViewProvider } from './layout/dtree.js';
import { WorkspaceSetupChecker } from './layout/workspace.js';

let extContext: vs.ExtensionContext;

type ProgressReportParams = {
    message?: string;
    increment?: number;
};

interface ProgressProxy {
    done: (value?: any) => void;
    progress: vs.Progress<ProgressReportParams>;
}

function createProgressNotification(params?: ProgressReportParams) {
    let r = <ProgressProxy>{};
    vs.window.withProgress(
        {
            title: params?.message ?? 'Indexing SC2 archives..',
            location: vs.ProgressLocation.Notification,
        },
        (progress, token) => {
            r.progress = progress;

            return new Promise<void>((resolve) => {
                r.done = resolve;
            });
        }
    );
    return r;
}

function activateGalaxyClient(context: vs.ExtensionContext) {
    const serverModule = context.asAbsolutePath(path.join('node_modules', 'sc2-lsp', 'dist', 'sc2-lsp.mjs'));

    const envSvc = Object.assign({}, process.env);
    envSvc.SC2MOD_LOG_LEVEL = vs.workspace.getConfiguration('sc2galaxy.trace').get('service');

    const serverOptions: lspc.ServerOptions = {
        run: {
            module: serverModule, transport: lspc.TransportKind.stdio, options: {
                env: envSvc,
            }
        },
        debug: {
            module: serverModule, transport: lspc.TransportKind.stdio, options: {
                execArgv: ['--nolazy', '--inspect=6009'],
                env: Object.assign(envSvc, { PLAXTONY_DEBUG: 1 }),
            }
        }
    };

    const clientOptions: lspc.LanguageClientOptions = {
        documentSelector: [{scheme: 'file', language: 'galaxy'}],
        synchronize: {
            configurationSection: 'sc2galaxy',
            fileEvents: vs.workspace.createFileSystemWatcher('**/*.galaxy')
        },
        initializationOptions: {
            defaultDataPath: context.asAbsolutePath('sc2-data-trigger'),
        },
    };

    const client = new lspc.LanguageClient('sc2galaxy', 'SC2Galaxy', serverOptions, clientOptions);

    let indexingProgress: ProgressProxy;
    client.onDidChangeState((ev) => {
        if (ev.newState === lspc.State.Running) {
            client.onNotification('indexStart', (params: any) => {
                if (indexingProgress) indexingProgress.done();
                indexingProgress = createProgressNotification();
            });
            client.onNotification('indexProgress', (params: any) => {
                indexingProgress.progress.report({message: params});
            });
            client.onNotification('indexEnd', async (params: any) => {
                if (indexingProgress) indexingProgress.done();
                indexingProgress = void 0;
                vs.window.setStatusBarMessage('Indexing of SC2 archives completed!', 2000);
            });
        }
        else if (ev.newState === lspc.State.Stopped) {
            client.outputChannel.show(true);
        }
    });

    context.subscriptions.push(client);
    client.start();

    const myContentProvider = new (class implements vs.TextDocumentContentProvider {
        fcontent = new Map<string, string>();

        onDidChangeEmitter = new vs.EventEmitter<vs.Uri>();
        onDidChange = this.onDidChangeEmitter.event;

        provideTextDocumentContent(uri: vs.Uri): string {
            const content = this.fcontent.get(uri.path);
            if (typeof content !== undefined) {
                return content;
            }
            else {
                return `Failed to fetch content for: ${uri.path}`;
            }
        }
    })();
    context.subscriptions.push(vs.workspace.registerTextDocumentContentProvider('sc2galaxy', myContentProvider));

    context.subscriptions.push(vs.commands.registerCommand('s2galaxy.verifyScript', async (...args) => {
        let sourceUri: string;
        try {
            if (args.length) {
                sourceUri = args[0].toString();
            }
            else {
                const activeTextEditor = vs.window.activeTextEditor;
                sourceUri = activeTextEditor.document.uri.toString()
            }
        }
        catch (e) {
            vs.window.showErrorMessage(`Couldn't determine entrypoint of a script.`);
            return;
        }

        const verifyUri = vs.Uri.from({
            scheme: 'sc2galaxy',
            path: `${vs.Uri.parse(sourceUri).path}.log`,
            query: 'verifyScript'
        });
        const output = await client.sendRequest<string>('document/checkRecursively', { uri: sourceUri });
        myContentProvider.fcontent.clear();
        myContentProvider.fcontent.set(verifyUri.path, output);

        let textDoc = vs.workspace.textDocuments.find(x => x.uri.toString() === verifyUri.toString());
        let textEditor = vs.window.visibleTextEditors.find(x => x.document.uri.toString() === verifyUri.toString());

        if (!textDoc) {
            textDoc = await vs.workspace.openTextDocument(verifyUri);
        }
        else {
            myContentProvider.onDidChangeEmitter.fire(verifyUri);
        }

        if (textEditor) {
            textEditor.revealRange(new vs.Range(textDoc.positionAt(output.length), textDoc.positionAt(output.length)));
        }
        else {
            textEditor = await vs.window.showTextDocument(textDoc, {
                preserveFocus: true,
                selection: new vs.Range(textDoc.positionAt(output.length), textDoc.positionAt(output.length)),
            });
        }
    }));
}

const sc2layoutConfig: vs.LanguageConfiguration = {
    indentationRules: {
        increaseIndentPattern: /<(?!\?|[^>]*\/>)([-_\.A-Za-z0-9]+)(?=\s|>)\b[^>]*>(?!.*<\/\1>)|<!--(?!.*-->)|\{[^}"']*$/,
        decreaseIndentPattern: /^\s*(<\/[-_\.A-Za-z0-9]+\b[^>]*>|-->|\})/,
    },
    wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
    onEnterRules: [
        {
            beforeText: /<([_:\w][_:\w-.\d]*)([^>/]*(?!\/>)(\/[^>]|>))+[^</]*$/i,
            afterText: /^<\/([_:\w][_:\w-.\d]*)\s*>\s*$/i,
            action: { indentAction: vs.IndentAction.IndentOutdent }
        },
    ],
};

async function activateLayoutClient(context: vs.ExtensionContext) {
    let dTree: TreeViewProvider;

    context.subscriptions.push(vs.languages.setLanguageConfiguration('sc2layout', sc2layoutConfig));

    const serverModule = require.resolve('sc2-layout-lang/bin/s2l-lsp');

    const envSvc = Object.assign({}, process.env);
    envSvc.SC2LAYOUT_LOG_LEVEL = vs.workspace.getConfiguration('sc2layout.trace').get('service');

    const serverOptions: lspc.ServerOptions = {
        run: { module: serverModule, transport: lspc.TransportKind.ipc, options: {
            env: envSvc,
        }},
        debug: { module: serverModule, transport: lspc.TransportKind.ipc, options: {
            execArgv: ['--nolazy', '--inspect=6010'],
            env: Object.assign(envSvc, { SC2LDEBUG: 1 }),
        }}
    };

    const clientOptions: lspc.LanguageClientOptions = {
        documentSelector: [{scheme: 'file', language: 'sc2layout'}],
        synchronize: {
            configurationSection: 'sc2layout',
            fileEvents: [
                vs.workspace.createFileSystemWatcher(
                    '**/{GameStrings.txt,GameHotkeys.txt,Assets.txt,AssetsProduct.txt,FontStyles.SC2Style,*.SC2Layout}'
                ),
            ],
        },
        initializationOptions: {
            defaultDataPath: context.asAbsolutePath('sc2-data'),
            globalStoragePath: context.globalStoragePath,
            wordPattern: [sc2layoutConfig.wordPattern.source, sc2layoutConfig.wordPattern.flags],
            configuration: vs.workspace.getConfiguration('sc2layout'),
        },
    };

    const client = new lspc.LanguageClient('sc2layout', 'SC2Layout', serverOptions, clientOptions);
    context.subscriptions.push(client);
    await client.start();

    const wsChecker = new WorkspaceSetupChecker(client);
    context.subscriptions.push(wsChecker.install());

    function refreshTreeProvider() {
        if (vs.workspace.getConfiguration('sc2layout.treeview').get<boolean>('visible')) {
            if (dTree) return;
            dTree = new TreeViewProvider(client);
            context.subscriptions.push(dTree);
        }
        else {
            if (!dTree) return;
            dTree.dispose();
            dTree = void 0;
        }
    }
    vs.commands.executeCommand('setContext', 'sc2layout:extensionEnabled', true);

    refreshTreeProvider();
    context.subscriptions.push(vs.workspace.onDidChangeConfiguration((ev: vs.ConfigurationChangeEvent) => {
        if (!ev.affectsConfiguration('sc2layout')) return;
        if (ev.affectsConfiguration('sc2layout.treeview')) {
            refreshTreeProvider();
        }
    }));

    let indexingProgress: ProgressProxy;
    client.onNotification('progressCreate', (params: ProgressReportParams) => {
        if (indexingProgress) indexingProgress.done(void 0);
        indexingProgress = createProgressNotification(params);
    });
    client.onNotification('progressReport', (params: ProgressReportParams) => {
        if (!indexingProgress) return;
        indexingProgress.progress.report(params);
    });
    client.onNotification('progressDone', (params: ProgressReportParams) => {
        if (indexingProgress) indexingProgress.done(void 0);
        indexingProgress = void 0;
        vs.window.setStatusBarMessage(params.message, 2000);
    });

    client.onNotification('sc2layout/workspaceDiagnostics', async (params: { content: string }) => {
        const textDoc = await vs.workspace.openTextDocument({ content: params.content, language: 'log' });
        await vs.window.showTextDocument(textDoc);
    });
}

export async function activate(context: vs.ExtensionContext) {
    extContext = context;
    activateGalaxyClient(context);
    await activateLayoutClient(context);
}

export async function deactivate() {
    extContext = void 0;
}

export function getThemeIcon(name: string) {
    return {
        light: path.join(extContext.extensionPath, 'resources', 'light', `${name}`),
        dark: path.join(extContext.extensionPath, 'resources', 'dark', `${name}`)
    };
}
