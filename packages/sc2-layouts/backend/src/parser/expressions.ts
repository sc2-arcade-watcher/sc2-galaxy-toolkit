import { CharacterCodes } from './scanner';
import { DiagnosticReport, DiagnosticCategory } from '../types';
import { getKindName } from './utils';
import { reverseMap } from '../common';

export function isIdentifierStart(ch: number): boolean {
    return isIdentifierPart(ch);
}

export function isIdentifierPart(ch: number): boolean {
    return (ch >= CharacterCodes.A && ch <= CharacterCodes.Z)
        || (ch >= CharacterCodes.a && ch <= CharacterCodes.z)
        || (ch >= CharacterCodes._0 && ch <= CharacterCodes._9)
        || (ch === CharacterCodes._)
    ;
}

export function isDigit(ch: number): boolean {
    return ch >= CharacterCodes._0 && ch <= CharacterCodes._9;
}

export class Scanner {
    private text: string;

    // Current position (end position of text of current token)
    private pos: number;

    // end of text
    private end: number;

    // Start position of whitespace before current token
    private startPos: number;

    // Start position of text of current token
    private tokenPos: number;

    //
    private token: SyntaxKind;
    private tokenValue: string;

    constructor(protected errorReporter?: (diag: DiagnosticReport) => void) {
    }

    protected report(msg: string, options: {start?: number, end?: number, category?: DiagnosticCategory} = {}) {
        if (!this.errorReporter) return;
        this.errorReporter({
            start: options.start ? options.start : this.pos,
            end: options.end ? options.end : this.tokenPos,
            category: options.category !== void 0 ? options.category : DiagnosticCategory.Error,
            message: msg,
        });
    }

    public setText(text: string): void {
        this.text = text;
        this.pos = 0;
        this.end = this.text.length;
    }

    scan(): SyntaxKind {
        this.startPos = this.pos;

        while (true) {
            this.tokenPos = this.pos;
            this.tokenValue = null;
            if (this.pos >= this.end) {
                return SyntaxKind.EndOfStreamToken;
            }

            let ch = this.text.charCodeAt(this.pos);

            switch (ch) {
                case CharacterCodes.tab:
                case CharacterCodes.verticalTab:
                case CharacterCodes.formFeed:
                case CharacterCodes.space:
                    ++this.pos;
                    break;

                case CharacterCodes.openBrace:
                {
                    this.pos++;
                    return this.token = SyntaxKind.OpenBraceToken;
                }
                case CharacterCodes.closeBrace:
                {
                    this.pos++;
                    return this.token = SyntaxKind.CloseBraceToken;
                }

                case CharacterCodes.openBracket:
                {
                    this.pos++;
                    return this.token = SyntaxKind.OpenBracketToken;
                }
                case CharacterCodes.closeBracket:
                {
                    this.pos++;
                    return this.token = SyntaxKind.CloseBracketToken;
                }

                case CharacterCodes.hash:
                {
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.hash) {
                        return this.pos += 2, this.token = SyntaxKind.HashHashToken;
                    }
                    this.pos++;
                    return this.token = SyntaxKind.HashToken;
                }

                case CharacterCodes.at:
                {
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.at) {
                        return this.pos += 2, this.token = SyntaxKind.AtAtToken;
                    }
                    this.pos++;
                    return this.token = SyntaxKind.AtToken;
                }

                case CharacterCodes.dot:
                {
                    this.pos++;
                    return this.token = SyntaxKind.DotToken;
                }

                case CharacterCodes.backslash:
                case CharacterCodes.slash:
                {
                    this.pos++;
                    return this.token = SyntaxKind.SlashToken;
                }

                case CharacterCodes.bar:
                {
                    this.pos++;
                    return this.token = SyntaxKind.BarToken;
                }

                case CharacterCodes.$:
                {
                    this.pos++;
                    return this.token = SyntaxKind.DolarToken;
                }

                case CharacterCodes.equals:
                {
                    this.pos++;
                    return this.token = SyntaxKind.EqualsToken;
                }

                case CharacterCodes.plus:
                {
                    this.pos++;
                    return this.token = SyntaxKind.PlusToken;
                }

                case CharacterCodes.minus:
                {
                    this.pos++;
                    return this.token = SyntaxKind.MinusToken;
                }

                default:
                {
                    if (ch >= CharacterCodes._0 && ch <= CharacterCodes._9) {
                        this.pos++;
                        while (this.pos < this.end && isDigit(this.text.charCodeAt(this.pos))) {
                            this.pos++;
                        }

                        if (!isIdentifierPart(this.text.charCodeAt(this.pos))) {
                            this.tokenValue = this.text.substring(this.tokenPos, this.pos);
                            return this.token = SyntaxKind.NumericLiteral;
                        }
                    }

                    if (isIdentifierStart(ch)) {
                        this.pos++;
                        while (this.pos < this.end && isIdentifierPart(ch = this.text.charCodeAt(this.pos))) this.pos++;
                        this.tokenValue = this.text.substring(this.tokenPos, this.pos);
                        return this.token = SyntaxKind.Identifier;
                    }

                    this.report(`Unexpected character: "${String.fromCharCode(ch).trim()}" [0x${ch.toString(16)}]`);
                    this.pos++;
                    return this.token = SyntaxKind.Unknown;
                }
            }
        }
    }

    public getCurrentPos(): number {
        return this.pos;
    }

    public getStartPos(): number {
        return this.startPos;
    }

    public getTokenPos(): number {
        return this.tokenPos;
    }

    public getTokenValue(): string {
        return this.tokenValue;
    }
}

