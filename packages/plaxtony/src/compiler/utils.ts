import * as lsp from 'vscode-languageserver';
import * as gt from './types';

/**
 * True if node is of some token syntax kind.
 * For example, this is true for an IfKeyword but not for an IfStatement.
 */
export function isToken(n: gt.Node): boolean {
    return <number>n.kind >= gt.SyntaxKindMarker.FirstToken && <number>n.kind <= gt.SyntaxKindMarker.LastToken;
}

export function isModifierKind(token: gt.SyntaxKind): boolean {
    switch (token) {
        case gt.SyntaxKind.ConstKeyword:
        case gt.SyntaxKind.StaticKeyword:
        case gt.SyntaxKind.NativeKeyword:
            return true;
    }
    return false;
}

export function isKeywordKind(token: gt.SyntaxKind): boolean {
    return <number>token >= gt.SyntaxKindMarker.FirstKeyword && <number>token <= gt.SyntaxKindMarker.LastKeyword;
}

export function isKeywordTypeKind(token: gt.SyntaxKind): boolean {
    return <number>token >= gt.SyntaxKindMarker.FirstKeywordType && <number>token <= gt.SyntaxKindMarker.LastKeywordType;
}

export function isComplexTypeKind(token: gt.SyntaxKind): boolean {
    if (gt.SyntaxKindMarker.FirstComplexType <= <number>token && gt.SyntaxKindMarker.LastComplexType >= <number>token) {
        return true;
    }
    return false;
}

export function isReferenceKeywordKind(token: gt.SyntaxKind): boolean {
    switch (token) {
        case gt.SyntaxKind.ArrayrefKeyword:
        case gt.SyntaxKind.StructrefKeyword:
        case gt.SyntaxKind.FuncrefKeyword:
            return true;
    }
    return false;
}

export function isComparisonOperator(token: gt.SyntaxKind): boolean {
    return token >= gt.SyntaxKind.LessThanToken && token <= gt.SyntaxKind.EqualsGreaterThanToken;
}

export function isAssignmentOperator(token: gt.SyntaxKind): boolean {
    return token >= gt.SyntaxKind.EqualsToken && token <= gt.SyntaxKind.CaretEqualsToken;
}

export function isAssignmentExpression(node: gt.Node): boolean {
    switch (node.kind) {
        case gt.SyntaxKind.BinaryExpression:
            return isAssignmentOperator((<gt.BinaryExpression>node).operatorToken.kind);
        case gt.SyntaxKind.ParenthesizedExpression:
            return isAssignmentExpression((<gt.ParenthesizedExpression>node).expression);
        default:
            return false;
    }
}

export function isLeftHandSideExpressionKind(kind: gt.SyntaxKind): boolean {
    return kind === gt.SyntaxKind.PropertyAccessExpression
        || kind === gt.SyntaxKind.ElementAccessExpression
        || kind === gt.SyntaxKind.CallExpression
        || kind === gt.SyntaxKind.ParenthesizedExpression
        || kind === gt.SyntaxKind.ArrayLiteralExpression
        || kind === gt.SyntaxKind.Identifier
        || kind === gt.SyntaxKind.NumericLiteral
        || kind === gt.SyntaxKind.StringLiteral
        || kind === gt.SyntaxKind.FalseKeyword
        || kind === gt.SyntaxKind.NullKeyword
        || kind === gt.SyntaxKind.TrueKeyword;
}

export function isContainerKind(kind: gt.SyntaxKind): boolean {
    return kind === gt.SyntaxKind.SourceFile
        || kind === gt.SyntaxKind.FunctionDeclaration
        || kind === gt.SyntaxKind.StructDeclaration
    ;
}

export function isNamedDeclarationKind(kind: gt.SyntaxKind): boolean {
    return kind === gt.SyntaxKind.SourceFile
        || kind === gt.SyntaxKind.VariableDeclaration
        || kind === gt.SyntaxKind.FunctionDeclaration
        || kind === gt.SyntaxKind.StructDeclaration
        || kind === gt.SyntaxKind.PropertyDeclaration
        || kind === gt.SyntaxKind.ParameterDeclaration
        || kind === gt.SyntaxKind.TypedefDeclaration
    ;
}

export function isDeclarationKind(kind: gt.SyntaxKind): boolean {
    return isNamedDeclarationKind(kind)
    ;
}

export function isLeftHandSideExpression(node: gt.Node): boolean {
    return isLeftHandSideExpressionKind(node.kind);
}

