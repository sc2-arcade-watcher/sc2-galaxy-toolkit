import { AbstractProvider } from './provider';
import * as lsp from 'vscode-languageserver';
export declare class HoverProvider extends AbstractProvider {
    private printer;
    getHoverAt(params: lsp.TextDocumentPositionParams): lsp.Hover;
}