// ===

export const enum SelHandleKind {
    Unknown,
    Identifier,
    Custom,

    // builtin
    This,
    Parent,
    Root,
    Layer,
    Sibling,
    Ancestor,
}

export const builtinHandlesTable = new Map<string, SelHandleKind>([
    ['this', SelHandleKind.This],
    ['parent', SelHandleKind.Parent],
    ['root', SelHandleKind.Root],
    ['layer', SelHandleKind.Layer],
    ['sibling', SelHandleKind.Sibling],
    ['ancestor', SelHandleKind.Ancestor],
]);
export const SelHandlesNameTable = new Map<SelHandleKind, string>(reverseMap(builtinHandlesTable));

enum AncestorArgName {
    'name',
    'type',
    'oftype',
}
// type AncestorArguments = keyof typeof AncestorArgName;

export const enum SyntaxKind {
    Unknown,

    // Literals
    NumericLiteral,
    StringLiteral,

    // Punctuation
    OpenBraceToken,
    CloseBraceToken,
    OpenBracketToken,
    CloseBracketToken,
    DotToken,
    SlashToken,
    BarToken,
    DolarToken,
    AtToken,
    HashToken,
    AtAtToken,
    HashHashToken,
    AsteriskAtToken,

    EqualsToken,
    PlusToken,
    MinusToken,

    EndOfStreamToken,

    // Node
    Identifier,

    //
    PropertyBindExpr,
    SelectorParameter,
    SelectorFragment,
    PathSelector,
}

const textToTokenTable: ReadonlyMap<string, SyntaxKind> = new Map([
    ['{', SyntaxKind.OpenBraceToken],
    ['}', SyntaxKind.CloseBraceToken],
    ['[', SyntaxKind.OpenBracketToken],
    [']', SyntaxKind.CloseBracketToken],
    ['.', SyntaxKind.DotToken],
    ['/', SyntaxKind.SlashToken],
    ['|', SyntaxKind.BarToken],
    ['$', SyntaxKind.DolarToken],
    ['@', SyntaxKind.AtToken],
    ['#', SyntaxKind.HashToken],
    ['@@', SyntaxKind.AtAtToken],
    ['##', SyntaxKind.HashHashToken],
    ['=', SyntaxKind.EqualsToken],
    ['+', SyntaxKind.PlusToken],
    ['-', SyntaxKind.MinusToken],
]);

function makeReverseMap(source: ReadonlyMap<string, SyntaxKind>): string[] {
    const result: string[] = [];
    source.forEach((value, name) => {
        result[value] = name;
    });
    return result;
}

const tokenStrings = makeReverseMap(textToTokenTable);

function tokenToString(t: SyntaxKind): string | undefined {
    return tokenStrings[t] !== void 0 ? tokenStrings[t] : getKindName(t);
}

interface TextRange {
    pos: number;
    end: number;
}

interface Node extends TextRange {
    kind: SyntaxKind;
    parent?: Node;
    syntaxTokens?: Node[];
}

export interface Token<TKind extends SyntaxKind> extends Node {
    kind: TKind;
}

export interface NodeArray<T extends Node> extends Array<T>, TextRange {
    pos: number;
    end: number;
}

export interface NumericLiteral extends Node {
    kind: SyntaxKind.NumericLiteral;
    text: string;
    value: number;
}

export interface Identifier extends Node {
    kind: SyntaxKind.Identifier;
    name: string;
}

export interface SelectorParameter extends Node {
    kind: SyntaxKind.SelectorParameter;
    key: Identifier;
    value: Identifier;
}

export interface SelectorFragment extends Node {
    kind: SyntaxKind.SelectorFragment;
    name: Identifier;
    selKind: SelHandleKind;
    parameter?: SelectorParameter;
    offset?: NumericLiteral;
}

