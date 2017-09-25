import { CharacterCodes, SyntaxKind, Token, DiagnosticMessage, DiagnosticCategory } from './types';

export interface ErrorCallback {
    (message: DiagnosticMessage, length: number): void;
}

const textToTokenTable: ReadonlyMap<string, SyntaxKind> = new Map([
    ["include", SyntaxKind.IncludeKeyword],
    ["struct", SyntaxKind.StructKeyword],
    ["static", SyntaxKind.StaticKeyword],
    ["const", SyntaxKind.ConstKeyword],
    ["native", SyntaxKind.NativeKeyword],
    ["break", SyntaxKind.BreakKeyword],
    ["continue", SyntaxKind.ContinueKeyword],
    ["return", SyntaxKind.ReturnKeyword],
    ["do", SyntaxKind.DoKeyword],
    ["for", SyntaxKind.ForKeyword],
    ["while", SyntaxKind.WhileKeyword],
    ["if", SyntaxKind.IfKeyword],
    ["else", SyntaxKind.ElseKeyword],
    ["true", SyntaxKind.TrueKeyword],
    ["false", SyntaxKind.FalseKeyword],
    ["null", SyntaxKind.NullKeyword],
    ["typedef", SyntaxKind.TypedefKeyword],
    ["abilcmd", SyntaxKind.AbilcmdKeyword],
    ["actor", SyntaxKind.ActorKeyword],
    ["actorscope", SyntaxKind.ActorscopeKeyword],
    ["aifilter", SyntaxKind.AifilterKeyword],
    ["animfilter", SyntaxKind.AnimfilterKeyword],
    ["bank", SyntaxKind.BankKeyword],
    ["bool", SyntaxKind.BoolKeyword],
    ["byte", SyntaxKind.ByteKeyword],
    ["camerainfo", SyntaxKind.CamerainfoKeyword],
    ["char", SyntaxKind.CharKeyword],
    ["color", SyntaxKind.ColorKeyword],
    ["doodad", SyntaxKind.DoodadKeyword],
    ["fixed", SyntaxKind.FixedKeyword],
    ["handle", SyntaxKind.HandleKeyword],
    ["generichandle", SyntaxKind.GenerichandleKeyword],
    ["effecthistory", SyntaxKind.EffecthistoryKeyword],
    ["int", SyntaxKind.IntKeyword],
    ["marker", SyntaxKind.MarkerKeyword],
    ["order", SyntaxKind.OrderKeyword],
    ["playergroup", SyntaxKind.PlayergroupKeyword],
    ["point", SyntaxKind.PointKeyword],
    ["region", SyntaxKind.RegionKeyword],
    ["revealer", SyntaxKind.RevealerKeyword],
    ["sound", SyntaxKind.SoundKeyword],
    ["soundlink", SyntaxKind.SoundlinkKeyword],
    ["string", SyntaxKind.StringKeyword],
    ["text", SyntaxKind.TextKeyword],
    ["timer", SyntaxKind.TimerKeyword],
    ["transmissionsource", SyntaxKind.TransmissionsourceKeyword],
    ["trigger", SyntaxKind.TriggerKeyword],
    ["unit", SyntaxKind.UnitKeyword],
    ["unitfilter", SyntaxKind.UnitfilterKeyword],
    ["unitgroup", SyntaxKind.UnitgroupKeyword],
    ["unitref", SyntaxKind.UnitrefKeyword],
    ["void", SyntaxKind.VoidKeyword],
    ["wave", SyntaxKind.WaveKeyword],
    ["waveinfo", SyntaxKind.WaveinfoKeyword],
    ["wavetarget", SyntaxKind.WavetargetKeyword],
    ["arrayref", SyntaxKind.ArrayrefKeyword],
    ["structref", SyntaxKind.StructrefKeyword],
    ["funcref", SyntaxKind.FuncrefKeyword],
    ["{", SyntaxKind.OpenBraceToken],
    ["}", SyntaxKind.CloseBraceToken],
    ["(", SyntaxKind.OpenParenToken],
    [")", SyntaxKind.CloseParenToken],
    ["[", SyntaxKind.OpenBracketToken],
    ["]", SyntaxKind.CloseBracketToken],
    [".", SyntaxKind.DotToken],
    [";", SyntaxKind.SemicolonToken],
    [",", SyntaxKind.CommaToken],
    ["<", SyntaxKind.LessThanToken],
    [">", SyntaxKind.GreaterThanToken],
    ["<=", SyntaxKind.LessThanEqualsToken],
    [">=", SyntaxKind.GreaterThanEqualsToken],
    ["==", SyntaxKind.EqualsEqualsToken],
    ["!=", SyntaxKind.ExclamationEqualsToken],
    ["=>", SyntaxKind.EqualsGreaterThanToken],
    ["+", SyntaxKind.PlusToken],
    ["-", SyntaxKind.MinusToken],
    ["*", SyntaxKind.AsteriskToken],
    ["/", SyntaxKind.SlashToken],
    ["%", SyntaxKind.PercentToken],
    ["++", SyntaxKind.PlusPlusToken],
    ["--", SyntaxKind.MinusMinusToken],
    ["<<", SyntaxKind.LessThanLessThanToken],
    [">>", SyntaxKind.GreaterThanGreaterThanToken],
    ["&", SyntaxKind.AmpersandToken],
    ["|", SyntaxKind.BarToken],
    ["^", SyntaxKind.CaretToken],
    ["!", SyntaxKind.ExclamationToken],
    ["~", SyntaxKind.TildeToken],
    ["&&", SyntaxKind.AmpersandAmpersandToken],
    ["||", SyntaxKind.BarBarToken],
    ["?", SyntaxKind.QuestionToken],
    [":", SyntaxKind.ColonToken],
    ["=", SyntaxKind.EqualsToken],
    ["+=", SyntaxKind.PlusEqualsToken],
    ["-=", SyntaxKind.MinusEqualsToken],
    ["*=", SyntaxKind.AsteriskEqualsToken],
    ["/=", SyntaxKind.SlashEqualsToken],
    ["%=", SyntaxKind.PercentEqualsToken],
    ["<<=", SyntaxKind.LessThanLessThanEqualsToken],
    [">>=", SyntaxKind.GreaterThanGreaterThanEqualsToken],
    ["&=", SyntaxKind.AmpersandEqualsToken],
    ["|=", SyntaxKind.BarEqualsToken],
    ["^=", SyntaxKind.CaretEqualsToken],
]);

