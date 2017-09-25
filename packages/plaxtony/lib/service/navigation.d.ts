import { NamedDeclaration } from '../compiler/types';
import { Store } from './store';
export declare class NavigationProvider {
    private store;
    constructor(store: Store);
    getDocumentSymbols(uri: string): NamedDeclaration[];
    getWorkspaceSymbols(): NamedDeclaration[];
}
