"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const textToTokenTable = new Map([
    ["include", 49 /* IncludeKeyword */],
    ["struct", 50 /* StructKeyword */],
    ["static", 51 /* StaticKeyword */],
    ["const", 52 /* ConstKeyword */],
    ["native", 53 /* NativeKeyword */],
    ["break", 54 /* BreakKeyword */],
    ["continue", 55 /* ContinueKeyword */],
    ["return", 56 /* ReturnKeyword */],
    ["do", 57 /* DoKeyword */],
    ["for", 58 /* ForKeyword */],
    ["while", 59 /* WhileKeyword */],
    ["if", 60 /* IfKeyword */],
    ["else", 61 /* ElseKeyword */],
    ["true", 62 /* TrueKeyword */],
    ["false", 63 /* FalseKeyword */],
    ["null", 64 /* NullKeyword */],
    ["typedef", 65 /* TypedefKeyword */],
    ["abilcmd", 72 /* AbilcmdKeyword */],
    ["actor", 73 /* ActorKeyword */],
    ["actorscope", 74 /* ActorscopeKeyword */],
    ["aifilter", 75 /* AifilterKeyword */],
    ["animfilter", 76 /* AnimfilterKeyword */],
    ["bank", 77 /* BankKeyword */],
    ["bool", 66 /* BoolKeyword */],
    ["bitmask", 78 /* BitmaskKeyword */],
    ["byte", 67 /* ByteKeyword */],
    ["camerainfo", 79 /* CamerainfoKeyword */],
    ["char", 68 /* CharKeyword */],
    ["color", 80 /* ColorKeyword */],
    ["doodad", 81 /* DoodadKeyword */],
    ["fixed", 70 /* FixedKeyword */],
    ["handle", 82 /* HandleKeyword */],
    ["generichandle", 83 /* GenerichandleKeyword */],
    ["effecthistory", 84 /* EffecthistoryKeyword */],
    ["int", 69 /* IntKeyword */],
    ["marker", 85 /* MarkerKeyword */],
    ["order", 86 /* OrderKeyword */],
    ["playergroup", 87 /* PlayergroupKeyword */],
    ["point", 88 /* PointKeyword */],
    ["region", 89 /* RegionKeyword */],
    ["revealer", 90 /* RevealerKeyword */],
    ["sound", 91 /* SoundKeyword */],
    ["soundlink", 92 /* SoundlinkKeyword */],
    ["string", 71 /* StringKeyword */],
    ["text", 93 /* TextKeyword */],
    ["timer", 94 /* TimerKeyword */],
    ["transmissionsource", 95 /* TransmissionsourceKeyword */],
    ["trigger", 96 /* TriggerKeyword */],
    ["unit", 97 /* UnitKeyword */],
    ["unitfilter", 98 /* UnitfilterKeyword */],
    ["unitgroup", 99 /* UnitgroupKeyword */],
    ["unitref", 100 /* UnitrefKeyword */],
    ["void", 101 /* VoidKeyword */],
    ["wave", 102 /* WaveKeyword */],
    ["waveinfo", 103 /* WaveinfoKeyword */],
    ["wavetarget", 104 /* WavetargetKeyword */],
    ["arrayref", 105 /* ArrayrefKeyword */],
    ["structref", 106 /* StructrefKeyword */],
    ["funcref", 107 /* FuncrefKeyword */],
    ["{", 3 /* OpenBraceToken */],
    ["}", 4 /* CloseBraceToken */],
    ["(", 5 /* OpenParenToken */],
    [")", 6 /* CloseParenToken */],
    ["[", 7 /* OpenBracketToken */],
    ["]", 8 /* CloseBracketToken */],
    [".", 9 /* DotToken */],
    [";", 10 /* SemicolonToken */],
    [",", 11 /* CommaToken */],
    ["<", 12 /* LessThanToken */],
    [">", 13 /* GreaterThanToken */],
    ["<=", 14 /* LessThanEqualsToken */],
    [">=", 15 /* GreaterThanEqualsToken */],
    ["==", 16 /* EqualsEqualsToken */],
    ["!=", 17 /* ExclamationEqualsToken */],
    ["=>", 18 /* EqualsGreaterThanToken */],
    ["+", 19 /* PlusToken */],
    ["-", 20 /* MinusToken */],
    ["*", 21 /* AsteriskToken */],
    ["/", 22 /* SlashToken */],
    ["%", 23 /* PercentToken */],
    ["++", 24 /* PlusPlusToken */],
    ["--", 25 /* MinusMinusToken */],
    ["<<", 26 /* LessThanLessThanToken */],
    [">>", 27 /* GreaterThanGreaterThanToken */],
    ["&", 28 /* AmpersandToken */],
    ["|", 29 /* BarToken */],
    ["^", 30 /* CaretToken */],
    ["!", 31 /* ExclamationToken */],
    ["~", 32 /* TildeToken */],
    ["&&", 33 /* AmpersandAmpersandToken */],
    ["||", 34 /* BarBarToken */],
    ["?", 35 /* QuestionToken */],
    [":", 36 /* ColonToken */],
    ["=", 38 /* EqualsToken */],
    ["+=", 39 /* PlusEqualsToken */],
    ["-=", 40 /* MinusEqualsToken */],
    ["*=", 41 /* AsteriskEqualsToken */],
    ["/=", 42 /* SlashEqualsToken */],
    ["%=", 43 /* PercentEqualsToken */],
    ["<<=", 44 /* LessThanLessThanEqualsToken */],
    [">>=", 45 /* GreaterThanGreaterThanEqualsToken */],
    ["&=", 46 /* AmpersandEqualsToken */],
    ["|=", 47 /* BarEqualsToken */],
    ["^=", 48 /* CaretEqualsToken */],
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
        || (ch >= 97 /* a */ && ch <= 122 /* z */)
        || (ch === 95 /* _ */);
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
                this.error('multibyte characters not allowed');
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
        return 108 /* Identifier */;
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
                return 109 /* EndOfFileToken */;
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
                    return this.token = 10 /* SemicolonToken */;
                case 40 /* openParen */:
                    this.pos++;
                    return this.token = 5 /* OpenParenToken */;
                case 41 /* closeParen */:
                    this.pos++;
                    return this.token = 6 /* CloseParenToken */;
                case 34 /* doubleQuote */:
                case 39 /* singleQuote */:
                    this.tokenValue = this.scanString();
                    return this.token = 2 /* StringLiteral */;
                case 33 /* exclamation */:
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 17 /* ExclamationEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 31 /* ExclamationToken */;
                case 37 /* percent */:
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 43 /* PercentEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 23 /* PercentToken */;
                case 38 /* ampersand */:
                    if (this.text.charCodeAt(this.pos + 1) === 38 /* ampersand */) {
                        return this.pos += 2, this.token = 33 /* AmpersandAmpersandToken */;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 46 /* AmpersandEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 28 /* AmpersandToken */;
                case 40 /* openParen */:
                    this.pos++;
                    return this.token = 5 /* OpenParenToken */;
                case 41 /* closeParen */:
                    this.pos++;
                    return this.token = 6 /* CloseParenToken */;
                case 42 /* asterisk */:
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 41 /* AsteriskEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 21 /* AsteriskToken */;
                case 43 /* plus */:
                    if (this.text.charCodeAt(this.pos + 1) === 43 /* plus */) {
                        return this.pos += 2, this.token = 24 /* PlusPlusToken */;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 39 /* PlusEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 19 /* PlusToken */;
                case 44 /* comma */:
                    this.pos++;
                    return this.token = 11 /* CommaToken */;
                case 45 /* minus */:
                    if (this.text.charCodeAt(this.pos + 1) === 45 /* minus */) {
                        return this.pos += 2, this.token = 25 /* MinusMinusToken */;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 40 /* MinusEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 20 /* MinusToken */;
                case 46 /* dot */:
                    if (isDigit(this.text.charCodeAt(this.pos + 1))) {
                        this.tokenValue = this.scanNumber();
                        return this.token = 1 /* NumericLiteral */;
                    }
                    this.pos++;
                    return this.token = 9 /* DotToken */;
                case 47 /* slash */:
                    // Single-line comment
                    if (this.text.charCodeAt(this.pos + 1) === 47 /* slash */) {
                        this.pos += 2;
                        while (this.pos < this.end) {
                            if (isLineBreak(this.text.charCodeAt(this.pos))) {
                                break;
                            }
                            this.pos++;
                        }
                        continue;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 42 /* SlashEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 22 /* SlashToken */;
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
                        return this.token = 1 /* NumericLiteral */;
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
                        return this.token = 1 /* NumericLiteral */;
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
                        return this.token = 1 /* NumericLiteral */;
                    }
                    // Try to parse as an octal
                    if (this.pos + 1 < this.end && isOctalDigit(this.text.charCodeAt(this.pos + 1))) {
                        this.tokenValue = "" + this.scanOctalDigits();
                        // numericLiteralFlags = NumericLiteralFlags.Octal;
                        return this.token = 1 /* NumericLiteral */;
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
                    return this.token = 1 /* NumericLiteral */;
                case 60 /* lessThan */:
                    if (this.text.charCodeAt(this.pos + 1) === 60 /* lessThan */) {
                        if (this.text.charCodeAt(this.pos + 2) === 61 /* equals */) {
                            return this.pos += 3, this.token = 44 /* LessThanLessThanEqualsToken */;
                        }
                        return this.pos += 2, this.token = 26 /* LessThanLessThanToken */;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 14 /* LessThanEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 12 /* LessThanToken */;
                case 61 /* equals */:
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 16 /* EqualsEqualsToken */;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 62 /* greaterThan */) {
                        return this.pos += 2, this.token = 18 /* EqualsGreaterThanToken */;
                    }
                    this.pos++;
                    return this.token = 38 /* EqualsToken */;
                case 62 /* greaterThan */:
                    if (this.text.charCodeAt(this.pos + 1) === 62 /* greaterThan */) {
                        if (this.text.charCodeAt(this.pos + 2) === 61 /* equals */) {
                            return this.pos += 3, this.token = 45 /* GreaterThanGreaterThanEqualsToken */;
                        }
                        return this.pos += 2, this.token = 27 /* GreaterThanGreaterThanToken */;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 15 /* GreaterThanEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 13 /* GreaterThanToken */;
                case 91 /* openBracket */:
                    this.pos++;
                    return this.token = 7 /* OpenBracketToken */;
                case 93 /* closeBracket */:
                    this.pos++;
                    return this.token = 8 /* CloseBracketToken */;
                case 94 /* caret */:
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 48 /* CaretEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 30 /* CaretToken */;
                case 123 /* openBrace */:
                    this.pos++;
                    return this.token = 3 /* OpenBraceToken */;
                case 124 /* bar */:
                    if (this.text.charCodeAt(this.pos + 1) === 124 /* bar */) {
                        return this.pos += 2, this.token = 34 /* BarBarToken */;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61 /* equals */) {
                        return this.pos += 2, this.token = 47 /* BarEqualsToken */;
                    }
                    this.pos++;
                    return this.token = 29 /* BarToken */;
                case 125 /* closeBrace */:
                    this.pos++;
                    return this.token = 4 /* CloseBraceToken */;
                case 126 /* tilde */:
                    this.pos++;
                    return this.token = 32 /* TildeToken */;
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
                    this.error('encountered invalid character');
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