import * as path from 'path';
import URI from 'vscode-uri';
import * as sch from './schema/base';
import { findFirst } from './common';
import { buildLineMap } from './parser/scanner';
import * as lsp from 'vscode-languageserver';

export const languageId = 'sc2layout';
export const languageExt = 'SC2Layout';

export enum ExtLangIds {
    SC2Layout = 'sc2layout',
}

// ===

export class TextDocument implements lsp.TextDocument {
    protected _uri: URI;
    protected _content: string;
    protected _version: number;
    protected _lineMap: number[];
    readonly languageId = languageId;

    constructor(uri: string, text: string) {
        this._uri = URI.parse(uri);
        this.updateContent(text, 0);
    }

    updateLineMap() {
        this._lineMap = buildLineMap(this._content);
    }

    updateContent(text: string, nver: number = null) {
        this._content = text;
        this._version = nver === null ? 0 : nver;
        this._lineMap = void 0;
        if (nver === null || nver === 0) {
            this.updateLineMap();
        }
    }

    getText(range?: lsp.Range): string {
        if (range) {
            return this._content.substring(
                this.offsetAt(range.start),
                this.offsetAt(range.end)
            );
        }
        return this._content;
    }

    positionAt(offset: number): lsp.Position {
        let low = 1, high = this.lineMap.length;
        const lineOffsets = this.lineMap;

        while (low < high) {
            let mid = Math.floor((low + high) / 2);
            if (lineOffsets[mid] > offset) {
                high = mid;
            }
            else {
                low = mid + 1;
            }
        }

        return lsp.Position.create(low - 1, offset - lineOffsets[low - 1]);
    }

    offsetAt(position: lsp.Position): number {
        return this.lineMap[position.line] + position.character;
    }

    get uri() {
        return this._uri.toString();
    }

    get version() {
        return this._version;
    }

    set version(nver: number) {
        this._version = nver;
    }

    get lineCount() {
        return this.lineMap.length;
    }

    get lineMap() {
        if (!this._lineMap) this.updateLineMap();
        return this._lineMap;
    }
}

// ===

export const enum XMLNodeKind {
    Document,
    Element,
}

export abstract class XMLNode {
    readonly kind: XMLNodeKind;
    stype?: sch.ComplexType;
    altTypeNotMatched?: true;
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
    text: string;
    descName: string = 'untitled';
    tdoc?: TextDocument;
    parseDiagnostics: DiagnosticReport[];

    getRootNode() {
        return <XMLElement>this.firstChild;
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

export enum AttrValueKind {
    Generic,
    Constant,
    ConstantRacial,
    ConstantFactional,
    Asset,
    AssetRacial,
    AssetFactional,
    PtrAsset,
    PropertyBind,
}

export type AttrValueConstant =
    AttrValueKind.Constant |
    AttrValueKind.ConstantRacial |
    AttrValueKind.ConstantFactional
;

export const AttrValueKindOp = {
    [AttrValueKind.Generic]: '',
    [AttrValueKind.Constant]: '#',
    [AttrValueKind.ConstantRacial]: '##',
    [AttrValueKind.ConstantFactional]: '###',
    [AttrValueKind.Asset]: '@',
    [AttrValueKind.AssetRacial]: '@@',
    [AttrValueKind.AssetFactional]: '@@@',
    [AttrValueKind.PtrAsset]: '*@',
    [AttrValueKind.PropertyBind]: '{}',
};

export const AttrValueKindOffset = {
    [AttrValueKind.Generic]: 0,
    [AttrValueKind.Constant]: 1,
    [AttrValueKind.ConstantRacial]: 2,
    [AttrValueKind.ConstantFactional]: 3,
    [AttrValueKind.Asset]: 1,
    [AttrValueKind.AssetRacial]: 2,
    [AttrValueKind.AssetFactional]: 3,
    [AttrValueKind.PtrAsset]: 2,
};

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
    Error,
    Warning,
    Message,
    Hint,
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
