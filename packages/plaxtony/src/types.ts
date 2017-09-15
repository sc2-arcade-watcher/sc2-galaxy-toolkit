/* @internal */
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

export const enum SyntaxKind {
    Unknown,

    // Literals
    NumericLiteral,
    StringLiteral,

    // Punctuation
    OpenBraceToken,
    CloseBraceToken,
    OpenParenToken,
    CloseParenToken,
    OpenBracketToken,
    CloseBracketToken,
    DotToken,
    SemicolonToken,
    CommaToken,
    LessThanToken,
    GreaterThanToken,
    LessThanEqualsToken,
    GreaterThanEqualsToken,
    EqualsEqualsToken,
    ExclamationEqualsToken,
    EqualsGreaterThanToken,
    PlusToken,
    MinusToken,
    AsteriskToken,
    SlashToken,
    PercentToken,
    PlusPlusToken,
    MinusMinusToken,
    LessThanLessThanToken,
    GreaterThanGreaterThanToken,
    AmpersandToken,
    BarToken,
    CaretToken,
    ExclamationToken,
    TildeToken,
    AmpersandAmpersandToken,
    BarBarToken,
    QuestionToken,
    ColonToken,
    AtToken,

    // Assignments
    EqualsToken,
    PlusEqualsToken,
    MinusEqualsToken,
    AsteriskEqualsToken,
    SlashEqualsToken,
    PercentEqualsToken,
    LessThanLessThanEqualsToken,
    GreaterThanGreaterThanEqualsToken,
    AmpersandEqualsToken,
    BarEqualsToken,
    CaretEqualsToken,

    // Reserved words
    IncludeKeyword,
    StructKeyword,
    StaticKeyword,
    ConstKeyword,
    NativeKeyword,
    BreakKeyword,
    ContinueKeyword,
    ReturnKeyword,
    DoKeyword,
    ForKeyword,
    WhileKeyword,
    IfKeyword,
    ElseKeyword,
    TrueKeyword,
    FalseKeyword,
    NullKeyword,
    TypedefKeyword,

    // Native types
    AbilcmdKeyword,
    ActorKeyword,
    ActorscopeKeyword,
    AifilterKeyword,
    AnimfilterKeyword,
    BankKeyword,
    BoolKeyword,
    ByteKeyword,
    CamerainfoKeyword,
    CharKeyword,
    ColorKeyword,
    DoodadKeyword,
    FixedKeyword,
    HandleKeyword,
    GenerichandleKeyword,
    EffecthistoryKeyword,
    IntKeyword,
    MarkerKeyword,
    OrderKeyword,
    PlayergroupKeyword,
    PointKeyword,
    RegionKeyword,
    RevealerKeyword,
    SoundKeyword,
    SoundlinkKeyword,
    StringKeyword,
    TextKeyword,
    TimerKeyword,
    TransmissionsourceKeyword,
    TriggerKeyword,
    UnitKeyword,
    UnitfilterKeyword,
    UnitgroupKeyword,
    UnitrefKeyword,
    VoidKeyword,
    WaveKeyword,
    WaveinfoKeyword,
    WavetargetKeyword,
    ArrayrefKeyword,
    StructrefKeyword,
    FuncrefKeyword,

    EndOfFileToken,

    // Elements
    Identifier,
    TypeReference,
    KeywordTypeNode,

    ArrayLiteralExpression,
    PropertyAccessExpression,
    CallExpression,
    PrefixUnaryExpression,
    PostfixUnaryExpression,
    BinaryExpression,
    TypeAssertionExpression,
    ParenthesizedExpression,

    SourceFile,
    Block,

    IncludeStatement,
    ReturnStatement,
    ExpressionStatement,
    EmptyStatement,

    StructDeclaration,
    VariableDeclaration,
    FunctionDeclaration,
    ParameterDeclaration,
    PropertyDeclaration,

    //
    // FirstKeyword = StructKeyword,
    // LastKeyword = FuncrefKeyword,
}

export type Modifier
    = Token<SyntaxKind.ConstKeyword>
    | Token<SyntaxKind.NativeKeyword>
    | Token<SyntaxKind.StaticKeyword>
;

export type KeywordType
    = SyntaxKind.AbilcmdKeyword
    | SyntaxKind.ActorKeyword
    | SyntaxKind.ActorscopeKeyword
    | SyntaxKind.AifilterKeyword
    | SyntaxKind.AnimfilterKeyword
    | SyntaxKind.BankKeyword
    | SyntaxKind.BoolKeyword
    | SyntaxKind.ByteKeyword
    | SyntaxKind.CamerainfoKeyword
    | SyntaxKind.CharKeyword
    | SyntaxKind.ColorKeyword
    | SyntaxKind.DoodadKeyword
    | SyntaxKind.FixedKeyword
    | SyntaxKind.HandleKeyword
    | SyntaxKind.GenerichandleKeyword
    | SyntaxKind.EffecthistoryKeyword
    | SyntaxKind.IntKeyword
    | SyntaxKind.MarkerKeyword
    | SyntaxKind.OrderKeyword
    | SyntaxKind.PlayergroupKeyword
    | SyntaxKind.PointKeyword
    | SyntaxKind.RegionKeyword
    | SyntaxKind.RevealerKeyword
    | SyntaxKind.SoundKeyword
    | SyntaxKind.SoundlinkKeyword
    | SyntaxKind.StringKeyword
    | SyntaxKind.TextKeyword
    | SyntaxKind.TimerKeyword
    | SyntaxKind.TransmissionsourceKeyword
    | SyntaxKind.TriggerKeyword
    | SyntaxKind.UnitKeyword
    | SyntaxKind.UnitfilterKeyword
    | SyntaxKind.UnitgroupKeyword
    | SyntaxKind.UnitrefKeyword
    | SyntaxKind.VoidKeyword
    | SyntaxKind.WaveKeyword
    | SyntaxKind.WaveinfoKeyword
    | SyntaxKind.WavetargetKeyword
    | SyntaxKind.ArrayrefKeyword
    | SyntaxKind.StructrefKeyword
    | SyntaxKind.FuncrefKeyword
