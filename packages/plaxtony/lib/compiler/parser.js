"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Types = require("./types");
const scanner_1 = require("./scanner");
const utils_1 = require("./utils");
const diagnostics_1 = require("./diagnostics");
var ParsingContext;
(function (ParsingContext) {
    ParsingContext[ParsingContext["SourceElements"] = 0] = "SourceElements";
    ParsingContext[ParsingContext["BlockStatements"] = 1] = "BlockStatements";
    ParsingContext[ParsingContext["StructMembers"] = 2] = "StructMembers";
    ParsingContext[ParsingContext["Parameters"] = 3] = "Parameters";
    ParsingContext[ParsingContext["TypeArguments"] = 4] = "TypeArguments";
    ParsingContext[ParsingContext["ArgumentExpressions"] = 5] = "ArgumentExpressions";
})(ParsingContext || (ParsingContext = {}));
class Parser {
    constructor() {
        this.parsingContext = 0;
        this.scanner = new scanner_1.Scanner((message, pos, length) => {
            this.parseErrorAtPosition(pos, length, message.message);
        });
    }
    token() {
        return this.currentToken;
    }
    nextToken() {
        return this.currentToken = this.scanner.scan();
    }
    parseErrorAtCurrentToken(message, arg0) {
        const start = this.scanner.getStartPos();
        const length = this.scanner.getTokenPos() - start;
        this.parseErrorAtPosition(start, length, message, arg0);
    }
    parseErrorAtPosition(start, length, message, arg0) {
        const diag = diagnostics_1.createFileDiagnostic(this.sourceFile, start, length, {
            code: 1001,
            category: Types.DiagnosticCategory.Error,
            message: message,
        }, arg0);
        // TODO: line & col should not be here
        diag.line = this.scanner.getLine();
        diag.col = this.scanner.getChar();
        this.sourceFile.parseDiagnostics.push(diag);
        // throw new Error(`${diag.file!.fileName} [${diag.start}]: ${diag.messageText}`);
        // throw new Error(`${diag.file!.fileName} [${this.scanner.getLine()}:${this.scanner.getCol()}]: ${diag.messageText}`);
    }
    speculationHelper(callback, isLookAhead) {
        // Keep track of the state we'll need to rollback to if lookahead fails (or if the
        // caller asked us to always reset our state).
        const saveToken = this.currentToken;
        const saveSyntaxTokensLength = this.syntaxTokens.length;
        const saveSyntaxTokensCurrentLength = this.syntaxTokens[this.syntaxTokens.length - 1].length;
        const saveParseDiagnosticsLength = this.sourceFile.parseDiagnostics.length;
        // const saveParseErrorBeforeNextFinishedNode = parseErrorBeforeNextFinishedNode;
        // Note: it is not actually necessary to save/restore the context flags here.  That's
        // because the saving/restoring of these flags happens naturally through the recursive
        // descent nature of our parser.  However, we still store this here just so we can
        // assert that invariant holds.
        // const saveContextFlags = contextFlags;
        // If we're only looking ahead, then tell the scanner to only lookahead as well.
        // Otherwise, if we're actually speculatively parsing, then tell the scanner to do the
        // same.
        const result = isLookAhead
            ? this.scanner.lookAhead(callback)
            : this.scanner.tryScan(callback);
        // Debug.assert(saveContextFlags === contextFlags);
        // If our callback returned something 'falsy' or we're just looking ahead,
        // then unconditionally restore us to where we were.
        if (!result || isLookAhead) {
            this.currentToken = saveToken;
            if (this.syntaxTokens.length > saveSyntaxTokensLength) {
                this.syntaxTokens = this.syntaxTokens.slice(0, saveSyntaxTokensLength);
            }
            if (this.syntaxTokens[this.syntaxTokens.length - 1].length > saveSyntaxTokensCurrentLength) {
                this.syntaxTokens[this.syntaxTokens.length - 1] = this.syntaxTokens[this.syntaxTokens.length - 1].slice(0, saveSyntaxTokensCurrentLength);
            }
            this.sourceFile.parseDiagnostics.length = saveParseDiagnosticsLength;
            // parseErrorBeforeNextFinishedNode = saveParseErrorBeforeNextFinishedNode;
        }
        return result;
    }
    lookAhead(callback) {
        return this.speculationHelper(callback, true);
    }
    parseExpected(kind, diagnosticMessage, shouldAdvance = true) {
        if (this.token() === kind) {
            if (shouldAdvance) {
                this.syntaxTokens[this.syntaxTokens.length - 1].push(this.parseTokenNode());
            }
            return true;
        }
        if (diagnosticMessage == null) {
            diagnosticMessage = "Expected " + utils_1.getKindName(kind) + ", found " + utils_1.getKindName(this.currentToken);
        }
        this.parseErrorAtCurrentToken(diagnosticMessage);
        return false;
    }
    parseOptional(t) {
        if (this.token() === t) {
            this.syntaxTokens[this.syntaxTokens.length - 1].push(this.parseTokenNode());
            return true;
        }
        return false;
    }
    parseTokenNode() {
        const node = this.createNode(this.token(), undefined, false);
        this.nextToken();
        return this.finishNode(node, undefined, false);
    }
    createNode(kind, pos, assignSyntaxTokens = true) {
        const node = {};
        node.kind = kind;
        node.pos = pos === undefined ? this.scanner.getTokenPos() : pos;
        node.end = node.pos;
        node.line = this.scanner.getLine();
        node.char = this.scanner.getChar();
        if (process.env.PLAXTONY_DEBUG) {
            node.kindName = utils_1.getKindName(node.kind);
        }
        if (assignSyntaxTokens) {
            this.syntaxTokens.push([]);
        }
        return node;
    }
    createNodeArray(elements, pos) {
        const array = (elements || []);
        if (pos === undefined) {
            pos = this.scanner.getStartPos();
        }
        array.pos = pos;
        array.end = pos;
        return array;
    }
    createMissingNode(kind) {
        this.parseErrorAtCurrentToken('Missing node: {0}', utils_1.getKindName(kind));
        const result = this.createNode(0 /* Unknown */);
        return this.finishNode(result);
    }
    createMissingList() {
        return this.createNodeArray();
    }
    finishNode(node, end, assignSyntaxTokens = true) {
        node.end = end === undefined ? this.scanner.getStartPos() : end;
        if (assignSyntaxTokens) {
            node.syntaxTokens = this.syntaxTokens.pop();
            for (const token of node.syntaxTokens) {
                token.parent = node;
            }
        }
        return node;
    }
    isListTerminator(kind) {
        if (this.token() === 112 /* EndOfFileToken */) {
            // Being at the end of the file ends all lists.
            return true;
        }
        switch (kind) {
            case 0 /* SourceElements */:
                return false;
            case 1 /* BlockStatements */:
            case 2 /* StructMembers */:
                return this.token() === 5 /* CloseBraceToken */;
            case 5 /* ArgumentExpressions */:
            case 3 /* Parameters */:
                return this.token() === 7 /* CloseParenToken */;
            case 4 /* TypeArguments */:
                return this.token() === 14 /* GreaterThanToken */;
        }
    }
    parsingContextErrors(context) {
        switch (context) {
            case 0 /* SourceElements */:
                return 'expected declaration';
            case 1 /* BlockStatements */:
                return 'expected declaration or statement';
            case 2 /* StructMembers */:
                return 'expected property declaration';
            case 4 /* TypeArguments */:
                return 'expected type argumnt definition';
            case 5 /* ArgumentExpressions */:
                return 'expected argumnt expression';
            case 3 /* Parameters */:
                return 'expected parameter declaration';
        }
    }
    isListElement(parsingContext, inErrorRecovery) {
        switch (parsingContext) {
            case 0 /* SourceElements */:
                return this.isStartOfRootStatement();
            case 1 /* BlockStatements */:
                return this.isStartOfStatement();
            case 2 /* StructMembers */:
                return this.isStartOfVariableDeclaration();
            case 4 /* TypeArguments */:
                return this.isStartOfTypeDefinition();
            case 3 /* Parameters */:
                return this.isStartOfParameter();
            case 5 /* ArgumentExpressions */:
                return this.isStartOfExpression();
        }
    }
    parseList(kind, parseElement) {
        const saveParsingContext = this.parsingContext;
        this.parsingContext |= 1 << kind;
        const result = this.createNodeArray();
        while (!this.isListTerminator(kind)) {
            if (this.token() === 1 /* SingleLineCommentTrivia */) {
                const commentToken = this.parseTokenNode();
                this.sourceFile.commentsLineMap.set(commentToken.line, commentToken);
                continue;
            }
            if (this.isListElement(kind, false)) {
                result.push(parseElement());
                continue;
            }
            const start = this.scanner.getStartPos();
            this.nextToken();
            this.parseErrorAtPosition(start, this.scanner.getTokenPos() - start, this.parsingContextErrors(kind));
            if (kind !== 0 /* SourceElements */) {
                break;
            }
        }
        result.end = this.scanner.getTokenPos();
        this.parsingContext = saveParsingContext;
        return result;
    }
    parseBracketedList(kind, parseElement, open, close) {
        if (this.parseExpected(open)) {
            const result = this.parseDelimitedList(kind, parseElement);
            this.parseExpected(close);
            return result;
        }
        return this.createMissingList();
    }
    parseDelimitedList(kind, parseElement) {
        const saveParsingContext = this.parsingContext;
        this.parsingContext |= 1 << kind;
        const result = this.createNodeArray();
        let commaStart = -1; // Meaning the previous token was not a comma
        while (true) {
            if (this.isListElement(kind, false)) {
                const startPos = this.scanner.getTokenPos();
                result.push(parseElement());
                commaStart = this.scanner.getTokenPos();
                if (this.parseOptional(12 /* CommaToken */)) {
                    // No need to check for a zero length node since we know we parsed a comma
                    continue;
                }
                commaStart = -1; // Back to the state where the last token was not a comma
                if (this.isListTerminator(kind)) {
                    break;
                }
                // We didn't get a comma, and the list wasn't terminated, explicitly parse
                // out a comma so we give a good error message.
                this.parseExpected(12 /* CommaToken */);
                continue;
            }
            if (this.isListTerminator(kind)) {
                break;
            }
            this.parseErrorAtCurrentToken(this.parsingContextErrors(kind));
            this.nextToken();
        }
        if (commaStart >= 0) {
            this.parseErrorAtPosition(commaStart, 1, 'trailing comma');
        }
        result.end = this.scanner.getTokenPos();
        this.parsingContext = saveParsingContext;
        return result;
    }
    isVariableDeclaration() {
        while (this.token() === 53 /* ConstKeyword */ || this.token() === 52 /* StaticKeyword */) {
            this.nextToken();
        }
        if (!utils_1.isKeywordTypeKind(this.token()) && this.token() !== 111 /* Identifier */) {
            return false;
        }
        this.parseTypeDefinition();
        if (this.token() !== 111 /* Identifier */) {
            return false;
        }
        this.nextToken();
        if (this.token() !== 39 /* EqualsToken */ && this.token() !== 11 /* SemicolonToken */) {
            return false;
        }
        return true;
    }
    isFunctionDeclaration() {
        while (this.token() === 54 /* NativeKeyword */ || this.token() === 52 /* StaticKeyword */) {
            this.nextToken();
        }
        if (!utils_1.isKeywordTypeKind(this.token()) && this.token() !== 111 /* Identifier */) {
            return false;
        }
        this.parseTypeDefinition();
        if (this.token() !== 111 /* Identifier */) {
            return false;
        }
        this.nextToken();
        if (this.token() !== 6 /* OpenParenToken */) {
            return false;
        }
        return true;
    }
    isParameter() {
        this.parseTypeDefinition();
        if (this.token() !== 111 /* Identifier */) {
            return false;
        }
        return true;
    }
    isStartOfExpression() {
        if (this.isStartOfLeftHandSideExpression()) {
            return true;
        }
        switch (this.token()) {
            case 20 /* PlusToken */:
            case 21 /* MinusToken */:
            case 33 /* TildeToken */:
            case 32 /* ExclamationToken */:
            case 25 /* PlusPlusToken */:
            case 26 /* MinusMinusToken */:
                return true;
            default:
                // Error tolerance.  If we see the start of some binary operator, we consider
                // that the start of an expression.  That way we'll parse out a missing identifier,
                // give a good message about an identifier being missing, and then consume the
                // rest of the binary expression.
                if (this.isBinaryOperator()) {
                    return true;
                }
                return this.token() === 111 /* Identifier */;
        }
    }
    isStartOfStatement() {
        switch (this.token()) {
            case 11 /* SemicolonToken */:
            case 4 /* OpenBraceToken */:
            case 51 /* StructKeyword */:
            case 64 /* IfKeyword */:
            case 61 /* DoKeyword */:
            case 63 /* WhileKeyword */:
            case 62 /* ForKeyword */:
            case 56 /* ContinueKeyword */:
            case 55 /* BreakKeyword */:
            case 57 /* ReturnKeyword */:
            case 50 /* IncludeKeyword */:
                return true;
            default:
                if (this.isStartOfVariableDeclaration()) {
                    return true;
                }
                return this.isStartOfExpression();
        }
    }
    isStartOfVariableDeclaration() {
        return this.lookAhead(this.isVariableDeclaration.bind(this));
    }
    isStartOfFunctionDeclaration() {
        return this.lookAhead(this.isFunctionDeclaration.bind(this));
    }
    isStartOfRootStatement() {
        switch (this.token()) {
            case 11 /* SemicolonToken */:
            case 51 /* StructKeyword */:
            case 50 /* IncludeKeyword */:
            case 69 /* TypedefKeyword */:
                return true;
        }
        if (this.isStartOfVariableDeclaration() || this.isStartOfFunctionDeclaration()) {
            return true;
        }
        return false;
    }
    isStartOfTypeDefinition() {
        return utils_1.isKeywordTypeKind(this.token()) || this.token() === 111 /* Identifier */;
    }
    isStartOfParameter() {
        return this.lookAhead(this.isParameter.bind(this));
    }
    parseLiteral(kind) {
        if (!kind) {
            kind = this.token();
        }
        const node = this.createNode(kind);
        this.parseExpected(kind, undefined, false);
        node.value = this.scanner.getTokenValue();
        node.text = this.scanner.getTokenText();
        this.nextToken();
        return this.finishNode(node);
    }
    parseInclude() {
        const node = this.createNode(133 /* IncludeStatement */);
        this.parseExpected(50 /* IncludeKeyword */);
        node.path = this.parseLiteral(3 /* StringLiteral */);
        return this.finishNode(node);
    }
    parseIdentifier(diagnosticMessage) {
        const identifier = this.createNode(111 /* Identifier */);
        this.parseExpected(111 /* Identifier */, diagnosticMessage, false);
        identifier.name = this.scanner.getTokenValue() || '';
        this.nextToken();
        return this.finishNode(identifier);
    }
    parseTypeDefinition() {
        let baseType;
        if (this.token() === 111 /* Identifier */) {
            baseType = this.parseIdentifier();
        }
        else if (utils_1.isKeywordTypeKind(this.token())) {
            baseType = this.parseTokenNode();
        }
        else {
            this.parseErrorAtCurrentToken('expected identifier or keyword');
            baseType = this.createMissingNode(111 /* Identifier */);
        }
        if (utils_1.isReferenceKeywordKind(baseType.kind)) {
            if (this.token() === 13 /* LessThanToken */) {
                const mappedType = this.createNode(114 /* MappedType */, baseType.pos);
                mappedType.returnType = baseType;
                mappedType.typeArguments = this.parseBracketedList(4 /* TypeArguments */, this.parseTypeDefinition.bind(this), 13 /* LessThanToken */, 14 /* GreaterThanToken */);
                baseType = this.finishNode(mappedType);
            }
        }
        while (this.token() === 8 /* OpenBracketToken */) {
            let arrayType = this.createNode(115 /* ArrayType */, baseType.pos);
            this.parseExpected(8 /* OpenBracketToken */);
            arrayType.size = this.parseExpression();
            arrayType.elementType = baseType;
            this.parseExpected(9 /* CloseBracketToken */);
            baseType = this.finishNode(arrayType);
        }
        return baseType;
    }
    parseParameter() {
        const param = this.createNode(140 /* ParameterDeclaration */);
        param.type = this.parseTypeDefinition();
        param.name = this.parseIdentifier();
        return this.finishNode(param);
    }
    parsePropertyDeclaration() {
        const property = this.createNode(141 /* PropertyDeclaration */);
        property.type = this.parseTypeDefinition();
        property.name = this.parseIdentifier();
        this.parseExpected(11 /* SemicolonToken */);
        return this.finishNode(property);
    }
    parseStructDeclaration() {
        const node = this.createNode(137 /* StructDeclaration */);
        this.parseExpected(51 /* StructKeyword */);
        node.name = this.parseIdentifier();
        this.parseExpected(4 /* OpenBraceToken */);
        node.members = this.parseList(2 /* StructMembers */, this.parsePropertyDeclaration.bind(this));
        this.parseExpected(5 /* CloseBraceToken */);
        this.parseExpected(11 /* SemicolonToken */);
        return this.finishNode(node);
    }
    parseModifiers() {
        let mods = this.createNodeArray();
        while (utils_1.isModifierKind(this.token())) {
            mods.push(this.parseTokenNode());
        }
        mods.end = this.scanner.getTokenPos();
        return mods;
    }
    parseFunctionDeclaration() {
        const func = this.createNode(139 /* FunctionDeclaration */);
        func.modifiers = this.parseModifiers();
        func.type = this.parseTypeDefinition();
        func.name = this.parseIdentifier();
        func.parameters = this.parseBracketedList(3 /* Parameters */, this.parseParameter.bind(this), 6 /* OpenParenToken */, 7 /* CloseParenToken */);
        if (this.token() === 4 /* OpenBraceToken */) {
            func.body = this.parseBlock(true);
        }
        else {
            this.parseExpected(11 /* SemicolonToken */);
        }
        return this.finishNode(func);
    }
    parseVariableDeclaration() {
        const variable = this.createNode(138 /* VariableDeclaration */);
        variable.modifiers = this.parseModifiers();
        variable.type = this.parseTypeDefinition();
        variable.name = this.parseIdentifier();
        if (this.token() === 39 /* EqualsToken */) {
            this.parseExpected(39 /* EqualsToken */);
            variable.initializer = this.parseBinaryExpressionOrHigher(0);
        }
        this.parseExpected(11 /* SemicolonToken */);
        return this.finishNode(variable);
    }
    parseBlock(allowVarDeclarations = false) {
        const node = this.createNode(126 /* Block */);
        if (this.parseExpected(4 /* OpenBraceToken */)) {
            node.statements = this.parseList(1 /* BlockStatements */, () => {
                const child = this.parseStatement();
                if (child.kind === 138 /* VariableDeclaration */) {
                    if (!allowVarDeclarations) {
                        this.parseErrorAtPosition(child.pos, child.end - child.pos, 'Local variables must be declared at the begining of function block');
                    }
                }
                else {
                    allowVarDeclarations = false;
                }
                return child;
            });
            this.parseExpected(5 /* CloseBraceToken */);
            return this.finishNode(node);
        }
        else {
            return this.createMissingNode(126 /* Block */);
        }
    }
    isUpdateExpression() {
        // This function is called inside parseUnaryExpression to decide
        // whether to call parseSimpleUnaryExpression or call parseUpdateExpression directly
        switch (this.token()) {
            case 20 /* PlusToken */:
            case 21 /* MinusToken */:
            case 33 /* TildeToken */:
            case 32 /* ExclamationToken */:
                return false;
            default:
                return true;
        }
    }
    isStartOfLeftHandSideExpression() {
        switch (this.token()) {
            case 68 /* NullKeyword */:
            case 66 /* TrueKeyword */:
            case 67 /* FalseKeyword */:
            case 2 /* NumericLiteral */:
            case 3 /* StringLiteral */:
            case 6 /* OpenParenToken */:
            case 111 /* Identifier */:
                return true;
            default:
                return false;
        }
    }
    makeBinaryExpression(left, operatorToken, right) {
        const node = this.createNode(122 /* BinaryExpression */, left.pos);
        node.left = left;
        node.operatorToken = operatorToken;
        node.right = right;
        return this.finishNode(node);
    }
    isBinaryOperator() {
        return this.getBinaryOperatorPrecedence() > 0;
    }
    getBinaryOperatorPrecedence() {
        switch (this.token()) {
            case 35 /* BarBarToken */:
                return 1;
            case 34 /* AmpersandAmpersandToken */:
                return 2;
            case 30 /* BarToken */:
                return 3;
            case 31 /* CaretToken */:
                return 4;
            case 29 /* AmpersandToken */:
                return 5;
            case 17 /* EqualsEqualsToken */:
            case 18 /* ExclamationEqualsToken */:
                return 6;
            case 13 /* LessThanToken */:
            case 14 /* GreaterThanToken */:
            case 15 /* LessThanEqualsToken */:
            case 16 /* GreaterThanEqualsToken */:
                return 7;
            case 27 /* LessThanLessThanToken */:
            case 28 /* GreaterThanGreaterThanToken */:
                return 8;
            case 20 /* PlusToken */:
            case 21 /* MinusToken */:
                return 9;
            case 22 /* AsteriskToken */:
            case 23 /* SlashToken */:
            case 24 /* PercentToken */:
                return 10;
        }
        // -1 is lower than all other precedences.  Returning it will cause binary expression
        // parsing to stop.
        return -1;
    }
    parsePrimaryExpression() {
        switch (this.token()) {
            case 2 /* NumericLiteral */:
            case 3 /* StringLiteral */:
                return this.parseLiteral();
            case 68 /* NullKeyword */:
            case 66 /* TrueKeyword */:
            case 67 /* FalseKeyword */:
                return this.parseTokenNode();
            case 6 /* OpenParenToken */:
                return this.parseParenthesizedExpression();
        }
        return this.parseIdentifier('expression expected');
    }
    parseParenthesizedExpression() {
        const node = this.createNode(124 /* ParenthesizedExpression */);
        this.parseExpected(6 /* OpenParenToken */);
        node.expression = this.parseExpression();
        this.parseExpected(7 /* CloseParenToken */);
        return this.finishNode(node);
    }
    parseMemberExpressionOrHigher() {
        const expression = this.parsePrimaryExpression();
        return this.parseMemberExpressionRest(expression);
    }
    parseMemberExpressionRest(expression) {
        while (true) {
            if (this.token() === 10 /* DotToken */) {
                const propertyAccess = this.createNode(118 /* PropertyAccessExpression */, expression.pos);
                this.parseExpected(10 /* DotToken */);
                propertyAccess.expression = expression;
                propertyAccess.name = this.parseIdentifier();
                expression = this.finishNode(propertyAccess);
                continue;
            }
            if (this.token() === 8 /* OpenBracketToken */) {
                const indexedAccess = this.createNode(117 /* ElementAccessExpression */, expression.pos);
                this.parseExpected(8 /* OpenBracketToken */);
                indexedAccess.expression = expression;
                indexedAccess.argumentExpression = this.parseExpression();
                this.parseExpected(9 /* CloseBracketToken */);
                expression = this.finishNode(indexedAccess);
                continue;
            }
            return expression;
        }
    }
    parseCallExpressionRest(expression) {
        while (true) {
            expression = this.parseMemberExpressionRest(expression);
            if (this.token() === 6 /* OpenParenToken */) {
                const callExpr = this.createNode(119 /* CallExpression */, expression.pos);
                callExpr.expression = expression;
                this.parseExpected(6 /* OpenParenToken */);
                callExpr.arguments = this.parseDelimitedList(5 /* ArgumentExpressions */, this.parseAssignmentExpressionOrHigher.bind(this));
                this.parseExpected(7 /* CloseParenToken */);
                expression = this.finishNode(callExpr);
                continue;
            }
            return expression;
        }
    }
    parseLeftHandSideExpressionOrHigher() {
        let expression;
        expression = this.parseMemberExpressionOrHigher();
        return this.parseCallExpressionRest(expression);
    }
    parseUpdateExpression() {
        if (this.token() === 25 /* PlusPlusToken */ || this.token() === 26 /* MinusMinusToken */) {
            this.parseErrorAtCurrentToken('unary increment operators not allowed');
            const node = this.createNode(120 /* PrefixUnaryExpression */);
            node.operator = this.parseTokenNode();
            node.operand = this.parseLeftHandSideExpressionOrHigher();
            return this.finishNode(node);
        }
        const expression = this.parseLeftHandSideExpressionOrHigher();
        if (!utils_1.isLeftHandSideExpression(expression)) {
            console.log(expression.kind);
            console.log(124 /* ParenthesizedExpression */);
            console.log(expression.kind === 124 /* ParenthesizedExpression */);
            throw new Error('isLeftHandSideExpression = false');
        }
        if ((this.token() === 25 /* PlusPlusToken */ || this.token() === 26 /* MinusMinusToken */)) {
            this.parseErrorAtCurrentToken('unary increment operators not supported');
            const node = this.createNode(121 /* PostfixUnaryExpression */, expression.pos);
            node.operand = expression;
            node.operator = this.parseTokenNode();
            return this.finishNode(node);
        }
        return expression;
    }
    parsePrefixUnaryExpression() {
        const node = this.createNode(120 /* PrefixUnaryExpression */);
        node.operator = this.parseTokenNode();
        node.operand = this.parseSimpleUnaryExpression();
        return this.finishNode(node);
    }
    parseSimpleUnaryExpression() {
        switch (this.token()) {
            case 20 /* PlusToken */:
            case 21 /* MinusToken */:
            case 33 /* TildeToken */:
            case 32 /* ExclamationToken */:
                return this.parsePrefixUnaryExpression();
            default:
                return this.parseUpdateExpression();
        }
    }
    parseUnaryExpressionOrHigher() {
        /**
         * UpdateExpression:
         *     1) LeftHandSideExpression
         *     2) LeftHandSideExpression++
         *     3) LeftHandSideExpression--
         *     4) ++UnaryExpression
         *     5) --UnaryExpression
         */
        if (this.isUpdateExpression()) {
            return this.parseUpdateExpression();
        }
        /**
         * UnaryExpression:
         *     1) UpdateExpression
         *     2) + UpdateExpression
         *     3) - UpdateExpression
         *     4) ~ UpdateExpression
         *     5) ! UpdateExpression
         */
        return this.parseSimpleUnaryExpression();
    }
    parseBinaryExpressionOrHigher(precedence) {
        const leftOperand = this.parseUnaryExpressionOrHigher();
        return this.parseBinaryExpressionRest(precedence, leftOperand);
    }
    parseBinaryExpressionRest(precedence, leftOperand) {
        while (true) {
            const newPrecedence = this.getBinaryOperatorPrecedence();
            // Check the precedence to see if we should "take" this operator
            // - For left associative operator, consume the operator,
            //   recursively call the function below, and parse binaryExpression as a rightOperand
            //   of the caller if the new precedence of the operator is greater then or equal to the current precedence.
            //   For example:
            //      a - b - c;
            //            ^token; leftOperand = b. Return b to the caller as a rightOperand
            //      a * b - c
            //            ^token; leftOperand = b. Return b to the caller as a rightOperand
            //      a - b * c;
            //            ^token; leftOperand = b. Return b * c to the caller as a rightOperand
            const consumeCurrentOperator = newPrecedence > precedence;
            if (!consumeCurrentOperator) {
                break;
            }
            leftOperand = this.makeBinaryExpression(leftOperand, this.parseTokenNode(), this.parseBinaryExpressionOrHigher(newPrecedence));
        }
        return leftOperand;
    }
    parseAssignmentExpressionOrHigher() {
        let expr = this.parseBinaryExpressionOrHigher(0);
        if (utils_1.isLeftHandSideExpression(expr) && utils_1.isAssignmentOperator(this.token())) {
            // multiple assigments in single statement is not allowed
            // return this.makeBinaryExpression(expr, <Types.BinaryOperatorToken>this.parseTokenNode(), this.parseAssignmentExpressionOrHigher());
            return this.makeBinaryExpression(expr, this.parseTokenNode(), this.parseBinaryExpressionOrHigher(0));
        }
        return expr;
    }
    parseExpression() {
        return this.parseAssignmentExpressionOrHigher();
    }
    parseTypedefDeclaration() {
        const node = this.createNode(142 /* TypedefDeclaration */);
        this.parseExpected(69 /* TypedefKeyword */);
        node.type = this.parseTypeDefinition();
        node.name = this.parseIdentifier();
        return this.finishNode(node);
    }
    parseReturnStatement() {
        const node = this.createNode(134 /* ReturnStatement */);
        this.parseExpected(57 /* ReturnKeyword */);
        if (this.token() !== 11 /* SemicolonToken */) {
            node.expression = this.parseExpression();
        }
        this.parseExpected(11 /* SemicolonToken */);
        return this.finishNode(node);
    }
    parseBreakOrContinueStatement(kind) {
        const node = this.createNode(kind);
        this.parseExpected(kind === 131 /* BreakStatement */ ? 55 /* BreakKeyword */ : 56 /* ContinueKeyword */);
        this.parseExpected(11 /* SemicolonToken */);
        return this.finishNode(node);
    }
    parseExpressionStatement() {
        const node = this.createNode(135 /* ExpressionStatement */);
        node.expression = this.parseExpression();
        this.parseExpected(11 /* SemicolonToken */);
        this.finishNode(node);
        switch (node.expression.kind) {
            case 119 /* CallExpression */:
                break;
            case 122 /* BinaryExpression */:
                if (utils_1.isAssignmentOperator(node.expression.operatorToken.kind))
                    break;
            // pass through
            default:
                this.parseErrorAtPosition(node.pos, node.end - node.pos, 'dummy expression');
        }
        return node;
    }
    parseEmptyStatement() {
        const node = this.createNode(136 /* EmptyStatement */);
        this.parseExpected(11 /* SemicolonToken */);
        return this.finishNode(node);
    }
    parseIfStatement() {
        const node = this.createNode(127 /* IfStatement */);
        this.parseExpected(64 /* IfKeyword */);
        this.parseExpected(6 /* OpenParenToken */);
        node.expression = this.parseExpression();
        this.parseExpected(7 /* CloseParenToken */);
        node.thenStatement = this.parseBlock();
        if (this.parseOptional(65 /* ElseKeyword */)) {
            node.elseStatement = this.token() === 64 /* IfKeyword */ ? this.parseIfStatement() : this.parseBlock();
        }
        return this.finishNode(node);
    }
    parseDoStatement() {
        const node = this.createNode(128 /* DoStatement */);
        this.parseExpected(61 /* DoKeyword */);
        node.statement = this.parseBlock();
        this.parseExpected(63 /* WhileKeyword */);
        this.parseExpected(6 /* OpenParenToken */);
        node.expression = this.parseExpression();
        this.parseExpected(7 /* CloseParenToken */);
        this.parseExpected(11 /* SemicolonToken */);
        return this.finishNode(node);
    }
    parseWhileStatement() {
        const node = this.createNode(129 /* WhileStatement */);
        this.parseExpected(63 /* WhileKeyword */);
        this.parseExpected(6 /* OpenParenToken */);
        node.expression = this.parseExpression();
        this.parseExpected(7 /* CloseParenToken */);
        node.statement = this.parseBlock();
        return this.finishNode(node);
    }
    parseForStatement() {
        const node = this.createNode(130 /* ForStatement */);
        this.parseExpected(62 /* ForKeyword */);
        this.parseExpected(6 /* OpenParenToken */);
        if (this.token() !== 11 /* SemicolonToken */ && this.token() !== 7 /* CloseParenToken */) {
            node.initializer = this.parseExpression();
        }
        this.parseExpected(11 /* SemicolonToken */);
        if (this.token() !== 11 /* SemicolonToken */ && this.token() !== 7 /* CloseParenToken */) {
            node.condition = this.parseExpression();
        }
        this.parseExpected(11 /* SemicolonToken */);
        if (this.token() !== 7 /* CloseParenToken */) {
            node.incrementor = this.parseExpression();
        }
        this.parseExpected(7 /* CloseParenToken */);
        node.statement = this.parseBlock();
        return this.finishNode(node);
    }
    parseStatement() {
        switch (this.token()) {
            case 11 /* SemicolonToken */:
                return this.parseEmptyStatement();
            case 50 /* IncludeKeyword */:
                return this.parseInclude();
            case 51 /* StructKeyword */:
                return this.parseStructDeclaration();
            case 64 /* IfKeyword */:
                return this.parseIfStatement();
            case 61 /* DoKeyword */:
                return this.parseDoStatement();
            case 63 /* WhileKeyword */:
                return this.parseWhileStatement();
            case 62 /* ForKeyword */:
                return this.parseForStatement();
            case 56 /* ContinueKeyword */:
                return this.parseBreakOrContinueStatement(132 /* ContinueStatement */);
            case 55 /* BreakKeyword */:
                return this.parseBreakOrContinueStatement(131 /* BreakStatement */);
            case 57 /* ReturnKeyword */:
                return this.parseReturnStatement();
            case 69 /* TypedefKeyword */:
                return this.parseTypedefDeclaration();
            case 111 /* Identifier */:
            case 53 /* ConstKeyword */:
            case 52 /* StaticKeyword */:
            case 54 /* NativeKeyword */:
            case 76 /* AbilcmdKeyword */:
            case 77 /* ActorKeyword */:
            case 78 /* ActorscopeKeyword */:
            case 79 /* AifilterKeyword */:
            case 80 /* BankKeyword */:
            case 81 /* BitmaskKeyword */:
            case 70 /* BoolKeyword */:
            case 71 /* ByteKeyword */:
            case 82 /* CamerainfoKeyword */:
            case 72 /* CharKeyword */:
            case 83 /* ColorKeyword */:
            case 84 /* DoodadKeyword */:
            case 74 /* FixedKeyword */:
            case 85 /* HandleKeyword */:
            case 86 /* GenerichandleKeyword */:
            case 87 /* EffecthistoryKeyword */:
            case 73 /* IntKeyword */:
            case 88 /* MarkerKeyword */:
            case 89 /* OrderKeyword */:
            case 90 /* PlayergroupKeyword */:
            case 91 /* PointKeyword */:
            case 92 /* RegionKeyword */:
            case 93 /* RevealerKeyword */:
            case 94 /* SoundKeyword */:
            case 95 /* SoundlinkKeyword */:
            case 75 /* StringKeyword */:
            case 96 /* TextKeyword */:
            case 97 /* TimerKeyword */:
            case 98 /* TransmissionsourceKeyword */:
            case 99 /* TriggerKeyword */:
            case 100 /* UnitKeyword */:
            case 101 /* UnitfilterKeyword */:
            case 102 /* UnitgroupKeyword */:
            case 103 /* UnitrefKeyword */:
            case 104 /* VoidKeyword */:
            case 105 /* WaveKeyword */:
            case 106 /* WaveinfoKeyword */:
            case 107 /* WavetargetKeyword */:
            case 108 /* ArrayrefKeyword */:
            case 109 /* StructrefKeyword */:
            case 110 /* FuncrefKeyword */:
                if (this.isStartOfFunctionDeclaration()) {
                    return this.parseFunctionDeclaration();
                }
                else if (this.isStartOfVariableDeclaration()) {
                    return this.parseVariableDeclaration();
                }
                return this.parseExpressionStatement();
            default:
                return this.parseExpressionStatement();
            // throw new Error("unexpected: " + getKindName(this.currentToken) + ": " + tokenToString(this.currentToken));
        }
    }
    setText(text) {
        this.scanner.setText(text);
    }
    parseFile(fileName, text) {
        this.scanner.setText(text);
        this.syntaxTokens = [];
        this.sourceFile = this.createNode(125 /* SourceFile */, 0);
        this.sourceFile.commentsLineMap = new Map();
        this.sourceFile.parseDiagnostics = [];
        this.sourceFile.bindDiagnostics = [];
        this.sourceFile.additionalSyntacticDiagnostics = [];
        this.sourceFile.fileName = fileName;
        this.nextToken();
        this.sourceFile.statements = this.parseList(0 /* SourceElements */, this.parseStatement.bind(this));
        this.finishNode(this.sourceFile);
        this.sourceFile.lineMap = this.scanner.getLineMap();
        this.sourceFile.text = text;
        utils_1.fixupParentReferences(this.sourceFile);
        return this.sourceFile;
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map