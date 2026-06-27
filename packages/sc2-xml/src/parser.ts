import { createScanner, CharacterCodes } from './scanner';
import { TokenType, ScannerState, XMLElement, DiagnosticReport, DiagnosticCategory, XMLDocument, XMLNode, XMLNodeKind } from './types';

export interface ParserHooks<L = {}> {
    onElementOpen?: (el: XMLElement<L>, parent: XMLNode<L>) => void;
    onStartTagClose?: (el: XMLElement<L>) => void;
    shouldAutoClose?: (el: XMLElement<L>) => boolean;
}

export function parse<L = {}>(text: string, hooks?: ParserHooks<L>) {
    const diagnostics: DiagnosticReport[] = [];
    const scanner = createScanner(text, 0, ScannerState.WithinContent, report => diagnostics.push(report));

    let docElement = new XMLDocument<L>(0, text.length, void 0);
    docElement.text = text;
    let curr: XMLNode<L> = docElement;
    let endTagStart: number = -1;
    let pendingAttribute: string | null = null;
    let token = scanner.scan();

    function printDiagnosticsAtCurrentToken(msg: string, start?: number, end?: number) {
        diagnostics.push({
            start: start || scanner.getTokenOffset(),
            end: end || scanner.getTokenEnd(),
            category: DiagnosticCategory.Error,
            message: msg,
        });
    }

    while (token !== TokenType.EOS) {
        switch (token) {
            case TokenType.StartTagOpen:
            {
                if (curr.parent) {
                    if ((<XMLElement<L>>curr).tag === void 0) {
                        curr = curr.parent;
                    }
                    else if (hooks?.shouldAutoClose?.(<XMLElement<L>>curr)) {
                        printDiagnosticsAtCurrentToken(`?Missing end tag for "${(<XMLElement<L>>curr).tag}"`, (<XMLElement<L>>curr).start, (<XMLElement<L>>curr).startTagEnd);
                        curr.end = endTagStart;
                        (<XMLElement<L>>curr).closed = false;
                        curr = curr.parent;
                    }
                }
                curr = new XMLElement<L>(scanner.getTokenOffset(), text.length, curr);
                break;
            }
            case TokenType.StartTag:
            {
                (<XMLElement<L>>curr).tag = scanner.getTokenText();
                curr.parent.children.push(<XMLElement<L>>curr);
                hooks?.onElementOpen?.(<XMLElement<L>>curr, curr.parent);
                break;
            }
            case TokenType.StartTagClose:
            {
                (<XMLElement<L>>curr).startTagEnd = (<XMLElement<L>>curr).end = scanner.getTokenEnd();
                hooks?.onStartTagClose?.(<XMLElement<L>>curr);
                break;
            }
            case TokenType.EndTagOpen:
            {
                if (!curr.parent) {
                    break;
                }
                if ((<XMLElement<L>>curr).tag === void 0) {
                    curr = curr.parent;
                }
                endTagStart = scanner.getTokenOffset();
                break;
            }
            case TokenType.EndTag:
            {
                let closeTag = scanner.getTokenText();
                if (curr !== docElement) {
                    (<XMLElement<L>>curr).closed = true;
                    (<XMLElement<L>>curr).endTagStart = endTagStart;

                    if (!(<XMLElement<L>>curr).isSameTag(closeTag) && curr.parent) {
                        curr.end = endTagStart;
                        (<XMLElement<L>>curr).closed = false;
                        if (curr.parent !== docElement && (<XMLElement<L>>curr.parent).isSameTag(closeTag)) {
                            printDiagnosticsAtCurrentToken(`Missing end tag for "${(<XMLElement<L>>curr).tag}"`, (<XMLElement<L>>curr).start, (<XMLElement<L>>curr).start + (<XMLElement<L>>curr).tag.length + 1);
                            curr = curr.parent;
                        }
                        else {
                            printDiagnosticsAtCurrentToken(`End tag miss-match for "${(<XMLElement<L>>curr).tag}"`, scanner.getTokenOffset(), scanner.getTokenEnd());
                        }
                    }
                }
                break;
            }
            case TokenType.StartTagSelfClose:
            {
                if (curr.parent) {
                    (<XMLElement<L>>curr).closed = true;
                    (<XMLElement<L>>curr).selfClosed = true;
                    (<XMLElement<L>>curr).startTagEnd = curr.end = scanner.getTokenEnd();
                    hooks?.onStartTagClose?.(<XMLElement<L>>curr);
                    curr = curr.parent;
                }
                break;
            }
            case TokenType.EndTagClose:
            {
                if (curr.parent) {
                    curr.end = scanner.getTokenEnd();
                    curr = curr.parent;
                }
                break;
            }
            case TokenType.AttributeName:
            {
                pendingAttribute = scanner.getTokenText().toLocaleLowerCase();
                (<XMLElement<L>>curr).attributes[pendingAttribute] = {
                    start: scanner.getTokenOffset(),
                    end: scanner.getTokenEnd(),
                    name: scanner.getTokenText(),
                };
                break;
            }
            case TokenType.AttributeValue:
            {
                let value = scanner.getTokenText();
                if (pendingAttribute) {
                    if (value.length >= 2 && value.charCodeAt(0) === CharacterCodes.doubleQuote && value.charCodeAt(value.length - 1) === CharacterCodes.doubleQuote) {
                        value = value.substr(1, value.length - 2);
                    }
                    (<XMLElement<L>>curr).attributes[pendingAttribute].value = value;
                    (<XMLElement<L>>curr).attributes[pendingAttribute].startValue = scanner.getTokenOffset();
                    (<XMLElement<L>>curr).attributes[pendingAttribute].end = scanner.getTokenEnd();
                    pendingAttribute = null;
                }
                break;
            }
        }
        token = scanner.scan();
    }
    while (curr.parent) {
        if (curr.kind === XMLNodeKind.Element) {
            const currEl = <XMLElement<L>>curr;
            if (!currEl.closed) {
                printDiagnosticsAtCurrentToken(`Expected end tag for "${currEl.tag}", EOS.`);
            }
            else {
                printDiagnosticsAtCurrentToken(`End tag hasn't been closed appropriately for "${currEl.tag}"`);
            }
        }
        curr.end = text.length;
        curr = curr.parent;
    }

    if (docElement.children.length > 1) {
        printDiagnosticsAtCurrentToken('Encountered a second root tag. There can be only one root tag per file.');
    }

    return {
        diagnostics,
        root: docElement,
    };
}
