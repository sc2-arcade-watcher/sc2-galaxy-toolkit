import { Store } from './store';
import * as lsp from 'vscode-languageserver';

export abstract class AbstractProvider {
    protected store: Store;

    public init(store: Store) {
        this.store = store;
    }
}

export function createProvider<T extends AbstractProvider>(cls: new () => T, store: Store): T {
    const provider = new cls();
    provider.init(store);
    return provider;
}
