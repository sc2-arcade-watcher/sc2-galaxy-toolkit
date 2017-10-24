import * as gt from '../compiler/types';
import { AbstractProvider } from './provider';
import * as lsp from 'vscode-languageserver';
export declare class SignaturesProvider extends AbstractProvider {
    private printer;
    private evaluateActiveParameter(callExpr, position);
    getSignatureOfFunction(functionSymbol: gt.Symbol): lsp.SignatureInformation;
    getSignatureAt(uri: string, position: number): lsp.SignatureHelp;
}
