import { TokenType, ScannerState, Scanner, DiagnosticReport, DiagnosticCategory } from '../types';

export const enum CharacterCodes {
    nullCharacter = 0,
    maxAsciiCharacter = 0x7F,

    lineFeed = 0x0A,              // \n
    carriageReturn = 0x0D,        // \r
    lineSeparator = 0x2028,
    paragraphSeparator = 0x2029,
    nextLine = 0x0085,

    // Unicode 3.0 space characters
    space = 0x0020,   // " "
    nonBreakingSpace = 0x00A0,   //
    enQuad = 0x2000,
    emQuad = 0x2001,
    enSpace = 0x2002,
    emSpace = 0x2003,
    threePerEmSpace = 0x2004,
    fourPerEmSpace = 0x2005,
    sixPerEmSpace = 0x2006,
    figureSpace = 0x2007,
    punctuationSpace = 0x2008,
    thinSpace = 0x2009,
    hairSpace = 0x200A,
    zeroWidthSpace = 0x200B,
    narrowNoBreakSpace = 0x202F,
    ideographicSpace = 0x3000,
    mathematicalSpace = 0x205F,
    ogham = 0x1680,

    _ = 0x5F,
    $ = 0x24,

    _0 = 0x30,
    _1 = 0x31,
    _2 = 0x32,
    _3 = 0x33,
    _4 = 0x34,
    _5 = 0x35,
    _6 = 0x36,
    _7 = 0x37,
    _8 = 0x38,
    _9 = 0x39,

    a = 0x61,
    b = 0x62,
    c = 0x63,
    d = 0x64,
    e = 0x65,
    f = 0x66,
    g = 0x67,
    h = 0x68,
    i = 0x69,
    j = 0x6A,
    k = 0x6B,
    l = 0x6C,
    m = 0x6D,
    n = 0x6E,
    o = 0x6F,
    p = 0x70,
    q = 0x71,
    r = 0x72,
    s = 0x73,
    t = 0x74,
    u = 0x75,
    v = 0x76,
    w = 0x77,
    x = 0x78,
    y = 0x79,
    z = 0x7A,

    A = 0x41,
    B = 0x42,
    C = 0x43,
    D = 0x44,
    E = 0x45,
    F = 0x46,
    G = 0x47,
    H = 0x48,
    I = 0x49,
    J = 0x4A,
    K = 0x4B,
    L = 0x4C,
    M = 0x4D,
    N = 0x4E,
    O = 0x4F,
    P = 0x50,
    Q = 0x51,
    R = 0x52,
    S = 0x53,
    T = 0x54,
    U = 0x55,
    V = 0x56,
    W = 0x57,
    X = 0x58,
    Y = 0x59,
    Z = 0x5a,

    ampersand = 0x26,             // &
    asterisk = 0x2A,              // *
    at = 0x40,                    // @
    backslash = 0x5C,             // \
    backtick = 0x60,              // `
    bar = 0x7C,                   // |
    caret = 0x5E,                 // ^
    closeBrace = 0x7D,            // }
    closeBracket = 0x5D,          // ]
    closeParen = 0x29,            // )
    colon = 0x3A,                 // :
    comma = 0x2C,                 // ,
    dot = 0x2E,                   // .
    doubleQuote = 0x22,           // "
    equals = 0x3D,                // =
    exclamation = 0x21,           // !
    greaterThan = 0x3E,           // >
    hash = 0x23,                  // #
    lessThan = 0x3C,              // <
    minus = 0x2D,                 // -
    openBrace = 0x7B,             // {
    openBracket = 0x5B,           // [
    openParen = 0x28,             // (
    percent = 0x25,               // %
    plus = 0x2B,                  // +
    question = 0x3F,              // ?
    semicolon = 0x3B,             // ;
    singleQuote = 0x27,           // '
    slash = 0x2F,                 // /
    tilde = 0x7E,                 // ~

    backspace = 0x08,             // \b
    formFeed = 0x0C,              // \f
    byteOrderMark = 0xFEFF,
    tab = 0x09,                   // \t
    verticalTab = 0x0B,           // \v
}

