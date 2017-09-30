import { SyntaxKind, Symbol, Node, SourceFile, CallExpression, Identifier, FunctionDeclaration, Expression } from '../compiler/types';
import { findAncestor } from '../compiler/utils';
import { Printer } from '../compiler/printer';
import { Store } from './store';
import { getTokenAtPosition, findPrecedingToken } from './utils';
import * as lsp from 'vscode-languageserver';

export class SignaturesProvider {
    private store: Store;
    private printer: Printer = new Printer();

    public constructor(store: Store) {
        this.store = store;
    }

    private evaluateActiveParameter(callExpr: CallExpression, position: number): number | null {
        let activeParam: number | null = null;

        callExpr.arguments.some((argument: Expression, index: number) => {
            if (argument.pos <= position && argument.end >= position) {
                activeParam = index;
                return true;
            }

            return false;
        });

        return activeParam;
    }

    public getSignatureAt(uri: string, position: number): lsp.SignatureHelp {
        const currentDocument = this.store.documents.get(uri);
        const currentToken = findPrecedingToken(position, currentDocument);
        const callNode = <CallExpression>findAncestor(currentToken, (element: Node): boolean => {
            return element.kind === SyntaxKind.CallExpression;
        })

        if (!callNode) {
            return null;
        }

        if (callNode.expression.kind !== SyntaxKind.Identifier) {
            return null;
        }

        const callIdentifier = (<Identifier>(callNode.expression));
        const signatureHelp = <lsp.SignatureHelp>{
            signatures: [],
            activeSignature: null,
            activeParameter: null,
        };

        for (const document of this.store.documents.values()) {
            const functionSymbol = document.symbol.members.get(callIdentifier.name);
            if (!functionSymbol) {
                continue;
            }
            const functionDeclaration = <FunctionDeclaration>functionSymbol.declarations[0];

            const signatureInfo = <lsp.SignatureInformation>{
                label: this.printer.printNode(Object.assign({}, functionDeclaration, {body: null})).trim(),
                documentation: '',
                parameters: [],
            };

            for (const paramDeclaration of functionDeclaration.parameters) {
                signatureInfo.parameters.push({
                    label: this.printer.printNode(paramDeclaration),
                    documentation: '',
                });
            }

            signatureHelp.activeSignature = 0;
            signatureHelp.activeParameter = this.evaluateActiveParameter(callNode, position);
            signatureHelp.signatures.push(signatureInfo);
            break;
        }

        return signatureHelp;
    }
}
