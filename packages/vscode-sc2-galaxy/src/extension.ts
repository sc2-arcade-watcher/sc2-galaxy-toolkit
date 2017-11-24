import * as path from 'path';

import { workspace, ExtensionContext } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient';

export function activate(context: ExtensionContext) {
    let serverModule = context.asAbsolutePath(path.join('out', 'src', 'server.js'));
    let debugOptions = { execArgv: ['--nolazy', '--debug-brk=3456'] };

    let serverOptions: ServerOptions = {
        run : { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
    };

    let modSources = [context.asAbsolutePath(path.join('sc2-data-trigger'))];
    modSources = modSources.concat(workspace.getConfiguration().get('sc2galaxy.s2mod.sources'));

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{scheme: 'file', language: 'galaxy'}],
        synchronize: {
            configurationSection: 'plaxtony',
            // Notify the server about file changes in the workspace
            // fileEvents: workspace.createFileSystemWatcher('**/.galaxy')
        },
        initializationOptions: {
            sources: modSources
        }
    };

    const client = new LanguageClient('plaxtony', 'Plaxtony Language Server', serverOptions, clientOptions);
    let disposable = client.start();

    context.subscriptions.push(disposable);
}
