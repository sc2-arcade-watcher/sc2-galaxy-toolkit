import { AbstractProvider } from './provider';
import * as lsp from 'vscode-languageserver';
import { ReferencesProvider } from './references';
export declare class RenameProvider extends AbstractProvider {
    referencesProvider: ReferencesProvider;
    onRenameRequest(params: lsp.RenameParams): lsp.WorkspaceEdit | lsp.ResponseError<undefined>;
}