export function isPartOfExpression(node: gt.Node): boolean {
    switch (node.kind) {
        case gt.SyntaxKind.NullKeyword:
        case gt.SyntaxKind.TrueKeyword:
        case gt.SyntaxKind.FalseKeyword:
        case gt.SyntaxKind.ArrayLiteralExpression:
        case gt.SyntaxKind.PropertyAccessExpression:
        case gt.SyntaxKind.ElementAccessExpression:
        case gt.SyntaxKind.CallExpression:
        case gt.SyntaxKind.TypeAssertionExpression:
        case gt.SyntaxKind.ParenthesizedExpression:
        case gt.SyntaxKind.PrefixUnaryExpression:
        case gt.SyntaxKind.PostfixUnaryExpression:
        case gt.SyntaxKind.BinaryExpression:
        case gt.SyntaxKind.Identifier:
            return true;
        case gt.SyntaxKind.NumericLiteral:
        case gt.SyntaxKind.StringLiteral:
            const parent = node.parent;
            switch (parent.kind) {
                case gt.SyntaxKind.VariableDeclaration:
                case gt.SyntaxKind.PropertyDeclaration:
                case gt.SyntaxKind.ExpressionStatement:
                case gt.SyntaxKind.IfStatement:
                case gt.SyntaxKind.DoStatement:
                case gt.SyntaxKind.WhileStatement:
                case gt.SyntaxKind.ReturnStatement:
                case gt.SyntaxKind.ForStatement:
                    const forStatement = <gt.ForStatement>parent;
                    return (forStatement.initializer === node) ||
                        forStatement.condition === node ||
                        forStatement.incrementor === node;
                default:
                    if (isPartOfExpression(parent)) {
                        return true;
                    }
            }
    }
    return false;
}

export function isPartOfTypeNode(node: gt.Node): boolean {
    if (gt.SyntaxKindMarker.FirstTypeNode <= <number>node.kind && <number>node.kind <= gt.SyntaxKindMarker.LastTypeNode) {
        return true;
    }

    switch (node.kind) {
        case gt.SyntaxKind.IntKeyword:
        case gt.SyntaxKind.FixedKeyword:
        case gt.SyntaxKind.StringKeyword:
        case gt.SyntaxKind.BoolKeyword:
        case gt.SyntaxKind.VoidKeyword:
            return true;

        // Identifiers and qualified names may be type nodes, depending on their context. Climb
        // above them to find the lowest container
        case gt.SyntaxKind.Identifier:
            // If the identifier is the RHS of a qualified name, then it's a type iff its parent is.
            if (node.parent.kind === gt.SyntaxKind.PropertyAccessExpression && (<gt.PropertyAccessExpression>node.parent).name === node) {
                node = node.parent;
            }
            // At this point, node is either a qualified name or an identifier
            // Debug.assert(node.kind === gt.SyntaxKind.Identifier || node.kind === gt.SyntaxKind.QualifiedName || node.kind === gt.SyntaxKind.PropertyAccessExpression,
            //     "'node' was expected to be a qualified name, identifier or property access in 'isPartOfTypeNode'.");
            // falls through
        case gt.SyntaxKind.PropertyAccessExpression:
            const parent = node.parent;
            // Do not recursively call isPartOfTypeNode on the parent. In the example:
            //
            //     let a: A.B.C;
            //
            // Calling isPartOfTypeNode would consider the qualified name A.B a type node.
            // Only C and A.B.C are type nodes.
            if (gt.SyntaxKindMarker.FirstTypeNode <= <number>parent.kind && <number>parent.kind <= gt.SyntaxKindMarker.LastTypeNode) {
                return true;
            }
            switch (parent.kind) {
                case gt.SyntaxKind.PropertyDeclaration:
                case gt.SyntaxKind.ParameterDeclaration:
                case gt.SyntaxKind.VariableDeclaration:
                    return node === (<gt.VariableDeclaration>parent).type;
                case gt.SyntaxKind.FunctionDeclaration:
                    return node === (<gt.FunctionDeclaration>parent).type;
                // TODO:
                // case gt.SyntaxKind.CallExpression:
                //     return (<gt.CallExpression>parent).typeArguments && indexOf((<gt.CallExpression>parent).typeArguments, node) >= 0;
            }
    }

    return false;
}

export function isRightSideOfPropertyAccess(node: gt.Node) {
    return (node.parent.kind === gt.SyntaxKind.PropertyAccessExpression && (<gt.PropertyAccessExpression>node.parent).name === node);
}

