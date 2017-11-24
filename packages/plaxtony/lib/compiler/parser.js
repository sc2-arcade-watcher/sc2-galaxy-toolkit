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
        this.parseErrorAtCurrentToken("missing node {0}", kind);
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
        if (this.token() === 109 /* EndOfFileToken */) {
            // Being at the end of the file ends all lists.
            return true;
        }
        switch (kind) {
            case 0 /* SourceElements */:
                return false;
            case 1 /* BlockStatements */:
            case 2 /* StructMembers */:
                return this.token() === 4 /* CloseBraceToken */;
            case 5 /* ArgumentExpressions */:
            case 3 /* Parameters */:
                return this.token() === 6 /* CloseParenToken */;
            case 4 /* TypeArguments */:
                return this.token() === 13 /* GreaterThanToken */;
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
                if (this.parseOptional(11 /* CommaToken */)) {
                    // No need to check for a zero length node since we know we parsed a comma
                    continue;
                }
                commaStart = -1; // Back to the state where the last token was not a comma
                if (this.isListTerminator(kind)) {
                    break;
                }
                // We didn't get a comma, and the list wasn't terminated, explicitly parse
                // out a comma so we give a good error message.
                this.parseExpected(11 /* CommaToken */);
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
        while (this.token() === 52 /* ConstKeyword */ || this.token() === 51 /* StaticKeyword */) {
            this.nextToken();
        }
        if (!utils_1.isKeywordTypeKind(this.token()) && this.token() !== 108 /* Identifier */) {
            return false;
        }
        this.parseTypeDefinition();
        if (this.token() !== 108 /* Identifier */) {
            return false;
        }
        this.nextToken();
        if (this.token() !== 38 /* EqualsToken */ && this.token() !== 10 /* SemicolonToken */) {
            return false;
        }
        return true;
    }
    isFunctionDeclaration() {
        while (this.token() === 53 /* NativeKeyword */ || this.token() === 51 /* StaticKeyword */) {
            this.nextToken();
        }
        if (!utils_1.isKeywordTypeKind(this.token()) && this.token() !== 108 /* Identifier */) {
            return false;
        }
        this.parseTypeDefinition();
        if (this.token() !== 108 /* Identifier */) {
            return false;
        }
        this.nextToken();
        if (this.token() !== 5 /* OpenParenToken */) {
            return false;
        }
        return true;
    }
    isStartOfExpression() {
        if (this.isStartOfLeftHandSideExpression()) {
            return true;
        }
        switch (this.token()) {
            case 19 /* PlusToken */:
            case 20 /* MinusToken */:
            case 32 /* TildeToken */:
            case 31 /* ExclamationToken */:
            case 24 /* PlusPlusToken */:
            case 25 /* MinusMinusToken */:
                return true;
            default:
                // Error tolerance.  If we see the start of some binary operator, we consider
                // that the start of an expression.  That way we'll parse out a missing identifier,
                // give a good message about an identifier being missing, and then consume the
                // rest of the binary expression.
                if (this.isBinaryOperator()) {
                    return true;
                }
                return this.token() === 108 /* Identifier */;
        }
    }
    isStartOfStatement() {
        switch (this.token()) {
            case 10 /* SemicolonToken */:
            case 3 /* OpenBraceToken */:
            case 50 /* StructKeyword */:
            case 60 /* IfKeyword */:
            case 57 /* DoKeyword */:
            case 59 /* WhileKeyword */:
            case 58 /* ForKeyword */:
            case 55 /* ContinueKeyword */:
            case 54 /* BreakKeyword */:
            case 56 /* ReturnKeyword */:
            case 49 /* IncludeKeyword */:
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
            case 10 /* SemicolonToken */:
            case 50 /* StructKeyword */:
            case 49 /* IncludeKeyword */:
            case 65 /* TypedefKeyword */:
                return true;
        }
        if (this.isStartOfVariableDeclaration() || this.isStartOfFunctionDeclaration()) {
            return true;
        }
        return false;
    }
    isStartOfTypeDefinition() {
        return utils_1.isKeywordTypeKind(this.token()) || this.token() === 108 /* Identifier */;
    }
    isStartOfParameter() {
        return this.isStartOfTypeDefinition();
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
        const node = this.createNode(130 /* IncludeStatement */);
        this.parseExpected(49 /* IncludeKeyword */);
        node.path = this.parseLiteral(2 /* StringLiteral */);
        return this.finishNode(node);
    }
    parseIdentifier(diagnosticMessage) {
        const identifier = this.createNode(108 /* Identifier */);
        this.parseExpected(108 /* Identifier */, diagnosticMessage, false);
        identifier.name = this.scanner.getTokenValue();
        this.nextToken();
        return this.finishNode(identifier);
    }
    parseTypeDefinition() {
        let baseType;
        if (this.token() === 108 /* Identifier */) {
            baseType = this.parseIdentifier();
        }
        else if (utils_1.isKeywordTypeKind(this.token())) {
            baseType = this.parseTokenNode();
        }
        else {
            this.parseErrorAtCurrentToken('expected identifier or keyword');
            baseType = this.createMissingNode(108 /* Identifier */);
        }
        while (this.token() === 7 /* OpenBracketToken */) {
            let arrayType = this.createNode(112 /* ArrayType */, baseType.pos);
            this.parseExpected(7 /* OpenBracketToken */);
            arrayType.size = this.parseExpression();
            arrayType.elementType = baseType;
            this.parseExpected(8 /* CloseBracketToken */);
            baseType = this.finishNode(arrayType);
        }
        if (utils_1.isReferenceKeywordKind(baseType.kind)) {
            if (this.token() === 12 /* LessThanToken */) {
                const mappedType = this.createNode(111 /* MappedType */, baseType.pos);
                mappedType.returnType = baseType;
                mappedType.typeArguments = this.parseBracketedList(4 /* TypeArguments */, this.parseTypeDefinition.bind(this), 12 /* LessThanToken */, 13 /* GreaterThanToken */);
                baseType = this.finishNode(mappedType);
            }
        }
        return baseType;
    }
    parseParameter() {
        const param = this.createNode(137 /* ParameterDeclaration */);
        param.type = this.parseTypeDefinition();
        param.name = this.parseIdentifier();
        return this.finishNode(param);
    }
    parsePropertyDeclaration() {
        const property = this.createNode(138 /* PropertyDeclaration */);
        property.type = this.parseTypeDefinition();
        property.name = this.parseIdentifier();
        this.parseExpected(10 /* SemicolonToken */);
        return this.finishNode(property);
    }
    parseStructDeclaration() {
        const node = this.createNode(134 /* StructDeclaration */);
        this.parseExpected(50 /* StructKeyword */);
        node.name = this.parseIdentifier();
        this.parseExpected(3 /* OpenBraceToken */);
        node.members = this.parseList(2 /* StructMembers */, this.parsePropertyDeclaration.bind(this));
        this.parseExpected(4 /* CloseBraceToken */);
        this.parseExpected(10 /* SemicolonToken */);
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
        const func = this.createNode(136 /* FunctionDeclaration */);
        func.modifiers = this.parseModifiers();
        func.type = this.parseTypeDefinition();
        func.name = this.parseIdentifier();
        func.parameters = this.parseBracketedList(3 /* Parameters */, this.parseParameter.bind(this), 5 /* OpenParenToken */, 6 /* CloseParenToken */);
        if (this.token() === 3 /* OpenBraceToken */) {
            func.body = this.parseBlock();
        }
        else {
            this.parseExpected(10 /* SemicolonToken */);
        }
        return this.finishNode(func);
    }
    parseVariableDeclaration() {
        const variable = this.createNode(135 /* VariableDeclaration */);
        variable.modifiers = this.parseModifiers();
        variable.type = this.parseTypeDefinition();
        variable.name = this.parseIdentifier();
        if (this.token() === 38 /* EqualsToken */) {
            this.parseExpected(38 /* EqualsToken */);
            variable.initializer = this.parseAssignmentExpressionOrHigher();
        }
        this.parseExpected(10 /* SemicolonToken */);
        return this.finishNode(variable);
    }
    parseBlock() {
        const node = this.createNode(123 /* Block */);
        this.parseExpected(3 /* OpenBraceToken */);
        node.statements = this.parseList(1 /* BlockStatements */, this.parseStatement.bind(this));
        this.parseExpected(4 /* CloseBraceToken */);
        return this.finishNode(node);
    }
    isUpdateExpression() {
        // This function is called inside parseUnaryExpression to decide
        // whether to call parseSimpleUnaryExpression or call parseUpdateExpression directly
        switch (this.token()) {
            case 19 /* PlusToken */:
            case 20 /* MinusToken */:
            case 32 /* TildeToken */:
            case 31 /* ExclamationToken */:
                return false;
            default:
                return true;
        }
    }
    isStartOfLeftHandSideExpression() {
        switch (this.token()) {
            case 64 /* NullKeyword */:
            case 62 /* TrueKeyword */:
            case 63 /* FalseKeyword */:
            case 1 /* NumericLiteral */:
            case 2 /* StringLiteral */:
            case 5 /* OpenParenToken */:
            case 108 /* Identifier */:
                return true;
            default:
                return false;
        }
    }
    makeBinaryExpression(left, operatorToken, right) {
        const node = this.createNode(119 /* BinaryExpression */, left.pos);
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
            case 34 /* BarBarToken */:
                return 1;
            case 33 /* AmpersandAmpersandToken */:
                return 2;
            case 29 /* BarToken */:
                return 3;
            case 30 /* CaretToken */:
                return 4;
            case 28 /* AmpersandToken */:
                return 5;
            case 16 /* EqualsEqualsToken */:
            case 17 /* ExclamationEqualsToken */:
                return 6;
            case 12 /* LessThanToken */:
            case 13 /* GreaterThanToken */:
            case 14 /* LessThanEqualsToken */:
            case 15 /* GreaterThanEqualsToken */:
                return 7;
            case 26 /* LessThanLessThanToken */:
            case 27 /* GreaterThanGreaterThanToken */:
                return 8;
            case 19 /* PlusToken */:
            case 20 /* MinusToken */:
                return 9;
            case 21 /* AsteriskToken */:
            case 22 /* SlashToken */:
            case 23 /* PercentToken */:
                return 10;
        }
        // -1 is lower than all other precedences.  Returning it will cause binary expression
        // parsing to stop.
        return -1;
    }
    parsePrimaryExpression() {
        switch (this.token()) {
            case 1 /* NumericLiteral */:
            case 2 /* StringLiteral */:
                return this.parseLiteral();
            case 64 /* NullKeyword */:
            case 62 /* TrueKeyword */:
            case 63 /* FalseKeyword */:
                return this.parseTokenNode();
            case 5 /* OpenParenToken */:
                return this.parseParenthesizedExpression();
        }
        return this.parseIdentifier('expression expected');
    }
    parseParenthesizedExpression() {
        const node = this.createNode(121 /* ParenthesizedExpression */);
        this.parseExpected(5 /* OpenParenToken */);
        node.expression = this.parseExpression();
        this.parseExpected(6 /* CloseParenToken */);
        return this.finishNode(node);
    }
    parseMemberExpressionOrHigher() {
        const expression = this.parsePrimaryExpression();
        return this.parseMemberExpressionRest(expression);
    }
    parseMemberExpressionRest(expression) {
        while (true) {
            if (this.token() === 9 /* DotToken */) {
                const propertyAccess = this.createNode(115 /* PropertyAccessExpression */, expression.pos);
                this.parseExpected(9 /* DotToken */);
                propertyAccess.expression = expression;
                propertyAccess.name = this.parseIdentifier();
                expression = this.finishNode(propertyAccess);
                continue;
            }
            if (this.token() === 7 /* OpenBracketToken */) {
                const indexedAccess = this.createNode(114 /* ElementAccessExpression */, expression.pos);
                this.parseExpected(7 /* OpenBracketToken */);
                indexedAccess.expression = expression;
                indexedAccess.argumentExpression = this.parseExpression();
                this.parseExpected(8 /* CloseBracketToken */);
                expression = this.finishNode(indexedAccess);
                continue;
            }
            return expression;
        }
    }
    parseCallExpressionRest(expression) {
        while (true) {
            expression = this.parseMemberExpressionRest(expression);
            if (this.token() === 5 /* OpenParenToken */) {
                const callExpr = this.createNode(116 /* CallExpression */, expression.pos);
                callExpr.expression = expression;
                this.parseExpected(5 /* OpenParenToken */);
                callExpr.arguments = this.parseDelimitedList(5 /* ArgumentExpressions */, this.parseAssignmentExpressionOrHigher.bind(this));
                this.parseExpected(6 /* CloseParenToken */);
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
        if (this.token() === 24 /* PlusPlusToken */ || this.token() === 25 /* MinusMinusToken */) {
            this.parseErrorAtCurrentToken('unary increment operators not allowed');
            const node = this.createNode(117 /* PrefixUnaryExpression */);
            node.operator = this.parseTokenNode();
            node.operand = this.parseLeftHandSideExpressionOrHigher();
            return this.finishNode(node);
        }
        const expression = this.parseLeftHandSideExpressionOrHigher();
        if (!utils_1.isLeftHandSideExpression(expression)) {
            console.log(expression.kind);
            console.log(121 /* ParenthesizedExpression */);
            console.log(expression.kind === 121 /* ParenthesizedExpression */);
            throw new Error('isLeftHandSideExpression = false');
        }
        if ((this.token() === 24 /* PlusPlusToken */ || this.token() === 25 /* MinusMinusToken */)) {
            this.parseErrorAtCurrentToken('unary increment operators not supported');
            const node = this.createNode(118 /* PostfixUnaryExpression */, expression.pos);
            node.operand = expression;
            node.operator = this.parseTokenNode();
            return this.finishNode(node);
        }
        return expression;
    }
    parsePrefixUnaryExpression() {
        const node = this.createNode(117 /* PrefixUnaryExpression */);
        node.operator = this.parseTokenNode();
        node.operand = this.parseSimpleUnaryExpression();
        return this.finishNode(node);
    }
    parseSimpleUnaryExpression() {
        switch (this.token()) {
            case 19 /* PlusToken */:
            case 20 /* MinusToken */:
            case 32 /* TildeToken */:
            case 31 /* ExclamationToken */:
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
        const node = this.createNode(139 /* TypedefDeclaration */);
        this.parseExpected(65 /* TypedefKeyword */);
        node.type = this.parseTypeDefinition();
        node.name = this.parseIdentifier();
        return this.finishNode(node);
    }
    parseReturnStatement() {
        const node = this.createNode(131 /* ReturnStatement */);
        this.parseExpected(56 /* ReturnKeyword */);
        if (this.token() !== 10 /* SemicolonToken */) {
            node.expression = this.parseExpression();
        }
        this.parseExpected(10 /* SemicolonToken */);
        return this.finishNode(node);
    }
    parseBreakOrContinueStatement(kind) {
        const node = this.createNode(kind);
        this.parseExpected(kind === 128 /* BreakStatement */ ? 54 /* BreakKeyword */ : 55 /* ContinueKeyword */);
        this.parseExpected(10 /* SemicolonToken */);
        return this.finishNode(node);
    }
    parseExpressionStatement() {
        const node = this.createNode(132 /* ExpressionStatement */);
        node.expression = this.parseExpression();
        this.parseExpected(10 /* SemicolonToken */);
        return this.finishNode(node);
    }
    parseEmptyStatement() {
        const node = this.createNode(133 /* EmptyStatement */);
        this.parseExpected(10 /* SemicolonToken */);
        return this.finishNode(node);
    }
    parseIfStatement() {
        const node = this.createNode(124 /* IfStatement */);
        this.parseExpected(60 /* IfKeyword */);
        this.parseExpected(5 /* OpenParenToken */);
        node.expression = this.parseExpression();
        this.parseExpected(6 /* CloseParenToken */);
        node.thenStatement = this.parseBlock();
        if (this.parseOptional(61 /* ElseKeyword */)) {
            node.elseStatement = this.token() === 60 /* IfKeyword */ ? this.parseIfStatement() : this.parseBlock();
        }
        return this.finishNode(node);
    }
    parseDoStatement() {
        const node = this.createNode(125 /* DoStatement */);
        this.parseExpected(57 /* DoKeyword */);
        node.statement = this.parseBlock();
        this.parseExpected(59 /* WhileKeyword */);
        this.parseExpected(5 /* OpenParenToken */);
        node.expression = this.parseExpression();
        this.parseExpected(6 /* CloseParenToken */);
        this.parseExpected(10 /* SemicolonToken */);
        return this.finishNode(node);
    }
    parseWhileStatement() {
        const node = this.createNode(126 /* WhileStatement */);
        this.parseExpected(59 /* WhileKeyword */);
        this.parseExpected(5 /* OpenParenToken */);
        node.expression = this.parseExpression();
        this.parseExpected(6 /* CloseParenToken */);
        node.statement = this.parseBlock();
        return this.finishNode(node);
    }
    parseForStatement() {
        const node = this.createNode(127 /* ForStatement */);
        this.parseExpected(58 /* ForKeyword */);
        this.parseExpected(5 /* OpenParenToken */);
        if (this.token() !== 10 /* SemicolonToken */ && this.token() !== 6 /* CloseParenToken */) {
            node.initializer = this.parseExpression();
        }
        this.parseExpected(10 /* SemicolonToken */);
        if (this.token() !== 10 /* SemicolonToken */ && this.token() !== 6 /* CloseParenToken */) {
            node.condition = this.parseExpression();
        }
        this.parseExpected(10 /* SemicolonToken */);
        if (this.token() !== 6 /* CloseParenToken */) {
            node.incrementor = this.parseExpression();
        }
        this.parseExpected(6 /* CloseParenToken */);
        node.statement = this.parseBlock();
        return this.finishNode(node);
    }
    parseStatement() {
        switch (this.token()) {
            case 10 /* SemicolonToken */:
                return this.parseEmptyStatement();
            case 49 /* IncludeKeyword */:
                return this.parseInclude();
            case 50 /* StructKeyword */:
                return this.parseStructDeclaration();
            case 60 /* IfKeyword */:
                return this.parseIfStatement();
            case 57 /* DoKeyword */:
                return this.parseDoStatement();
            case 59 /* WhileKeyword */:
                return this.parseWhileStatement();
            case 58 /* ForKeyword */:
                return this.parseForStatement();
            case 55 /* ContinueKeyword */:
                return this.parseBreakOrContinueStatement(129 /* ContinueStatement */);
            case 54 /* BreakKeyword */:
                return this.parseBreakOrContinueStatement(128 /* BreakStatement */);
            case 56 /* ReturnKeyword */:
                return this.parseReturnStatement();
            case 65 /* TypedefKeyword */:
                return this.parseTypedefDeclaration();
            case 108 /* Identifier */:
            case 52 /* ConstKeyword */:
            case 51 /* StaticKeyword */:
            case 53 /* NativeKeyword */:
            case 72 /* AbilcmdKeyword */:
            case 73 /* ActorKeyword */:
            case 74 /* ActorscopeKeyword */:
            case 75 /* AifilterKeyword */:
            case 76 /* AnimfilterKeyword */:
            case 77 /* BankKeyword */:
            case 78 /* BitmaskKeyword */:
            case 66 /* BoolKeyword */:
            case 67 /* ByteKeyword */:
            case 79 /* CamerainfoKeyword */:
            case 68 /* CharKeyword */:
            case 80 /* ColorKeyword */:
            case 81 /* DoodadKeyword */:
            case 70 /* FixedKeyword */:
            case 82 /* HandleKeyword */:
            case 83 /* GenerichandleKeyword */:
            case 84 /* EffecthistoryKeyword */:
            case 69 /* IntKeyword */:
            case 85 /* MarkerKeyword */:
            case 86 /* OrderKeyword */:
            case 87 /* PlayergroupKeyword */:
            case 88 /* PointKeyword */:
            case 89 /* RegionKeyword */:
            case 90 /* RevealerKeyword */:
            case 91 /* SoundKeyword */:
            case 92 /* SoundlinkKeyword */:
            case 71 /* StringKeyword */:
            case 93 /* TextKeyword */:
            case 94 /* TimerKeyword */:
            case 95 /* TransmissionsourceKeyword */:
            case 96 /* TriggerKeyword */:
            case 97 /* UnitKeyword */:
            case 98 /* UnitfilterKeyword */:
            case 99 /* UnitgroupKeyword */:
            case 100 /* UnitrefKeyword */:
            case 101 /* VoidKeyword */:
            case 102 /* WaveKeyword */:
            case 103 /* WaveinfoKeyword */:
            case 104 /* WavetargetKeyword */:
            case 105 /* ArrayrefKeyword */:
            case 106 /* StructrefKeyword */:
            case 107 /* FuncrefKeyword */:
                if (this.isStartOfFunctionDeclaration()) {
                    return this.parseFunctionDeclaration();
                }
                else if (this.isStartOfVariableDeclaration()) {
                    return this.parseVariableDeclaration();
                }
                return this.parseExpressionStatement();
            default:
                return this.parseExpressionStatement();
        }
    }
    setText(text) {
        this.scanner.setText(text);
    }
    parseFile(fileName, text) {
        this.scanner.setText(text);
        this.syntaxTokens = [];
        this.sourceFile = this.createNode(122 /* SourceFile */, 0);
        this.sourceFile.parseDiagnostics = [];
        this.sourceFile.bindDiagnostics = [];
        this.sourceFile.additionalSyntacticDiagnostics = [];
        this.sourceFile.fileName = fileName;
        this.nextToken();
        this.sourceFile.statements = this.parseList(0 /* SourceElements */, this.parseStatement.bind(this));
        this.finishNode(this.sourceFile);
        this.sourceFile.lineMap = this.scanner.getLineMap();
        utils_1.fixupParentReferences(this.sourceFile);
        return this.sourceFile;
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map