export interface PropertyBindExpr extends Node, NodeExpr {
    kind: SyntaxKind.PropertyBindExpr;
    path: NodeArray<SelectorFragment>;
    property: Identifier;
    propertyIndex?: Identifier | NumericLiteral;
}

export interface PathSelector extends Node, NodeExpr {
    kind: SyntaxKind.PathSelector;
    path: NodeArray<SelectorFragment>;
}

export interface NodeExpr {
    diagnostics: DiagnosticReport[];
}

export class ExpressionParser {
    private scanner: Scanner = new Scanner(this.reportScanDiagnostics.bind(this));
    private currentToken: SyntaxKind;
    private syntaxTokens: Node[][];
    private diagnostics: DiagnosticReport[];

    private token(): SyntaxKind {
        return this.currentToken;
    }

    private nextToken(): SyntaxKind {
        this.currentToken = this.scanner.scan();
        return this.currentToken;
    }

    private parseExpected(kind: SyntaxKind, message?: string, shouldAdvance = true): boolean {
        if (this.token() === kind) {
            if (shouldAdvance) {
                this.syntaxTokens[this.syntaxTokens.length - 1].push(this.parseTokenNode());
            }
            return true;
        }
        if (!message) {
            message = `Expected "${tokenToString(kind)}", found "${tokenToString(this.currentToken)}" instead.`;
        }
        this.reportDiagnostics(message);
        return false;
    }

    private parseExpectedMany(kind: SyntaxKind[], message?: string, shouldAdvance = true): boolean {
        if (kind.find(item => item === this.token())) {
            if (shouldAdvance) {
                this.syntaxTokens[this.syntaxTokens.length - 1].push(this.parseTokenNode());
            }
            return true;
        }
        if (!message) {
            message = `Expected one of [${kind.map(kind => `"${tokenToString(kind)}"`).join(', ')}], found "${tokenToString(this.currentToken)}" instead.`;
        }
        this.reportDiagnostics(message);
        return false;
    }

    private parseTokenNode<T extends Node>(): T {
        const node = <T>this.createNode(this.token(), void 0, false);
        this.nextToken();
        return this.finishNode(node, void 0, false);
    }

    private createNode<T extends Node>(kind: SyntaxKind, pos?: number, assignSyntaxTokens: boolean = true): T {
        const node = <T>{};
        node.kind = kind;
        node.pos = pos === void 0 ? this.scanner.getTokenPos() : pos;
        node.end = node.pos;

        if (assignSyntaxTokens) {
            this.syntaxTokens.push([]);
        }
        return node;
    }

    private finishNode<T extends Node>(node: T, end?: number, assignSyntaxTokens: boolean = true): T {
        node.end = end === void 0 ? this.scanner.getStartPos() : end;
        if (assignSyntaxTokens) {
            node.syntaxTokens = this.syntaxTokens.pop();
            for (const token of node.syntaxTokens) {
                token.parent = node;
            }
        }
        return node;
    }

    private createNodeArray<T extends Node>(elements?: T[], pos?: number): NodeArray<T> {
        const array = <NodeArray<T>>(elements || []);
        if (pos === void 0) {
            pos = this.scanner.getStartPos();
        }
        array.pos = pos;
        array.end = pos;
        return array;
    }

    private reportScanDiagnostics(diag: DiagnosticReport) {
        this.diagnostics.push(diag);
    }

    private reportDiagnostics(msg: string, options: {start?: number, end?: number, category?: DiagnosticCategory} = {}) {
        this.diagnostics.push({
            start: options.start !== void 0 ? options.start : this.scanner.getStartPos(),
            end: options.end !== void 0 ? options.end : this.scanner.getTokenPos(),
            category: options.category !== void 0 ? options.category : DiagnosticCategory.Error,
            message: msg,
        });
    }

    private clear() {
        this.syntaxTokens = [];
        this.diagnostics = [];
    }

    private finalizeExpr(expr: NodeExpr) {
        expr.diagnostics = this.diagnostics;

        this.diagnostics = void 0;
        this.syntaxTokens = void 0;
    }

    private isSelectorFragment() {
        switch (this.token()) {
            case SyntaxKind.DolarToken:
            case SyntaxKind.Identifier:
                return true;
        }
        return false;
    }

    private parseIdentifier(alwaysAdvance: boolean = true) {
        const identifier = this.createNode<Identifier>(SyntaxKind.Identifier);
        this.parseExpected(SyntaxKind.Identifier, null, false);
        identifier.name = this.scanner.getTokenValue() || '';
        if (alwaysAdvance || this.token() === SyntaxKind.Identifier) {
            this.nextToken();
        }
        return this.finishNode(identifier);
    }

    private parseExpectedIdentifier() {
        return this.parseIdentifier(false);
    }

