import * as Types from './types';
import { SyntaxKind, Node, NodeArray, MutableNodeArray } from './types';
import { Scanner, tokenToString } from './scanner';
import { getKindName, isModifierKind, isKeywordTypeKind, isLeftHandSideExpression, isAssignmentOperator, fixupParentReferences, isReferenceKeywordKind } from './utils';
import { createFileDiagnostic } from './diagnostics';

const enum ParsingContext {
    SourceElements,
    BlockStatements,
    StructMembers,
    Parameters,
    TypeArguments,
    ArgumentExpressions,
}

export class Parser {
    private scanner: Scanner;
    private currentToken: SyntaxKind;
    private parsingContext: ParsingContext = 0;
    private sourceFile: Types.SourceFile;
    private syntaxTokens: Types.Node[][];

    private token(): SyntaxKind {
        return this.currentToken;
    }

    private nextToken(): SyntaxKind {
        return this.currentToken = this.scanner.scan();
    }

    private parseErrorAtCurrentToken(message: string, arg0?: any): void {
        const start = this.scanner.getStartPos();
        const length = this.scanner.getTokenPos() - start;

        this.parseErrorAtPosition(start, length, message, arg0);
    }

    private parseErrorAtPosition(start: number, length: number, message: string, arg0?: any): void {
        const diag = createFileDiagnostic(
            this.sourceFile,
            start,
            length,
            <Types.DiagnosticMessage>{
                code: 1001,
                category: Types.DiagnosticCategory.Error,
                message: message,
            },
            arg0
        );
        // TODO: line & col should not be here
        diag.line = this.scanner.getLine();
        diag.col = this.scanner.getChar();
        this.sourceFile.parseDiagnostics.push(diag);
        // throw new Error(`${diag.file!.fileName} [${diag.start}]: ${diag.messageText}`);
        // throw new Error(`${diag.file!.fileName} [${this.scanner.getLine()}:${this.scanner.getCol()}]: ${diag.messageText}`);
    }

    private speculationHelper<T>(callback: () => T, isLookAhead: boolean): T {
        // Keep track of the state we'll need to rollback to if lookahead fails (or if the
        // caller asked us to always reset our state).
        const saveToken = this.currentToken;
        const saveSyntaxTokensLength = this.syntaxTokens.length;
        const saveSyntaxTokensCurrentLength = this.syntaxTokens[this.syntaxTokens.length - 1].length;
        // const saveParseDiagnosticsLength = parseDiagnostics.length;
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
            // parseDiagnostics.length = saveParseDiagnosticsLength;
            // parseErrorBeforeNextFinishedNode = saveParseErrorBeforeNextFinishedNode;
        }

