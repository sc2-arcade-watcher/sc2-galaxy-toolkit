import * as lsp from 'vscode-languageserver';

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
    SingleLineCommentTrivia,

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

    // Comparison
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
    BreakpointKeyword,
    ReturnKeyword,
    SwitchKeyword,
    // CaseKeyword,
    DefaultKeyword,
    NewKeyword,
    DoKeyword,
    ForKeyword,
    WhileKeyword,
    IfKeyword,
    ElseKeyword,
    TrueKeyword,
    FalseKeyword,
    NullKeyword,
    TypedefKeyword,

    // Basic types
    BoolKeyword,
    ByteKeyword,
    CharKeyword,
    IntKeyword,
    FixedKeyword,
    StringKeyword,
    // Native complex types
    AbilcmdKeyword,
    ActorKeyword,
    ActorscopeKeyword,
    AifilterKeyword,
    BankKeyword,
    BitmaskKeyword,
    CamerainfoKeyword,
    ColorKeyword,
    DatetimeKeyword,
    DoodadKeyword,
    HandleKeyword,
    GenerichandleKeyword,
    EffecthistoryKeyword,
    MarkerKeyword,
    OrderKeyword,
    PlayergroupKeyword,
    PointKeyword,
    RegionKeyword,
    RevealerKeyword,
    SoundKeyword,
    SoundlinkKeyword,
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
    // Ref types
    ArrayrefKeyword,
    StructrefKeyword,
    FuncrefKeyword,

    //
    Identifier,

    EndOfFileToken,

    // Elements
    TypeReference,
    MappedType,
    ArrayType,

    ArrayLiteralExpression,
    ElementAccessExpression,
    PropertyAccessExpression,
    CallExpression,
    PrefixUnaryExpression,
    PostfixUnaryExpression,
    BinaryExpression,
    TypeAssertionExpression,
    ParenthesizedExpression,

    SourceFile,
    Block,

    IfStatement,
    DoStatement,
    WhileStatement,
    ForStatement,
    BreakStatement,
    ContinueStatement,
    BreakpointStatement,

    IncludeStatement,
    ReturnStatement,
    ExpressionStatement,
    EmptyStatement,

    StructDeclaration,
    VariableDeclaration,
    FunctionDeclaration,
    ParameterDeclaration,
    PropertyDeclaration,
    TypedefDeclaration,
}

export const enum SyntaxKindMarker {
    FirstToken = SyntaxKind.NumericLiteral,
    LastToken = SyntaxKind.Identifier,

    FirstKeyword = SyntaxKind.IncludeKeyword,
    LastKeyword = SyntaxKind.FuncrefKeyword,

    FirstBasicType = SyntaxKind.BoolKeyword,
    LastBasicType = SyntaxKind.StringKeyword,

    FirstComplexType = SyntaxKind.AbilcmdKeyword,
    LastComplexType = SyntaxKind.WavetargetKeyword,

    FirstTypeNode = SyntaxKind.TypeReference,
    LastTypeNode = SyntaxKind.ArrayType,

    FirstKeywordType = SyntaxKind.BoolKeyword,
    LastKeywordType = SyntaxKind.ArrayType,
};

export type Modifier
    = Token<SyntaxKind.ConstKeyword>
    | Token<SyntaxKind.NativeKeyword>
    | Token<SyntaxKind.StaticKeyword>
;

export const enum SymbolFlags {
    None                    = 0,
    LocalVariable           = 1 << 1,
    FunctionParameter       = 1 << 2,
    GlobalVariable          = 1 << 3,
    Property                = 1 << 4,
    Function                = 1 << 5,
    Struct                  = 1 << 6,
    Typedef                 = 1 << 7,
    Static                  = 1 << 10,
    Native                  = 1 << 11,

    Variable = LocalVariable | FunctionParameter | GlobalVariable,
    FunctionScopedVariable = LocalVariable | FunctionParameter,
}

export interface Symbol {
    id?: number;
    flags: SymbolFlags;                     // Symbol flags
    escapedName: string;                    // Name of symbol
    declarations: Declaration[];            // Declarations associated with this symbol
    valueDeclaration?: Declaration;         // First value declaration of the symbol
    members?: SymbolTable;                  // members
    target?: Symbol;                        // Resolved (non-alias) target of an alias
    /* @internal */ parent?: Symbol;        // Parent symbol
    /* @internal */ isReferenced?: boolean; // True if the symbol is referenced elsewhere
    /* @internal */ isAssigned?: boolean;   // True if the symbol is a parameter with assignments
}

