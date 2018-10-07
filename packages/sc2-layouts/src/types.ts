import * as path from 'path';
import URI from 'vscode-uri';
import * as sch from './schema/base';
import { findFirst } from './util';

export const languageId = 'sc2layout';
export const languageExt = 'SC2Layout';

export const enum XMLNodeKind {
    Document,
    Element,
}

export abstract class XMLNode {
    readonly kind: XMLNodeKind;
    stype?: sch.ComplexType;
    children: XMLElement[] = [];

    constructor(public start: number, public end: number, public parent?: XMLNode) {
    }

    public get firstChild(): XMLNode | undefined { return this.children[0]; }
    public get lastChild(): XMLNode | undefined { return this.children.length ? this.children[this.children.length - 1] : void 0; }

    public findNodeBefore(offset: number): XMLNode {
        let idx = findFirst(this.children, c => offset <= c.start) - 1;
        if (idx >= 0) {
            let child = this.children[idx];
            if (offset > child.start) {
                if (offset < child.end) {
                    return child.findNodeBefore(offset);
                }
                let lastChild = child.lastChild;
                if (lastChild && lastChild.end === child.end) {
                    return child.findNodeBefore(offset);
                }
                return child;
            }
        }
        return this;
    }

    public findNodeAt(offset: number): XMLNode {
        let idx = findFirst(this.children, c => offset <= c.start) - 1;
        if (idx >= 0) {
            let child = this.children[idx];
            if (offset > child.start && offset <= child.end) {
                return child.findNodeAt(offset);
            }
        }
        return this;
    }

    public getDocument(): XMLDocument {
        let curr: XMLNode = this;
        while (curr.parent) {
            curr = curr.parent;
        }
        return <XMLDocument>curr;
    }

    public getDocumentDesc(): XMLElement {
        let curr: XMLElement = this.getDocument().firstChild as XMLElement;
        return curr;
        // return this.getDocument().getDescNode();
    }
}

export class XMLDocument extends XMLNode {
    kind = XMLNodeKind.Document;
    uri?: URI;
    text: string;
    parseDiagnostics: DiagnosticReport[];

    getDescNode() {
        return <XMLElement>this.firstChild;
    }

    getDescName() {
        return path.basename(this.uri.fsPath).replace(/\.[^\.]+$/, '');
    }
}

export class XMLElement extends XMLNode {
    kind = XMLNodeKind.Element;

    public tag: string | undefined;
    public closed: boolean = false;
    public selfClosed: boolean = false;
    public startTagEnd?: number;
    public endTagStart: number | undefined;
    public attributes: {[name: string]: XMLAttr} = {};

    sdef?: sch.ElementDef;

    // public get attributeNames(): string[] { return this.attributes ? Object.keys(this.attributes) : []; }

    public isSameTag(tagName: string) {
        return this.tag && tagName && this.tag.length === tagName.length && this.tag === tagName;
    }

    public findAttributeAt(offset: number) {
        for (const attrKey in this.attributes) {
            if (this.attributes[attrKey].end <= offset) continue;
            if (this.attributes[attrKey].start > offset) continue;
            return this.attributes[attrKey];
        }
        return null;
    }

    public getAttributeValue(name: string, defValue = '') {
        const attr = this.attributes[name];
        if (!attr || !attr.startValue) return defValue;
        return attr.value;
    }
}

export interface XMLAttr {
    start: number;
    end: number;

    name: string;
    value?: string;

    startValue?: number;
}

export const enum AttrValueKind {
    Generic,
    Constant,
    PropertyBind,
}

export enum TokenType {
    StartCommentTag,
    Comment,
    EndCommentTag,
    StartTagOpen,
    StartTagClose,
    StartTagSelfClose,
    StartTag,
    EndTagOpen,
    EndTagClose,
    EndTag,
    DelimiterAssign,
    AttributeName,
    AttributeValue,
    StartDoctypeTag,
    Doctype,
    EndDoctypeTag,
    Content,
    Whitespace,
    Unknown,
    EOS
}

export enum ScannerState {
    WithinContent,
    AfterOpeningStartTag,
    AfterOpeningEndTag,
    WithinDoctype,
    WithinTag,
    WithinEndTag,
    WithinComment,
    AfterAttributeName,
    BeforeAttributeValue
}

export interface Scanner {
    scan(): TokenType;
    getTokenType(): TokenType;
    getTokenOffset(): number;
    getTokenLength(): number;
    getTokenEnd(): number;
    getTokenText(): string;
    getTokenError(): string | undefined;
    getScannerState(): ScannerState;
}

export enum DiagnosticCategory {
    Warning,
    Error,
    Message,
}

export interface DiagnosticReport {
    start: number;
    end: number;
    category: DiagnosticCategory;
    message: string;
}

// export interface SourceFile {
//     uri?: string;
//     text: string;
//     diagnostics: DiagnosticReport[];
//     root: Node;
// }
