import * as gt from '../compiler/types';
import * as lsp from 'vscode-languageserver';
import { SyntaxKind, Symbol, Node, SourceFile, CallExpression, Identifier, FunctionDeclaration, Expression } from '../compiler/types';
import { findAncestor, getSourceFileOfNode } from '../compiler/utils';
import { Printer } from '../compiler/printer';
import { TypeChecker } from '../compiler/checker';
import { AbstractProvider } from './provider';
import { getTokenAtPosition } from './utils';
import { getDocumentationOfSymbol } from './s2meta';

export class SignaturesProvider extends AbstractProvider {
    private printer: Printer = new Printer();

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

                // offset is after last existing arg, it means the current argument wasn't yet parsed
                if (index === args.length - 1 && position > args[index].end) {
                    activeParam++;
                }
            }
            // offset is before bounds of next param node, yet we got here - we must be in whitespace
            else if (prevArg) {
                activeParam = index;
                return true;
            }

            return;
        });

        return activeParam;
    }

    public getSignatureOfFunction(functionSymbol: gt.Symbol): lsp.SignatureInformation {
        const functionDeclaration = <FunctionDeclaration>functionSymbol.declarations[0];

        let code = this.printer.printNode(Object.assign({}, functionDeclaration, {body: null})).trim();
        // strip ;
        if (code.substr(code.length - 1, 1) === ';') {
            code = code.substr(0, code.length - 1);
        }

        const signatureInfo = <lsp.SignatureInformation>{
            label: code,
            parameters: [],
        };

        signatureInfo.documentation = {
            kind: lsp.MarkupKind.Markdown,
            value: getDocumentationOfSymbol(this.store, functionSymbol, false),
        };

        const argsDoc = this.store.s2metadata ? this.store.s2metadata.getFunctionArgumentsDoc(functionSymbol.escapedName) : null;

        for (const [index, paramDeclaration] of functionDeclaration.parameters.entries()) {
            const paramInfo = <lsp.ParameterInformation>{
                label: this.printer.printNode(paramDeclaration),
            };
            if (argsDoc && argsDoc[index]) {
                paramInfo.documentation = {
                    kind: lsp.MarkupKind.Markdown,
                    value: argsDoc[index],
                };
            }
            signatureInfo.parameters.push(paramInfo);
        }

        return signatureInfo;
    }

    public getSignatureAt(uri: string, position: number): lsp.SignatureHelp {
        const signatureHelp = <lsp.SignatureHelp>{
            signatures: [],
            activeSignature: null,
            activeParameter: null,
        };
        const sourceFile = this.store.documents.get(uri);
        if (!sourceFile) return;
        const currentToken = getTokenAtPosition(position, sourceFile, true);

        if (!currentToken) {
            return null;
        }
        let node: Node = currentToken.parent;

        const callNode = <CallExpression>findAncestor(node, (element: Node): boolean => {
            if (element.kind !== SyntaxKind.CallExpression) {
                return false;
            }
            // we don't want to provide signature for left side of CallExpression
            if ((<CallExpression>element).arguments.pos > position) {
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

        const checker = new TypeChecker(this.store);
        const type = checker.getTypeOfNode(callNode.expression, true);

        if (type.flags & gt.TypeFlags.Function) {
            const signatureInfo = this.getSignatureOfFunction((<gt.FunctionType>type).symbol);

            signatureHelp.activeSignature = 0;
            signatureHelp.activeParameter = this.evaluateActiveParameter(callNode, position);
            signatureHelp.signatures.push(signatureInfo);
        }

        return signatureHelp;
    }
}