export type SymbolTable = Map<string, Symbol>;

export const enum TypeFlags {
    Unknown                 = 1 << 0,
    String                  = 1 << 1,
    Integer                 = 1 << 2,
    Byte                    = 1 << 3,
    Char                    = 1 << 4,
    Fixed                   = 1 << 5,
    Boolean                 = 1 << 6,
    Nullable                = 1 << 7,
    StringLiteral           = 1 << 8,
    NumericLiteral          = 1 << 9,
    BooleanLiteral          = 1 << 10,
    Void                    = 1 << 11,
    Null                    = 1 << 12,
    Struct                  = 1 << 13,
    Function                = 1 << 14,
    Complex                 = 1 << 15,
    Array                   = 1 << 16,
    Mapped                  = 1 << 17,

    Reference               = 1 << 18,

    Typedef                 = 1 << 21,

    True                    = 1 << 22,
    False                   = 1 << 23,

    /* @internal */
    Literal = StringLiteral | NumericLiteral | BooleanLiteral,
    IntLike = Integer | Byte,
    Numeric = Integer | Byte | Fixed,
}

export interface Type {
    flags: TypeFlags;                // Flags
    symbol?: Symbol;                 // Symbol associated with type (if any)
}

// String literal types (TypeFlags.StringLiteral)
// Numeric literal types (TypeFlags.NumberLiteral)
export interface LiteralType extends Type {
    value: string | number;     // Value of literal
    freshType?: LiteralType;    // Fresh version of type
    regularType?: LiteralType;  // Regular version of type
}

export interface StringLiteralType extends LiteralType {
    value: string;
}

export interface NumberLiteralType extends LiteralType {
    value: number;
}

export interface StructType extends Type {
}

export interface FunctionType extends Type {
}

export interface TypedefType extends Type {
    // aliasOf: Type;
    referencedType: Type;
}

export interface ArrayType extends Type {
    elementType: Type;
}

export interface MappedType extends Type {
    returnType: Type;
    referencedType: Type;
}

export interface ComplexType extends Type {
    kind: SyntaxKind;
}

export const enum NodeCheckFlags {
    TypeChecked                         = 1 << 0,  // Node has been type checked
    ContextChecked                      = 1 << 1,  // Contextual types have been assigned
}

/* @internal */
export interface NodeLinks {
    flags?: NodeCheckFlags;           // Set of flags specific to Node
    resolvedType?: Type;              // Cached type of type node
    resolvedSymbol?: Symbol;          // Cached name resolution result
}

export interface TextRange {
    line: number;
    char: number;
    pos: number;
    end: number;
}

export interface Token<TKind extends SyntaxKind> extends Node {
    kind: TKind;
}

export interface Node extends TextRange {
    // token: Token;
    id?: number;
    kind: SyntaxKind;
    /* @internal */ kindName?: string; // debug purposes
    parent?: Node;
    syntaxTokens: Node[];
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
    /* @internal */ hasReturn?: boolean;
}

export interface IncludeStatement extends Statement {
    kind: SyntaxKind.IncludeStatement;
    path: StringLiteral;
}

export interface TypeNode extends Node {
    symbol?: Symbol; // Symbol associated with type (if any)
}

export interface ArrayTypeNode extends TypeNode {
    kind: SyntaxKind.ArrayType;
    elementType: TypeNode;
    size: Expression;
}

export interface MappedTypeNode extends TypeNode {
    kind: SyntaxKind.MappedType;
    returnType: TypeNode;
    typeArguments?: NodeArray<TypeNode>;
}

export interface Declaration extends Node {
    // name?: Identifier;
    modifiers?: NodeArray<Modifier>;
    /* @internal */ symbol?: Symbol; // Symbol declared by node (initialized by binding)
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
    members: NodeArray<PropertyDeclaration>;
}

export interface PropertyDeclaration extends NamedDeclaration {
    kind: SyntaxKind.PropertyDeclaration;
    type: TypeNode;
}

export interface FunctionDeclaration extends SignatureDeclaration, NamedDeclaration {
    kind: SyntaxKind.FunctionDeclaration;
    body?: Block;
}

export interface TypedefDeclaration extends NamedDeclaration {
    kind: SyntaxKind.TypedefDeclaration;
    type: TypeNode;
}

export interface ReturnStatement extends Statement {
    kind: SyntaxKind.ReturnStatement;
    expression?: Expression;
}