// const tokenStrings = new Map(Array.from(textToTokenTable).reverse());

function makeReverseMap(source: ReadonlyMap<string, SyntaxKind>): string[] {
    const result: string[] = [];
    source.forEach((value, name) => {
        result[value] = name;
    });
    return result;
}

const tokenStrings = makeReverseMap(textToTokenTable);

export function stringToToken(s: string): SyntaxKind | undefined {
    return textToTokenTable.get(s);
}

export function tokenToString(t: SyntaxKind): string | undefined {
    return tokenStrings[t];
}

export function isIdentifierStart(ch: number): boolean {
    return ch >= CharacterCodes.A && ch <= CharacterCodes.Z || ch >= CharacterCodes.a && ch <= CharacterCodes.z ||
        ch === CharacterCodes._ ||
        ch > CharacterCodes.maxAsciiCharacter;
}

export function isIdentifierPart(ch: number): boolean {
    return ch >= CharacterCodes.A && ch <= CharacterCodes.Z || ch >= CharacterCodes.a && ch <= CharacterCodes.z ||
        ch >= CharacterCodes._0 && ch <= CharacterCodes._9 || ch === CharacterCodes._ ||
        ch > CharacterCodes.maxAsciiCharacter;
}

export function isLineBreak(ch: number): boolean {
    return ch === CharacterCodes.lineFeed
        || ch === CharacterCodes.carriageReturn
        || ch === CharacterCodes.lineSeparator
        || ch === CharacterCodes.paragraphSeparator
    ;
}

export function isDigit(ch: number): boolean {
    return ch >= CharacterCodes._0 && ch <= CharacterCodes._9;
}

export function isOctalDigit(ch: number): boolean {
    return ch >= CharacterCodes._0 && ch <= CharacterCodes._7;
}

export class Scanner {
    private line: number;
    private char: number;

