import * as path from 'path';

import { workspace, ExtensionContext } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient';

export function activate(context: ExtensionContext) {
    let serverModule = context.asAbsolutePath(path.join('out', 'src', 'server.js'));
    let debugOptions = { execArgv: ['--nolazy', '--debug=6009'] };

    let serverOptions: ServerOptions = {
        run : { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
    };

    let clientOptions: LanguageClientOptions = {
        documentSelector: [{scheme: 'file', language: 'galaxy'}],
        synchronize: {
            configurationSection: 'plaxtony',
            // Notify the server about file changes in the workspace
            // fileEvents: workspace.createFileSystemWatcher('**/.galaxy')
        }
    };

    let disposable = new LanguageClient('plaxtony', 'Plaxtony Language Server', serverOptions, clientOptions).start();

    context.subscriptions.push(disposable);
}
