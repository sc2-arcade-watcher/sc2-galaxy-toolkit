import { AbstractProvider } from './provider';
import * as lsp from 'vscode-languageserver';
export declare class DefinitionProvider extends AbstractProvider {
    getDefinitionAt(uri: string, position: number): lsp.Definition;
}
