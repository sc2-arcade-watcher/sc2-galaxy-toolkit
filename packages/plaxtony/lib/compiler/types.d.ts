export declare const enum CharacterCodes {
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
export declare const enum SyntaxKind {
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
    SwitchKeyword = 57,
    DefaultKeyword = 58,
    NewKeyword = 59,
    DoKeyword = 60,
    ForKeyword = 61,
    WhileKeyword = 62,
    IfKeyword = 63,
    ElseKeyword = 64,
    TrueKeyword = 65,
    FalseKeyword = 66,
    NullKeyword = 67,
    TypedefKeyword = 68,
    BoolKeyword = 69,
    ByteKeyword = 70,
    CharKeyword = 71,
    IntKeyword = 72,
    FixedKeyword = 73,
    StringKeyword = 74,
    AbilcmdKeyword = 75,
    ActorKeyword = 76,
    ActorscopeKeyword = 77,
    AifilterKeyword = 78,
    BankKeyword = 79,
    BitmaskKeyword = 80,
    CamerainfoKeyword = 81,
    ColorKeyword = 82,
    DoodadKeyword = 83,
    HandleKeyword = 84,
    GenerichandleKeyword = 85,
    EffecthistoryKeyword = 86,
    MarkerKeyword = 87,
    OrderKeyword = 88,
    PlayergroupKeyword = 89,
    PointKeyword = 90,
    RegionKeyword = 91,
    RevealerKeyword = 92,
    SoundKeyword = 93,
    SoundlinkKeyword = 94,
    TextKeyword = 95,
    TimerKeyword = 96,
    TransmissionsourceKeyword = 97,
    TriggerKeyword = 98,
    UnitKeyword = 99,
    UnitfilterKeyword = 100,
    UnitgroupKeyword = 101,
    UnitrefKeyword = 102,
    VoidKeyword = 103,
    WaveKeyword = 104,
    WaveinfoKeyword = 105,
    WavetargetKeyword = 106,
    ArrayrefKeyword = 107,
    StructrefKeyword = 108,
    FuncrefKeyword = 109,
    Identifier = 110,
    EndOfFileToken = 111,
    TypeReference = 112,
    MappedType = 113,
    ArrayType = 114,
    ArrayLiteralExpression = 115,
    ElementAccessExpression = 116,
    PropertyAccessExpression = 117,
    CallExpression = 118,
    PrefixUnaryExpression = 119,
    PostfixUnaryExpression = 120,
    BinaryExpression = 121,
    TypeAssertionExpression = 122,
    ParenthesizedExpression = 123,
    SourceFile = 124,
    Block = 125,
    IfStatement = 126,
    DoStatement = 127,
    WhileStatement = 128,
    ForStatement = 129,
    BreakStatement = 130,
    ContinueStatement = 131,
    IncludeStatement = 132,
    ReturnStatement = 133,
    ExpressionStatement = 134,
    EmptyStatement = 135,
    StructDeclaration = 136,
    VariableDeclaration = 137,
    FunctionDeclaration = 138,
    ParameterDeclaration = 139,
    PropertyDeclaration = 140,
    TypedefDeclaration = 141,
}
export declare const enum SyntaxKindMarker {
    FirstToken = 1,
    LastToken = 110,
    FirstKeyword = 49,
    LastKeyword = 109,
    FirstBasicType = 69,
    LastBasicType = 74,
    FirstComplexType = 75,
    LastComplexType = 106,
    FirstTypeNode = 112,
    LastTypeNode = 114,
    FirstKeywordType = 69,
    LastKeywordType = 114,
}
export declare type Modifier = Token<SyntaxKind.ConstKeyword> | Token<SyntaxKind.NativeKeyword> | Token<SyntaxKind.StaticKeyword>;
export declare const enum SymbolFlags {
    None = 0,
    LocalVariable = 2,
    FunctionParameter = 4,
    GlobalVariable = 8,
    Property = 16,
    Function = 32,
    Struct = 64,
    Typedef = 128,
    Static = 1024,
    Variable = 14,
    FunctionScopedVariable = 6,
}
export interface Symbol {
    id?: number;
    flags: SymbolFlags;
    escapedName: string;
    declarations: Declaration[];
    valueDeclaration?: Declaration;
    members?: SymbolTable;
    target?: Symbol;
    parent?: Symbol;
    isReferenced?: boolean;
    isAssigned?: boolean;
}
export declare type SymbolTable = Map<string, Symbol>;
export declare const enum TypeFlags {
    Unknown = 1,
    String = 2,
    Integer = 4,
    Byte = 8,
    Char = 16,
    Fixed = 32,
    Boolean = 64,
    Nullable = 128,
    StringLiteral = 256,
    NumericLiteral = 512,
    BooleanLiteral = 1024,
    Void = 2048,
    Null = 4096,
    Struct = 8192,
    Function = 16384,
    Complex = 32768,
    Array = 65536,
    Mapped = 131072,
    Reference = 262144,
    Typedef = 2097152,
    True = 4194304,
    False = 8388608,
    Literal = 1792,
    Numeric = 36,
}
export interface Type {
    flags: TypeFlags;
    symbol?: Symbol;
}
export interface LiteralType extends Type {
    value: string | number;
    freshType?: LiteralType;
    regularType?: LiteralType;
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
export declare const enum NodeCheckFlags {
    TypeChecked = 1,
    ContextChecked = 2,
}
export interface NodeLinks {
    flags?: NodeCheckFlags;
    resolvedType?: Type;
    resolvedSymbol?: Symbol;
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
    id?: number;
    kind: SyntaxKind;
    parent?: Node;
    syntaxTokens: Node[];
}
export interface NodeArray<T extends Node> extends ReadonlyArray<T>, TextRange {
}
export declare type MutableNodeArray<T extends Node> = NodeArray<T> & T[];
export interface Statement extends Node {
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
    hasReturn?: boolean;
}
export interface IncludeStatement extends Statement {
    kind: SyntaxKind.IncludeStatement;
    path: StringLiteral;
}
export interface TypeNode extends Node {
    symbol?: Symbol;
}
export interface TypeNode extends Node {
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
    modifiers?: NodeArray<Modifier>;
    symbol?: Symbol;
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
    text: string;
    parseDiagnostics: Diagnostic[];
    bindDiagnostics: Diagnostic[];
    additionalSyntacticDiagnostics: Diagnostic[];
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
export declare type EntityNameExpression = Identifier | PropertyAccessExpression | ParenthesizedExpression;
export declare type PrefixUnaryOperator = SyntaxKind.MinusToken | SyntaxKind.PlusToken | SyntaxKind.TildeToken | SyntaxKind.ExclamationToken | SyntaxKind.MinusMinusToken | SyntaxKind.PlusPlusToken;
export declare type PostfixUnaryOperator = SyntaxKind.PlusPlusToken | SyntaxKind.MinusMinusToken;
export declare type BinaryOperator = SyntaxKind.MinusToken | SyntaxKind.PlusToken | SyntaxKind.AsteriskToken | SyntaxKind.SlashToken | SyntaxKind.PercentToken | SyntaxKind.AmpersandToken | SyntaxKind.BarToken | SyntaxKind.CaretToken | SyntaxKind.LessThanLessThanToken | SyntaxKind.GreaterThanGreaterThanToken | SyntaxKind.BarBarToken | SyntaxKind.AmpersandAmpersandToken;
export declare type BinaryOperatorToken = Token<BinaryOperator>;
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
export interface BinaryExpression extends Expression {
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
export declare type BreakOrContinueStatement = BreakStatement | ContinueStatement;
export interface IfStatement extends Statement {
    kind: SyntaxKind.IfStatement;
    expression: Expression;
    thenStatement: Statement;
    elseStatement?: Statement;
    hasReturn?: boolean;
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
export declare enum DiagnosticCategory {
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
    file?: SourceFile;
    start?: number;
    length?: number;
    messageText: string;
    category: DiagnosticCategory;
    code: number;
    source?: string;
    line?: number;
    col?: number;
    toString(): string;
}