    private parseSelectorParameter() {
        const selParam = this.createNode<SelectorParameter>(SyntaxKind.SelectorParameter);
        this.parseExpected(SyntaxKind.OpenBracketToken);
        this.parseExpected(SyntaxKind.AtToken);

        let cpos = this.scanner.getTokenPos();
        selParam.key = this.parseExpectedIdentifier();
        if (this.scanner.getTokenPos() > cpos) {
            const isValid = (<any>AncestorArgName)[selParam.key.name] !== void 0;
            if (!isValid) {
                this.reportDiagnostics(`Unknown parameter name "${selParam.key.name}"`);
            }
        }

        this.parseExpected(SyntaxKind.EqualsToken);
        selParam.value = this.parseExpectedIdentifier();

        this.parseExpected(SyntaxKind.CloseBracketToken);
        return this.finishNode(selParam);
    }

    private parseSelectorFragment() {
        const selFrag = this.createNode<SelectorFragment>(SyntaxKind.SelectorFragment);
        if (this.token() === SyntaxKind.DolarToken) {
            this.parseExpected(SyntaxKind.DolarToken);
            selFrag.name = this.parseExpectedIdentifier();
            selFrag.selKind = builtinHandlesTable.get(selFrag.name.name) || SelHandleKind.Custom;

            switch (selFrag.selKind) {
                case SelHandleKind.Ancestor:
                {
                    if (this.token() === SyntaxKind.OpenBracketToken) {
                        selFrag.parameter = this.parseSelectorParameter();
                    }
                    else {
                        this.reportDiagnostics(`Missing parameter for $ancestor`);
                    }
                    break;
                }

                case SelHandleKind.Sibling:
                {
                    this.parseExpectedMany([SyntaxKind.MinusToken, SyntaxKind.PlusToken]);
                    this.parseExpected(SyntaxKind.NumericLiteral);
                    break;
                }
            }
        }
        else {
            selFrag.selKind = SelHandleKind.Identifier;
            selFrag.name = this.parseExpectedIdentifier();
        }
        return this.finishNode(selFrag);
    }

    private parseSelectionPath(parseTrailingSlash = true) {
        const selPath = this.createNodeArray<SelectorFragment>();

        let hasSeparator = false;
        while (this.token() !== SyntaxKind.EndOfStreamToken && this.token() !== SyntaxKind.CloseBraceToken) {
            if (this.isSelectorFragment()) {
                selPath.push(this.parseSelectorFragment());
            }
            else {
                hasSeparator = false;
                break;
            }

            if (this.token() === SyntaxKind.SlashToken) {
                this.parseExpected(SyntaxKind.SlashToken);
                hasSeparator = true;
            }
            else {
                hasSeparator = false;
                break;
            }
        }

        if (hasSeparator && parseTrailingSlash) {
            selPath.push(this.parseSelectorFragment());
        }

        selPath.end = this.scanner.getStartPos();
        return selPath;
    }

    parsePropertyBind(text: string) {
        this.clear();
        this.scanner.setText(text);

        const propBind = this.createNode<PropertyBindExpr>(SyntaxKind.PropertyBindExpr, 0);
        this.nextToken();

        this.parseExpected(SyntaxKind.OpenBraceToken);

        propBind.path = this.parseSelectionPath(true);

        // this.parseExpected(SyntaxKind.SlashToken);
        if (this.parseExpected(SyntaxKind.AtToken)) {
            propBind.property = this.parseExpectedIdentifier();

            if (this.token() === SyntaxKind.OpenBracketToken) {
                this.parseExpected(SyntaxKind.OpenBracketToken);
                this.parseExpectedMany([SyntaxKind.NumericLiteral, SyntaxKind.Identifier], void 0, true);
                // TODO: save index
                // propBind.propertyIndex = this.createNode(this.token(), void 0, false);
                this.parseExpected(SyntaxKind.CloseBracketToken);
            }
        }

        this.parseExpected(SyntaxKind.CloseBraceToken);
        this.parseExpected(SyntaxKind.EndOfStreamToken);

        this.finishNode(propBind);

        if (!propBind.path.length && propBind.property) {
            this.reportDiagnostics(`Target frame isn't specified`, {
                start: propBind.pos,
                end: propBind.end,
            });
        }

        this.finalizeExpr(propBind);

        return propBind;
    }

    parsePathSelector(text: string) {
        this.clear();
        this.scanner.setText(text);

        const pathSel = this.createNode<PathSelector>(SyntaxKind.PathSelector, 0);
        this.nextToken();
        pathSel.path = this.parseSelectionPath();

        this.finishNode(pathSel);
        this.finalizeExpr(pathSel);
        return pathSel;
    }
}

