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
    DoKeyword = 57,
    ForKeyword = 58,
    WhileKeyword = 59,
    IfKeyword = 60,
    ElseKeyword = 61,
    TrueKeyword = 62,
    FalseKeyword = 63,
    NullKeyword = 64,
    TypedefKeyword = 65,
    BoolKeyword = 66,
    ByteKeyword = 67,
    CharKeyword = 68,
    IntKeyword = 69,
    FixedKeyword = 70,
    StringKeyword = 71,
    AbilcmdKeyword = 72,
    ActorKeyword = 73,
    ActorscopeKeyword = 74,
    AifilterKeyword = 75,
    AnimfilterKeyword = 76,
    BankKeyword = 77,
    BitmaskKeyword = 78,
    CamerainfoKeyword = 79,
    ColorKeyword = 80,
    DoodadKeyword = 81,
    HandleKeyword = 82,
    GenerichandleKeyword = 83,
    EffecthistoryKeyword = 84,
    MarkerKeyword = 85,
    OrderKeyword = 86,
    PlayergroupKeyword = 87,
    PointKeyword = 88,
    RegionKeyword = 89,
    RevealerKeyword = 90,
    SoundKeyword = 91,
    SoundlinkKeyword = 92,
    TextKeyword = 93,
    TimerKeyword = 94,
    TransmissionsourceKeyword = 95,
    TriggerKeyword = 96,
    UnitKeyword = 97,
    UnitfilterKeyword = 98,
    UnitgroupKeyword = 99,
    UnitrefKeyword = 100,
    VoidKeyword = 101,
    WaveKeyword = 102,
    WaveinfoKeyword = 103,
    WavetargetKeyword = 104,
    ArrayrefKeyword = 105,
    StructrefKeyword = 106,
    FuncrefKeyword = 107,
    Identifier = 108,
    EndOfFileToken = 109,
    TypeReference = 110,
    MappedType = 111,
    ArrayType = 112,
    ArrayLiteralExpression = 113,
    ElementAccessExpression = 114,
    PropertyAccessExpression = 115,
    CallExpression = 116,
    PrefixUnaryExpression = 117,
    PostfixUnaryExpression = 118,
    BinaryExpression = 119,
    TypeAssertionExpression = 120,
    ParenthesizedExpression = 121,
    SourceFile = 122,
    Block = 123,
    IfStatement = 124,
    DoStatement = 125,
    WhileStatement = 126,
    ForStatement = 127,
    BreakStatement = 128,
    ContinueStatement = 129,
    IncludeStatement = 130,
    ReturnStatement = 131,
    ExpressionStatement = 132,
    EmptyStatement = 133,
    StructDeclaration = 134,
    VariableDeclaration = 135,
    FunctionDeclaration = 136,
    ParameterDeclaration = 137,
    PropertyDeclaration = 138,
    TypedefDeclaration = 139,
}
export declare const enum SyntaxKindMarker {
    FirstToken = 1,
    LastToken = 108,
    FirstKeyword = 49,
    LastKeyword = 107,
    FirstBasicType = 66,
    LastBasicType = 71,
    FirstComplexType = 72,
    LastComplexType = 104,
    FirstTypeNode = 110,
    LastTypeNode = 112,
}
export declare type Modifier = Token<SyntaxKind.ConstKeyword> | Token<SyntaxKind.NativeKeyword> | Token<SyntaxKind.StaticKeyword>;
export declare type KeywordType = SyntaxKind.AbilcmdKeyword | SyntaxKind.ActorKeyword | SyntaxKind.ActorscopeKeyword | SyntaxKind.AifilterKeyword | SyntaxKind.AnimfilterKeyword | SyntaxKind.BankKeyword | SyntaxKind.BitmaskKeyword | SyntaxKind.BoolKeyword | SyntaxKind.ByteKeyword | SyntaxKind.CamerainfoKeyword | SyntaxKind.CharKeyword | SyntaxKind.ColorKeyword | SyntaxKind.DoodadKeyword | SyntaxKind.FixedKeyword | SyntaxKind.HandleKeyword | SyntaxKind.GenerichandleKeyword | SyntaxKind.EffecthistoryKeyword | SyntaxKind.IntKeyword | SyntaxKind.MarkerKeyword | SyntaxKind.OrderKeyword | SyntaxKind.PlayergroupKeyword | SyntaxKind.PointKeyword | SyntaxKind.RegionKeyword | SyntaxKind.RevealerKeyword | SyntaxKind.SoundKeyword | SyntaxKind.SoundlinkKeyword | SyntaxKind.StringKeyword | SyntaxKind.TextKeyword | SyntaxKind.TimerKeyword | SyntaxKind.TransmissionsourceKeyword | SyntaxKind.TriggerKeyword | SyntaxKind.UnitKeyword | SyntaxKind.UnitfilterKeyword | SyntaxKind.UnitgroupKeyword | SyntaxKind.UnitrefKeyword | SyntaxKind.VoidKeyword | SyntaxKind.WaveKeyword | SyntaxKind.WaveinfoKeyword | SyntaxKind.WavetargetKeyword | SyntaxKind.ArrayrefKeyword | SyntaxKind.StructrefKeyword | SyntaxKind.FuncrefKeyword;
export declare const enum SymbolFlags {
    None = 0,
    LocalVariable = 2,
    FunctionParameter = 4,
    GlobalVariable = 8,
    Property = 16,
    Function = 32,
    Struct = 64,
    Typedef = 128,
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
    Any = 1,
    String = 2,
    Integer = 4,
    Fixed = 8,
    Boolean = 16,
    Enum = 32,
    StringLiteral = 64,
    NumberLiteral = 128,
    BooleanLiteral = 256,
    Void = 1024,
    Null = 2048,
    Struct = 4096,
    Function = 8192,
    Complex = 16384,
    Array = 32768,
    Mapped = 65536,
    Funcref = 131072,
    Arrayref = 262144,
    Structref = 524288,
    Typedef = 1048576,
    Nullable = 2048,
    Literal = 448,
    Numeric = 12,
    Reference = 917504,
}
export interface Type {
    flags: TypeFlags;
    symbol?: Symbol;
}
export interface IntrinsicType extends Type {
    intrinsicName: string;
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
export interface TypeReferenceNode extends TypeNode {
    kind: SyntaxKind.TypeReference;
    name: Identifier;
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
export interface Identifier extends PrimaryExpression {
    kind: SyntaxKind.Identifier;
    name: string;
    resolvedSymbol?: Symbol;
}
export declare type EntityNameExpression = Identifier | PropertyAccessExpression | ParenthesizedExpression;
export declare type PrefixUnaryOperator = SyntaxKind.MinusToken | SyntaxKind.PlusToken | SyntaxKind.TildeToken | SyntaxKind.ExclamationToken | SyntaxKind.MinusMinusToken | SyntaxKind.PlusPlusToken;
export declare type PostfixUnaryOperator = SyntaxKind.PlusPlusToken | SyntaxKind.MinusMinusToken;
export declare type BinaryOperator = PrefixUnaryOperator;
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
