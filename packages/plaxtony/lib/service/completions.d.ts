import { Store } from './store';
import * as vs from 'vscode-languageserver';
export declare class CompletionsProvider {
    private store;
    private getFromSymbol(parentSymbol);
    constructor(store: Store);
    getCompletionsAt(uri: string, position: number): vs.CompletionItem[];
}