function isNodeOrArray(a: any): boolean {
    return a !== undefined && a.kind !== undefined;
}

export function getKindName(k: number | string): string {
    if (typeof k === "string") {
        return k;
    }

    return (<any>gt).SyntaxKind[k];
}

export function sourceFileToJSON(file: gt.Node): string {
    return JSON.stringify(file, (_, v) => isNodeOrArray(v) ? serializeNode(v) : v, "    ");

    function serializeNode(n: gt.Node): any {
        const o: any = { kind: getKindName(n.kind) };
        // if (ts.containsParseError(n)) {
        //     o.containsParseError = true;
        // }

        for (let propertyName in n) {
            switch (propertyName) {
                case "parent":
                case "symbol":
                case "locals":
                case "localSymbol":
                case "kind":
                case "semanticDiagnostics":
                case "id":
                case "nodeCount":
                case "symbolCount":
                case "identifierCount":
                case "scriptSnapshot":
                    // Blacklist of items we never put in the baseline file.
                    break;

                case "originalKeywordKind":
                    o[propertyName] = getKindName((<any>n)[propertyName]);
                    break;

                case "flags":
                    // Clear the flags that are produced by aggregating child values. That is ephemeral
                    // data we don't care about in the dump. We only care what the parser set directly
                    // on the AST.
                    // const flags = n.flags & ~(ts.NodeFlags.JavaScriptFile | ts.NodeFlags.HasAggregatedChildData);
                    // if (flags) {
                    //     o[propertyName] = getNodeFlagName(flags);
                    // }
                    break;

                case "referenceDiagnostics":
                case "parseDiagnostics":
                    // o[propertyName] = Utils.convertDiagnostics((<any>n)[propertyName]);
                    break;

                // case "nextContainer":
                //     if (n.nextContainer) {
                //         o[propertyName] = { kind: n.nextContainer.kind, pos: n.nextContainer.pos, end: n.nextContainer.end };
                //     }
                //     break;

                case "text":
                    // Include 'text' field for identifiers/literals, but not for source files.
                    if (n.kind !== gt.SyntaxKind.SourceFile) {
                        o[propertyName] = (<any>n)[propertyName];
                    }
                    break;

                default:
                    o[propertyName] = (<any>n)[propertyName];
            }
        }

        return o;
    }
}

/**
 * Iterates through the parent chain of a node and performs the callback on each parent until the callback
 * returns a truthy value, then returns that value.
 * If no such value is found, it applies the callback until the parent pointer is undefined or the callback returns "quit"
 * At that point findAncestor returns undefined.
 */
export function findAncestor<T extends gt.Node>(node: gt.Node, callback: (element: gt.Node) => element is T): T | undefined;
export function findAncestor(node: gt.Node, callback: (element: gt.Node) => boolean | "quit"): gt.Node | undefined;
export function findAncestor(node: gt.Node, callback: (element: gt.Node) => boolean | "quit"): gt.Node {
    while (node) {
        const result = callback(node);
        if (result === "quit") {
            return undefined;
        }
        else if (result) {
            return node;
        }
        node = node.parent;
    }
    return undefined;
}

export function findAncestorByKind(node: gt.Node, kind: gt.SyntaxKind): gt.Node {
    while (node && node.kind !== kind) {
        node = node.parent;
    }
    return node;
}

export function getSourceFileOfNode(node: gt.Node): gt.SourceFile {
    while (node && node.kind !== gt.SyntaxKind.SourceFile) {
        node = node.parent;
    }
    return <gt.SourceFile>node;
}

export function fixupParentReferences(rootNode: gt.Node) {
    let parent: gt.Node = rootNode;
    forEachChild(rootNode, visitNode);

    function visitNode(n: gt.Node): void {
        // walk down setting parents that differ from the parent we think it should be.  This
        // allows us to quickly bail out of setting parents for subtrees during incremental
        // parsing
        if (n.parent !== parent) {
            n.parent = parent;

            const saveParent = parent;
            parent = n;
            forEachChild(n, visitNode);
            parent = saveParent;
        }
    }
}

function visitNode<T>(cbNode: (node?: gt.Node) => T, node: gt.Node): T | undefined {
    return node && cbNode(node);
}

function visitNodes<T>(cbNode: (node: gt.Node) => T, cbNodes: (node: gt.NodeArray<gt.Node>) => T | undefined, nodes: gt.NodeArray<gt.Node>): T | undefined {
    if (nodes) {
        if (cbNodes) {
            return cbNodes(nodes);
        }
        for (const node of nodes) {
            const result = cbNode(node);
            if (result) {
                return result;
            }
        }
    }
}

