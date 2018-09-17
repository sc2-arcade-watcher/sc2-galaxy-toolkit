import { AbstractProvider } from './provider';
import * as gt from '../compiler/types';
import * as lsp from 'vscode-languageserver';
import { ReferencesProvider } from './references';
export interface RenameRequestCached {
    params: lsp.TextDocumentPositionParams;
    sourceFile: gt.SourceFile;
    identifier: gt.Identifier;
    symbol: gt.Symbol;
    locations?: lsp.Location[];
}
export declare class RenameProvider extends AbstractProvider {
    referencesProvider: ReferencesProvider;
    protected recentRequest: RenameRequestCached;
    protected getTokenAt(params: lsp.TextDocumentPositionParams): {
        sourceFile: gt.SourceFile;
        identifier: gt.Identifier;
        symbol: gt.Symbol;
    };
    protected locationsToWorkspaceEdits(locations: lsp.Location[], newText: string): lsp.WorkspaceEdit;
    prefetchLocations(): void;
    onPrepareRename(params: lsp.TextDocumentPositionParams): lsp.ResponseError<undefined> | {
        placeholder: string;
        range: lsp.Range;
    };
    onRenameRequest(params: lsp.RenameParams): lsp.WorkspaceEdit | lsp.ResponseError<undefined>;
}
