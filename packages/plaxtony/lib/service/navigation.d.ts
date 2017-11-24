import { NamedDeclaration } from '../compiler/types';
import { AbstractProvider } from './provider';
export declare class NavigationProvider extends AbstractProvider {
    getDocumentSymbols(uri: string): NamedDeclaration[];
    getWorkspaceSymbols(query?: string): NamedDeclaration[];
}