function localize(i: string, s: string) {
    return s;
    // return `${i}: ${s}`;
}

class MultiLineStream {

    private source: string;
    private len: number;
    private position: number;

    constructor(source: string, position: number) {
        this.source = source;
        this.len = source.length;
        this.position = position;
    }

    public eos(): boolean {
        return this.len <= this.position;
    }

    public getSource(): string {
        return this.source;
    }

    public pos(): number {
        return this.position;
    }

    public goBackTo(pos: number): void {
        this.position = pos;
    }

    public goBack(n: number): void {
        this.position -= n;
    }

    public advance(n: number): void {
        this.position += n;
    }

    public goToEnd(): void {
        this.position = this.source.length;
    }

    public nextChar(): number {
        return this.source.charCodeAt(this.position++) || 0;
    }

    public peekChar(n: number = 0): number {
        return this.source.charCodeAt(this.position + n) || 0;
    }

    public advanceIfChar(ch: number): boolean {
        if (ch === this.source.charCodeAt(this.position)) {
            this.position++;
            return true;
        }
        return false;
    }

    public advanceIfChars(ch: number[]): boolean {
        let i: number;
        if (this.position + ch.length > this.source.length) {
            return false;
        }
        for (i = 0; i < ch.length; i++) {
            if (this.source.charCodeAt(this.position + i) !== ch[i]) {
                return false;
            }
        }
        this.advance(i);
        return true;
    }

    public advanceIfRegExp(regex: RegExp): string {
        let str = this.source.substr(this.position);
        let match = str.match(regex);
        if (match) {
            this.position = this.position + match.index! + match[0].length;
            return match[0];
        }
        return '';
    }

    public advanceUntilRegExp(regex: RegExp): string {
        let str = this.source.substr(this.position);
        let match = str.match(regex);
        if (match) {
            this.position = this.position + match.index!;
            return match[0];
        } else {
            this.goToEnd();
        }
        return '';
    }

    public advanceUntilChar(ch: number): boolean {
        while (this.position < this.source.length) {
            if (this.source.charCodeAt(this.position) === ch) {
                return true;
            }
            this.advance(1);
        }
        return false;
    }

    public advanceUntilChars(ch: number[]): boolean {
        while (this.position + ch.length <= this.source.length) {
            let i = 0;
            for (; i < ch.length && this.source.charCodeAt(this.position + i) === ch[i]; i++) {
            }
            if (i === ch.length) {
                return true;
            }
            this.advance(1);
        }
        this.goToEnd();
        return false;
    }

    public skipWhitespace(): boolean {
        let n = this.advanceWhileChar(ch => {
            return ch === _WSP || ch === _TAB || ch === _NWL || ch === _LFD || ch === _CAR;
        });
        return n > 0;
    }

    public advanceWhileChar(condition: (ch: number) => boolean): number {
        let posNow = this.position;
        while (this.position < this.len && condition(this.source.charCodeAt(this.position))) {
            this.position++;
        }
        return this.position - posNow;
    }
}
const _BNG = '!'.charCodeAt(0);
const _QST = '?'.charCodeAt(0);
const _MIN = '-'.charCodeAt(0);
const _LAN = '<'.charCodeAt(0);
const _RAN = '>'.charCodeAt(0);
const _FSL = '/'.charCodeAt(0);
const _EQS = '='.charCodeAt(0);
const _DQO = '"'.charCodeAt(0);
const _SQO = '\''.charCodeAt(0);
const _NWL = '\n'.charCodeAt(0);
const _CAR = '\r'.charCodeAt(0);
const _LFD = '\f'.charCodeAt(0);
const _WSP = ' '.charCodeAt(0);
const _TAB = '\t'.charCodeAt(0);

