"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const textToTokenTable = new Map([
    ["include", 49],
    ["struct", 50],
    ["static", 51],
    ["const", 52],
    ["native", 53],
    ["break", 54],
    ["continue", 55],
    ["return", 56],
    ["do", 57],
    ["for", 58],
    ["while", 59],
    ["if", 60],
    ["else", 61],
    ["true", 62],
    ["false", 63],
    ["null", 64],
    ["typedef", 65],
    ["abilcmd", 66],
    ["actor", 67],
    ["actorscope", 68],
    ["aifilter", 69],
    ["animfilter", 70],
    ["bank", 71],
    ["bool", 72],
    ["byte", 73],
    ["camerainfo", 74],
    ["char", 75],
    ["color", 76],
    ["doodad", 77],
    ["fixed", 78],
    ["handle", 79],
    ["generichandle", 80],
    ["effecthistory", 81],
    ["int", 82],
    ["marker", 83],
    ["order", 84],
    ["playergroup", 85],
    ["point", 86],
    ["region", 87],
    ["revealer", 88],
    ["sound", 89],
    ["soundlink", 90],
    ["string", 91],
    ["text", 92],
    ["timer", 93],
    ["transmissionsource", 94],
    ["trigger", 95],
    ["unit", 96],
    ["unitfilter", 97],
    ["unitgroup", 98],
    ["unitref", 99],
    ["void", 100],
    ["wave", 101],
    ["waveinfo", 102],
    ["wavetarget", 103],
    ["arrayref", 104],
    ["structref", 105],
    ["funcref", 106],
    ["{", 3],
    ["}", 4],
    ["(", 5],
    [")", 6],
    ["[", 7],
    ["]", 8],
    [".", 9],
    [";", 10],
    [",", 11],
    ["<", 12],
    [">", 13],
    ["<=", 14],
    [">=", 15],
    ["==", 16],
    ["!=", 17],
    ["=>", 18],
    ["+", 19],
    ["-", 20],
    ["*", 21],
    ["/", 22],
    ["%", 23],
    ["++", 24],
    ["--", 25],
    ["<<", 26],
    [">>", 27],
    ["&", 28],
    ["|", 29],
    ["^", 30],
    ["!", 31],
    ["~", 32],
    ["&&", 33],
    ["||", 34],
    ["?", 35],
    [":", 36],
    ["=", 38],
    ["+=", 39],
    ["-=", 40],
    ["*=", 41],
    ["/=", 42],
    ["%=", 43],
    ["<<=", 44],
    [">>=", 45],
    ["&=", 46],
    ["|=", 47],
    ["^=", 48],
]);
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
    return ch >= 65 && ch <= 90 || ch >= 97 && ch <= 122 ||
        ch === 95 ||
        ch > 127;
}
exports.isIdentifierStart = isIdentifierStart;
function isIdentifierPart(ch) {
    return ch >= 65 && ch <= 90 || ch >= 97 && ch <= 122 ||
        ch >= 48 && ch <= 57 || ch === 95 ||
        ch > 127;
}
exports.isIdentifierPart = isIdentifierPart;
function isLineBreak(ch) {
    return ch === 10
        || ch === 13
        || ch === 8232
        || ch === 8233;
}
exports.isLineBreak = isLineBreak;
function isDigit(ch) {
    return ch >= 48 && ch <= 57;
}
exports.isDigit = isDigit;
function isOctalDigit(ch) {
    return ch >= 48 && ch <= 55;
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
            }, 0);
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
        const result = callback();
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
            if (ch >= 48 && ch <= 57) {
                value = value * 16 + ch - 48;
            }
            else if (ch >= 65 && ch <= 70) {
                value = value * 16 + ch - 65 + 10;
            }
            else if (ch >= 97 && ch <= 102) {
                value = value * 16 + ch - 97 + 10;
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
            case 48:
                return "\0";
            case 98:
                return "\b";
            case 116:
                return "\t";
            case 110:
                return "\n";
            case 118:
                return "\v";
            case 102:
                return "\f";
            case 114:
                return "\r";
            case 39:
                return "\'";
            case 34:
                return "\"";
            case 120:
                const escapedValue = this.scanHexDigits(2, false);
                if (escapedValue >= 0) {
                    return String.fromCharCode(escapedValue);
                }
                else {
                    this.error("Diagnostics.Hexadecimal_digit_expected");
                    return "";
                }
            case 13:
                if (this.pos < this.end && this.text.charCodeAt(this.pos) === 10) {
                    this.pos++;
                }
            case 10:
            case 8232:
            case 8233:
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
                this.error("Diagnostics.Unterminated_string_literal");
                break;
            }
            const ch = this.text.charCodeAt(this.pos);
            if (ch === quote) {
                result += this.text.substring(start, this.pos);
                this.pos++;
                break;
            }
            if (ch === 92 && allowEscapes) {
                result += this.text.substring(start, this.pos);
                result += this.scanEscapeSequence();
                start = this.pos;
                continue;
            }
            if (isLineBreak(ch)) {
                result += this.text.substring(start, this.pos);
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
        if (this.text.charCodeAt(this.pos) === 46) {
            this.pos++;
            while (isDigit(this.text.charCodeAt(this.pos)))
                this.pos++;
        }
        let end = this.pos;
        if (this.text.charCodeAt(this.pos) === 69 || this.text.charCodeAt(this.pos) === 101) {
            this.pos++;
            if (this.text.charCodeAt(this.pos) === 43 || this.text.charCodeAt(this.pos) === 45)
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
        let numberOfDigits = 0;
        while (true) {
            const ch = this.text.charCodeAt(this.pos);
            const valueOfCh = ch - 48;
            if (!isDigit(ch) || valueOfCh >= base) {
                break;
            }
            value = value * base + valueOfCh;
            this.pos++;
            numberOfDigits++;
        }
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
        let token;
        const len = this.tokenValue.length;
        const ch = this.tokenValue.charCodeAt(0);
        if (ch >= 97 && ch <= 122) {
            token = stringToToken(this.tokenValue);
            if (token !== undefined) {
                return token;
            }
        }
        return 107;
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
            if (this.pos >= this.end) {
                return 108;
            }
            let ch = this.text.charCodeAt(this.pos);
            switch (ch) {
                case 9:
                case 11:
                case 12:
                case 32:
                    ++this.pos;
                    break;
                case 59:
                    ++this.pos;
                    return this.token = 10;
                case 40:
                    this.pos++;
                    return this.token = 5;
                case 41:
                    this.pos++;
                    return this.token = 6;
                case 34:
                case 39:
                    this.tokenValue = this.scanString();
                    return this.token = 2;
                case 33:
                    if (this.text.charCodeAt(this.pos + 1) === 61) {
                        return this.pos += 2, this.token = 17;
                    }
                    this.pos++;
                    return this.token = 31;
                case 37:
                    if (this.text.charCodeAt(this.pos + 1) === 61) {
                        return this.pos += 2, this.token = 43;
                    }
                    this.pos++;
                    return this.token = 23;
                case 38:
                    if (this.text.charCodeAt(this.pos + 1) === 38) {
                        return this.pos += 2, this.token = 33;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61) {
                        return this.pos += 2, this.token = 46;
                    }
                    this.pos++;
                    return this.token = 28;
                case 40:
                    this.pos++;
                    return this.token = 5;
                case 41:
                    this.pos++;
                    return this.token = 6;
                case 42:
                    if (this.text.charCodeAt(this.pos + 1) === 61) {
                        return this.pos += 2, this.token = 41;
                    }
                    this.pos++;
                    return this.token = 21;
                case 43:
                    if (this.text.charCodeAt(this.pos + 1) === 43) {
                        return this.pos += 2, this.token = 24;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61) {
                        return this.pos += 2, this.token = 39;
                    }
                    this.pos++;
                    return this.token = 19;
                case 44:
                    this.pos++;
                    return this.token = 11;
                case 45:
                    if (this.text.charCodeAt(this.pos + 1) === 45) {
                        return this.pos += 2, this.token = 25;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61) {
                        return this.pos += 2, this.token = 40;
                    }
                    this.pos++;
                    return this.token = 20;
                case 46:
                    if (isDigit(this.text.charCodeAt(this.pos + 1))) {
                        this.tokenValue = this.scanNumber();
                        return this.token = 1;
                    }
                    this.pos++;
                    return this.token = 9;
                case 47:
                    if (this.text.charCodeAt(this.pos + 1) === 47) {
                        this.pos += 2;
                        while (this.pos < this.end) {
                            if (isLineBreak(this.text.charCodeAt(this.pos))) {
                                break;
                            }
                            this.pos++;
                        }
                        continue;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61) {
                        return this.pos += 2, this.token = 42;
                    }
                    this.pos++;
                    return this.token = 22;
                case 48:
                    if (this.pos + 2 < this.end && (this.text.charCodeAt(this.pos + 1) === 88 || this.text.charCodeAt(this.pos + 1) === 120)) {
                        this.pos += 2;
                        let value = this.scanHexDigits(1, true);
                        if (value < 0) {
                            this.error("Diagnostics.Hexadecimal_digit_expected");
                            value = 0;
                        }
                        this.tokenValue = "" + value;
                        return this.token = 1;
                    }
                    else if (this.pos + 2 < this.end && (this.text.charCodeAt(this.pos + 1) === 66 || this.text.charCodeAt(this.pos + 1) === 98)) {
                        this.pos += 2;
                        let value = this.scanBinaryOrOctalDigits(2);
                        if (value < 0) {
                            this.error("Diagnostics.Binary_digit_expected");
                            value = 0;
                        }
                        this.tokenValue = "" + value;
                        return this.token = 1;
                    }
                    else if (this.pos + 2 < this.end && (this.text.charCodeAt(this.pos + 1) === 79 || this.text.charCodeAt(this.pos + 1) === 111)) {
                        this.pos += 2;
                        let value = this.scanBinaryOrOctalDigits(8);
                        if (value < 0) {
                            this.error("Diagnostics.Octal_digit_expected");
                            value = 0;
                        }
                        this.tokenValue = "" + value;
                        return this.token = 1;
                    }
                    if (this.pos + 1 < this.end && isOctalDigit(this.text.charCodeAt(this.pos + 1))) {
                        this.tokenValue = "" + this.scanOctalDigits();
                        return this.token = 1;
                    }
                case 49:
                case 50:
                case 51:
                case 52:
                case 53:
                case 54:
                case 55:
                case 56:
                case 57:
                    this.tokenValue = this.scanNumber();
                    return this.token = 1;
                case 60:
                    if (this.text.charCodeAt(this.pos + 1) === 60) {
                        if (this.text.charCodeAt(this.pos + 2) === 61) {
                            return this.pos += 3, this.token = 44;
                        }
                        return this.pos += 2, this.token = 26;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61) {
                        return this.pos += 2, this.token = 14;
                    }
                    this.pos++;
                    return this.token = 12;
                case 61:
                    if (this.text.charCodeAt(this.pos + 1) === 61) {
                        return this.pos += 2, this.token = 16;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 62) {
                        return this.pos += 2, this.token = 18;
                    }
                    this.pos++;
                    return this.token = 38;
                case 62:
                    if (this.text.charCodeAt(this.pos + 1) === 62) {
                        if (this.text.charCodeAt(this.pos + 2) === 61) {
                            return this.pos += 3, this.token = 45;
                        }
                        return this.pos += 2, this.token = 27;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61) {
                        return this.pos += 2, this.token = 15;
                    }
                    this.pos++;
                    return this.token = 13;
                case 91:
                    this.pos++;
                    return this.token = 7;
                case 93:
                    this.pos++;
                    return this.token = 8;
                case 94:
                    if (this.text.charCodeAt(this.pos + 1) === 61) {
                        return this.pos += 2, this.token = 48;
                    }
                    this.pos++;
                    return this.token = 30;
                case 123:
                    this.pos++;
                    return this.token = 3;
                case 124:
                    if (this.text.charCodeAt(this.pos + 1) === 124) {
                        return this.pos += 2, this.token = 34;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === 61) {
                        return this.pos += 2, this.token = 47;
                    }
                    this.pos++;
                    return this.token = 29;
                case 125:
                    this.pos++;
                    return this.token = 4;
                case 126:
                    this.pos++;
                    return this.token = 32;
                default:
                    if (isIdentifierStart(ch)) {
                        this.pos++;
                        while (this.pos < this.end && isIdentifierPart(ch = this.text.charCodeAt(this.pos)))
                            this.pos++;
                        this.tokenValue = this.text.substring(this.tokenPos, this.pos);
                        return this.token = this.getIdentifierToken();
                    }
                    else if (isLineBreak(ch)) {
                        if (ch === 10) {
                            this.char = this.pos;
                            this.line++;
                        }
                        this.pos++;
                        if (ch === 10) {
                            this.lineMap.push(this.pos);
                        }
                        continue;
                    }
                    this.error(`encountered invalid character ${this.text.charAt(this.pos)}`);
                    this.pos++;
                    return this.token = 0;
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
    getTextPos() {
        return this.end;
    }
    getTokenValue() {
        return this.tokenValue;
    }
    getLineMap() {
        return this.lineMap;
    }
}
exports.Scanner = Scanner;
