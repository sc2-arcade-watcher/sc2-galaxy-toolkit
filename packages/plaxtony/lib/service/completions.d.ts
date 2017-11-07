import { AbstractProvider } from './provider';
import * as vs from 'vscode-languageserver';
export declare class CompletionsProvider extends AbstractProvider {
    private printer;
    private buildFromSymbolDecl(symbol);
    private buildFromSymbolMembers(parentSymbol, query?);
    getCompletionsAt(uri: string, position: number): vs.CompletionItem[];
    resolveCompletion(completion: vs.CompletionItem): vs.CompletionItem;
}
