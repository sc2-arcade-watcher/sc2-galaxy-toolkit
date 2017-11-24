import * as gt from '../compiler/types';
import * as lsp from 'vscode-languageserver';
import { AbstractProvider } from './provider';
export declare class SignaturesProvider extends AbstractProvider {
    private printer;
    private evaluateActiveParameter(callExpr, position);
    getSignatureOfFunction(functionSymbol: gt.Symbol): lsp.SignatureInformation;
    getSignatureAt(uri: string, position: number): lsp.SignatureHelp;
}
