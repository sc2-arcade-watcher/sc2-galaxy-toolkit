"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const textToTokenTable = new Map([
    ["include", 50 /* IncludeKeyword */],
    ["struct", 51 /* StructKeyword */],
    ["static", 52 /* StaticKeyword */],
    ["const", 53 /* ConstKeyword */],
    ["native", 54 /* NativeKeyword */],
    ["break", 55 /* BreakKeyword */],
    ["continue", 56 /* ContinueKeyword */],
    ["breakpoint", 57 /* BreakpointKeyword */],
    ["return", 58 /* ReturnKeyword */],
    ["switch", 59 /* SwitchKeyword */],
    // ["case", SyntaxKind.CaseKeyword],
    ["default", 60 /* DefaultKeyword */],
    ["new", 61 /* NewKeyword */],
    ["do", 62 /* DoKeyword */],
    ["for", 63 /* ForKeyword */],
    ["while", 64 /* WhileKeyword */],
    ["if", 65 /* IfKeyword */],
    ["else", 66 /* ElseKeyword */],
    ["true", 67 /* TrueKeyword */],
    ["false", 68 /* FalseKeyword */],
    ["null", 69 /* NullKeyword */],
    ["typedef", 70 /* TypedefKeyword */],
    ["abilcmd", 77 /* AbilcmdKeyword */],
    ["actor", 78 /* ActorKeyword */],
    ["actorscope", 79 /* ActorscopeKeyword */],
    ["aifilter", 80 /* AifilterKeyword */],
    ["bank", 81 /* BankKeyword */],
    ["bool", 71 /* BoolKeyword */],
    ["bitmask", 82 /* BitmaskKeyword */],
    ["byte", 72 /* ByteKeyword */],
    ["camerainfo", 83 /* CamerainfoKeyword */],
    ["char", 73 /* CharKeyword */],
    ["color", 84 /* ColorKeyword */],
    ["doodad", 86 /* DoodadKeyword */],
    ["datetime", 85 /* DatetimeKeyword */],
    ["fixed", 75 /* FixedKeyword */],
    ["handle", 87 /* HandleKeyword */],
    ["generichandle", 88 /* GenerichandleKeyword */],
    ["effecthistory", 89 /* EffecthistoryKeyword */],
    ["int", 74 /* IntKeyword */],
    ["marker", 90 /* MarkerKeyword */],
    ["order", 91 /* OrderKeyword */],
    ["playergroup", 92 /* PlayergroupKeyword */],
    ["point", 93 /* PointKeyword */],
    ["region", 94 /* RegionKeyword */],
    ["revealer", 95 /* RevealerKeyword */],
    ["sound", 96 /* SoundKeyword */],
    ["soundlink", 97 /* SoundlinkKeyword */],
    ["string", 76 /* StringKeyword */],
    ["text", 98 /* TextKeyword */],
    ["timer", 99 /* TimerKeyword */],
    ["transmissionsource", 100 /* TransmissionsourceKeyword */],
    ["trigger", 101 /* TriggerKeyword */],
    ["unit", 102 /* UnitKeyword */],
    ["unitfilter", 103 /* UnitfilterKeyword */],
    ["unitgroup", 104 /* UnitgroupKeyword */],
    ["unitref", 105 /* UnitrefKeyword */],
    ["void", 106 /* VoidKeyword */],
    ["wave", 107 /* WaveKeyword */],
    ["waveinfo", 108 /* WaveinfoKeyword */],
    ["wavetarget", 109 /* WavetargetKeyword */],
    ["arrayref", 110 /* ArrayrefKeyword */],
    ["structref", 111 /* StructrefKeyword */],
    ["funcref", 112 /* FuncrefKeyword */],
    ["{", 4 /* OpenBraceToken */],
    ["}", 5 /* CloseBraceToken */],
    ["(", 6 /* OpenParenToken */],
    [")", 7 /* CloseParenToken */],
    ["[", 8 /* OpenBracketToken */],
    ["]", 9 /* CloseBracketToken */],
    [".", 10 /* DotToken */],
    [";", 11 /* SemicolonToken */],
    [",", 12 /* CommaToken */],
    ["<", 13 /* LessThanToken */],
    [">", 14 /* GreaterThanToken */],
    ["<=", 15 /* LessThanEqualsToken */],
    [">=", 16 /* GreaterThanEqualsToken */],
    ["==", 17 /* EqualsEqualsToken */],
    ["!=", 18 /* ExclamationEqualsToken */],
    ["=>", 19 /* EqualsGreaterThanToken */],
    ["+", 20 /* PlusToken */],
    ["-", 21 /* MinusToken */],
    ["*", 22 /* AsteriskToken */],
    ["/", 23 /* SlashToken */],
    ["%", 24 /* PercentToken */],
    ["++", 25 /* PlusPlusToken */],
    ["--", 26 /* MinusMinusToken */],
    ["<<", 27 /* LessThanLessThanToken */],
    [">>", 28 /* GreaterThanGreaterThanToken */],
    ["&", 29 /* AmpersandToken */],
    ["|", 30 /* BarToken */],
    ["^", 31 /* CaretToken */],
    ["!", 32 /* ExclamationToken */],
    ["~", 33 /* TildeToken */],
    ["&&", 34 /* AmpersandAmpersandToken */],
    ["||", 35 /* BarBarToken */],
    ["?", 36 /* QuestionToken */],
    [":", 37 /* ColonToken */],
    ["=", 39 /* EqualsToken */],
    ["+=", 40 /* PlusEqualsToken */],
    ["-=", 41 /* MinusEqualsToken */],
    ["*=", 42 /* AsteriskEqualsToken */],
    ["/=", 43 /* SlashEqualsToken */],
    ["%=", 44 /* PercentEqualsToken */],
    ["<<=", 45 /* LessThanLessThanEqualsToken */],
    [">>=", 46 /* GreaterThanGreaterThanEqualsToken */],
    ["&=", 47 /* AmpersandEqualsToken */],
    ["|=", 48 /* BarEqualsToken */],
    ["^=", 49 /* CaretEqualsToken */],
]);
// const tokenStrings = new Map(Array.from(textToTokenTable).reverse());
function makeReverseMap(source) {
    const result = [];
    source.forEach((value, name) => {
        result[value] = name;
    });
    return result;
}
const tokenStrings = makeReverseMap(textToTokenTable);
function stringToToken(s) {
    return textToTokenTable.get(s);
}
exports.stringToToken = stringToToken;
function tokenToString(t) {
    return tokenStrings[t];
}
exports.tokenToString = tokenToString;
function isIdentifierStart(ch) {
    return (ch >= 65 /* A */ && ch <= 90 /* Z */)
        || (ch >= 97 /* a */ && ch <= 122 /* z */);
}
exports.isIdentifierStart = isIdentifierStart;
function isIdentifierPart(ch) {
    return (ch >= 65 /* A */ && ch <= 90 /* Z */)
        || (ch >= 97 /* a */ && ch <= 122 /* z */)
        || (ch >= 48 /* _0 */ && ch <= 57 /* _9 */)
        || (ch === 95 /* _ */);
}
exports.isIdentifierPart = isIdentifierPart;
function isLineBreak(ch) {
    return ch === 10 /* lineFeed */
        || ch === 13 /* carriageReturn */
        || ch === 8232 /* lineSeparator */
        || ch === 8233 /* paragraphSeparator */;
}
exports.isLineBreak = isLineBreak;
function isDigit(ch) {
    return ch >= 48 /* _0 */ && ch <= 57 /* _9 */;
}
exports.isDigit = isDigit;
function isOctalDigit(ch) {
    return ch >= 48 /* _0 */ && ch <= 55 /* _7 */;
}
exports.isOctalDigit = isOctalDigit;
class Scanner {
    constructor(onError) {
        this.onError = onError;
    }
    error(msg) {
        if (this.onError) {
            this.onError({
                category: types_1.DiagnosticCategory.Error,
                code: 0,
                message: msg,
            }, this.pos, 1);
        }
    }
    speculationHelper(callback, isLookahead) {
        const saveLine = this.line;
        const saveCol = this.char;
        const savePos = this.pos;
        const saveStartPos = this.startPos;
        const saveTokenPos = this.tokenPos;
        const saveToken = this.token;
        const saveTokenValue = this.tokenValue;
        const saveLineMapLength = this.lineMap.length;
        // const savePrecedingLineBreak = this.precedingLineBreak;
        const result = callback();
        // If our callback returned something 'falsy' or we're just looking ahead,
        // then unconditionally restore us to where we were.
        if (!result || isLookahead) {
            this.line = saveLine;
            this.char = saveCol;
            this.pos = savePos;
            this.startPos = saveStartPos;
            this.tokenPos = saveTokenPos;
            this.token = saveToken;
            this.tokenValue = saveTokenValue;
            if (this.lineMap.length !== saveLineMapLength) {
                this.lineMap = this.lineMap.slice(0, saveLineMapLength);
            }
            // this.precedingLineBreak = savePrecedingLineBreak;
        }
        return result;
    }
    lookAhead(callback) {
        return this.speculationHelper(callback, true);
    }
    tryScan(callback) {
        return this.speculationHelper(callback, false);
    }
    scanHexDigits(minCount, scanAsManyAsPossible) {
        let digits = 0;
        let value = 0;
        while (digits < minCount || scanAsManyAsPossible) {
            const ch = this.text.charCodeAt(this.pos);
            if (ch >= 48 /* _0 */ && ch <= 57 /* _9 */) {
                value = value * 16 + ch - 48 /* _0 */;
            }
            else if (ch >= 65 /* A */ && ch <= 70 /* F */) {
                value = value * 16 + ch - 65 /* A */ + 10;
            }
            else if (ch >= 97 /* a */ && ch <= 102 /* f */) {
                value = value * 16 + ch - 97 /* a */ + 10;
            }
            else {
                break;
            }
            this.pos++;
            digits++;
        }
        if (digits < minCount) {
            value = -1;
        }
        return value;
    }
    scanEscapeSequence() {
        this.pos++;
        if (this.pos >= this.end) {
            this.error("Diagnostics.Unexpected_end_of_text");
            return "";
        }
        const ch = this.text.charCodeAt(this.pos);
        this.pos++;
        switch (ch) {
            case 48 /* _0 */:
                return "\0";
            case 98 /* b */:
                return "\b";
            case 116 /* t */:
                return "\t";
            case 110 /* n */:
                return "\n";
            case 118 /* v */:
                return "\v";
            case 102 /* f */:
                return "\f";
            case 114 /* r */:
                return "\r";
            case 39 /* singleQuote */:
                return "\'";
            case 34 /* doubleQuote */:
                return "\"";
            case 120 /* x */:
                // '\xDD'
                const escapedValue = this.scanHexDigits(2, false);
                if (escapedValue >= 0) {
                    return String.fromCharCode(escapedValue);
                }
                else {
                    this.error("Diagnostics.Hexadecimal_digit_expected");
                    return "";
                }
            // when encountering a LineContinuation (i.e. a backslash and a line terminator sequence),
            // the line terminator is interpreted to be "the empty code unit sequence".
            case 13 /* carriageReturn */:
                if (this.pos < this.end && this.text.charCodeAt(this.pos) === 10 /* lineFeed */) {
                    this.pos++;
                }
            // falls through
            case 10 /* lineFeed */:
            case 8232 /* lineSeparator */:
            case 8233 /* paragraphSeparator */:
                this.error('Multiline strings not supported');
                return "";
            default:
                return String.fromCharCode(ch);
        }
    }
    scanString(allowEscapes = true) {
        const quote = this.text.charCodeAt(this.pos);
        this.pos++;
        let result = "";
        let start = this.pos;
        while (true) {
            if (this.pos >= this.end) {
                result += this.text.substring(start, this.pos);
                // tokenIsUnterminated = true;
                this.error("Diagnostics.Unterminated_string_literal");
                break;
            }
            const ch = this.text.charCodeAt(this.pos);
            if (ch > 127 /* maxAsciiCharacter */) {
                this.error(`Non ASCII characters not allowed: 0x${ch.toString(16)}`);
            }
            if (ch === quote) {
                result += this.text.substring(start, this.pos);
                this.pos++;
                break;
            }
            if (ch === 92 /* backslash */ && allowEscapes) {
                result += this.text.substring(start, this.pos);
                result += this.scanEscapeSequence();
                start = this.pos;
                continue;
            }
            if (isLineBreak(ch)) {
                result += this.text.substring(start, this.pos);
                // tokenIsUnterminated = true;
                this.error("Diagnostics.Unterminated_string_literal");
                break;
            }
            this.pos++;
        }
        return result;
    }
    scanNumber() {
        const start = this.pos;
        while (isDigit(this.text.charCodeAt(this.pos)))
            this.pos++;
        if (this.text.charCodeAt(this.pos) === 46 /* dot */) {
            this.pos++;
            while (isDigit(this.text.charCodeAt(this.pos)))
                this.pos++;
        }
        let end = this.pos;
        if (this.text.charCodeAt(this.pos) === 69 /* E */ || this.text.charCodeAt(this.pos) === 101 /* e */) {
            this.pos++;
            // numericLiteralFlags = NumericLiteralFlags.Scientific;
            if (this.text.charCodeAt(this.pos) === 43 /* plus */ || this.text.charCodeAt(this.pos) === 45 /* minus */)
                this.pos++;
            if (isDigit(this.text.charCodeAt(this.pos))) {
                this.pos++;
                while (isDigit(this.text.charCodeAt(this.pos)))
                    this.pos++;
                end = this.pos;
            }
            else {
                this.error("Diagnostics.Digit_expected");
            }
        }
        return "" + +(this.text.substring(start, end));
    }
    scanBinaryOrOctalDigits(base) {
        console.assert(base === 2 || base === 8, "Expected either base 2 or base 8");
        let value = 0;
        // For counting number of digits; Valid binaryIntegerLiteral must have at least one binary digit following B or b.
        // Similarly valid octalIntegerLiteral must have at least one octal digit following o or O.
        let numberOfDigits = 0;
        while (true) {
            const ch = this.text.charCodeAt(this.pos);
            const valueOfCh = ch - 48 /* _0 */;
            if (!isDigit(ch) || valueOfCh >= base) {
                break;
            }
            value = value * base + valueOfCh;
            this.pos++;
            numberOfDigits++;
        }
        // Invalid binaryIntegerLiteral or octalIntegerLiteral
        if (numberOfDigits === 0) {
            return -1;
        }
        return value;
    }
    scanOctalDigits() {
        const start = this.pos;
        while (isOctalDigit(this.text.charCodeAt(this.pos))) {
            this.pos++;
        }
        return +(this.text.substring(start, this.pos));
    }
    getIdentifierToken() {
        // Reserved words are between 2 and 11 characters long and start with a lowercase letter
        let token;
        const len = this.tokenValue.length;
        const ch = this.tokenValue.charCodeAt(0);
        if (ch >= 97 /* a */ && ch <= 122 /* z */) {
            token = stringToToken(this.tokenValue);
            if (token !== undefined) {
                return token;
            }
        }
        return 113 /* Identifier */;
    }
    setText(text) {
        this.text = text;
        this.pos = 0;
        this.end = this.text.length;
        this.line = 0;
        this.char = 0;
        this.lineMap = [0];
    }
    scan() {
        this.startPos = this.pos;
        while (true) {
            this.tokenPos = this.pos;
            this.tokenValue = null;
            if (this.pos >= this.end) {
                return 114 /* EndOfFileToken */;
            }
            let ch = this.text.charCodeAt(this.pos);
            switch (ch) {
                case 9 /* tab */:
                case 11 /* verticalTab */:
                case 12 /* formFeed */:
                case 32 /* space */:
                    ++this.pos;
                    break;
                case 59 /* semicolon */:
                    ++this.pos;
                    return this.token = 11 /* SemicolonToken */;
                case 40 /* openParen */:
                    this.pos++;
                    return this.token = 6 /* OpenParenToken */;
                case 41 /* closeParen */:
                    this.pos++;
                    return this.token = 7 /* CloseParenToken */;
                case 34 /* doubleQuote */:
                case 39 /* singleQuote */:
                    this.tokenValue = this.scanString();
                    return this.token = 3 /* StringLiteral */;
                case 33 /* exclamation */:
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 18 /* ExclamationEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 32 /* ExclamationToken */;
                case 37 /* percent */:
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 44 /* PercentEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 24 /* PercentToken */;
                case 38 /* ampersand */:
                    if (this.text.charCodeAt(this.pos + 1) === 38 /* ampersand */) {
                        return this.pos += 2, this.token = 34 /* AmpersandAmpersandToken */;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 47 /* AmpersandEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 29 /* AmpersandToken */;
                case 40 /* openParen */:
                    this.pos++;
                    return this.token = 6 /* OpenParenToken */;
                case 41 /* closeParen */:
                    this.pos++;
                    return this.token = 7 /* CloseParenToken */;
                case 42 /* asterisk */:
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 42 /* AsteriskEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 22 /* AsteriskToken */;
                case 43 /* plus */:
                    if (this.text.charCodeAt(this.pos + 1) === 43 /* plus */) {
                        return this.pos += 2, this.token = 25 /* PlusPlusToken */;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 40 /* PlusEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 20 /* PlusToken */;
                case 44 /* comma */:
                    this.pos++;
                    return this.token = 12 /* CommaToken */;
                case 45 /* minus */:
                    if (this.text.charCodeAt(this.pos + 1) === 45 /* minus */) {
                        return this.pos += 2, this.token = 26 /* MinusMinusToken */;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 41 /* MinusEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 21 /* MinusToken */;
                case 46 /* dot */:
                    if (isDigit(this.text.charCodeAt(this.pos + 1))) {
                        this.tokenValue = this.scanNumber();
                        return this.token = 2 /* NumericLiteral */;
                    }
                    this.pos++;
                    return this.token = 10 /* DotToken */;
                case 47 /* slash */:
                    // Single-line comment
                    if (this.text.charCodeAt(this.pos + 1) === 47 /* slash */) {
                        this.pos += 2;
                        while (this.pos < this.end) {
                            const char = this.text.charCodeAt(this.pos);
                            if (isLineBreak(char)) {
                                break;
                            }
                            if (char >= 127 /* maxAsciiCharacter */) {
                                this.error(`Non ASCII characters not allowed: 0x${char.toString(16)}`);
                            }
                            this.pos++;
                        }
                        return this.token = 1 /* SingleLineCommentTrivia */;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 43 /* SlashEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 23 /* SlashToken */;
                case 48 /* _0 */:
                    if (this.pos + 2 < this.end && (this.text.charCodeAt(this.pos + 1) === 88 /* X */ || this.text.charCodeAt(this.pos + 1) === 120 /* x */)) {
                        this.pos += 2;
                        let value = this.scanHexDigits(1, true);
                        if (value < 0) {
                            this.error("Diagnostics.Hexadecimal_digit_expected");
                            value = 0;
                        }
                        this.tokenValue = "" + value;
                        // numericLiteralFlags = NumericLiteralFlags.HexSpecifier;
                        return this.token = 2 /* NumericLiteral */;
                    }
                    else if (this.pos + 2 < this.end && (this.text.charCodeAt(this.pos + 1) === 66 /* B */ || this.text.charCodeAt(this.pos + 1) === 98 /* b */)) {
                        this.pos += 2;
                        let value = this.scanBinaryOrOctalDigits(/* base */ 2);
                        if (value < 0) {
                            this.error("Diagnostics.Binary_digit_expected");
                            value = 0;
                        }
                        this.tokenValue = "" + value;
                        // numericLiteralFlags = NumericLiteralFlags.BinarySpecifier;
                        return this.token = 2 /* NumericLiteral */;
                    }
                    else if (this.pos + 2 < this.end && (this.text.charCodeAt(this.pos + 1) === 79 /* O */ || this.text.charCodeAt(this.pos + 1) === 111 /* o */)) {
                        this.pos += 2;
                        let value = this.scanBinaryOrOctalDigits(/* base */ 8);
                        if (value < 0) {
                            this.error("Diagnostics.Octal_digit_expected");
                            value = 0;
                        }
                        this.tokenValue = "" + value;
                        // numericLiteralFlags = NumericLiteralFlags.OctalSpecifier;
                        return this.token = 2 /* NumericLiteral */;
                    }
                    // Try to parse as an octal
                    if (this.pos + 1 < this.end && isOctalDigit(this.text.charCodeAt(this.pos + 1))) {
                        this.tokenValue = "" + this.scanOctalDigits();
                        // numericLiteralFlags = NumericLiteralFlags.Octal;
                        return this.token = 2 /* NumericLiteral */;
                    }
                // This fall-through is a deviation from the EcmaScript grammar. The grammar says that a leading zero
                // can only be followed by an octal digit, a dot, or the end of the number literal. However, we are being
                // permissive and allowing decimal digits of the form 08* and 09* (which many browsers also do).
                // falls through
                case 49 /* _1 */:
                case 50 /* _2 */:
                case 51 /* _3 */:
                case 52 /* _4 */:
                case 53 /* _5 */:
                case 54 /* _6 */:
                case 55 /* _7 */:
                case 56 /* _8 */:
                case 57 /* _9 */:
                    this.tokenValue = this.scanNumber();
                    return this.token = 2 /* NumericLiteral */;
                case 60 /* lessThan */:
                    if (this.text.charCodeAt(this.pos + 1) === 60 /* lessThan */) {
                        if (this.text.charCodeAt(this.pos + 2) === 61 /* equals */) {
                            return this.pos += 3, this.token = 45 /* LessThanLessThanEqualsToken */;
                        }
                        return this.pos += 2, this.token = 27 /* LessThanLessThanToken */;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 15 /* LessThanEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 13 /* LessThanToken */;
                case 61 /* equals */:
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 17 /* EqualsEqualsToken */;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 62 /* greaterThan */) {
                        return this.pos += 2, this.token = 19 /* EqualsGreaterThanToken */;
                    }
                    this.pos++;
                    return this.token = 39 /* EqualsToken */;
                case 62 /* greaterThan */:
                    if (this.text.charCodeAt(this.pos + 1) === 62 /* greaterThan */) {
                        if (this.text.charCodeAt(this.pos + 2) === 61 /* equals */) {
                            return this.pos += 3, this.token = 46 /* GreaterThanGreaterThanEqualsToken */;
                        }
                        return this.pos += 2, this.token = 28 /* GreaterThanGreaterThanToken */;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 16 /* GreaterThanEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 14 /* GreaterThanToken */;
                case 91 /* openBracket */:
                    this.pos++;
                    return this.token = 8 /* OpenBracketToken */;
                case 93 /* closeBracket */:
                    this.pos++;
                    return this.token = 9 /* CloseBracketToken */;
                case 94 /* caret */:
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 49 /* CaretEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 31 /* CaretToken */;
                case 123 /* openBrace */:
                    this.pos++;
                    return this.token = 4 /* OpenBraceToken */;
                case 124 /* bar */:
                    if (this.text.charCodeAt(this.pos + 1) === 124 /* bar */) {
                        return this.pos += 2, this.token = 35 /* BarBarToken */;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 48 /* BarEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 30 /* BarToken */;
                case 125 /* closeBrace */:
                    this.pos++;
                    return this.token = 5 /* CloseBraceToken */;
                case 126 /* tilde */:
                    this.pos++;
                    return this.token = 33 /* TildeToken */;
                default:
                    if (isIdentifierStart(ch)) {
                        this.pos++;
                        while (this.pos < this.end && isIdentifierPart(ch = this.text.charCodeAt(this.pos)))
                            this.pos++;
                        this.tokenValue = this.text.substring(this.tokenPos, this.pos);
                        return this.token = this.getIdentifierToken();
                    }
                    else if (isLineBreak(ch)) {
                        if (ch === 10 /* lineFeed */) {
                            this.char = this.pos;
                            this.line++;
                        }
                        this.pos++;
                        if (ch === 10 /* lineFeed */) {
                            this.lineMap.push(this.pos);
                        }
                        continue;
                    }
                    this.error(`Encountered invalid character: 0x${ch.toString(16)}`);
                    this.pos++;
                    return this.token = 0 /* Unknown */;
            }
        }
    }
    getLine() {
        return this.line;
    }
    getChar() {
        return this.pos - this.char;
    }
    getCurrentPos() {
        return this.pos;
    }
    getStartPos() {
        return this.startPos;
    }
    getTokenPos() {
        return this.tokenPos;
    }
    getTokenValue() {
        return this.tokenValue;
    }
    getTokenText() {
        return this.text.substring(this.tokenPos, this.pos);
    }
    getLineMap() {
        return this.lineMap;
    }
}
exports.Scanner = Scanner;
//# sourceMappingURL=scanner.js.map