        return result;
    }

    private lookAhead<T>(callback: () => T): T {
        return this.speculationHelper(callback, true);
    }

    private parseExpected(kind: SyntaxKind, diagnosticMessage?: string, shouldAdvance = true): boolean {
        if (this.token() === kind) {
            if (shouldAdvance) {
                this.syntaxTokens[this.syntaxTokens.length - 1].push(this.parseTokenNode());
            }
            return true;
        }

        if (diagnosticMessage == null) {
            diagnosticMessage = "Expected " + getKindName(kind) + ", found " + getKindName(this.currentToken);
        }

        this.parseErrorAtCurrentToken(diagnosticMessage);

        return false;
    }

    private parseOptional(t: SyntaxKind): boolean {
        if (this.token() === t) {
            this.syntaxTokens[this.syntaxTokens.length - 1].push(this.parseTokenNode());
            return true;
        }
        return false;
    }

    private parseTokenNode<T extends Node>(): T {
        const node = <T>this.createNode(this.token(), undefined, false);
        this.nextToken();
        return this.finishNode(node, undefined, false);
    }

    private createNode(kind: SyntaxKind, pos?: number, assignSyntaxTokens: boolean = true): Node {
        const node = <Node>{};
        node.kind = kind;
        node.pos = pos === undefined ? this.scanner.getTokenPos() : pos;
        node.end = node.pos;
        node.line = this.scanner.getLine();
        node.char = this.scanner.getChar();

        if (process.env.PLAXTONY_DEBUG) {
            (<any>node).kindName = getKindName(node.kind);
        }

        if (assignSyntaxTokens) {
            this.syntaxTokens.push([]);
        }
        return node;
    }

    private createNodeArray<T extends Node>(elements?: T[], pos?: number): MutableNodeArray<T> {
        const array = <MutableNodeArray<T>>(elements || []);
        if (pos === undefined) {
            pos = this.scanner.getStartPos();
        }
        array.pos = pos;
        array.end = pos;
        return array;
    }

    private createMissingNode<T extends Node>(kind: T["kind"]): T {
        this.parseErrorAtCurrentToken("missing node {0}", kind);

        const result = this.createNode(SyntaxKind.Unknown);

        return this.finishNode(result) as T;
    }

    private createMissingList<T extends Node>(): NodeArray<T> {
        return this.createNodeArray<T>();
    }

    private finishNode<T extends Node>(node: T, end?: number, assignSyntaxTokens: boolean = true): T {
        node.end = end === undefined ? this.scanner.getStartPos() : end;
        if (assignSyntaxTokens) {
            node.syntaxTokens = this.syntaxTokens.pop();
            for (const token of node.syntaxTokens) {
                token.parent = node;
            }
        }
        return node;
    }

    private isListTerminator(kind: ParsingContext): boolean {
        if (this.token() === SyntaxKind.EndOfFileToken) {
            // Being at the end of the file ends all lists.
            return true;
        }

        switch (kind) {
            case ParsingContext.SourceElements:
                return false;
            case ParsingContext.BlockStatements:
            case ParsingContext.StructMembers:
                return this.token() === SyntaxKind.CloseBraceToken;
            case ParsingContext.ArgumentExpressions:
            case ParsingContext.Parameters:
                return this.token() === SyntaxKind.CloseParenToken;
            case ParsingContext.TypeArguments:
                return this.token() === SyntaxKind.GreaterThanToken;
        }
    }

    private parsingContextErrors(context: ParsingContext): string {
        switch (context) {
            case ParsingContext.SourceElements:
                return 'expected declaration';
            case ParsingContext.BlockStatements:
                return 'expected declaration or statement';
            case ParsingContext.StructMembers:
                return 'expected property declaration';
            case ParsingContext.TypeArguments:
                return 'expected type argumnt definition';
            case ParsingContext.ArgumentExpressions:
                return 'expected argumnt expression';
            case ParsingContext.Parameters:
                return 'expected parameter declaration';
        }
    }

    private isListElement(parsingContext: ParsingContext, inErrorRecovery: boolean): boolean {
        switch (parsingContext) {
            case ParsingContext.SourceElements:
                return this.isStartOfRootStatement();
            case ParsingContext.BlockStatements:
                return this.isStartOfStatement();
            case ParsingContext.StructMembers:
                return this.isStartOfVariableDeclaration();
            case ParsingContext.TypeArguments:
                return this.isStartOfTypeDefinition();
            case ParsingContext.Parameters:
                return this.isStartOfParameter();
            case ParsingContext.ArgumentExpressions:
                return this.isStartOfExpression();
        }
    }

    private parseList<T extends Node>(kind: ParsingContext, parseElement: () => T): NodeArray<T> {
        const saveParsingContext = this.parsingContext;
        this.parsingContext |= 1 << kind;
        const result = this.createNodeArray<T>();

        while (!this.isListTerminator(kind)) {
            if (this.isListElement(kind, false)) {
                result.push(parseElement());

                continue;
            }

            const start = this.scanner.getStartPos();
            this.nextToken();
            this.parseErrorAtPosition(start, this.scanner.getTokenPos() - start, this.parsingContextErrors(kind));
            if (kind !== ParsingContext.SourceElements) {
                break;
            }
        }

        result.end = this.scanner.getTokenPos();
        this.parsingContext = saveParsingContext;
        return result;
    }

    private parseBracketedList<T extends Node>(kind: ParsingContext, parseElement: () => T, open: SyntaxKind, close: SyntaxKind): NodeArray<T> {
        if (this.parseExpected(open)) {
            const result = this.parseDelimitedList(kind, parseElement);
            this.parseExpected(close);
            return result;
        }

        return this.createMissingList<T>();
    }

    private parseDelimitedList<T extends Node>(kind: ParsingContext, parseElement: () => T): NodeArray<T> {
        const saveParsingContext = this.parsingContext;
        this.parsingContext |= 1 << kind;
        const result = this.createNodeArray<T>();

        while (true) {
            if (this.isListElement(kind, false)) {
                const startPos = this.scanner.getTokenPos();
                result.push(parseElement());

                if (this.parseOptional(SyntaxKind.CommaToken)) {
                    // No need to check for a zero length node since we know we parsed a comma
                    continue;
                }

                if (this.isListTerminator(kind)) {
                    break;
                }

                // We didn't get a comma, and the list wasn't terminated, explicitly parse
                // out a comma so we give a good error message.
                this.parseExpected(SyntaxKind.CommaToken);

                continue;
            }

            if (this.isListTerminator(kind)) {
                break;
            }

            this.parseErrorAtCurrentToken(this.parsingContextErrors(kind));
            this.nextToken();
        }

        result.end = this.scanner.getTokenPos();
        this.parsingContext = saveParsingContext;
        return result;
    }

    private isVariableDeclaration(): boolean {
        while (this.token() === SyntaxKind.ConstKeyword || this.token() === SyntaxKind.StaticKeyword) {
            this.nextToken();
        }

        if (!isKeywordTypeKind(this.token()) && this.token() !== SyntaxKind.Identifier) {
            return false;
        }

        this.parseTypeDefinition();

        if (this.token() !== SyntaxKind.Identifier) {
            return false;
        }

        this.nextToken();
        if (this.token() !== SyntaxKind.EqualsToken && this.token() !== SyntaxKind.SemicolonToken) {
            return false;
        }

        return true;
    }

    private isFunctionDeclaration(): boolean {
        while (this.token() === SyntaxKind.NativeKeyword || this.token() === SyntaxKind.StaticKeyword) {
            this.nextToken();
        }

        if (!isKeywordTypeKind(this.token()) && this.token() !== SyntaxKind.Identifier) {
            return false;
        }

        this.parseTypeDefinition();

        if (this.token() !== SyntaxKind.Identifier) {
            return false;
        }

        this.nextToken();
        if (this.token() !== SyntaxKind.OpenParenToken) {
            return false;
        }

        return true;
    }

    private isStartOfExpression(): boolean {
        if (this.isStartOfLeftHandSideExpression()) {
            return true;
        }

        switch (this.token()) {
            case SyntaxKind.PlusToken:
            case SyntaxKind.MinusToken:
            case SyntaxKind.TildeToken:
            case SyntaxKind.ExclamationToken:
            case SyntaxKind.PlusPlusToken:
            case SyntaxKind.MinusMinusToken:
                return true;
            default:
                // Error tolerance.  If we see the start of some binary operator, we consider
                // that the start of an expression.  That way we'll parse out a missing identifier,
                // give a good message about an identifier being missing, and then consume the
                // rest of the binary expression.
                if (this.isBinaryOperator()) {
                    return true;
                }

                return this.token() === SyntaxKind.Identifier;
        }
    }

    private isStartOfStatement(): boolean {
        switch (this.token()) {
            case SyntaxKind.SemicolonToken:
            case SyntaxKind.OpenBraceToken:
            case SyntaxKind.StructKeyword:
            case SyntaxKind.IfKeyword:
            case SyntaxKind.DoKeyword:
            case SyntaxKind.WhileKeyword:
            case SyntaxKind.ForKeyword:
            case SyntaxKind.ContinueKeyword:
            case SyntaxKind.BreakKeyword:
            case SyntaxKind.ReturnKeyword:
            case SyntaxKind.IncludeKeyword:
                return true;

            default:
                if (this.isStartOfVariableDeclaration()) {
                    return true;
                }
                return this.isStartOfExpression();
        }
    }

    private isStartOfVariableDeclaration(): boolean {
        return this.lookAhead(this.isVariableDeclaration.bind(this));
    }

    private isStartOfFunctionDeclaration(): boolean {
        return this.lookAhead(this.isFunctionDeclaration.bind(this));
    }

    private isStartOfRootStatement(): boolean {
        switch (this.token()) {
            case SyntaxKind.SemicolonToken:
            case SyntaxKind.StructKeyword:
            case SyntaxKind.IncludeKeyword:
                return true;
        }

        if (this.isStartOfVariableDeclaration() || this.isStartOfFunctionDeclaration()) {
            return true;
        }

        return false;
    }

    private isStartOfTypeDefinition(): boolean {
        return isKeywordTypeKind(this.token()) || this.token() === SyntaxKind.Identifier;
    }

    private isStartOfParameter(): boolean {
        return this.isStartOfTypeDefinition();
    }

    private parseLiteral(kind?: SyntaxKind): Types.Literal {
        if (!kind) {
            kind = this.token();
        }
        const node = <Types.Literal>this.createNode(kind);
        this.parseExpected(kind, undefined, false);
        node.value = this.scanner.getTokenValue();
        node.text = this.scanner.getTokenText();
        this.nextToken();
        return this.finishNode(node);
    }

    private parseInclude(): Types.IncludeStatement {
        const node = <Types.IncludeStatement>this.createNode(SyntaxKind.IncludeStatement);
        this.parseExpected(SyntaxKind.IncludeKeyword);
        node.path = <Types.StringLiteral>this.parseLiteral(SyntaxKind.StringLiteral);
        return this.finishNode(node);
    }

    private parseIdentifier(diagnosticMessage?: string): Types.Identifier {
        const identifier = <Types.Identifier>this.createNode(SyntaxKind.Identifier);
        this.parseExpected(SyntaxKind.Identifier, diagnosticMessage, false);
        identifier.name = this.scanner.getTokenValue();
        this.nextToken();
        return this.finishNode(identifier);
    }

    private parseTypeDefinition(): Types.TypeNode {
        let baseType: Types.TypeNode;

        if (this.token() === SyntaxKind.Identifier) {
            baseType = this.parseIdentifier();
        }
        else if (isKeywordTypeKind(this.token())) {
            baseType = this.parseTokenNode();
        }
        else {
            this.parseErrorAtCurrentToken('expected identifier or keyword');
            baseType = this.createMissingNode(SyntaxKind.Identifier);
        }

        while (this.token() === SyntaxKind.OpenBracketToken) {
            let arrayType = <Types.ArrayTypeNode>this.createNode(SyntaxKind.ArrayType, baseType.pos);
            this.parseExpected(SyntaxKind.OpenBracketToken)
            arrayType.size = this.parseExpression();
            arrayType.elementType = baseType;
            this.parseExpected(SyntaxKind.CloseBracketToken);
            baseType = this.finishNode(arrayType)
        }

        if (isReferenceKeywordKind(baseType.kind)) {
            if (this.token() === SyntaxKind.LessThanToken) {
                const mappedType = <Types.MappedTypeNode>this.createNode(SyntaxKind.MappedType, baseType.pos);
                mappedType.returnType = baseType;
                mappedType.typeArguments = this.parseBracketedList(ParsingContext.TypeArguments, this.parseTypeDefinition.bind(this), SyntaxKind.LessThanToken, SyntaxKind.GreaterThanToken);
                baseType = this.finishNode(mappedType)
            }
        }

        return baseType;
    }

    private parseParameter(): Types.ParameterDeclaration {
        const param = <Types.ParameterDeclaration>this.createNode(SyntaxKind.ParameterDeclaration);
        param.type = this.parseTypeDefinition();
        param.name = this.parseIdentifier();
        return this.finishNode(param)
    }

    private parsePropertyDeclaration(): Types.PropertyDeclaration {
        const property = <Types.PropertyDeclaration>this.createNode(SyntaxKind.PropertyDeclaration);
        property.type = this.parseTypeDefinition();
        property.name = this.parseIdentifier();
        this.parseExpected(SyntaxKind.SemicolonToken);
        return this.finishNode(property)
    }

    private parseStructDeclaration(): Types.StructDeclaration {
        const node = <Types.StructDeclaration>this.createNode(SyntaxKind.StructDeclaration);
        this.parseExpected(SyntaxKind.StructKeyword);
        node.name = this.parseIdentifier();
        this.parseExpected(SyntaxKind.OpenBraceToken);
        node.members = this.parseList(ParsingContext.StructMembers, this.parsePropertyDeclaration.bind(this));
        this.parseExpected(SyntaxKind.CloseBraceToken);
        this.parseExpected(SyntaxKind.SemicolonToken);
        return this.finishNode(node);
    }

    private parseModifiers(): NodeArray<Types.Modifier> {
        let mods = this.createNodeArray<Types.Modifier>();
        while (isModifierKind(this.token())) {
            mods.push(this.parseTokenNode());
        }
        mods.end = this.scanner.getTokenPos();
        return mods;
    }

    private parseFunctionDeclaration(): Types.FunctionDeclaration {
        const func = <Types.FunctionDeclaration>this.createNode(SyntaxKind.FunctionDeclaration);
        func.modifiers = this.parseModifiers();
        func.type = this.parseTypeDefinition();
        func.name = this.parseIdentifier();

        func.parameters = this.parseBracketedList(ParsingContext.Parameters, this.parseParameter.bind(this), SyntaxKind.OpenParenToken, SyntaxKind.CloseParenToken);

        if (this.token() === SyntaxKind.OpenBraceToken) {
            func.body = this.parseBlock();
        }
        else {
            this.parseExpected(SyntaxKind.SemicolonToken);
        }
        return this.finishNode(func);
    }

    private parseVariableDeclaration(): Types.VariableDeclaration {
        const variable = <Types.VariableDeclaration>this.createNode(SyntaxKind.VariableDeclaration);
        variable.modifiers = this.parseModifiers();
        variable.type = this.parseTypeDefinition();
        variable.name = this.parseIdentifier();
        if (this.token() === SyntaxKind.EqualsToken) {
            this.parseExpected(SyntaxKind.EqualsToken);
            variable.initializer = this.parseAssignmentExpressionOrHigher();
        }
        this.parseExpected(SyntaxKind.SemicolonToken);
        return this.finishNode(variable);
    }

    private parseBlock(): Types.Block {
        const node = <Types.Block>this.createNode(SyntaxKind.Block);
        this.parseExpected(SyntaxKind.OpenBraceToken);
        node.statements = this.parseList(ParsingContext.BlockStatements, this.parseStatement.bind(this));
        this.parseExpected(SyntaxKind.CloseBraceToken);
        return this.finishNode(node);
    }

    private isUpdateExpression(): boolean {
        // This function is called inside parseUnaryExpression to decide
        // whether to call parseSimpleUnaryExpression or call parseUpdateExpression directly
        switch (this.token()) {
            case SyntaxKind.PlusToken:
            case SyntaxKind.MinusToken:
            case SyntaxKind.TildeToken:
            case SyntaxKind.ExclamationToken:
                return false;
            default:
                return true;
        }
    }

    private isStartOfLeftHandSideExpression(): boolean {
        switch (this.token()) {
            case SyntaxKind.NullKeyword:
            case SyntaxKind.TrueKeyword:
            case SyntaxKind.FalseKeyword:
            case SyntaxKind.NumericLiteral:
            case SyntaxKind.StringLiteral:
            case SyntaxKind.OpenParenToken:
            case SyntaxKind.Identifier:
                return true;
            default:
                return false;
        }
    }

    private makeBinaryExpression(left: Types.Expression, operatorToken: Types.BinaryOperatorToken, right: Types.Expression): Types.BinaryExpression {
        const node = <Types.BinaryExpression>this.createNode(SyntaxKind.BinaryExpression, left.pos);
        node.left = left;
        node.operatorToken = operatorToken;
        node.right = right;
        return this.finishNode(node);
    }

    private isBinaryOperator() {
        return this.getBinaryOperatorPrecedence() > 0;
    }

    private getBinaryOperatorPrecedence(): number {
        switch (this.token()) {
            case SyntaxKind.BarBarToken:
                return 1;
            case SyntaxKind.AmpersandAmpersandToken:
                return 2;
            case SyntaxKind.BarToken:
                return 3;
            case SyntaxKind.CaretToken:
                return 4;
            case SyntaxKind.AmpersandToken:
                return 5;
            case SyntaxKind.EqualsEqualsToken:
            case SyntaxKind.ExclamationEqualsToken:
                return 6;
            case SyntaxKind.LessThanToken:
            case SyntaxKind.GreaterThanToken:
            case SyntaxKind.LessThanEqualsToken:
            case SyntaxKind.GreaterThanEqualsToken:
                return 7;
            case SyntaxKind.LessThanLessThanToken:
            case SyntaxKind.GreaterThanGreaterThanToken:
                return 8;
            case SyntaxKind.PlusToken:
            case SyntaxKind.MinusToken:
                return 9;
            case SyntaxKind.AsteriskToken:
            case SyntaxKind.SlashToken:
            case SyntaxKind.PercentToken:
                return 10;
        }

        // -1 is lower than all other precedences.  Returning it will cause binary expression
        // parsing to stop.
        return -1;
    }

    private parsePrimaryExpression(): Types.PrimaryExpression {
        switch (this.token()) {
            case SyntaxKind.NumericLiteral:
            case SyntaxKind.StringLiteral:
                return this.parseLiteral();
            case SyntaxKind.NullKeyword:
            case SyntaxKind.TrueKeyword:
            case SyntaxKind.FalseKeyword:
                return this.parseTokenNode<Types.PrimaryExpression>();
            case SyntaxKind.OpenParenToken:
                return this.parseParenthesizedExpression();
        }

        return this.parseIdentifier('expression expected');
    }

    private parseParenthesizedExpression(): Types.ParenthesizedExpression {
        const node = <Types.ParenthesizedExpression>this.createNode(SyntaxKind.ParenthesizedExpression);
        this.parseExpected(SyntaxKind.OpenParenToken);
        node.expression = this.parseExpression();
        this.parseExpected(SyntaxKind.CloseParenToken);
        return this.finishNode(node);
    }

    private parseMemberExpressionOrHigher(): Types.MemberExpression {
        const expression = this.parsePrimaryExpression();
        return this.parseMemberExpressionRest(expression);
    }

    private parseMemberExpressionRest(expression: Types.LeftHandSideExpression): Types.MemberExpression {
        while (true) {
            if (this.token() === SyntaxKind.DotToken) {
                const propertyAccess = <Types.PropertyAccessExpression>this.createNode(SyntaxKind.PropertyAccessExpression, expression.pos);
                this.parseExpected(SyntaxKind.DotToken);
                propertyAccess.expression = expression;
                propertyAccess.name = this.parseIdentifier();
                expression = this.finishNode(propertyAccess);
                continue;
            }

            if (this.token() === SyntaxKind.OpenBracketToken) {
                const indexedAccess = <Types.ElementAccessExpression>this.createNode(SyntaxKind.ElementAccessExpression, expression.pos);
                this.parseExpected(SyntaxKind.OpenBracketToken);
                indexedAccess.expression = expression;
                indexedAccess.argumentExpression = this.parseExpression();
                this.parseExpected(SyntaxKind.CloseBracketToken);
                expression = this.finishNode(indexedAccess);
                continue;
            }

            return <Types.MemberExpression>expression;
        }
    }

    private parseCallExpressionRest(expression: Types.LeftHandSideExpression): Types.LeftHandSideExpression {
        while (true) {
            expression = this.parseMemberExpressionRest(expression);

            if (this.token() === SyntaxKind.OpenParenToken) {
                const callExpr = <Types.CallExpression>this.createNode(SyntaxKind.CallExpression, expression.pos);
                callExpr.expression = expression;
                this.parseExpected(SyntaxKind.OpenParenToken);
                callExpr.arguments = this.parseDelimitedList(ParsingContext.ArgumentExpressions, this.parseAssignmentExpressionOrHigher.bind(this));
                this.parseExpected(SyntaxKind.CloseParenToken);
                expression = this.finishNode(callExpr);
                continue;
            }

            return expression;
        }
    }

    private parseLeftHandSideExpressionOrHigher(): Types.LeftHandSideExpression {
        let expression: Types.MemberExpression;
        expression = this.parseMemberExpressionOrHigher();
        return this.parseCallExpressionRest(expression);
    }

    private parseUpdateExpression(): Types.UpdateExpression {
        if (this.token() === SyntaxKind.PlusPlusToken || this.token() === SyntaxKind.MinusMinusToken) {
            this.parseErrorAtCurrentToken('unary increment operators not allowed');
            const node = <Types.PrefixUnaryExpression>this.createNode(SyntaxKind.PrefixUnaryExpression);
            node.operator = this.parseTokenNode();
            node.operand = this.parseLeftHandSideExpressionOrHigher();
            return this.finishNode(node);
        }

        const expression = this.parseLeftHandSideExpressionOrHigher();

        if (!isLeftHandSideExpression(expression)) {
            console.log(expression.kind);
            console.log(SyntaxKind.ParenthesizedExpression);
            console.log(expression.kind === SyntaxKind.ParenthesizedExpression);
            throw new Error('isLeftHandSideExpression = false');
        }

        if ((this.token() === SyntaxKind.PlusPlusToken || this.token() === SyntaxKind.MinusMinusToken)) {
            this.parseErrorAtCurrentToken('unary increment operators not supported');
            const node = <Types.PostfixUnaryExpression>this.createNode(SyntaxKind.PostfixUnaryExpression, expression.pos);
            node.operand = expression;
            node.operator = this.parseTokenNode();
            return this.finishNode(node);
        }

        return expression;
    }

    private parsePrefixUnaryExpression() {
        const node = <Types.PrefixUnaryExpression>this.createNode(SyntaxKind.PrefixUnaryExpression);
        node.operator = this.parseTokenNode();
        node.operand = this.parseSimpleUnaryExpression();

        return this.finishNode(node);
    }

    private parseSimpleUnaryExpression(): Types.UnaryExpression {
        switch (this.token()) {
            case SyntaxKind.PlusToken:
            case SyntaxKind.MinusToken:
            case SyntaxKind.TildeToken:
            case SyntaxKind.ExclamationToken:
                return this.parsePrefixUnaryExpression();
            default:
                return this.parseUpdateExpression();
        }
    }

    private parseUnaryExpressionOrHigher(): Types.UnaryExpression | Types.BinaryExpression {
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

    private parseBinaryExpressionOrHigher(precedence: number): Types.Expression {
        const leftOperand = this.parseUnaryExpressionOrHigher();
        return this.parseBinaryExpressionRest(precedence, leftOperand);
    }

    private parseBinaryExpressionRest(precedence: number, leftOperand: Types.Expression): Types.Expression {
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

            leftOperand = this.makeBinaryExpression(leftOperand, <Types.BinaryOperatorToken>this.parseTokenNode(), this.parseBinaryExpressionOrHigher(newPrecedence));
        }

        return leftOperand;
    }

    private parseAssignmentExpressionOrHigher(): Types.Expression {
        let expr = this.parseBinaryExpressionOrHigher(0);

        if (isLeftHandSideExpression(expr) && isAssignmentOperator(this.token())) {
            // multiple assigments in single statement is not allowed
            // return this.makeBinaryExpression(expr, <Types.BinaryOperatorToken>this.parseTokenNode(), this.parseAssignmentExpressionOrHigher());
            return this.makeBinaryExpression(expr, <Types.BinaryOperatorToken>this.parseTokenNode(), this.parseBinaryExpressionOrHigher(0));
        }

        return expr;
    }

    private parseExpression(): Types.Expression {
        return this.parseAssignmentExpressionOrHigher();
    }

    private parseReturnStatement(): Types.ReturnStatement {
        const node = <Types.ReturnStatement>this.createNode(SyntaxKind.ReturnStatement);
        this.parseExpected(SyntaxKind.ReturnKeyword);
        if (this.token() !== SyntaxKind.SemicolonToken) {
            node.expression = this.parseExpression();
        }
        this.parseExpected(SyntaxKind.SemicolonToken);
        return this.finishNode(node);
    }

    private parseBreakOrContinueStatement(kind: SyntaxKind): Types.BreakOrContinueStatement {
        const node = <Types.BreakOrContinueStatement>this.createNode(kind);

        this.parseExpected(kind === SyntaxKind.BreakStatement ? SyntaxKind.BreakKeyword : SyntaxKind.ContinueKeyword);
        this.parseExpected(SyntaxKind.SemicolonToken);
        return this.finishNode(node);
    }

    private parseExpressionStatement(): Types.ExpressionStatement {
        const node = <Types.ExpressionStatement>this.createNode(SyntaxKind.ExpressionStatement);
        node.expression = this.parseExpression();
        this.parseExpected(SyntaxKind.SemicolonToken);
        return this.finishNode(node);
    }

    private parseEmptyStatement(): Types.EmptyStatement {
        const node = <Types.EmptyStatement>this.createNode(SyntaxKind.EmptyStatement);
        this.parseExpected(SyntaxKind.SemicolonToken);
        return this.finishNode(node);
    }

    private parseIfStatement(): Types.IfStatement {
        const node = <Types.IfStatement>this.createNode(SyntaxKind.IfStatement);
        this.parseExpected(SyntaxKind.IfKeyword);
        this.parseExpected(SyntaxKind.OpenParenToken);
        node.expression = this.parseExpression();
        this.parseExpected(SyntaxKind.CloseParenToken);
        node.thenStatement = this.parseBlock();
        if (this.parseOptional(SyntaxKind.ElseKeyword)) {
            node.elseStatement = this.token() === SyntaxKind.IfKeyword ? this.parseIfStatement() : this.parseBlock();
        }
        return this.finishNode(node);
    }

    private parseDoStatement(): Types.DoStatement {
        const node = <Types.DoStatement>this.createNode(SyntaxKind.DoStatement);
        this.parseExpected(SyntaxKind.DoKeyword);
        node.statement = this.parseBlock();
        this.parseExpected(SyntaxKind.WhileKeyword);
        this.parseExpected(SyntaxKind.OpenParenToken);
        node.expression = this.parseExpression();
        this.parseExpected(SyntaxKind.CloseParenToken);
        this.parseExpected(SyntaxKind.SemicolonToken);
        return this.finishNode(node);
    }

    private parseWhileStatement(): Types.WhileStatement {
        const node = <Types.WhileStatement>this.createNode(SyntaxKind.WhileStatement);
        this.parseExpected(SyntaxKind.WhileKeyword);
        this.parseExpected(SyntaxKind.OpenParenToken);
        node.expression = this.parseExpression();
        this.parseExpected(SyntaxKind.CloseParenToken);
        node.statement = this.parseBlock();
        return this.finishNode(node);
    }

    private parseForStatement(): Types.ForStatement {
        const node = <Types.ForStatement>this.createNode(SyntaxKind.ForStatement);
        this.parseExpected(SyntaxKind.ForKeyword);
        this.parseExpected(SyntaxKind.OpenParenToken);
        if (this.token() !== SyntaxKind.SemicolonToken && this.token() !== SyntaxKind.CloseParenToken) {
            node.initializer = this.parseExpression();
        }
        this.parseExpected(SyntaxKind.SemicolonToken);
        if (this.token() !== SyntaxKind.SemicolonToken && this.token() !== SyntaxKind.CloseParenToken) {
            node.condition = this.parseExpression();
        }
        this.parseExpected(SyntaxKind.SemicolonToken);
        if (this.token() !== SyntaxKind.CloseParenToken) {
            node.incrementor = this.parseExpression();
        }
        this.parseExpected(SyntaxKind.CloseParenToken);
        node.statement = this.parseBlock();
        return this.finishNode(node);
    }

    private parseStatement(): Types.Statement {
        switch (this.token()) {
            case SyntaxKind.SemicolonToken:
                return this.parseEmptyStatement();

            case SyntaxKind.IncludeKeyword:
                return this.parseInclude();

            case SyntaxKind.StructKeyword:
                return this.parseStructDeclaration();

            case SyntaxKind.IfKeyword:
                return this.parseIfStatement();

            case SyntaxKind.DoKeyword:
                return this.parseDoStatement();

            case SyntaxKind.WhileKeyword:
                return this.parseWhileStatement();

            case SyntaxKind.ForKeyword:
                return this.parseForStatement();

            case SyntaxKind.ContinueKeyword:
                return this.parseBreakOrContinueStatement(SyntaxKind.ContinueStatement);

            case SyntaxKind.BreakKeyword:
                return this.parseBreakOrContinueStatement(SyntaxKind.BreakStatement);

            case SyntaxKind.ReturnKeyword:
                return this.parseReturnStatement();

            case SyntaxKind.Identifier:
            case SyntaxKind.ConstKeyword:
            case SyntaxKind.StaticKeyword:
            case SyntaxKind.NativeKeyword:
            case SyntaxKind.AbilcmdKeyword:
            case SyntaxKind.ActorKeyword:
            case SyntaxKind.ActorscopeKeyword:
            case SyntaxKind.AifilterKeyword:
            case SyntaxKind.AnimfilterKeyword:
            case SyntaxKind.BankKeyword:
            case SyntaxKind.BoolKeyword:
            case SyntaxKind.ByteKeyword:
            case SyntaxKind.CamerainfoKeyword:
            case SyntaxKind.CharKeyword:
            case SyntaxKind.ColorKeyword:
            case SyntaxKind.DoodadKeyword:
            case SyntaxKind.FixedKeyword:
            case SyntaxKind.HandleKeyword:
            case SyntaxKind.GenerichandleKeyword:
            case SyntaxKind.EffecthistoryKeyword:
            case SyntaxKind.IntKeyword:
            case SyntaxKind.MarkerKeyword:
            case SyntaxKind.OrderKeyword:
            case SyntaxKind.PlayergroupKeyword:
            case SyntaxKind.PointKeyword:
            case SyntaxKind.RegionKeyword:
            case SyntaxKind.RevealerKeyword:
            case SyntaxKind.SoundKeyword:
            case SyntaxKind.SoundlinkKeyword:
            case SyntaxKind.StringKeyword:
            case SyntaxKind.TextKeyword:
            case SyntaxKind.TimerKeyword:
            case SyntaxKind.TransmissionsourceKeyword:
            case SyntaxKind.TriggerKeyword:
            case SyntaxKind.UnitKeyword:
            case SyntaxKind.UnitfilterKeyword:
            case SyntaxKind.UnitgroupKeyword:
            case SyntaxKind.UnitrefKeyword:
            case SyntaxKind.VoidKeyword:
            case SyntaxKind.WaveKeyword:
            case SyntaxKind.WaveinfoKeyword:
            case SyntaxKind.WavetargetKeyword:
            case SyntaxKind.ArrayrefKeyword:
            case SyntaxKind.StructrefKeyword:
            case SyntaxKind.FuncrefKeyword:
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

    constructor() {
        this.scanner = new Scanner((message: Types.DiagnosticMessage) => {
            this.parseErrorAtCurrentToken(message.message);
        });
    }

    public setText(text: string) {
        this.scanner.setText(text);
    }

    public parseFile(fileName: string, text: string): Types.SourceFile {
        this.scanner.setText(text);
        this.syntaxTokens = [];

        this.sourceFile = <Types.SourceFile>this.createNode(SyntaxKind.SourceFile, 0);
        this.sourceFile.parseDiagnostics = [];
        this.sourceFile.bindDiagnostics = [];
        this.sourceFile.additionalSyntacticDiagnostics = [];
        this.sourceFile.fileName = fileName;

        this.nextToken();
        this.sourceFile.statements = this.parseList(ParsingContext.SourceElements, this.parseStatement.bind(this));

        this.finishNode(this.sourceFile);
        this.sourceFile.lineMap = this.scanner.getLineMap();

        fixupParentReferences(this.sourceFile);

        return this.sourceFile;
    }
}