/**
 * Invokes a callback for each child of the given node. The 'cbNode' callback is invoked for all child nodes
 * stored in properties. If a 'cbNodes' callback is specified, it is invoked for embedded arrays; otherwise,
 * embedded arrays are flattened and the 'cbNode' callback is invoked for each element. If a callback returns
 * a truthy value, iteration stops and that value is returned. Otherwise, undefined is returned.
 *
 * @param node a given node to visit its children
 * @param cbNode a callback to be invoked for all child nodes
 * @param cbNodes a callback to be invoked for embedded array
 *
 * @remarks `forEachChild` must visit the children of a node in the order
 * that they appear in the source code.
 */
export function forEachChild<T>(node: gt.Node, cbNode: (node: gt.Node) => T | undefined, cbNodes?: (nodes: gt.NodeArray<gt.Node>) => T | undefined): T | undefined {
    if (!node || !node.kind) {
        return;
    }
    switch (node.kind) {
        case gt.SyntaxKind.PropertyDeclaration:
            return visitNodes(cbNode, cbNodes, (<gt.PropertyDeclaration>node).modifiers) ||
                visitNode(cbNode, (<gt.PropertyDeclaration>node).type) ||
                visitNode(cbNode, (<gt.PropertyDeclaration>node).name);
        case gt.SyntaxKind.VariableDeclaration:
            return visitNodes(cbNode, cbNodes, (<gt.VariableDeclaration>node).modifiers) ||
                visitNode(cbNode, (<gt.VariableDeclaration>node).type) ||
                visitNode(cbNode, (<gt.VariableDeclaration>node).name) ||
                visitNode(cbNode, (<gt.VariableDeclaration>node).initializer);
        case gt.SyntaxKind.FunctionDeclaration:
            return visitNodes(cbNode, cbNodes, (<gt.FunctionDeclaration>node).modifiers) ||
                visitNode(cbNode, (<gt.FunctionDeclaration>node).type) ||
                visitNode(cbNode, (<gt.FunctionDeclaration>node).name) ||
                visitNodes(cbNode, cbNodes, (<gt.FunctionDeclaration>node).parameters) ||
                visitNode(cbNode, (<gt.FunctionDeclaration>node).body);
        case gt.SyntaxKind.StructDeclaration:
            return visitNodes(cbNode, cbNodes, (<gt.StructDeclaration>node).modifiers) ||
                visitNode(cbNode, (<gt.StructDeclaration>node).name) ||
                visitNodes(cbNode, cbNodes, (<gt.StructDeclaration>node).members);
        case gt.SyntaxKind.ParameterDeclaration:
            return visitNodes(cbNode, cbNodes, (<gt.ParameterDeclaration>node).modifiers) ||
                visitNode(cbNode, (<gt.ParameterDeclaration>node).name) ||
                visitNode(cbNode, (<gt.ParameterDeclaration>node).type);
        case gt.SyntaxKind.TypedefDeclaration:
            return visitNode(cbNode, (<gt.TypedefDeclaration>node).type) ||
                visitNode(cbNode, (<gt.TypedefDeclaration>node).name);
        case gt.SyntaxKind.ArrayType:
            return visitNode(cbNode, (<gt.ArrayTypeNode>node).elementType) ||
                visitNode(cbNode, (<gt.ArrayTypeNode>node).size);
        case gt.SyntaxKind.MappedType:
            return visitNode(cbNode, (<gt.MappedTypeNode>node).returnType) ||
                visitNodes(cbNode, cbNodes, (<gt.MappedTypeNode>node).typeArguments);
        case gt.SyntaxKind.PropertyAccessExpression:
            return visitNode(cbNode, (<gt.PropertyAccessExpression>node).expression) ||
                visitNode(cbNode, (<gt.PropertyAccessExpression>node).name);
        case gt.SyntaxKind.ElementAccessExpression:
            return visitNode(cbNode, (<gt.ElementAccessExpression>node).expression) ||
                visitNode(cbNode, (<gt.ElementAccessExpression>node).argumentExpression);
        case gt.SyntaxKind.CallExpression:
            return visitNode(cbNode, (<gt.CallExpression>node).expression) ||
                visitNodes(cbNode, cbNodes, (<gt.CallExpression>node).arguments);
        case gt.SyntaxKind.ParenthesizedExpression:
            return visitNode(cbNode, (<gt.ParenthesizedExpression>node).expression);
        case gt.SyntaxKind.PrefixUnaryExpression:
            return visitNode(cbNode, (<gt.PrefixUnaryExpression>node).operator) ||
                visitNode(cbNode, (<gt.PrefixUnaryExpression>node).operand);
        case gt.SyntaxKind.PostfixUnaryExpression:
            return visitNode(cbNode, (<gt.PostfixUnaryExpression>node).operand) ||
                visitNode(cbNode, (<gt.PostfixUnaryExpression>node).operator);
        case gt.SyntaxKind.BinaryExpression:
            return visitNode(cbNode, (<gt.BinaryExpression>node).left) ||
                visitNode(cbNode, (<gt.BinaryExpression>node).operatorToken) ||
                visitNode(cbNode, (<gt.BinaryExpression>node).right);
        case gt.SyntaxKind.Block:
            return visitNodes(cbNode, cbNodes, (<gt.Block>node).statements);
        case gt.SyntaxKind.SourceFile:
            return visitNodes(cbNode, cbNodes, (<gt.SourceFile>node).statements);
        case gt.SyntaxKind.ExpressionStatement:
            return visitNode(cbNode, (<gt.ExpressionStatement>node).expression);
        case gt.SyntaxKind.IfStatement:
            return visitNode(cbNode, (<gt.IfStatement>node).expression) ||
                visitNode(cbNode, (<gt.IfStatement>node).thenStatement) ||
                visitNode(cbNode, (<gt.IfStatement>node).elseStatement);
        case gt.SyntaxKind.DoStatement:
            return visitNode(cbNode, (<gt.DoStatement>node).statement) ||
                visitNode(cbNode, (<gt.DoStatement>node).expression);
        case gt.SyntaxKind.WhileStatement:
            return visitNode(cbNode, (<gt.WhileStatement>node).expression) ||
                visitNode(cbNode, (<gt.WhileStatement>node).statement);
        case gt.SyntaxKind.ForStatement:
            return visitNode(cbNode, (<gt.ForStatement>node).initializer) ||
                visitNode(cbNode, (<gt.ForStatement>node).condition) ||
                visitNode(cbNode, (<gt.ForStatement>node).incrementor) ||
                visitNode(cbNode, (<gt.ForStatement>node).statement);
        case gt.SyntaxKind.ContinueStatement:
        case gt.SyntaxKind.BreakStatement:
        case gt.SyntaxKind.BreakpointStatement:
            break;
        case gt.SyntaxKind.ReturnStatement:
            return visitNode(cbNode, (<gt.ReturnStatement>node).expression);
        case gt.SyntaxKind.IncludeStatement:
            return visitNode(cbNode, (<gt.IncludeStatement>node).path);
    }
}

