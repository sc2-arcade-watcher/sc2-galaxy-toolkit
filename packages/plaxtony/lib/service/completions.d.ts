import * as gt from '../compiler/types';
import { AbstractProvider } from './provider';
import * as lsp from 'vscode-languageserver';
export declare const enum CompletionFunctionExpand {
    None = 0,
    Parenthesis = 1,
    ArgumentsNull = 2,
    ArgumentsDefault = 3,
}
export interface CompletionConfig {
    functionExpand: CompletionFunctionExpand;
}
export declare class CompletionsProvider extends AbstractProvider {
    private printer;
    config: CompletionConfig;
    constructor();
    expandFunctionArguments(decl: gt.FunctionDeclaration): string[];
    private buildFromSymbolDecl(symbol);
    private buildFromSymbolMembers(parentSymbol, query?);
    private provideTriggerHandlers();
    private provideGameLinks(gameType);
    getCompletionsAt(uri: string, position: number, context?: lsp.CompletionContext): lsp.CompletionList;
    resolveCompletion(completion: lsp.CompletionItem): lsp.CompletionItem;
}