export function createScanner(input: string, initialOffset = 0, initialState: ScannerState = ScannerState.WithinContent, onError?: (report: DiagnosticReport) => void): Scanner {

    let stream = new MultiLineStream(input, initialOffset);
    let state = initialState;
    let tokenOffset: number = 0;
    let tokenType: TokenType = TokenType.Unknown;
    let tokenError: string | undefined;

    let hasSpaceAfterTag: boolean;
    let lastTag: string;
    let lastAttributeName: string | undefined;

    // let lineMap: number[] = [0];

    function nextElementName(): string {
        return stream.advanceIfRegExp(/^[_:\w][_:\w-.\d]*/).toLowerCase();
    }

    function nextAttributeName(): string {
        return stream.advanceIfRegExp(/^[^\s"'>/=\x00-\x0F\x7F\x80-\x9F]*/).toLowerCase();
    }

    function finishToken(offset: number, type: TokenType, errorMessage?: string): TokenType {
        tokenType = type;
        tokenOffset = offset;
        // tokenError = errorMessage;
        if (errorMessage && onError) {
            onError({
                message: errorMessage,
                category: DiagnosticCategory.Error,
                start: tokenOffset,
                end: stream.pos(),
            });
        }
        return type;
    }

    function scan(): TokenType {
        let offset = stream.pos();
        let oldState = state;
        let token = internalScan();
        if (token !== TokenType.EOS && offset === stream.pos()) {
            console.log('Scanner.scan has not advanced at offset ' + offset + ', state before: ' + oldState + ' after: ' + state);
            stream.advance(1);
            return finishToken(offset, TokenType.Unknown);
        }
        return token;
    }

    function internalScan(): TokenType {
        let offset = stream.pos();
        if (stream.eos()) {
            return finishToken(offset, TokenType.EOS);
        }
        let errorMessage;

        switch (state) {
            case ScannerState.WithinComment:
                if (stream.advanceIfChars([_MIN, _MIN, _RAN])) { // -->
                    state = ScannerState.WithinContent;
                    return finishToken(offset, TokenType.EndCommentTag);
                }
                stream.advanceUntilChars([_MIN, _MIN, _RAN]); // -->
                return finishToken(offset, TokenType.Comment);
            case ScannerState.WithinDoctype:
                stream.advanceIfChar(_QST); // ?
                if (stream.advanceIfChar(_RAN)) {
                    state = ScannerState.WithinContent;
                    return finishToken(offset, TokenType.EndDoctypeTag);
                }
                stream.advanceUntilChar(_RAN); // >
                return finishToken(offset, TokenType.Doctype);
            case ScannerState.WithinContent:
                if (stream.advanceIfChar(_LAN)) { // <
                    if (!stream.eos() && (stream.peekChar() === _BNG || stream.peekChar() === _QST)) { // !
                        if (stream.advanceIfChars([_BNG, _MIN, _MIN])) { // <!--
                            state = ScannerState.WithinComment;
                            return finishToken(offset, TokenType.StartCommentTag);
                        }
                        if (stream.advanceIfRegExp(/^\?xml/i)) {
                            state = ScannerState.WithinDoctype;
                            return finishToken(offset, TokenType.StartDoctypeTag);
                        }
                    }
                    if (stream.advanceIfChar(_FSL)) { // /
                        state = ScannerState.AfterOpeningEndTag;
                        return finishToken(offset, TokenType.EndTagOpen);
                    }
                    state = ScannerState.AfterOpeningStartTag;
                    return finishToken(offset, TokenType.StartTagOpen);
                }
                stream.advanceUntilChar(_LAN);
                return finishToken(offset, TokenType.Content);
            case ScannerState.AfterOpeningEndTag:
                let tagName = nextElementName();
                if (tagName.length > 0) {
                    state = ScannerState.WithinEndTag;
                    return finishToken(offset, TokenType.EndTag);
                }
                if (stream.skipWhitespace()) { // white space is not valid here
                    return finishToken(offset, TokenType.Whitespace, localize('error.unexpectedWhitespace', 'Tag name must directly follow the open bracket.'));
                }
                state = ScannerState.WithinEndTag;
                stream.advanceUntilChar(_RAN);
                if (offset < stream.pos()) {
                    return finishToken(offset, TokenType.Unknown, localize('error.endTagNameExpected', 'End tag name expected.'));
                }
                return internalScan();
            case ScannerState.WithinEndTag:
                if (stream.skipWhitespace()) { // white space is valid here
                    return finishToken(offset, TokenType.Whitespace);
                }
                if (stream.advanceIfChar(_RAN)) { // >
                    state = ScannerState.WithinContent;
                    return finishToken(offset, TokenType.EndTagClose);
                }
                errorMessage = localize('error.tagNameExpected', 'Closing bracket expected.');
                break;
            case ScannerState.AfterOpeningStartTag:
                lastTag = nextElementName();
                lastAttributeName = void 0;
                if (lastTag.length > 0) {
                    hasSpaceAfterTag = false;
                    state = ScannerState.WithinTag;
                    return finishToken(offset, TokenType.StartTag);
                }
                if (stream.skipWhitespace()) { // white space is not valid here
                    return finishToken(offset, TokenType.Whitespace, localize('error.unexpectedWhitespace', 'Tag name must directly follow the open bracket.'));
                }
                state = ScannerState.WithinTag;
                stream.advanceUntilChar(_RAN);
                if (offset < stream.pos()) {
                    return finishToken(offset, TokenType.Unknown, localize('error.startTagNameExpected', 'Start tag name expected.'));
                }
                return internalScan();
            case ScannerState.WithinTag:
                if (stream.skipWhitespace()) {
                    hasSpaceAfterTag = true; // remember that we have seen a whitespace
                    return finishToken(offset, TokenType.Whitespace);
                }
                if (hasSpaceAfterTag) {
                    lastAttributeName = nextAttributeName();
                    if (lastAttributeName.length > 0) {
                        state = ScannerState.AfterAttributeName;
                        hasSpaceAfterTag = false;
                        return finishToken(offset, TokenType.AttributeName);
                    }
                }
                if (stream.advanceIfChars([_FSL, _RAN])) { // />
                    state = ScannerState.WithinContent;
                    return finishToken(offset, TokenType.StartTagSelfClose);
                }
                if (stream.advanceIfChar(_RAN)) { // >
                    state = ScannerState.WithinContent;
                    return finishToken(offset, TokenType.StartTagClose);
                }
                stream.advance(1);
                return finishToken(offset, TokenType.Unknown, localize('error.unexpectedCharacterInTag', 'Unexpected character in tag.'));
            case ScannerState.AfterAttributeName:
                if (stream.skipWhitespace()) {
                    hasSpaceAfterTag = true;
                    return finishToken(offset, TokenType.Whitespace);
                }

                if (stream.advanceIfChar(_EQS)) {
                    state = ScannerState.BeforeAttributeValue;
                    return finishToken(offset, TokenType.DelimiterAssign);
                }
                state = ScannerState.WithinTag;
                return internalScan(); // no advance yet - jump to WithinTag
            case ScannerState.BeforeAttributeValue:
                if (stream.skipWhitespace()) {
                    return finishToken(offset, TokenType.Whitespace);
                }
                let attributeValue = stream.advanceIfRegExp(/^[^\s"'`=<>\/]+/);
                if (attributeValue.length > 0) {
                    state = ScannerState.WithinTag;
                    hasSpaceAfterTag = false;
                    return finishToken(offset, TokenType.AttributeValue);
                }
                let ch = stream.peekChar();
                if (ch === _SQO || ch === _DQO) {
                    stream.advance(1); // consume quote
                    state = ScannerState.WithinTag;
                    hasSpaceAfterTag = false;
                    const attributeValue = finishToken(offset, TokenType.AttributeValue);
                    if (stream.advanceUntilChar(ch)) {
                        stream.advance(1); // consume quote
                    }
                    return attributeValue;
                }
                state = ScannerState.WithinTag;
                hasSpaceAfterTag = false;
                return internalScan(); // no advance yet - jump to WithinTag
        }

        stream.advance(1);
        state = ScannerState.WithinContent;
        return finishToken(offset, TokenType.Unknown, errorMessage);
    }
    return {
        scan,
        getTokenType: () => tokenType,
        getTokenOffset: () => tokenOffset,
        getTokenLength: () => stream.pos() - tokenOffset,
        getTokenEnd: () => stream.pos(),
        getTokenText: () => stream.getSource().substring(tokenOffset, stream.pos()),
        getScannerState: () => state,
        getTokenError: () => tokenError,
    };
}

