import { createScanner, CharacterCodes } from './scanner';
import { TokenType, ScannerState, XMLElement, DiagnosticReport, DiagnosticCategory, XMLDocument, XMLNode, TextDocument, XMLNodeKind } from '../types';
import * as sch from '../schema/base';
import { SchemaValidator } from '../schema/validation';

export interface ParserOptions {
    schema: sch.SchemaRegistry;
}

export function parse(text: string, options: ParserOptions) {
    const diagnostics: DiagnosticReport[] = [];
    const validator = new SchemaValidator(options.schema);
    const scanner = createScanner(text, 0, ScannerState.WithinContent, report => diagnostics.push(report));

    let docElement = new XMLDocument(0, text.length, void 0);
    docElement.text = text;
    docElement.stype = options.schema.fileRootType;
    let curr: XMLNode = docElement;
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

    function matchElementType(el: XMLElement, parentNode: XMLNode) {
        if (parentNode.stype && !el.altTypeNotMatched) {
            const csel = parentNode.stype.struct.get(el.tag);
            if (csel) {
                el.sdef = csel;
                el.stype = el.sdef.type;
            }
            else {
                printDiagnosticsAtCurrentToken(`Not expected element "${el.tag}" under [${parentNode.stype.name}]`);
            }
        }
        else {
            // printDiagnosticsAtCurrentToken(`Parent node schema missing`);
        }
    }

    function matchNodeAlt(el: XMLElement) {
        if (el.sdef && el.sdef.flags & sch.ElementDefFlags.TypeAlternation) {
            const valType = el.getAttributeValue('type');
            const altType = el.sdef.alternateTypes.get(valType);
            if (altType) {
                el.stype = altType;
            }
            else {
                printDiagnosticsAtCurrentToken(`Couldn't find matching type for ${el.tag}[type=${valType}]`, el.start);
                el.altTypeNotMatched = true;
            }
        }
    }

    while (token !== TokenType.EOS) {
        switch (token) {
            case TokenType.StartTagOpen:
            {
                if (curr.parent) {
                    if ((<XMLElement>curr).tag === void 0) {
                        curr = curr.parent;
                    }
                    else if (curr.stype && !curr.stype.struct.size) {
                        printDiagnosticsAtCurrentToken(`?Missing end tag for "${(<XMLElement>curr).tag}"`, (<XMLElement>curr).start, (<XMLElement>curr).startTagEnd);
                        curr.end = endTagStart;
                        (<XMLElement>curr).closed = false;
                        curr = curr.parent;
                    }
                }
                curr = new XMLElement(scanner.getTokenOffset(), text.length, curr);
                break;
            }
            case TokenType.StartTag:
            {
                (<XMLElement>curr).tag = scanner.getTokenText();
                curr.parent.children.push(<XMLElement>curr);
                matchElementType(<XMLElement>curr, curr.parent);
                break;
            }
            case TokenType.StartTagClose:
            {
                (<XMLElement>curr).startTagEnd = (<XMLElement>curr).end = scanner.getTokenEnd(); // might be later set to end tag position
                matchNodeAlt(<XMLElement>curr);
                break;
            }
            case TokenType.EndTagOpen:
            {
                if (!curr.parent) {
                    break;
                }
                if ((<XMLElement>curr).tag === void 0) {
                    curr = curr.parent;
                }
                endTagStart = scanner.getTokenOffset();
                break;
            }
            case TokenType.EndTag:
            {
                let closeTag = scanner.getTokenText();
                if (curr !== docElement) {
                    (<XMLElement>curr).closed = true;
                    (<XMLElement>curr).endTagStart = endTagStart;

                    if (!(<XMLElement>curr).isSameTag(closeTag) && curr.parent) {
                        curr.end = endTagStart;
                        (<XMLElement>curr).closed = false;
                        if (curr.parent !== docElement && (<XMLElement>curr.parent).isSameTag(closeTag)) {
                            printDiagnosticsAtCurrentToken(`Missing end tag for "${(<XMLElement>curr).tag}"`, (<XMLElement>curr).start, (<XMLElement>curr).start + (<XMLElement>curr).tag.length + 1);
                            curr = curr.parent;
                        }
                        else {
                            printDiagnosticsAtCurrentToken(`End tag miss-match for "${(<XMLElement>curr).tag}"`, scanner.getTokenOffset(), scanner.getTokenEnd());
                        }
                    }
                }
                break;
            }
            case TokenType.StartTagSelfClose:
            {
                if (curr.parent) {
                    (<XMLElement>curr).closed = true;
                    (<XMLElement>curr).selfClosed = true;
                    (<XMLElement>curr).startTagEnd = curr.end = scanner.getTokenEnd();
                    matchNodeAlt(<XMLElement>curr);
                    // validator.validateNode((<XMLElement>curr));
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
                (<XMLElement>curr).attributes[pendingAttribute] = {
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
                    (<XMLElement>curr).attributes[pendingAttribute].value = value;
                    (<XMLElement>curr).attributes[pendingAttribute].startValue = scanner.getTokenOffset();
                    (<XMLElement>curr).attributes[pendingAttribute].end = scanner.getTokenEnd();
                    pendingAttribute = null;
                }
                break;
            }
        }
        token = scanner.scan();
    }
    while (curr.parent) {
        if (curr.kind === XMLNodeKind.Element) {
            const currEl = <XMLElement>curr;
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
        diagnostics: diagnostics.concat(validator.diagnostics),
        root: docElement,
    };
}

export function parseDocument(doc: TextDocument, options: ParserOptions) {
    const r = parse(doc.getText(), options);
    r.root.parseDiagnostics = r.diagnostics;
    r.root.tdoc = doc;
    const m = doc.uri.match(/([^\/\\]+)\.[^\.]+$/);
    if (m) {
        r.root.descName = m[1];
    }
    return r.root;
}
