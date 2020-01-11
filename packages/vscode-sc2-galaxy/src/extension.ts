import * as path from 'path';

import { workspace, ExtensionContext, window, Disposable, languages, CompletionItemProvider, TextDocument, CompletionItem, CompletionItemKind, SnippetString, ProgressLocation, Progress, commands } from 'vscode';
import * as lspc from 'vscode-languageclient';

interface ProgressProxy {
    done: () => void;
    progress: Progress<{ message?: string; increment?: number }>;
}

function createProgressNotification() {
    let r = <ProgressProxy>{};
    window.withProgress(
        {
            title: 'Indexing SC2 archives..',
            location: ProgressLocation.Notification,
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

export function activate(context: ExtensionContext) {
    const serverModule = context.asAbsolutePath(path.join('node_modules', 'plaxtony', 'lib', 'src', 'service', 'lsp-run.js'));

    const envSvc = Object.assign({}, process.env);
    envSvc.PLAXTONY_LOG_LEVEL = workspace.getConfiguration('sc2galaxy.trace').get('service');

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
            fileEvents: workspace.createFileSystemWatcher('**/*.galaxy')
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
                window.setStatusBarMessage('Indexing of SC2 archives completed!', 2000);
            });
        }
        else if (ev.newState === lspc.State.Stopped) {
            client.outputChannel.show(true);
        }
    });

    context.subscriptions.push(client.start());

    context.subscriptions.push(commands.registerCommand('s2galaxy.verifyScript', async (...args) => {
        let uri: string;
        try {
            if (args) {
                uri = args[0].toString();
            }
            else if (!args) {
                uri = window.activeTextEditor.document.uri.toString()
            }
        }
        catch (e) {
            window.showErrorMessage(`Couldn't determine entrypoint of a script.`);
            return;
        }

        const content = await client.sendRequest('document/checkRecursively', { uri });
        const textDoc = await workspace.openTextDocument({ content: <string>content, language: 'log' });
        await window.showTextDocument(textDoc);
    }));
}
