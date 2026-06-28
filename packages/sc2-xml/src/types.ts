import { findFirst } from './utils.js';

export const enum XMLNodeKind {
    Document,
    Element,
}

export abstract class XMLNode<L = {}> {
    readonly kind: XMLNodeKind;
    lang: L = {} as L;
    children: XMLElement<L>[] = [];

    constructor(public start: number, public end: number, public parent?: XMLNode<L>) {
    }

    public get firstChild(): XMLNode<L> | undefined { return this.children[0]; }
    public get lastChild(): XMLNode<L> | undefined { return this.children.length ? this.children[this.children.length - 1] : void 0; }

    public findNodeBefore(offset: number): XMLNode<L> {
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

    public findNodeAt(offset: number): XMLNode<L> {
        let idx = findFirst(this.children, c => offset <= c.start) - 1;
        if (idx >= 0) {
            let child = this.children[idx];
            if (offset > child.start && offset <= child.end) {
                return child.findNodeAt(offset);
            }
        }
        return this;
    }

    public getDocument(): XMLDocument<L> {
        let curr: XMLNode<L> = this;
        while (curr.parent) {
            curr = curr.parent;
        }
        return <XMLDocument<L>>curr;
    }

    public getDocumentDesc(): XMLElement<L> {
        let curr: XMLElement<L> = this.getDocument().firstChild as XMLElement<L>;
        return curr;
    }
}

export class XMLDocument<L = {}> extends XMLNode<L> {
    kind = XMLNodeKind.Document;
    text: string;
    parseDiagnostics: DiagnosticReport[];

    getRootNode() {
        return <XMLElement<L>>this.firstChild;
    }
}

export class XMLElement<L = {}> extends XMLNode<L> {
    kind = XMLNodeKind.Element;

    public tag: string | undefined;
    public closed: boolean = false;
    public selfClosed: boolean = false;
    public startTagEnd?: number;
    public endTagStart: number | undefined;
    public attributes: {[name: string]: XMLAttr} = {};

    public isSameTag(tagName: string) {
        return this.tag && tagName && this.tag.length === tagName.length && this.tag === tagName;
    }

    public findAttributeAt(offset: number) {
        for (const attrKey in this.attributes) {
            if (this.attributes[attrKey].end < offset) continue;
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

    public hasAttribute(name: string) {
        const attr = this.attributes[name];
        if (!attr || !attr.startValue) return false;
        return true;
    }
}

export interface XMLAttr {
    start: number;
    end: number;

    name: string;
    value?: string;

    startValue?: number;
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
    Error = 1,
    Warning = 2,
    Message = 3,
    Hint = 4,
}

export interface DiagnosticReport {
    start: number;
    end: number;
    category: DiagnosticCategory;
    message: string;
}
