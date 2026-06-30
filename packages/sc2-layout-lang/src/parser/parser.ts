import { parse as xmlParse, type ParserHooks, type XMLElement, type XMLNode, type DiagnosticReport, DiagnosticCategory } from 'sc2-xml';
import { SC2Layout, TextDocument } from '../types.js';
import * as sch from '../schema/base.js';

export interface ParserOptions {
    schema: sch.SchemaRegistry;
}

function createSchemaHooks(schema: sch.SchemaRegistry, diagnostics: DiagnosticReport[]): ParserHooks<SC2Layout> {
    function printDiagnosticsForElement(msg: string, start: number, end: number) {
        diagnostics.push({
            start,
            end,
            category: DiagnosticCategory.Error,
            message: msg,
        });
    }

    function matchElementType(el: XMLElement<SC2Layout>, parentNode: XMLNode<SC2Layout>, tokenOffset: number, tokenEnd: number) {
        if (parentNode.lang.stype && !el.lang.altTypeNotMatched) {
            const csel = parentNode.lang.stype.struct.get(el.tag);
            if (csel) {
                el.lang.sdef = csel;
                el.lang.stype = el.lang.sdef.type;
            }
            else {
                printDiagnosticsForElement(`Not expected element "${el.tag}" under [${parentNode.lang.stype.name}]`, tokenOffset, tokenEnd);
            }
        }
    }

    function matchNodeAlt(el: XMLElement<SC2Layout>) {
        function doMatch(currAltType: sch.AlternationDesc) {
            switch (currAltType.matchKind) {
                case sch.AlternativeMatchKind.AttrValue: {
                    let valType = el.getAttributeValue(currAltType.attributeName);
                    if (currAltType.icase) {
                        valType = valType.toLowerCase();
                    }

                    const altStmt = currAltType.statements.get(valType);
                    if (altStmt) {
                        el.lang.stype = altStmt.type;
                        if (altStmt.altType) {
                            doMatch(altStmt.altType);
                        }
                    }
                    else {
                        printDiagnosticsForElement(
                            `Couldn't find matching type for ${el.tag}[${currAltType.attributeName}=${valType}]`,
                            el.start,
                            el.start
                        );
                        el.lang.altTypeNotMatched = true;
                    }
                    break;
                }

                default: {
                    throw new Error(`unsupported matchKind`);
                    break;
                }
            }
        }

        if (el.lang.sdef && el.lang.sdef.flags & sch.ElementDefFlags.TypeAlternation) {
            doMatch(el.lang.sdef.altType);
        }
    }

    return {
        onDocumentCreate(doc) {
            doc.lang.stype = schema.fileRootType;
        },
        onElementOpen(el, parent) {
            matchElementType(el, parent, el.start, el.end);
        },
        onStartTagClose(el) {
            matchNodeAlt(el);
        },
        shouldAutoClose(el) {
            return !!el.lang.stype && !el.lang.stype.struct.size;
        },
    };
}

export function parse(text: string, options: ParserOptions) {
    const diagnostics: DiagnosticReport[] = [];
    const hooks = createSchemaHooks(options.schema, diagnostics);
    const result = xmlParse<SC2Layout>(text, hooks);
    return { diagnostics: [...result.diagnostics, ...diagnostics], root: result.root };
}

export function parseDocument(doc: TextDocument, options: ParserOptions) {
    const r = parse(doc.getText(), options);
    r.root.parseDiagnostics = r.diagnostics;
    r.root.lang.tdoc = doc;
    const m = doc.uri.match(/([^\/\\]+)\.[^\.]+$/);
    if (m) {
        r.root.lang.descName = m[1];
    }
    return r.root;
}