class Diagnostic implements gt.Diagnostic {
    file?: gt.SourceFile;
    messageText: string;
    code: number;
    category: gt.DiagnosticCategory;
    tags?: lsp.DiagnosticTag[];
    source?: string;

    start?: number;
    length?: number;

    line?: number;
    col?: number;

    constructor(file: gt.SourceFile, code: number, messageText: string, start: number, length: number) {
        this.file = file;
        this.code = code;
        this.messageText = messageText;
        this.start = start;
        this.length = length;
    }

    toString() {
        return `${this.file?.fileName} [${this.start}]: ${this.messageText}`.toString();
    }
}

export function createFileDiagnostic(file: gt.SourceFile, start: number, length: number, message: gt.DiagnosticMessage): gt.Diagnostic {
    // const end = start + length;
    return <gt.Diagnostic>{
        file: file,
        code: message.code,
        category: message.category,
        start: start,
        length: length,
        messageText: message.message,

        toString() {
            return `${this.file?.fileName} [${this.start}]: ${this.messageText}`.toString();
        }
    };
}

export function createDiagnosticForNode(node: gt.Node, category: gt.DiagnosticCategory, msg: string, tags?: lsp.DiagnosticTag[]): gt.Diagnostic {
    const d = <gt.Diagnostic>{
        file: getSourceFileOfNode(node),
        category: category,
        start: node.pos,
        length: node.end - node.pos,
        line: node.line,
        col: node.char,
        messageText: msg,

        toString() {
            return `${this.file?.fileName} [${this.start}]: ${this.messageText}`.toString();
        }
    };
    if (tags) {
        d.tags = tags.concat();
    }
    return d;
}
