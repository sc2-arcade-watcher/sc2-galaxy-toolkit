"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gt = require("./types");
/**
 * True if node is of some token syntax kind.
 * For example, this is true for an IfKeyword but not for an IfStatement.
 */
function isToken(n) {
    return n.kind >= 2 /* FirstToken */ && n.kind <= 113 /* LastToken */;
}
exports.isToken = isToken;
function isModifierKind(token) {
    switch (token) {
        case 53 /* ConstKeyword */:
        case 52 /* StaticKeyword */:
        case 54 /* NativeKeyword */:
            return true;
    }
    return false;
}
exports.isModifierKind = isModifierKind;
function isKeywordTypeKind(token) {
    return token >= 71 /* FirstKeywordType */ && token <= 117 /* LastKeywordType */;
}
exports.isKeywordTypeKind = isKeywordTypeKind;
function isComplexTypeKind(token) {
    if (77 /* FirstComplexType */ <= token && 109 /* LastComplexType */ >= token) {
        return true;
    }
    return false;
}
exports.isComplexTypeKind = isComplexTypeKind;
function isReferenceKeywordKind(token) {
    switch (token) {
        case 110 /* ArrayrefKeyword */:
        case 111 /* StructrefKeyword */:
        case 112 /* FuncrefKeyword */:
            return true;
    }
    return false;
}
exports.isReferenceKeywordKind = isReferenceKeywordKind;
function isComparisonOperator(token) {
    return token >= 13 /* LessThanToken */ && token <= 19 /* EqualsGreaterThanToken */;
}
exports.isComparisonOperator = isComparisonOperator;
function isAssignmentOperator(token) {
    return token >= 39 /* EqualsToken */ && token <= 49 /* CaretEqualsToken */;
}
exports.isAssignmentOperator = isAssignmentOperator;
function isAssignmentExpression(node) {
    switch (node.kind) {
        case 124 /* BinaryExpression */:
            return isAssignmentOperator(node.operatorToken.kind);
        case 126 /* ParenthesizedExpression */:
            return isAssignmentExpression(node.expression);
        default:
            return false;
    }
}
exports.isAssignmentExpression = isAssignmentExpression;
function isLeftHandSideExpressionKind(kind) {
    return kind === 120 /* PropertyAccessExpression */
        || kind === 119 /* ElementAccessExpression */
        || kind === 121 /* CallExpression */
        || kind === 126 /* ParenthesizedExpression */
        || kind === 118 /* ArrayLiteralExpression */
        || kind === 113 /* Identifier */
        || kind === 2 /* NumericLiteral */
        || kind === 3 /* StringLiteral */
        || kind === 68 /* FalseKeyword */
        || kind === 69 /* NullKeyword */
        || kind === 67 /* TrueKeyword */;
}
exports.isLeftHandSideExpressionKind = isLeftHandSideExpressionKind;
function isContainerKind(kind) {
    return kind === 127 /* SourceFile */
        || kind === 142 /* FunctionDeclaration */
        || kind === 140 /* StructDeclaration */;
}
exports.isContainerKind = isContainerKind;
function isNamedDeclarationKind(kind) {
    return kind === 127 /* SourceFile */
        || kind === 141 /* VariableDeclaration */
        || kind === 142 /* FunctionDeclaration */
        || kind === 140 /* StructDeclaration */
        || kind === 144 /* PropertyDeclaration */
        || kind === 143 /* ParameterDeclaration */
        || kind === 145 /* TypedefDeclaration */;
}
exports.isNamedDeclarationKind = isNamedDeclarationKind;
function isDeclarationKind(kind) {
    return isNamedDeclarationKind(kind);
}
exports.isDeclarationKind = isDeclarationKind;
function isLeftHandSideExpression(node) {
    return isLeftHandSideExpressionKind(node.kind);
}
exports.isLeftHandSideExpression = isLeftHandSideExpression;
function isPartOfExpression(node) {
    switch (node.kind) {
        case 69 /* NullKeyword */:
        case 67 /* TrueKeyword */:
        case 68 /* FalseKeyword */:
        case 118 /* ArrayLiteralExpression */:
        case 120 /* PropertyAccessExpression */:
        case 119 /* ElementAccessExpression */:
        case 121 /* CallExpression */:
        case 125 /* TypeAssertionExpression */:
        case 126 /* ParenthesizedExpression */:
        case 122 /* PrefixUnaryExpression */:
        case 123 /* PostfixUnaryExpression */:
        case 124 /* BinaryExpression */:
        case 113 /* Identifier */:
            return true;
        case 2 /* NumericLiteral */:
        case 3 /* StringLiteral */:
            const parent = node.parent;
            switch (parent.kind) {
                case 141 /* VariableDeclaration */:
                case 144 /* PropertyDeclaration */:
                case 138 /* ExpressionStatement */:
                case 129 /* IfStatement */:
                case 130 /* DoStatement */:
                case 131 /* WhileStatement */:
                case 137 /* ReturnStatement */:
                case 132 /* ForStatement */:
                    const forStatement = parent;
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
exports.isPartOfExpression = isPartOfExpression;
function isPartOfTypeNode(node) {
    if (115 /* FirstTypeNode */ <= node.kind && node.kind <= 117 /* LastTypeNode */) {
        return true;
    }
    switch (node.kind) {
        case 74 /* IntKeyword */:
        case 75 /* FixedKeyword */:
        case 76 /* StringKeyword */:
        case 71 /* BoolKeyword */:
        case 106 /* VoidKeyword */:
            return true;
        // Identifiers and qualified names may be type nodes, depending on their context. Climb
        // above them to find the lowest container
        case 113 /* Identifier */:
            // If the identifier is the RHS of a qualified name, then it's a type iff its parent is.
            if (node.parent.kind === 120 /* PropertyAccessExpression */ && node.parent.name === node) {
                node = node.parent;
            }
        // At this point, node is either a qualified name or an identifier
        // Debug.assert(node.kind === gt.SyntaxKind.Identifier || node.kind === gt.SyntaxKind.QualifiedName || node.kind === gt.SyntaxKind.PropertyAccessExpression,
        //     "'node' was expected to be a qualified name, identifier or property access in 'isPartOfTypeNode'.");
        // falls through
        case 120 /* PropertyAccessExpression */:
            const parent = node.parent;
            // Do not recursively call isPartOfTypeNode on the parent. In the example:
            //
            //     let a: A.B.C;
            //
            // Calling isPartOfTypeNode would consider the qualified name A.B a type node.
            // Only C and A.B.C are type nodes.
            if (115 /* FirstTypeNode */ <= parent.kind && parent.kind <= 117 /* LastTypeNode */) {
                return true;
            }
            switch (parent.kind) {
                case 144 /* PropertyDeclaration */:
                case 143 /* ParameterDeclaration */:
                case 141 /* VariableDeclaration */:
                    return node === parent.type;
                case 142 /* FunctionDeclaration */:
                    return node === parent.type;
                // TODO:
                // case gt.SyntaxKind.CallExpression:
                //     return (<gt.CallExpression>parent).typeArguments && indexOf((<gt.CallExpression>parent).typeArguments, node) >= 0;
            }
    }
    return false;
}
exports.isPartOfTypeNode = isPartOfTypeNode;
function isRightSideOfPropertyAccess(node) {
    return (node.parent.kind === 120 /* PropertyAccessExpression */ && node.parent.name === node);
}
exports.isRightSideOfPropertyAccess = isRightSideOfPropertyAccess;
function isNodeOrArray(a) {
    return a !== undefined && a.kind !== undefined;
}
function getKindName(k) {
    if (typeof k === "string") {
        return k;
    }
    return gt.SyntaxKind[k];
}
exports.getKindName = getKindName;
function sourceFileToJSON(file) {
    return JSON.stringify(file, (_, v) => isNodeOrArray(v) ? serializeNode(v) : v, "    ");
    function serializeNode(n) {
        const o = { kind: getKindName(n.kind) };
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
                    o[propertyName] = getKindName(n[propertyName]);
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
                    if (n.kind !== 127 /* SourceFile */) {
                        o[propertyName] = n[propertyName];
                    }
                    break;
                default:
                    o[propertyName] = n[propertyName];
            }
        }
        return o;
    }
}
exports.sourceFileToJSON = sourceFileToJSON;
function findAncestor(node, callback) {
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
exports.findAncestor = findAncestor;
function findAncestorByKind(node, kind) {
    while (node && node.kind !== kind) {
        node = node.parent;
    }
    return node;
}
exports.findAncestorByKind = findAncestorByKind;
function getSourceFileOfNode(node) {
    while (node && node.kind !== 127 /* SourceFile */) {
        node = node.parent;
    }
    return node;
}
exports.getSourceFileOfNode = getSourceFileOfNode;
function fixupParentReferences(rootNode) {
    let parent = rootNode;
    forEachChild(rootNode, visitNode);
    function visitNode(n) {
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
exports.fixupParentReferences = fixupParentReferences;
function visitNode(cbNode, node) {
    return node && cbNode(node);
}
function visitNodes(cbNode, cbNodes, nodes) {
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
function forEachChild(node, cbNode, cbNodes) {
    if (!node || !node.kind) {
        return;
    }
    switch (node.kind) {
        case 144 /* PropertyDeclaration */:
            return visitNodes(cbNode, cbNodes, node.modifiers) ||
                visitNode(cbNode, node.type) ||
                visitNode(cbNode, node.name);
        case 141 /* VariableDeclaration */:
            return visitNodes(cbNode, cbNodes, node.modifiers) ||
                visitNode(cbNode, node.type) ||
                visitNode(cbNode, node.name) ||
                visitNode(cbNode, node.initializer);
        case 142 /* FunctionDeclaration */:
            return visitNodes(cbNode, cbNodes, node.modifiers) ||
                visitNode(cbNode, node.type) ||
                visitNode(cbNode, node.name) ||
                visitNodes(cbNode, cbNodes, node.parameters) ||
                visitNode(cbNode, node.body);
        case 140 /* StructDeclaration */:
            return visitNodes(cbNode, cbNodes, node.modifiers) ||
                visitNode(cbNode, node.name) ||
                visitNodes(cbNode, cbNodes, node.members);
        case 143 /* ParameterDeclaration */:
            return visitNodes(cbNode, cbNodes, node.modifiers) ||
                visitNode(cbNode, node.name) ||
                visitNode(cbNode, node.type);
        case 145 /* TypedefDeclaration */:
            return visitNode(cbNode, node.type) ||
                visitNode(cbNode, node.name);
        case 117 /* ArrayType */:
            return visitNode(cbNode, node.elementType) ||
                visitNode(cbNode, node.size);
        case 116 /* MappedType */:
            return visitNode(cbNode, node.returnType) ||
                visitNodes(cbNode, cbNodes, node.typeArguments);
        case 120 /* PropertyAccessExpression */:
            return visitNode(cbNode, node.expression) ||
                visitNode(cbNode, node.name);
        case 119 /* ElementAccessExpression */:
            return visitNode(cbNode, node.expression) ||
                visitNode(cbNode, node.argumentExpression);
        case 121 /* CallExpression */:
            return visitNode(cbNode, node.expression) ||
                visitNodes(cbNode, cbNodes, node.arguments);
        case 126 /* ParenthesizedExpression */:
            return visitNode(cbNode, node.expression);
        case 122 /* PrefixUnaryExpression */:
            return visitNode(cbNode, node.operator) ||
                visitNode(cbNode, node.operand);
        case 123 /* PostfixUnaryExpression */:
            return visitNode(cbNode, node.operand) ||
                visitNode(cbNode, node.operator);
        case 124 /* BinaryExpression */:
            return visitNode(cbNode, node.left) ||
                visitNode(cbNode, node.operatorToken) ||
                visitNode(cbNode, node.right);
        case 128 /* Block */:
            return visitNodes(cbNode, cbNodes, node.statements);
        case 127 /* SourceFile */:
            return visitNodes(cbNode, cbNodes, node.statements);
        case 138 /* ExpressionStatement */:
            return visitNode(cbNode, node.expression);
        case 129 /* IfStatement */:
            return visitNode(cbNode, node.expression) ||
                visitNode(cbNode, node.thenStatement) ||
                visitNode(cbNode, node.elseStatement);
        case 130 /* DoStatement */:
            return visitNode(cbNode, node.statement) ||
                visitNode(cbNode, node.expression);
        case 131 /* WhileStatement */:
            return visitNode(cbNode, node.expression) ||
                visitNode(cbNode, node.statement);
        case 132 /* ForStatement */:
            return visitNode(cbNode, node.initializer) ||
                visitNode(cbNode, node.condition) ||
                visitNode(cbNode, node.incrementor) ||
                visitNode(cbNode, node.statement);
        case 134 /* ContinueStatement */:
        case 133 /* BreakStatement */:
        case 135 /* BreakpointStatement */:
            break;
        case 137 /* ReturnStatement */:
            return visitNode(cbNode, node.expression);
        case 136 /* IncludeStatement */:
            return visitNode(cbNode, node.path);
    }
}
exports.forEachChild = forEachChild;
function createDiagnosticForNode(node, category, msg) {
    return {
        file: getSourceFileOfNode(node),
        category: category,
        start: node.pos,
        length: node.end - node.pos,
        line: node.line,
        col: node.char,
        messageText: msg,
    };
}
exports.createDiagnosticForNode = createDiagnosticForNode;
//# sourceMappingURL=utils.js.map