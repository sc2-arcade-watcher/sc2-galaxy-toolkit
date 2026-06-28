import { URI } from 'vscode-uri';
import * as sch from './schema/base.js';
import { buildLineMap } from 'sc2-xml';
import * as lsp from 'vscode-languageserver';
import {
    XMLNode as XMLNodeBase,
    XMLElement as XMLElementBase,
    XMLDocument as XMLDocumentBase,
} from 'sc2-xml';

export {
    XMLNodeKind,
    XMLAttr,
    TokenType,
    ScannerState,
    DiagnosticCategory,
    DiagnosticReport,
    CharacterCodes,
    createScanner,
    buildLineMap,
    findFirst,
    binarySearch,
} from 'sc2-xml';
export type { Scanner, ParserHooks } from 'sc2-xml';
export { parse as xmlParse } from 'sc2-xml';

export interface SC2Layout {
    stype?: sch.ComplexType;
    sdef?: sch.ElementDef;
    altTypeNotMatched?: true;
    tdoc?: TextDocument;
    descName?: string;
}

export const XMLNode = XMLNodeBase;
export type XMLNode = XMLNodeBase<SC2Layout>;
export const XMLElement = XMLElementBase;
export type XMLElement = XMLElementBase<SC2Layout>;
export const XMLDocument = XMLDocumentBase;
export type XMLDocument = XMLDocumentBase<SC2Layout>;

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
        offset = Math.max(Math.min(offset, this._content.length), 0);

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

    getWordRangeAtPosition(position: lsp.Position, regex: RegExp = /[^\s]+/): lsp.Range | undefined {
        const line = Math.min(this.lineMap.length, Math.max(0, position.line));
        const lineText = this.getText(lsp.Range.create(
            lsp.Position.create(line, 0),
            this.positionAt(this.lineMap[line + 1] ? this.lineMap[line + 1] : this._content.length)
        ));
        const character = Math.min(lineText.length - 1, Math.max(0, position.character));
        let startChar = character;
        let endChar = character;
        while (startChar > 0 && lineText.charAt(startChar - 1).match(regex)) {
            --startChar;
        }
        while (endChar < lineText.length - 1 && lineText.charAt(endChar).match(regex)) {
            ++endChar;
        }
        if (startChar === endChar) {
            return void 0;
        }
        else {
            return lsp.Range.create(line, startChar, line, endChar);
        }
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
