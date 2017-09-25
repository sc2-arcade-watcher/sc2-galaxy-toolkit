"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Types = require("./types");
const scanner_1 = require("./scanner");
const utils_1 = require("./utils");
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
        this.scanner = new scanner_1.Scanner((message) => {
            this.parseErrorAtCurrentToken(message.message);
        });
    }
    token() {
        return this.currentToken;
    }
    nextToken() {
        return this.currentToken = this.scanner.scan();
    }
    parseErrorAtCurrentToken(message, arg0) {
        const start = this.scanner.getTokenPos();
        const length = this.scanner.getTextPos() - start;
        this.parseErrorAtPosition(start, length, message, arg0);
    }
    parseErrorAtPosition(start, length, message, arg0) {
        const diag = utils_1.createFileDiagnostic(this.sourceFile, start, length, {
            code: 1001,
            category: Types.DiagnosticCategory.Error,
            message: message,
        }, arg0);
        diag.line = this.scanner.getLine();
        diag.col = this.scanner.getChar();
        this.sourceFile.parseDiagnostics.push(diag);
    }
    speculationHelper(callback, isLookAhead) {
        const saveToken = this.currentToken;
        const saveSyntaxTokensLength = this.syntaxTokens.length;
        const saveSyntaxTokensCurrentLength = this.syntaxTokens[this.syntaxTokens.length - 1].length;
        const result = isLookAhead
            ? this.scanner.lookAhead(callback)
            : this.scanner.tryScan(callback);
        if (!result || isLookAhead) {
            this.currentToken = saveToken;
            if (this.syntaxTokens.length > saveSyntaxTokensLength) {
                this.syntaxTokens = this.syntaxTokens.slice(0, saveSyntaxTokensLength);
            }
            if (this.syntaxTokens[this.syntaxTokens.length - 1].length > saveSyntaxTokensCurrentLength) {
                this.syntaxTokens[this.syntaxTokens.length - 1] = this.syntaxTokens[this.syntaxTokens.length - 1].slice(0, saveSyntaxTokensCurrentLength);
            }
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
        node.pos = pos === undefined ? this.scanner.getStartPos() : pos;
        node.end = node.pos;
        node.line = this.scanner.getLine();
        node.char = this.scanner.getChar();
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
        const result = this.createNode(0);
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
        if (this.token() === 108) {
            return true;
        }
        switch (kind) {
            case 0:
                return false;
            case 1:
            case 2:
                return this.token() === 4;
            case 5:
            case 3:
                return this.token() === 6;
            case 4:
                return this.token() === 13;
        }
    }
    parsingContextErrors(context) {
        switch (context) {
            case 0:
                return 'expected declaration';
            case 1:
                return 'expected declaration or statement';
            case 2:
                return 'expected property declaration';
            case 4:
                return 'expected type argumnt definition';
            case 5:
                return 'expected argumnt expression';
            case 3:
                return 'expected parameter declaration';
        }
    }
    isListElement(parsingContext, inErrorRecovery) {
        switch (parsingContext) {
            case 0:
                return this.isStartOfRootStatement();
            case 1:
                return this.isStartOfStatement();
            case 2:
                return this.isStartOfVariableDeclaration();
            case 4:
                return this.isStartOfTypeDefinition();
            case 3:
                return this.isStartOfParameter();
            case 5:
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
            this.parseErrorAtCurrentToken(this.parsingContextErrors(kind));
            this.nextToken();
            if (kind !== 0) {
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
        while (true) {
            if (this.isListElement(kind, false)) {
                const startPos = this.scanner.getStartPos();
                result.push(parseElement());
                if (this.parseOptional(11)) {
                    continue;
                }
                if (this.isListTerminator(kind)) {
                    break;
                }
                this.parseExpected(11);
                continue;
            }
            if (this.isListTerminator(kind)) {
                break;
            }
            this.parseErrorAtCurrentToken(this.parsingContextErrors(kind));
        }
        result.end = this.scanner.getTokenPos();
        this.parsingContext = saveParsingContext;
        return result;
    }
    isVariableDeclaration() {
        while (this.token() === 52 || this.token() === 51) {
            this.nextToken();
        }
        if (!utils_1.isKeywordTypeKind(this.token()) && this.token() !== 107) {
            return false;
        }
        this.parseTypeDefinition();
        if (this.token() !== 107) {
            return false;
        }
        this.nextToken();
        if (this.token() !== 38 && this.token() !== 10) {
            return false;
        }
        return true;
    }
    isFunctionDeclaration() {
        while (this.token() === 53 || this.token() === 51) {
            this.nextToken();
        }
        if (!utils_1.isKeywordTypeKind(this.token()) && this.token() !== 107) {
            return false;
        }
        this.parseTypeDefinition();
        if (this.token() !== 107) {
            return false;
        }
        this.nextToken();
        if (this.token() !== 5) {
            return false;
        }
        return true;
    }
    isStartOfExpression() {
        if (this.isStartOfLeftHandSideExpression()) {
            return true;
        }
        switch (this.token()) {
            case 19:
            case 20:
            case 32:
            case 31:
            case 24:
            case 25:
                return true;
            default:
                if (this.isBinaryOperator()) {
                    return true;
                }
                return this.token() === 107;
        }
    }
    isStartOfStatement() {
        switch (this.token()) {
            case 10:
            case 3:
            case 50:
            case 60:
            case 57:
            case 59:
            case 58:
            case 55:
            case 54:
            case 56:
            case 49:
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
            case 10:
            case 50:
            case 49:
                return true;
        }
        if (this.isStartOfVariableDeclaration() || this.isStartOfFunctionDeclaration()) {
            return true;
        }
        return false;
    }
    isStartOfTypeDefinition() {
        return utils_1.isKeywordTypeKind(this.token()) || this.token() === 107;
    }
    isStartOfParameter() {
        return this.isStartOfTypeDefinition();
    }
    parseLiteral(kind) {
        const node = this.createNode(kind);
        this.parseExpected(kind, undefined, false);
        node.text = this.scanner.getTokenValue();
        this.nextToken();
        return this.finishNode(node);
    }
    parseInclude() {
        const node = this.createNode(129);
        this.parseExpected(49);
        node.path = this.parseLiteral(2);
        return this.finishNode(node);
    }
    parseIdentifier(diagnosticMessage) {
        this.parseExpected(107, diagnosticMessage, false);
        const identifier = this.createNode(107);
        identifier.name = this.scanner.getTokenValue();
        this.nextToken();
        return this.finishNode(identifier);
    }
    parseTypeDefinition() {
        let type;
        if (this.token() === 107) {
            type = this.createNode(109);
            type.name = this.parseIdentifier();
        }
        else if (utils_1.isKeywordTypeKind(this.token())) {
            type = this.createNode(110);
            type.keyword = this.parseTokenNode();
        }
        else {
            this.parseErrorAtCurrentToken('expected identifier or keyword');
            type = this.createMissingNode(110);
        }
        if (this.token() === 12) {
            type.typeArguments = this.parseBracketedList(4, this.parseTypeDefinition.bind(this), 12, 13);
        }
        while (this.parseOptional(7)) {
            let arrayType = this.createNode(111);
            arrayType.size = this.parseExpression();
            arrayType.elementType = type;
            type = arrayType;
            this.parseExpected(8);
        }
        return this.finishNode(type);
    }
    parseParameter() {
        const param = this.createNode(136);
        param.type = this.parseTypeDefinition();
        param.name = this.parseIdentifier();
        return this.finishNode(param);
    }
    parsePropertyDeclaration() {
        const property = this.createNode(137);
        property.type = this.parseTypeDefinition();
        property.name = this.parseIdentifier();
        this.parseExpected(10);
        return this.finishNode(property);
    }
    parseStructDeclaration() {
        const node = this.createNode(133);
        this.parseExpected(50);
        node.name = this.parseIdentifier();
        this.parseExpected(3);
        node.members = this.parseList(2, this.parsePropertyDeclaration.bind(this));
        this.parseExpected(4);
        this.parseExpected(10);
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
        const func = this.createNode(135);
        func.modifiers = this.parseModifiers();
        func.type = this.parseTypeDefinition();
        func.name = this.parseIdentifier();
        func.parameters = this.parseBracketedList(3, this.parseParameter.bind(this), 5, 6);
        if (this.token() === 3) {
            func.body = this.parseBlock();
        }
        else {
            this.parseExpected(10);
        }
        return this.finishNode(func);
    }
    parseVariableDeclaration() {
        const variable = this.createNode(134);
        variable.modifiers = this.parseModifiers();
        variable.type = this.parseTypeDefinition();
        variable.name = this.parseIdentifier();
        if (this.token() === 38) {
            this.parseExpected(38);
            variable.initializer = this.parseAssignmentExpressionOrHigher();
        }
        this.parseExpected(10);
        return this.finishNode(variable);
    }
    parseBlock() {
        const node = this.createNode(122);
        this.parseExpected(3);
        node.statements = this.parseList(1, this.parseStatement.bind(this));
        this.parseExpected(4);
        return this.finishNode(node);
    }
    parseLiteralNode() {
        const node = this.createNode(this.token());
        node.text = this.scanner.getTokenValue();
        this.nextToken();
        return this.finishNode(node);
    }
    isUpdateExpression() {
        switch (this.token()) {
            case 19:
            case 20:
            case 32:
            case 31:
                return false;
            default:
                return true;
        }
    }
    isStartOfLeftHandSideExpression() {
        switch (this.token()) {
            case 64:
            case 62:
            case 63:
            case 1:
            case 2:
            case 5:
            case 107:
                return true;
            default:
                return false;
        }
    }
    makeBinaryExpression(left, operatorToken, right) {
        const node = this.createNode(118, left.pos);
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
            case 34:
                return 1;
            case 33:
                return 2;
            case 29:
                return 3;
            case 30:
                return 4;
            case 28:
                return 5;
            case 16:
            case 17:
                return 6;
            case 12:
            case 13:
            case 14:
            case 15:
                return 7;
            case 26:
            case 27:
                return 8;
            case 19:
            case 20:
                return 9;
            case 21:
            case 22:
            case 23:
                return 10;
        }
        return -1;
    }
    parsePrimaryExpression() {
        switch (this.token()) {
            case 1:
            case 2:
                return this.parseLiteralNode();
            case 64:
            case 62:
            case 63:
                return this.parseTokenNode();
            case 5:
                return this.parseParenthesizedExpression();
        }
        return this.parseIdentifier('expression expected');
    }
    parseParenthesizedExpression() {
        const node = this.createNode(120);
        this.parseExpected(5);
        node.expression = this.parseExpression();
        this.parseExpected(6);
        return this.finishNode(node);
    }
    parseMemberExpressionOrHigher() {
        const expression = this.parsePrimaryExpression();
        return this.parseMemberExpressionRest(expression);
    }
    parseMemberExpressionRest(expression) {
        while (true) {
            if (this.parseOptional(9)) {
                const propertyAccess = this.createNode(114, expression.pos);
                propertyAccess.expression = expression;
                propertyAccess.name = this.parseIdentifier();
                expression = this.finishNode(propertyAccess);
                continue;
            }
            if (this.parseOptional(7)) {
                const indexedAccess = this.createNode(113, expression.pos);
                indexedAccess.expression = expression;
                indexedAccess.argumentExpression = this.parseExpression();
                this.parseExpected(8);
                expression = this.finishNode(indexedAccess);
                continue;
            }
            return expression;
        }
    }
    parseCallExpressionRest(expression) {
        while (true) {
            expression = this.parseMemberExpressionRest(expression);
            if (this.token() === 5) {
                const callExpr = this.createNode(115, expression.pos);
                callExpr.expression = expression;
                this.parseExpected(5);
                callExpr.arguments = this.parseDelimitedList(5, this.parseAssignmentExpressionOrHigher.bind(this));
                this.parseExpected(6);
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
        if (this.token() === 24 || this.token() === 25) {
            this.parseErrorAtCurrentToken('unary increment operators not allowed');
            const node = this.createNode(116);
            node.operator = this.token();
            this.nextToken();
            node.operand = this.parseLeftHandSideExpressionOrHigher();
            return this.finishNode(node);
        }
        const expression = this.parseLeftHandSideExpressionOrHigher();
        if (!utils_1.isLeftHandSideExpression(expression)) {
            console.log(expression.kind);
            console.log(120);
            console.log(expression.kind === 120);
            throw new Error('isLeftHandSideExpression = false');
        }
        if ((this.token() === 24 || this.token() === 25)) {
            this.parseErrorAtCurrentToken('unary increment operators not supported');
            const node = this.createNode(117, expression.pos);
            node.operand = expression;
            node.operator = this.token();
            this.nextToken();
            return this.finishNode(node);
        }
        return expression;
    }
    parsePrefixUnaryExpression() {
        const node = this.createNode(116);
        node.operator = this.token();
        this.nextToken();
        node.operand = this.parseSimpleUnaryExpression();
        return this.finishNode(node);
    }
    parseSimpleUnaryExpression() {
        switch (this.token()) {
            case 19:
            case 20:
            case 32:
            case 31:
                return this.parsePrefixUnaryExpression();
            default:
                return this.parseUpdateExpression();
        }
    }
    parseUnaryExpressionOrHigher() {
        if (this.isUpdateExpression()) {
            return this.parseUpdateExpression();
        }
        return this.parseSimpleUnaryExpression();
    }
    parseBinaryExpressionOrHigher(precedence) {
        const leftOperand = this.parseUnaryExpressionOrHigher();
        return this.parseBinaryExpressionRest(precedence, leftOperand);
    }
    parseBinaryExpressionRest(precedence, leftOperand) {
        while (true) {
            const newPrecedence = this.getBinaryOperatorPrecedence();
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
            return this.makeBinaryExpression(expr, this.parseTokenNode(), this.parseBinaryExpressionOrHigher(0));
        }
        return expr;
    }
    parseExpression() {
        return this.parseAssignmentExpressionOrHigher();
    }
    parseReturnStatement() {
        const node = this.createNode(130);
        this.parseExpected(56);
        if (this.token() !== 10) {
            node.expression = this.parseExpression();
        }
        this.parseExpected(10);
        return this.finishNode(node);
    }
    parseBreakOrContinueStatement(kind) {
        const node = this.createNode(kind);
        this.parseExpected(kind === 127 ? 54 : 55);
        this.parseExpected(10);
        return this.finishNode(node);
    }
    parseExpressionStatement() {
        const node = this.createNode(131);
        node.expression = this.parseExpression();
        this.parseExpected(10);
        return this.finishNode(node);
    }
    parseEmptyStatement() {
        const node = this.createNode(132);
        this.parseExpected(10);
        return this.finishNode(node);
    }
    parseIfStatement() {
        const node = this.createNode(123);
        this.parseExpected(60);
        this.parseExpected(5);
        node.expression = this.parseExpression();
        this.parseExpected(6);
        node.thenStatement = this.parseBlock();
        if (this.parseOptional(61)) {
            node.elseStatement = this.token() === 60 ? this.parseIfStatement() : this.parseBlock();
        }
        return this.finishNode(node);
    }
    parseDoStatement() {
        const node = this.createNode(124);
        this.parseExpected(57);
        node.statement = this.parseBlock();
        this.parseExpected(59);
        this.parseExpected(5);
        node.expression = this.parseExpression();
        this.parseExpected(6);
        this.parseExpected(10);
        return this.finishNode(node);
    }
    parseWhileStatement() {
        const node = this.createNode(125);
        this.parseExpected(59);
        this.parseExpected(5);
        node.expression = this.parseExpression();
        this.parseExpected(6);
        node.statement = this.parseBlock();
        return this.finishNode(node);
    }
    parseForStatement() {
        const node = this.createNode(126);
        this.parseExpected(58);
        this.parseExpected(5);
        if (this.token() !== 10 && this.token() !== 6) {
            node.initializer = this.parseExpression();
        }
        this.parseExpected(10);
        if (this.token() !== 10 && this.token() !== 6) {
            node.condition = this.parseExpression();
        }
        this.parseExpected(10);
        if (this.token() !== 6) {
            node.incrementor = this.parseExpression();
        }
        this.parseExpected(6);
        node.statement = this.parseBlock();
        return this.finishNode(node);
    }
    parseStatement() {
        switch (this.token()) {
            case 10:
                return this.parseEmptyStatement();
            case 49:
                return this.parseInclude();
            case 50:
                return this.parseStructDeclaration();
            case 60:
                return this.parseIfStatement();
            case 57:
                return this.parseDoStatement();
            case 59:
                return this.parseWhileStatement();
            case 58:
                return this.parseForStatement();
            case 55:
                return this.parseBreakOrContinueStatement(128);
            case 54:
                return this.parseBreakOrContinueStatement(127);
            case 56:
                return this.parseReturnStatement();
            case 107:
            case 52:
            case 51:
            case 53:
            case 66:
            case 67:
            case 68:
            case 69:
            case 70:
            case 71:
            case 72:
            case 73:
            case 74:
            case 75:
            case 76:
            case 77:
            case 78:
            case 79:
            case 80:
            case 81:
            case 82:
            case 83:
            case 84:
            case 85:
            case 86:
            case 87:
            case 88:
            case 89:
            case 90:
            case 91:
            case 92:
            case 93:
            case 94:
            case 95:
            case 96:
            case 97:
            case 98:
            case 99:
            case 100:
            case 101:
            case 102:
            case 103:
            case 104:
            case 105:
            case 106:
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
        this.sourceFile = this.createNode(121, 0);
        this.sourceFile.parseDiagnostics = [];
        this.sourceFile.bindDiagnostics = [];
        this.sourceFile.additionalSyntacticDiagnostics = [];
        this.sourceFile.fileName = fileName;
        this.nextToken();
        this.sourceFile.statements = this.parseList(0, this.parseStatement.bind(this));
        this.finishNode(this.sourceFile);
        this.sourceFile.lineMap = this.scanner.getLineMap();
        utils_1.fixupParentReferences(this.sourceFile);
        return this.sourceFile;
    }
}
exports.Parser = Parser;