;

export interface TextRange {
    pos: number;
    end: number;
}

export interface Token<TKind extends SyntaxKind> extends Node {
    kind: TKind;
}

export interface Node extends TextRange {
    // token: Token;
    kind: SyntaxKind;
}

export interface NodeArray<T extends Node> extends ReadonlyArray<T>, TextRange {
}

export type MutableNodeArray<T extends Node> = NodeArray<T> & T[];

export interface Statement extends Node {
    // kind: SyntaxKind.Identifier;
}

export interface ExpressionStatement extends Statement {
    kind: SyntaxKind.ExpressionStatement;
    expression: Expression;
}

export interface EmptyStatement extends Statement {
    kind: SyntaxKind.EmptyStatement;
}

export interface Block extends Statement {
    kind: SyntaxKind.Block;
    statements: NodeArray<Statement>;
}

export interface IncludeStatement extends Statement {
    kind: SyntaxKind.IncludeKeyword;
    path: StringLiteral;
}

export interface TypeNode extends Node {
}

export interface TypeDefinition extends Node {
    typeArguments?: NodeArray<TypeNode>;
}

export interface KeywordTypeNode extends TypeDefinition {
    kind: SyntaxKind.KeywordTypeNode;
    keyword: Token<KeywordType>;
}

export interface TypeReferenceNode extends TypeDefinition {
    kind: SyntaxKind.TypeReference;
    name: Identifier;
}

export interface Declaration extends Node {
    name?: Identifier;
    modifiers?: Modifier[];
}

export interface NamedDeclaration extends Declaration {
    name: Identifier;
}

export interface ParameterDeclaration extends NamedDeclaration {
    kind: SyntaxKind.ParameterDeclaration;
    type: TypeNode;
}

export interface SignatureDeclaration extends Declaration {
    type: TypeNode;
    parameters: NodeArray<ParameterDeclaration>;
}

export interface VariableDeclaration extends NamedDeclaration {
    kind: SyntaxKind.VariableDeclaration;
    type: TypeNode;
    initializer?: Expression;
}

export interface StructDeclaration extends NamedDeclaration {
    kind: SyntaxKind.StructDeclaration;
    members: NodeArray<Declaration>;
}

export interface PropertyDeclaration extends NamedDeclaration {
    kind: SyntaxKind.PropertyDeclaration;
    name: Identifier;
    type: TypeNode;
}

export interface FunctionDeclaration extends SignatureDeclaration, NamedDeclaration {
    name: Identifier;
    kind: SyntaxKind.FunctionDeclaration;
    body?: Block;
}

export interface ReturnStatement extends Statement {
    kind: SyntaxKind.ReturnStatement;
    expression?: Expression;
}

export interface SourceFile extends Node {
    kind: SyntaxKind.SourceFile;
    fileName: string;
    statements: NodeArray<Statement>;
}

export interface Expression extends Node {
}

export interface ParenthesizedExpression extends Expression {
    kind: SyntaxKind.ParenthesizedExpression;
    expression: Expression;
}

export interface Literal extends Expression {
    text: string;
}

export interface NullLiteral extends Literal {
    kind: SyntaxKind.NullKeyword;
}

export interface BooleanLiteral extends Literal {
    kind: SyntaxKind.TrueKeyword | SyntaxKind.FalseKeyword;
}

export interface StringLiteral extends Literal {
    kind: SyntaxKind.StringLiteral;
}

export interface Identifier extends Expression {
    kind: SyntaxKind.Identifier;
    name: string;
}

export type PrefixUnaryOperator
    = SyntaxKind.MinusToken
    | SyntaxKind.PlusToken
    | SyntaxKind.TildeToken
    | SyntaxKind.ExclamationToken
    | SyntaxKind.MinusMinusToken
    | SyntaxKind.PlusPlusToken
;

export type PostfixUnaryOperator
    = SyntaxKind.PlusPlusToken
    | SyntaxKind.MinusMinusToken
;

export type BinaryOperator
    = PrefixUnaryOperator
;

export type BinaryOperatorToken = Token<BinaryOperator>;

export interface UpdateExpression extends UnaryExpression {
}

export interface LeftHandSideExpression extends UpdateExpression {
}

export interface MemberExpression extends LeftHandSideExpression {
}

export interface PrimaryExpression extends MemberExpression {
}

export interface UnaryExpression extends Expression {
}

export interface BinaryExpression extends Expression  {
    kind: SyntaxKind.BinaryExpression;
    left: Expression;
    operatorToken: Token<BinaryOperator>;
    right: Expression;
}

export interface PrefixUnaryExpression extends UnaryExpression {
    kind: SyntaxKind.PrefixUnaryExpression;
    operator: PrefixUnaryOperator;
    operand: UnaryExpression;
}

export interface PostfixUnaryExpression extends UnaryExpression {
    kind: SyntaxKind.PostfixUnaryExpression;
    operand: LeftHandSideExpression;
    operator: PostfixUnaryOperator;
}

//
// Diagnostics
//

export enum DiagnosticCategory {
    Warning,
    Error,
    Message
}

export interface DiagnosticMessage {
    // key: string;
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
