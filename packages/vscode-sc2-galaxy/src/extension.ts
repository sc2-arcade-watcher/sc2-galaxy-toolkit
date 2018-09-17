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
    let serverModule = context.asAbsolutePath(path.join('node_modules', 'plaxtony', 'lib', 'src', 'service', 'lsp-run.js'));
    let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

    let serverOptions: ServerOptions = {
        run : { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
    };

    let modSources = [context.asAbsolutePath(path.join('sc2-data-trigger'))];
    modSources = modSources.concat(workspace.getConfiguration().get('sc2galaxy.s2mod.sources'));

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{scheme: 'file', language: 'galaxy'}],
        synchronize: {
            configurationSection: 'sc2galaxy',
            fileEvents: workspace.createFileSystemWatcher('**/*.galaxy')
        },
        initializationOptions: {
            sources: modSources
        }
    };

    const client = new LanguageClient('plaxtony', 'Plaxtony Language Server', serverOptions, clientOptions);
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
        window.setStatusBarMessage(r === true ? `[[ ✓ ]] SUCCESS!` : `[[ x ]] FAILED!`, 1500);
    }));

    context.subscriptions.push(disposable);
}
