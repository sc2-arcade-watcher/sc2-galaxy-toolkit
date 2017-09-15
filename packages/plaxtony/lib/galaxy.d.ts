declare module "types" {
    export const enum CharacterCodes {
        nullCharacter = 0,
        maxAsciiCharacter = 127,
        lineFeed = 10,
        carriageReturn = 13,
        lineSeparator = 8232,
        paragraphSeparator = 8233,
        nextLine = 133,
        space = 32,
        nonBreakingSpace = 160,
        enQuad = 8192,
        emQuad = 8193,
        enSpace = 8194,
        emSpace = 8195,
        threePerEmSpace = 8196,
        fourPerEmSpace = 8197,
        sixPerEmSpace = 8198,
        figureSpace = 8199,
        punctuationSpace = 8200,
        thinSpace = 8201,
        hairSpace = 8202,
        zeroWidthSpace = 8203,
        narrowNoBreakSpace = 8239,
        ideographicSpace = 12288,
        mathematicalSpace = 8287,
        ogham = 5760,
        _ = 95,
        $ = 36,
        _0 = 48,
        _1 = 49,
        _2 = 50,
        _3 = 51,
        _4 = 52,
        _5 = 53,
        _6 = 54,
        _7 = 55,
        _8 = 56,
        _9 = 57,
        a = 97,
        b = 98,
        c = 99,
        d = 100,
        e = 101,
        f = 102,
        g = 103,
        h = 104,
        i = 105,
        j = 106,
        k = 107,
        l = 108,
        m = 109,
        n = 110,
        o = 111,
        p = 112,
        q = 113,
        r = 114,
        s = 115,
        t = 116,
        u = 117,
        v = 118,
        w = 119,
        x = 120,
        y = 121,
        z = 122,
        A = 65,
        B = 66,
        C = 67,
        D = 68,
        E = 69,
        F = 70,
        G = 71,
        H = 72,
        I = 73,
        J = 74,
        K = 75,
        L = 76,
        M = 77,
        N = 78,
        O = 79,
        P = 80,
        Q = 81,
        R = 82,
        S = 83,
        T = 84,
        U = 85,
        V = 86,
        W = 87,
        X = 88,
        Y = 89,
        Z = 90,
        ampersand = 38,
        asterisk = 42,
        at = 64,
        backslash = 92,
        backtick = 96,
        bar = 124,
        caret = 94,
        closeBrace = 125,
        closeBracket = 93,
        closeParen = 41,
        colon = 58,
        comma = 44,
        dot = 46,
        doubleQuote = 34,
        equals = 61,
        exclamation = 33,
        greaterThan = 62,
        hash = 35,
        lessThan = 60,
        minus = 45,
        openBrace = 123,
        openBracket = 91,
        openParen = 40,
        percent = 37,
        plus = 43,
        question = 63,
        semicolon = 59,
        singleQuote = 39,
        slash = 47,
        tilde = 126,
        backspace = 8,
        formFeed = 12,
        byteOrderMark = 65279,
        tab = 9,
        verticalTab = 11,
    }
    export const enum SyntaxKind {
        Unknown = 0,
        NumericLiteral = 1,
        StringLiteral = 2,
        OpenBraceToken = 3,
        CloseBraceToken = 4,
        OpenParenToken = 5,
        CloseParenToken = 6,
        OpenBracketToken = 7,
        CloseBracketToken = 8,
        DotToken = 9,
        SemicolonToken = 10,
        CommaToken = 11,
        LessThanToken = 12,
        GreaterThanToken = 13,
        LessThanEqualsToken = 14,
        GreaterThanEqualsToken = 15,
        EqualsEqualsToken = 16,
        ExclamationEqualsToken = 17,
        EqualsGreaterThanToken = 18,
        PlusToken = 19,
        MinusToken = 20,
        AsteriskToken = 21,
        SlashToken = 22,
        PercentToken = 23,
        PlusPlusToken = 24,
        MinusMinusToken = 25,
        LessThanLessThanToken = 26,
        GreaterThanGreaterThanToken = 27,
        AmpersandToken = 28,
        BarToken = 29,
        CaretToken = 30,
        ExclamationToken = 31,
        TildeToken = 32,
        AmpersandAmpersandToken = 33,
        BarBarToken = 34,
        QuestionToken = 35,
        ColonToken = 36,
        AtToken = 37,
        EqualsToken = 38,
        PlusEqualsToken = 39,
        MinusEqualsToken = 40,
        AsteriskEqualsToken = 41,
        SlashEqualsToken = 42,
        PercentEqualsToken = 43,
        LessThanLessThanEqualsToken = 44,
        GreaterThanGreaterThanEqualsToken = 45,
        AmpersandEqualsToken = 46,
        BarEqualsToken = 47,
        CaretEqualsToken = 48,
        IncludeKeyword = 49,
        StructKeyword = 50,
        StaticKeyword = 51,
        ConstKeyword = 52,
        NativeKeyword = 53,
        BreakKeyword = 54,
        ContinueKeyword = 55,
        ReturnKeyword = 56,
        DoKeyword = 57,
        ForKeyword = 58,
        WhileKeyword = 59,
        IfKeyword = 60,
        ElseKeyword = 61,
        TrueKeyword = 62,
        FalseKeyword = 63,
        NullKeyword = 64,
        TypedefKeyword = 65,
        AbilcmdKeyword = 66,
        ActorKeyword = 67,
        ActorscopeKeyword = 68,
        AifilterKeyword = 69,
        AnimfilterKeyword = 70,
        BankKeyword = 71,
        BoolKeyword = 72,
        ByteKeyword = 73,
        CamerainfoKeyword = 74,
        CharKeyword = 75,
        ColorKeyword = 76,
        DoodadKeyword = 77,
        FixedKeyword = 78,
        HandleKeyword = 79,
        GenerichandleKeyword = 80,
        EffecthistoryKeyword = 81,
        IntKeyword = 82,
        MarkerKeyword = 83,
        OrderKeyword = 84,
        PlayergroupKeyword = 85,
        PointKeyword = 86,
        RegionKeyword = 87,
        RevealerKeyword = 88,
        SoundKeyword = 89,
        SoundlinkKeyword = 90,
        StringKeyword = 91,
        TextKeyword = 92,
        TimerKeyword = 93,
        TransmissionsourceKeyword = 94,
        TriggerKeyword = 95,
        UnitKeyword = 96,
        UnitfilterKeyword = 97,
        UnitgroupKeyword = 98,
        UnitrefKeyword = 99,
        VoidKeyword = 100,
        WaveKeyword = 101,
        WaveinfoKeyword = 102,
        WavetargetKeyword = 103,
        ArrayrefKeyword = 104,
        StructrefKeyword = 105,
        FuncrefKeyword = 106,
        EndOfFileToken = 107,
        Identifier = 108,
        TypeReference = 109,
        KeywordType = 110,
        SourceFile = 111,
        Block = 112,
        IncludeStatement = 113,
        StructDeclaration = 114,
        VariableDeclaration = 115,
        FunctionDeclaration = 116,
        ParameterDeclaration = 117,
        PropertyDeclaration = 118,
    }
    export type Modifier = Token<SyntaxKind.ConstKeyword> | Token<SyntaxKind.NativeKeyword> | Token<SyntaxKind.StaticKeyword>;
    export type KeywordType = SyntaxKind.AbilcmdKeyword | SyntaxKind.ActorKeyword | SyntaxKind.ActorscopeKeyword | SyntaxKind.AifilterKeyword | SyntaxKind.AnimfilterKeyword | SyntaxKind.BankKeyword | SyntaxKind.BoolKeyword | SyntaxKind.ByteKeyword | SyntaxKind.CamerainfoKeyword | SyntaxKind.CharKeyword | SyntaxKind.ColorKeyword | SyntaxKind.DoodadKeyword | SyntaxKind.FixedKeyword | SyntaxKind.HandleKeyword | SyntaxKind.GenerichandleKeyword | SyntaxKind.EffecthistoryKeyword | SyntaxKind.IntKeyword | SyntaxKind.MarkerKeyword | SyntaxKind.OrderKeyword | SyntaxKind.PlayergroupKeyword | SyntaxKind.PointKeyword | SyntaxKind.RegionKeyword | SyntaxKind.RevealerKeyword | SyntaxKind.SoundKeyword | SyntaxKind.SoundlinkKeyword | SyntaxKind.StringKeyword | SyntaxKind.TextKeyword | SyntaxKind.TimerKeyword | SyntaxKind.TransmissionsourceKeyword | SyntaxKind.TriggerKeyword | SyntaxKind.UnitKeyword | SyntaxKind.UnitfilterKeyword | SyntaxKind.UnitgroupKeyword | SyntaxKind.UnitrefKeyword | SyntaxKind.VoidKeyword | SyntaxKind.WaveKeyword | SyntaxKind.WaveinfoKeyword | SyntaxKind.WavetargetKeyword | SyntaxKind.ArrayrefKeyword | SyntaxKind.StructrefKeyword | SyntaxKind.FuncrefKeyword;
    export interface TextRange {
        pos: number;
        end: number;
    }
    export interface Token<TKind extends SyntaxKind> extends Node {
        kind: TKind;
    }
    export interface Node extends TextRange {
        kind: SyntaxKind;
    }
    export interface NodeArray<T extends Node> extends ReadonlyArray<T>, TextRange {
    }
    export type MutableNodeArray<T extends Node> = NodeArray<T> & T[];
    export interface Expression extends Node {
    }
    export interface Literal extends Node {
        value: string;
    }
    export interface StringLiteral extends Node {
        kind: SyntaxKind.StringLiteral;
    }
    export interface Identifier extends Node {
        kind: SyntaxKind.Identifier;
        name: string;
    }
    export interface Statement extends Node {
    }
    export interface Block extends Statement {
        kind: SyntaxKind.Block;
        statements: Statement[];
    }
    export interface IncludeStatement extends Statement {
        kind: SyntaxKind.IncludeKeyword;
        path: StringLiteral;
    }
    export interface TypeNode extends Node {
        typeArguments?: TypeNode[];
    }
    export interface KeywordTypeNode extends TypeNode {
        kind: SyntaxKind.KeywordType;
        typeKeyword: KeywordType;
    }
    export interface TypeReferenceNode extends TypeNode {
        kind: SyntaxKind.TypeReference;
        name: Identifier;
    }
    export interface Declaration extends Node {
        name: Identifier;
        modifiers: Modifier[];
    }
    export interface ParameterDeclaration extends Declaration {
        kind: SyntaxKind.ParameterDeclaration;
        type: TypeNode;
    }
    export interface SignatureDeclaration extends Declaration {
        type: TypeNode;
        parameters: ParameterDeclaration[];
    }
    export interface VariableDeclaration extends Declaration {
        kind: SyntaxKind.VariableDeclaration;
        type: TypeNode;
        initializer?: Expression;
    }
    export interface StructDeclaration extends Declaration {
        kind: SyntaxKind.StructDeclaration;
        members: NodeArray<Declaration>;
    }
    export interface PropertyDeclaration extends Declaration {
        kind: SyntaxKind.PropertyDeclaration;
        name: Identifier;
        type: TypeNode;
    }
    export interface FunctionDeclaration extends SignatureDeclaration, Declaration {
        kind: SyntaxKind.FunctionDeclaration;
        body?: Block;
    }
    export interface SourceFile extends Node {
        kind: SyntaxKind.SourceFile;
        fileName: string;
        statements: NodeArray<Statement>;
    }
    export enum DiagnosticCategory {
        Warning = 0,
        Error = 1,
        Message = 2,
    }
    export interface DiagnosticMessage {
        category: DiagnosticCategory;
        code: number;
        message: string;
    }
    export interface Diagnostic {
        file: SourceFile | undefined;
        start: number | undefined;
        length: number | undefined;
        messageText: string;
        category: DiagnosticCategory;
        code: number;
        source?: string;
    }
}
declare module "scanner" {
    import { SyntaxKind } from "types";
    export function stringToToken(s: string): SyntaxKind | undefined;
    export function tokenToString(t: SyntaxKind): string | undefined;
    export function isIdentifierStart(ch: number): boolean;
    export function isIdentifierPart(ch: number): boolean;
    export function isLineBreak(ch: number): boolean;
    export function isDigit(ch: number): boolean;
    export function isOctalDigit(ch: number): boolean;
    export class Scanner {
        private pos;
        private end;
        private startPos;
        private tokenPos;
        private text;
        private token;
        private tokenValue;
        private error(msg);
        private speculationHelper<T>(callback, isLookahead);
        lookAhead<T>(callback: () => T): T;
        tryScan<T>(callback: () => T): T;
        private scanHexDigits(minCount, scanAsManyAsPossible);
        private scanEscapeSequence();
        private scanString(allowEscapes?);
        private scanNumber();
        private scanBinaryOrOctalDigits(base);
        private scanOctalDigits();
        private getIdentifierToken();
        setText(text: string): void;
        scan(): SyntaxKind;
        getStartPos(): number;
        getTokenPos(): number;
        getTextPos(): number;
        getTokenValue(): string;
    }
}
declare module "utils" {
    import { SyntaxKind } from "types";
    import * as Types from "types";
    export function formatStringFromArgs(text: string, args: {
        [index: number]: string;
    }, baseIndex?: number): string;
    export function createFileDiagnostic(file: Types.SourceFile, start: number, length: number, message: Types.DiagnosticMessage, ...args: (string | number)[]): Types.Diagnostic;
    export function isModifierKind(token: SyntaxKind): boolean;
    export function isKeywordTypeKind(token: SyntaxKind): boolean;
    export function getKindName(k: number | string): string;
    export function sourceFileToJSON(file: Types.Node): string;
}
declare module "parser" {
    import * as Types from "types";
    export class Parser {
        private scanner;
        private currentToken;
        private parsingContext;
        private parseDiagnostics;
        private sourceFile;
        private token();
        private nextToken();
        private parseErrorAtCurrentToken(message, arg0?);
        private parseErrorAtPosition(start, length, message, arg0?);
        private speculationHelper<T>(callback, isLookAhead);
        private lookAhead<T>(callback);
        private parseExpected(kind, diagnosticMessage?, shouldAdvance?);
        private isVariableDeclaration();
        private isFunctionDeclaration();
        private isStartOfExpression();
        private isStartOfStatement();
        private isStartOfVariableDeclaration();
        private isStartOfFunctionDeclaration();
        private isStartOfRootStatement();
        private isListTerminator(kind);
        private isListElement(parsingContext, inErrorRecovery);
        private parseList<T>(kind, parseElement);
        private createNode(kind, pos?);
        private createNodeArray<T>(elements?, pos?);
        private finishNode<T>(node, end?);
        private parseLiteral(kind);
        private parseInclude();
        private parseIdentifier();
        private parseType();
        private parsePropertyDeclaration();
        private parseStructDeclaration();
        private parseModifiers();
        private parseFunctionDeclaration();
        private parseStatement();
        constructor();
        setText(text: string): void;
        parseFile(fileName: string, text: string): Types.SourceFile;
    }
}
