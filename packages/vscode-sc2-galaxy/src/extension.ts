import * as path from 'path';

import { workspace, ExtensionContext, window, Disposable, languages, CompletionItemProvider, TextDocument, CompletionItem, CompletionItemKind, SnippetString, ProgressLocation, Progress, commands } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, Position, CancellationToken } from 'vscode-languageclient';

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

    const serverOptions: ServerOptions = {
        run : { module: serverModule, transport: TransportKind.ipc, options: {
            env: envSvc,
        }},
        debug: { module: serverModule, transport: TransportKind.ipc, options: {
            execArgv: ['--nolazy', '--inspect=6009'],
            env: Object.assign(envSvc, { PLAXTONY_DEBUG: 1 }),
        }}
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{scheme: 'file', language: 'galaxy'}],
        synchronize: {
            configurationSection: 'sc2galaxy',
            fileEvents: workspace.createFileSystemWatcher('**/*.galaxy')
        },
        initializationOptions: {
            defaultDataPath: context.asAbsolutePath('sc2-data-trigger'),
        }
    };

    const client = new LanguageClient('sc2galaxy', 'SC2Galaxy', serverOptions, clientOptions);
    let disposable = client.start();

    let indexingProgress: ProgressProxy;
    (async () => {
        await client.onReady();
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
    })();

    context.subscriptions.push(commands.registerTextEditorCommand('s2galaxy.verifyScript', async (textEditor, edit) => {
        const r = await client.sendRequest('document/checkRecursively', {uri: textEditor.document.uri.toString()});
        window.setStatusBarMessage(r === true ? `[[ ✓ ]] SUCCESS!` : `[[ x ]] FAILED!`, 2500);
    }));

    context.subscriptions.push(disposable);
}
