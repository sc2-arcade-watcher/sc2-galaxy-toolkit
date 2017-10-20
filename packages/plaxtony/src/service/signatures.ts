import * as gt from '../compiler/types';
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
        let prevArg: gt.Node;

        callExpr.arguments.some((argument: Expression, index: number, args) => {
            if (argument.pos <= position) {
                activeParam = index;
                prevArg = argument;

                // exit early when confirmed it is in bounds
                // in other case keep going to acomodate whitespaces
                if (argument.end >= position) {
                    return true;
                }
            }
            // offset is before bounds of next param node, yet we got here - we must be in whitespace
            else if (prevArg) {
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
        let node: Node = currentToken.parent;

        // we don't want to provide signature for left side of CallExpression
        if (currentToken.parent.kind === gt.SyntaxKind.CallExpression && (<gt.CallExpression>currentToken.parent).expression === currentToken) {
            node = currentToken.parent.parent;
        }
        const callNode = <CallExpression>findAncestor(node, (element: Node): boolean => {
            if (element.kind !== SyntaxKind.CallExpression) {
                return false;
            }
            // skip if goes over range - we must've hit CloseParenToken
            if (element.end <= position) {
                return false;
            }
            return true;
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

            // not really a valid signature parameter right there
            // if (signatureHelp.activeParameter && (signatureHelp.activeParameter + 1) > signatureInfo.parameters.length) {
            //     signatureHelp.activeParameter = null;
            // }

            signatureHelp.signatures.push(signatureInfo);
            break;
        }

        return signatureHelp;
    }
}