    // Current position (end position of text of current token)
    private pos: number;

    // end of text
    private end: number;

    // Start position of whitespace before current token
    private startPos: number;

    // Start position of text of current token
    private tokenPos: number;

    private text: string;

    private token: SyntaxKind;
    private tokenValue: string;
    // private precedingLineBreak: boolean;
    // private hasExtendedUnicodeEscape: boolean;
    // private tokenIsUnterminated: boolean;
    // private numericLiteralFlags: NumericLiteralFlags;

    private onError?: ErrorCallback;
    private lineMap: number[];

    constructor(onError?: ErrorCallback) {
        this.onError = onError;
    }

    private error(msg: string): void {
        if (this.onError) {
            this.onError(<DiagnosticMessage>{
                category: DiagnosticCategory.Error,
                code: 0,
                message: msg,
            }, 0);
        }
    }

    private speculationHelper<T>(callback: () => T, isLookahead: boolean): T {
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

    public lookAhead<T>(callback: () => T): T {
        return this.speculationHelper(callback, true);
    }

    public tryScan<T>(callback: () => T): T {
        return this.speculationHelper(callback, false);
    }

    private scanHexDigits(minCount: number, scanAsManyAsPossible: boolean): number {
        let digits = 0;
        let value = 0;
        while (digits < minCount || scanAsManyAsPossible) {
            const ch = this.text.charCodeAt(this.pos);
            if (ch >= CharacterCodes._0 && ch <= CharacterCodes._9) {
                value = value * 16 + ch - CharacterCodes._0;
            }
            else if (ch >= CharacterCodes.A && ch <= CharacterCodes.F) {
                value = value * 16 + ch - CharacterCodes.A + 10;
            }
            else if (ch >= CharacterCodes.a && ch <= CharacterCodes.f) {
                value = value * 16 + ch - CharacterCodes.a + 10;
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

    private scanEscapeSequence(): string {
        this.pos++;
        if (this.pos >= this.end) {
            this.error("Diagnostics.Unexpected_end_of_text");
            return "";
        }
        const ch = this.text.charCodeAt(this.pos);
        this.pos++;
        switch (ch) {
            case CharacterCodes._0:
                return "\0";
            case CharacterCodes.b:
                return "\b";
            case CharacterCodes.t:
                return "\t";
            case CharacterCodes.n:
                return "\n";
            case CharacterCodes.v:
                return "\v";
            case CharacterCodes.f:
                return "\f";
            case CharacterCodes.r:
                return "\r";
            case CharacterCodes.singleQuote:
                return "\'";
            case CharacterCodes.doubleQuote:
                return "\"";

            case CharacterCodes.x:
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
            case CharacterCodes.carriageReturn:
                if (this.pos < this.end && this.text.charCodeAt(this.pos) === CharacterCodes.lineFeed) {
                    this.pos++;
                }
            // falls through
            case CharacterCodes.lineFeed:
            case CharacterCodes.lineSeparator:
            case CharacterCodes.paragraphSeparator:
                return "";
            default:
                return String.fromCharCode(ch);
        }
    }

    private scanString(allowEscapes = true): string {
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
            if (ch === quote) {
                result += this.text.substring(start, this.pos);
                this.pos++;
                break;
            }
            if (ch === CharacterCodes.backslash && allowEscapes) {
                result += this.text.substring(start, this.pos);
                result += this.scanEscapeSequence()
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

    private scanNumber(): string {
        const start = this.pos;
        while (isDigit(this.text.charCodeAt(this.pos))) this.pos++;
        if (this.text.charCodeAt(this.pos) === CharacterCodes.dot) {
            this.pos++;
            while (isDigit(this.text.charCodeAt(this.pos))) this.pos++;
        }
        let end = this.pos;
        if (this.text.charCodeAt(this.pos) === CharacterCodes.E || this.text.charCodeAt(this.pos) === CharacterCodes.e) {
            this.pos++;
            // numericLiteralFlags = NumericLiteralFlags.Scientific;
            if (this.text.charCodeAt(this.pos) === CharacterCodes.plus || this.text.charCodeAt(this.pos) === CharacterCodes.minus) this.pos++;
            if (isDigit(this.text.charCodeAt(this.pos))) {
                this.pos++;
                while (isDigit(this.text.charCodeAt(this.pos))) this.pos++;
                end = this.pos;
            }
            else {
                this.error("Diagnostics.Digit_expected");
            }
        }
        return "" + +(this.text.substring(start, end));
    }

    private scanBinaryOrOctalDigits(base: number): number {
        console.assert(base === 2 || base === 8, "Expected either base 2 or base 8");

        let value = 0;
        // For counting number of digits; Valid binaryIntegerLiteral must have at least one binary digit following B or b.
        // Similarly valid octalIntegerLiteral must have at least one octal digit following o or O.
        let numberOfDigits = 0;
        while (true) {
            const ch = this.text.charCodeAt(this.pos);
            const valueOfCh = ch - CharacterCodes._0;
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

    private scanOctalDigits(): number {
        const start = this.pos;
        while (isOctalDigit(this.text.charCodeAt(this.pos))) {
            this.pos++;
        }
        return +(this.text.substring(start, this.pos));
    }

    private getIdentifierToken(): SyntaxKind {
        // Reserved words are between 2 and 11 characters long and start with a lowercase letter
        let token: SyntaxKind | undefined;
        const len = this.tokenValue.length;
        const ch = this.tokenValue.charCodeAt(0);
        if (ch >= CharacterCodes.a && ch <= CharacterCodes.z) {
            token = stringToToken(this.tokenValue);
            if (token !== undefined) {
                return token;
            }
        }
        return SyntaxKind.Identifier;
    }

    public setText(text: string): void {
        this.text = text;
        this.pos = 0;
        this.end = this.text.length;
        this.line = 0;
        this.char = 0;
        this.lineMap = [0];
    }

    scan(): SyntaxKind {
        this.startPos = this.pos;

        while (true) {
            this.tokenPos = this.pos;
            if (this.pos >= this.end) {
                return SyntaxKind.EndOfFileToken;
            }
            let ch = this.text.charCodeAt(this.pos);

            switch (ch) {
                case CharacterCodes.tab:
                case CharacterCodes.verticalTab:
                case CharacterCodes.formFeed:
                case CharacterCodes.space:
                    ++this.pos;
                    break;

                case CharacterCodes.semicolon:
                    ++this.pos;
                    return this.token = SyntaxKind.SemicolonToken;

                case CharacterCodes.openParen:
                    this.pos++;
                    return this.token = SyntaxKind.OpenParenToken;
                case CharacterCodes.closeParen:
                    this.pos++;
                    return this.token = SyntaxKind.CloseParenToken;

                case CharacterCodes.doubleQuote:
                case CharacterCodes.singleQuote:
                    this.tokenValue = this.scanString();

                    return this.token = SyntaxKind.StringLiteral;

                case CharacterCodes.exclamation:
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.equals) {
                        return this.pos += 2, this.token = SyntaxKind.ExclamationEqualsToken;
                    }
                    this.pos++;
                    return this.token = SyntaxKind.ExclamationToken;

                case CharacterCodes.percent:
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.equals) {
                        return this.pos += 2, this.token = SyntaxKind.PercentEqualsToken;
                    }
                    this.pos++;
                    return this.token = SyntaxKind.PercentToken;
                case CharacterCodes.ampersand:
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.ampersand) {
                        return this.pos += 2, this.token = SyntaxKind.AmpersandAmpersandToken;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.equals) {
                        return this.pos += 2, this.token = SyntaxKind.AmpersandEqualsToken;
                    }
                    this.pos++;
                    return this.token = SyntaxKind.AmpersandToken;
                case CharacterCodes.openParen:
                    this.pos++;
                    return this.token = SyntaxKind.OpenParenToken;
                case CharacterCodes.closeParen:
                    this.pos++;
                    return this.token = SyntaxKind.CloseParenToken;
                case CharacterCodes.asterisk:
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.equals) {
                        return this.pos += 2, this.token = SyntaxKind.AsteriskEqualsToken;
                    }
                    this.pos++;
                    return this.token = SyntaxKind.AsteriskToken;
                case CharacterCodes.plus:
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.plus) {
                        return this.pos += 2, this.token = SyntaxKind.PlusPlusToken;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.equals) {
                        return this.pos += 2, this.token = SyntaxKind.PlusEqualsToken;
                    }
                    this.pos++;
                    return this.token = SyntaxKind.PlusToken;
                case CharacterCodes.comma:
                    this.pos++;
                    return this.token = SyntaxKind.CommaToken;
                case CharacterCodes.minus:
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.minus) {
                        return this.pos += 2, this.token = SyntaxKind.MinusMinusToken;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.equals) {
                        return this.pos += 2, this.token = SyntaxKind.MinusEqualsToken;
                    }
                    this.pos++;
                    return this.token = SyntaxKind.MinusToken;
                case CharacterCodes.dot:
                    if (isDigit(this.text.charCodeAt(this.pos + 1))) {
                        this.tokenValue = this.scanNumber();
                        return this.token = SyntaxKind.NumericLiteral;
                    }
                    this.pos++;
                    return this.token = SyntaxKind.DotToken;

                case CharacterCodes.slash:
                    // Single-line comment
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.slash) {
                        this.pos += 2;

                        while (this.pos < this.end) {
                            if (isLineBreak(this.text.charCodeAt(this.pos))) {
                                break;
                            }
                            this.pos++;
                        }

                        continue;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.equals) {
                        return this.pos += 2, this.token = SyntaxKind.SlashEqualsToken;
                    }
                    this.pos++;
                    return this.token = SyntaxKind.SlashToken;

                case CharacterCodes._0:
                    if (this.pos + 2 < this.end && (this.text.charCodeAt(this.pos + 1) === CharacterCodes.X || this.text.charCodeAt(this.pos + 1) === CharacterCodes.x)) {
                        this.pos += 2;
                        let value = this.scanHexDigits(1, true);
                        if (value < 0) {
                            this.error("Diagnostics.Hexadecimal_digit_expected");
                            value = 0;
                        }
                        this.tokenValue = "" + value;
                        // numericLiteralFlags = NumericLiteralFlags.HexSpecifier;
                        return this.token = SyntaxKind.NumericLiteral;
                    }
                    else if (this.pos + 2 < this.end && (this.text.charCodeAt(this.pos + 1) === CharacterCodes.B || this.text.charCodeAt(this.pos + 1) === CharacterCodes.b)) {
                        this.pos += 2;
                        let value = this.scanBinaryOrOctalDigits(/* base */ 2);
                        if (value < 0) {
                            this.error("Diagnostics.Binary_digit_expected");
                            value = 0;
                        }
                        this.tokenValue = "" + value;
                        // numericLiteralFlags = NumericLiteralFlags.BinarySpecifier;
                        return this.token = SyntaxKind.NumericLiteral;
                    }
                    else if (this.pos + 2 < this.end && (this.text.charCodeAt(this.pos + 1) === CharacterCodes.O || this.text.charCodeAt(this.pos + 1) === CharacterCodes.o)) {
                        this.pos += 2;
                        let value = this.scanBinaryOrOctalDigits(/* base */ 8);
                        if (value < 0) {
                            this.error("Diagnostics.Octal_digit_expected");
                            value = 0;
                        }
                        this.tokenValue = "" + value;
                        // numericLiteralFlags = NumericLiteralFlags.OctalSpecifier;
                        return this.token = SyntaxKind.NumericLiteral;
                    }
                    // Try to parse as an octal
                    if (this.pos + 1 < this.end && isOctalDigit(this.text.charCodeAt(this.pos + 1))) {
                        this.tokenValue = "" + this.scanOctalDigits();
                        // numericLiteralFlags = NumericLiteralFlags.Octal;
                        return this.token = SyntaxKind.NumericLiteral;
                    }
                    // This fall-through is a deviation from the EcmaScript grammar. The grammar says that a leading zero
                    // can only be followed by an octal digit, a dot, or the end of the number literal. However, we are being
                    // permissive and allowing decimal digits of the form 08* and 09* (which many browsers also do).
                    // falls through
                case CharacterCodes._1:
                case CharacterCodes._2:
                case CharacterCodes._3:
                case CharacterCodes._4:
                case CharacterCodes._5:
                case CharacterCodes._6:
                case CharacterCodes._7:
                case CharacterCodes._8:
                case CharacterCodes._9:
                    this.tokenValue = this.scanNumber();
                    return this.token = SyntaxKind.NumericLiteral;

                case CharacterCodes.lessThan:
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.lessThan) {
                        if (this.text.charCodeAt(this.pos + 2) === CharacterCodes.equals) {
                            return this.pos += 3, this.token = SyntaxKind.LessThanLessThanEqualsToken;
                        }
                        return this.pos += 2, this.token = SyntaxKind.LessThanLessThanToken;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.equals) {
                        return this.pos += 2, this.token = SyntaxKind.LessThanEqualsToken;
                    }
                    this.pos++;
                    return this.token = SyntaxKind.LessThanToken;
                case CharacterCodes.equals:
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.equals) {
                        return this.pos += 2, this.token = SyntaxKind.EqualsEqualsToken;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.greaterThan) {
                        return this.pos += 2, this.token = SyntaxKind.EqualsGreaterThanToken;
                    }
                    this.pos++;
                    return this.token = SyntaxKind.EqualsToken;
                case CharacterCodes.greaterThan:
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.greaterThan) {
                        if (this.text.charCodeAt(this.pos + 2) === CharacterCodes.equals) {
                            return this.pos += 3, this.token = SyntaxKind.GreaterThanGreaterThanEqualsToken;
                        }
                        return this.pos += 2, this.token = SyntaxKind.GreaterThanGreaterThanToken;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.equals) {
                        return this.pos += 2, this.token = SyntaxKind.GreaterThanEqualsToken;
                    }
                    this.pos++;
                    return this.token = SyntaxKind.GreaterThanToken;

                case CharacterCodes.openBracket:
                    this.pos++;
                    return this.token = SyntaxKind.OpenBracketToken;
                case CharacterCodes.closeBracket:
                    this.pos++;
                    return this.token = SyntaxKind.CloseBracketToken;
                case CharacterCodes.caret:
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.equals) {
                        return this.pos += 2, this.token = SyntaxKind.CaretEqualsToken;
                    }
                    this.pos++;
                    return this.token = SyntaxKind.CaretToken;
                case CharacterCodes.openBrace:
                    this.pos++;
                    return this.token = SyntaxKind.OpenBraceToken;
                case CharacterCodes.bar:
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.bar) {
                        return this.pos += 2, this.token = SyntaxKind.BarBarToken;
                    }
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.equals) {
                        return this.pos += 2, this.token = SyntaxKind.BarEqualsToken;
                    }
                    this.pos++;
                    return this.token = SyntaxKind.BarToken;
                case CharacterCodes.closeBrace:
                    this.pos++;
                    return this.token = SyntaxKind.CloseBraceToken;
                case CharacterCodes.tilde:
                    this.pos++;
                    return this.token = SyntaxKind.TildeToken;

                default:
                    if (isIdentifierStart(ch)) {
                        this.pos++;
                        while (this.pos < this.end && isIdentifierPart(ch = this.text.charCodeAt(this.pos))) this.pos++;
                        this.tokenValue = this.text.substring(this.tokenPos, this.pos);
                        return this.token = this.getIdentifierToken();
                    }
                    else if (isLineBreak(ch)) {
                        if (ch === CharacterCodes.lineFeed) {
                            this.char = this.pos;
                            this.line++;
                        }
                        this.pos++;
                        if (ch === CharacterCodes.lineFeed) {
                            this.lineMap.push(this.pos);
                        }
                        continue;
                    }
                    this.error(`encountered invalid character ${this.text.charAt(this.pos)}`);
                    this.pos++;
                    return this.token = SyntaxKind.Unknown;
            }
        }
    }

    public getLine(): number {
        return this.line;
    }

    public getChar(): number {
        return this.pos - this.char;
    }

    public getStartPos(): number {
        return this.startPos;
    }

    public getTokenPos(): number {
        return this.tokenPos;
    }

    public getTextPos(): number {
        return this.end;
    }

    public getTokenValue(): string {
        return this.tokenValue;
    }

    public getLineMap(): number[] {
       return this.lineMap;
    }
}
