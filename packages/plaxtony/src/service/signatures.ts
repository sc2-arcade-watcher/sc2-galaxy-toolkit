import * as gt from '../compiler/types';
import { SyntaxKind, Symbol, Node, SourceFile, CallExpression, Identifier, FunctionDeclaration, Expression } from '../compiler/types';
import { findAncestor, getSourceFileOfNode } from '../compiler/utils';
import { Printer } from '../compiler/printer';
import { AbstractProvider } from './provider';
import { getTokenAtPosition } from './utils';
import * as lsp from 'vscode-languageserver';
import * as trig from '../sc2mod/trigger'

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

        const signatureInfo = <lsp.SignatureInformation>{
            label: this.printer.printNode(Object.assign({}, functionDeclaration, {body: null})).trim(),
            documentation: '',
            parameters: [],
        };

        // metadata
        const s2archive = this.store.getArchiveOfSourceFile(getSourceFileOfNode(functionDeclaration));
        const funcEl = <trig.FunctionDef>this.store.getSymbolMetadata(functionSymbol);
        if (s2archive && funcEl) {
            for (const prop of ['Name', 'Hint']) {
                const textKey = funcEl.textKey(prop);
                if (s2archive.trigStrings.has(textKey)) {
                    if (signatureInfo.documentation.length) {
                        signatureInfo.documentation += '\n\n';
                    }
                    if (prop === 'Name') {
                        signatureInfo.documentation += '### ' + s2archive.trigStrings.get(textKey);
                    }
                    else {
                        signatureInfo.documentation += s2archive.trigStrings.get(textKey);
                    }
                }
            }
        }

        for (const [index, paramDeclaration] of functionDeclaration.parameters.entries()) {
            const paramInfo = <lsp.ParameterInformation>{
                label: this.printer.printNode(paramDeclaration),
                documentation: '',
            };

            if (funcEl) {
                const realIndex = index + (funcEl.flags & trig.ElementFlag.Event ? -1 : 0);
                if (realIndex >= 0) {
                    const paramEl = <trig.ParamDef>funcEl.getParameters()[realIndex];
                    if (paramEl) {
                        const textKey = paramEl.textKey('Name');
                        if (s2archive.trigStrings.has(textKey)) {
                            paramInfo.documentation += '#### ' + s2archive.trigStrings.get(textKey) + ` - *${paramEl.type.type}*` + '\n';
                        }

                        if (paramEl.type.type === 'preset') {
                            paramInfo.documentation += '---\n';
                            // #### Presets:\n
                            const preset = paramEl.type.typeElement.resolve();
                            for (const presetValueRef of preset.values) {
                                const presetValue = presetValueRef.resolve();
                                const locName = s2archive.trigStrings.get(presetValue.textKey('Name'));
                                paramInfo.documentation += `- \`${presetValue.value}\` - **${locName}**\n`;
                            }
                        }
                    }
                }
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
        const currentDocument = this.store.documents.get(uri);
        const currentToken = getTokenAtPosition(position, currentDocument, true);
        let node: Node = currentToken.parent;

        if (!currentToken) {
            return signatureHelp;
        }

        // we don't want to provide signature for left side of CallExpression
        // if (currentToken.parent.kind === gt.SyntaxKind.CallExpression &&
        //     (
        //         (<gt.CallExpression>currentToken.parent).expression === currentToken ||
        //         currentToken.parent.syntaxTokens.indexOf(currentToken) === 0 // only OpenParenToken
        //     )
        // ) {
        //     node = currentToken.parent.parent;
        // }
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
            return signatureHelp;
        }

        if (callNode.expression.kind !== SyntaxKind.Identifier) {
            return signatureHelp;
        }

        const callIdentifier = (<Identifier>(callNode.expression));

        for (const document of this.store.documents.values()) {
            const functionSymbol = document.symbol.members.get(callIdentifier.name);
            if (!functionSymbol) {
                continue;
            }

            const signatureInfo = this.getSignatureOfFunction(functionSymbol);

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