export interface SourceFile extends Declaration {
    kind: SyntaxKind.SourceFile;
    fileName: string;
    statements: NodeArray<Statement>;
    lineMap: number[];
    commentsLineMap: Map<number, Token<SyntaxKind.SingleLineCommentTrivia>>;
    /* @internal */ text: string;
    /* @internal */ parseDiagnostics: Diagnostic[]; // File-level diagnostics reported by the parser
    /* @internal */ bindDiagnostics: Diagnostic[]; // File-level diagnostics reported by the binder.
    /* @internal */ additionalSyntacticDiagnostics: Diagnostic[]; // Stores additional file-level diagnostics reported by the program
}

export interface Expression extends Node {
}

export interface ParenthesizedExpression extends PrimaryExpression {
    kind: SyntaxKind.ParenthesizedExpression;
    expression: Expression;
}

export interface Literal extends Expression {
    value?: string;
    text?: string;
}

export interface StringLiteral extends Literal {
    kind: SyntaxKind.StringLiteral;
}

export interface NumericLiteral extends Literal {
    kind: SyntaxKind.NumericLiteral;
}

export interface Identifier extends PrimaryExpression {
    kind: SyntaxKind.Identifier;
    name: string;
    resolvedSymbol?: Symbol;
}

export type EntityNameExpression = Identifier | PropertyAccessExpression | ParenthesizedExpression;

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
    = SyntaxKind.MinusToken
    | SyntaxKind.PlusToken
    | SyntaxKind.AsteriskToken
    | SyntaxKind.SlashToken
    | SyntaxKind.PercentToken

    | SyntaxKind.AmpersandToken
    | SyntaxKind.BarToken
    | SyntaxKind.CaretToken
    | SyntaxKind.LessThanLessThanToken
    | SyntaxKind.GreaterThanGreaterThanToken

    | SyntaxKind.BarBarToken
    | SyntaxKind.AmpersandAmpersandToken
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
    operator: Token<PrefixUnaryOperator>;
    operand: UnaryExpression;
}

export interface PostfixUnaryExpression extends UnaryExpression {
    kind: SyntaxKind.PostfixUnaryExpression;
    operand: LeftHandSideExpression;
    operator: Token<PostfixUnaryOperator>;
}

export interface ElementAccessExpression extends MemberExpression {
    kind: SyntaxKind.ElementAccessExpression;
    expression: LeftHandSideExpression;
    argumentExpression: Expression;
}

export interface SymbolLink {
    symbolLink: Symbol;
}

export interface PropertyAccessExpression extends MemberExpression, NamedDeclaration {
    kind: SyntaxKind.PropertyAccessExpression;
    expression: LeftHandSideExpression;
    name: Identifier;
}

export interface CallExpression extends LeftHandSideExpression, Declaration {
    kind: SyntaxKind.CallExpression;
    expression: LeftHandSideExpression;
    arguments: NodeArray<Expression>;
}

export interface BreakStatement extends Statement {
    kind: SyntaxKind.BreakStatement;
}

export interface ContinueStatement extends Statement {
    kind: SyntaxKind.ContinueStatement;
}

export type BreakOrContinueStatement = BreakStatement | ContinueStatement;

export interface BreakpointStatement extends Statement {
    kind: SyntaxKind.BreakpointStatement;
}

export interface IfStatement extends Statement {
    kind: SyntaxKind.IfStatement;
    expression: Expression;
    thenStatement: Statement;
    elseStatement?: Statement;
    /* @internal */ hasReturn?: boolean;
}

export interface IterationStatement extends Statement {
    statement: Statement;
}

export interface DoStatement extends IterationStatement {
    kind: SyntaxKind.DoStatement;
    expression: Expression;
}

export interface WhileStatement extends IterationStatement {
    kind: SyntaxKind.WhileStatement;
    expression: Expression;
}

export interface ForStatement extends IterationStatement {
    kind: SyntaxKind.ForStatement;
    initializer?: Expression;
    condition?: Expression;
    incrementor?: Expression;
}

//
// Diagnostics
//

export enum DiagnosticCategory {
    Error = 1,
    Warning = 2,
    Message = 3,
    Hint = 4,
}

export interface DiagnosticMessage {
    // key: string;
    category: DiagnosticCategory;
    code: number;
    message: string;
}

export interface Diagnostic {
    file?: SourceFile;
    start?: number;
    length?: number;
    messageText: string;
    category: DiagnosticCategory;
    tags?: lsp.DiagnosticTag[];
    code: number;
    source?: string;

    line?: number;
    col?: number;

    toString(): string;
}
