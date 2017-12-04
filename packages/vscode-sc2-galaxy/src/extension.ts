import * as path from 'path';

import { workspace, ExtensionContext, window, Disposable } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient';

export function activate(context: ExtensionContext) {
    let serverModule = context.asAbsolutePath(path.join('node_modules', 'plaxtony', 'lib', 'service', 'lsp-run.js'));
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
            // Notify the server about file changes in the workspace
            // fileEvents: workspace.createFileSystemWatcher('**/.galaxy')
        },
        initializationOptions: {
            sources: modSources
        }
    };

    const client = new LanguageClient('plaxtony', 'Plaxtony Language Server', serverOptions, clientOptions);
    let disposable = client.start();

    (async () => {
        let statusHandle: Disposable;
        await client.onReady();
        client.onNotification('indexStart', (params: any) => {
            statusHandle = window.setStatusBarMessage('$(search) Indexing SC2 archives..');
        });
        client.onNotification('indexEnd', (params: any) => {
            statusHandle.dispose();
            window.setStatusBarMessage('Indexing of SC2 archives completed!', 3000);
        });
    })();

    context.subscriptions.push(disposable);
}
