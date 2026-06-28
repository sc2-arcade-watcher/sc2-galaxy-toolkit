import * as path from 'path';
import * as vs from 'vscode';
import * as lspc from 'vscode-languageclient';

interface ProgressProxy {
    done: () => void;
    progress: vs.Progress<{ message?: string; increment?: number }>;
}

function createProgressNotification() {
    let r = <ProgressProxy>{};
    vs.window.withProgress(
        {
            title: 'Indexing SC2 archives..',
            location: vs.ProgressLocation.Notification,
        },
        (progress, token) => {
            r.progress = progress;

            return new Promise((resolve) => {
                r.done = resolve;
            });
        }
    );
    return r;
}

export function activate(context: vs.ExtensionContext) {
    const serverModule = context.asAbsolutePath(path.join('node_modules', 'plaxtony', 'lib', 'src', 'service', 'lsp-run.js'));

    const envSvc = Object.assign({}, process.env);
    envSvc.PLAXTONY_LOG_LEVEL = vs.workspace.getConfiguration('sc2galaxy.trace').get('service');

    const serverOptions: lspc.ServerOptions = {
        run: {
            module: serverModule, transport: lspc.TransportKind.ipc, options: {
                env: envSvc,
            }
        },
        debug: {
            module: serverModule, transport: lspc.TransportKind.ipc, options: {
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
                indexingProgress = null;
                vs.window.setStatusBarMessage('Indexing of SC2 archives completed!', 2000);
            });
        }
        else if (ev.newState === lspc.State.Stopped) {
            client.outputChannel.show(true);
        }
    });

    context.subscriptions.push(client.start());

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
