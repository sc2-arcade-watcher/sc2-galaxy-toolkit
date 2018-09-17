import { AbstractProvider } from './provider';
import * as lsp from 'vscode-languageserver';
export interface ReferencesConfig {
    currentWorkspaceOnly: boolean;
}
export declare class ReferencesProvider extends AbstractProvider {
    private locations;
    private searchSymbol;
    private checker;
    config: ReferencesConfig;
    constructor();
    private collectReferences(sourceFile, child);
    onReferences(params: lsp.ReferenceParams, currentWorkspaceOnly?: boolean): lsp.Location[];
}
