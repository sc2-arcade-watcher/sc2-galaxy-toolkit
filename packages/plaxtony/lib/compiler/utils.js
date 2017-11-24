"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Types = require("./types");
/**
 * True if node is of some token syntax kind.
 * For example, this is true for an IfKeyword but not for an IfStatement.
 */
function isToken(n) {
    return n.kind >= 1 /* FirstToken */ && n.kind <= 108 /* LastToken */;
}
exports.isToken = isToken;
function isModifierKind(token) {
    switch (token) {
        case 52 /* ConstKeyword */:
        case 51 /* StaticKeyword */:
        case 53 /* NativeKeyword */:
            return true;
    }
    return false;
}
exports.isModifierKind = isModifierKind;
function isKeywordTypeKind(token) {
    switch (token) {
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
            return true;
    }
    return false;
}
exports.isKeywordTypeKind = isKeywordTypeKind;
function isReferenceKeywordKind(token) {
    switch (token) {
        case 105 /* ArrayrefKeyword */:
        case 106 /* StructrefKeyword */:
        case 107 /* FuncrefKeyword */:
            return true;
    }
    return false;
}
exports.isReferenceKeywordKind = isReferenceKeywordKind;
function isAssignmentOperator(token) {
    return token >= 38 /* EqualsToken */ && token <= 48 /* CaretEqualsToken */;
}
exports.isAssignmentOperator = isAssignmentOperator;
function isLeftHandSideExpressionKind(kind) {
    return kind === 115 /* PropertyAccessExpression */
        || kind === 114 /* ElementAccessExpression */
        || kind === 116 /* CallExpression */
        || kind === 121 /* ParenthesizedExpression */
        || kind === 113 /* ArrayLiteralExpression */
        || kind === 108 /* Identifier */
        || kind === 1 /* NumericLiteral */
        || kind === 2 /* StringLiteral */
        || kind === 63 /* FalseKeyword */
        || kind === 64 /* NullKeyword */
        || kind === 62 /* TrueKeyword */;
}
exports.isLeftHandSideExpressionKind = isLeftHandSideExpressionKind;
function isContainerKind(kind) {
    return kind === 122 /* SourceFile */
        || kind === 136 /* FunctionDeclaration */
        || kind === 134 /* StructDeclaration */;
}
exports.isContainerKind = isContainerKind;
function isNamedDeclarationKind(kind) {
    return kind === 122 /* SourceFile */
        || kind === 135 /* VariableDeclaration */
        || kind === 136 /* FunctionDeclaration */
        || kind === 134 /* StructDeclaration */
        || kind === 138 /* PropertyDeclaration */
        // || kind === SyntaxKind.PropertyAccessExpression
        || kind === 137 /* ParameterDeclaration */
        || kind === 139 /* TypedefDeclaration */;
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
        case 64 /* NullKeyword */:
        case 62 /* TrueKeyword */:
        case 63 /* FalseKeyword */:
        case 113 /* ArrayLiteralExpression */:
        case 115 /* PropertyAccessExpression */:
        case 114 /* ElementAccessExpression */:
        case 116 /* CallExpression */:
        case 120 /* TypeAssertionExpression */:
        case 121 /* ParenthesizedExpression */:
        case 117 /* PrefixUnaryExpression */:
        case 118 /* PostfixUnaryExpression */:
        case 119 /* BinaryExpression */:
        case 108 /* Identifier */:
            return true;
        case 1 /* NumericLiteral */:
        case 2 /* StringLiteral */:
            const parent = node.parent;
            switch (parent.kind) {
                case 135 /* VariableDeclaration */:
                case 138 /* PropertyDeclaration */:
                case 132 /* ExpressionStatement */:
                case 124 /* IfStatement */:
                case 125 /* DoStatement */:
                case 126 /* WhileStatement */:
                case 131 /* ReturnStatement */:
                case 127 /* ForStatement */:
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
    if (110 /* FirstTypeNode */ <= node.kind && node.kind <= 112 /* LastTypeNode */) {
        return true;
    }
    switch (node.kind) {
        case 69 /* IntKeyword */:
        case 70 /* FixedKeyword */:
        case 71 /* StringKeyword */:
        case 66 /* BoolKeyword */:
        case 101 /* VoidKeyword */:
            return true;
        // Identifiers and qualified names may be type nodes, depending on their context. Climb
        // above them to find the lowest container
        case 108 /* Identifier */:
            // If the identifier is the RHS of a qualified name, then it's a type iff its parent is.
            if (node.parent.kind === 115 /* PropertyAccessExpression */ && node.parent.name === node) {
                node = node.parent;
            }
        // At this point, node is either a qualified name or an identifier
        // Debug.assert(node.kind === SyntaxKind.Identifier || node.kind === SyntaxKind.QualifiedName || node.kind === SyntaxKind.PropertyAccessExpression,
        //     "'node' was expected to be a qualified name, identifier or property access in 'isPartOfTypeNode'.");
        // falls through
        case 115 /* PropertyAccessExpression */:
            const parent = node.parent;
            // Do not recursively call isPartOfTypeNode on the parent. In the example:
            //
            //     let a: A.B.C;
            //
            // Calling isPartOfTypeNode would consider the qualified name A.B a type node.
            // Only C and A.B.C are type nodes.
            if (110 /* FirstTypeNode */ <= parent.kind && parent.kind <= 112 /* LastTypeNode */) {
                return true;
            }
            switch (parent.kind) {
                case 138 /* PropertyDeclaration */:
                case 137 /* ParameterDeclaration */:
                case 135 /* VariableDeclaration */:
                    return node === parent.type;
                case 136 /* FunctionDeclaration */:
                    return node === parent.type;
            }
    }
    return false;
}
exports.isPartOfTypeNode = isPartOfTypeNode;
function isRightSideOfPropertyAccess(node) {
    return (node.parent.kind === 115 /* PropertyAccessExpression */ && node.parent.name === node);
}
exports.isRightSideOfPropertyAccess = isRightSideOfPropertyAccess;
function isNodeOrArray(a) {
    return a !== undefined && a.kind !== undefined;
}
function getKindName(k) {
    if (typeof k === "string") {
        return k;
    }
    // For some markers in SyntaxKind, we should print its original syntax name instead of
    // the marker name in tests.
    // if (k === (<any>Types).SyntaxKind.FirstJSDocNode ||
    //     k === (<any>Types).SyntaxKind.LastJSDocNode ||
    //     k === (<any>Types).SyntaxKind.FirstJSDocTagNode ||
    //     k === (<any>Types).SyntaxKind.LastJSDocTagNode) {
    //     for (const kindName in (<any>Types).SyntaxKind) {
    //         if ((<any>Types).SyntaxKind[kindName] === k) {
    //             return kindName;
    //         }
    //     }
    // }
    return Types.SyntaxKind[k];
}
exports.getKindName = getKindName;
function sourceFileToJSON(file) {
    return JSON.stringify(file, (_, v) => isNodeOrArray(v) ? serializeNode(v) : v, "    ");
    // function getFlagName(flags: any, f: number): any {
    //     if (f === 0) {
    //         return 0;
    //     }
    //     let result = "";
    //     forEach(Object.getOwnPropertyNames(flags), (v: any) => {
    //         if (isFinite(v)) {
    //             v = +v;
    //             if (f === +v) {
    //                 result = flags[v];
    //                 return true;
    //             }
    //             else if ((f & v) > 0) {
    //                 if (result.length) {
    //                     result += " | ";
    //                 }
    //                 result += flags[v];
    //                 return false;
    //             }
    //         }
    //     });
    //     return result;
    // }
    // function getNodeFlagName(f: number) { return getFlagName((<any>ts).NodeFlags, f); }
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
                    if (n.kind !== 122 /* SourceFile */) {
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
function getSourceFileOfNode(node) {
    while (node && node.kind !== 122 /* SourceFile */) {
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
        case 138 /* PropertyDeclaration */:
            return visitNodes(cbNode, cbNodes, node.modifiers) ||
                visitNode(cbNode, node.type) ||
                visitNode(cbNode, node.name);
        case 135 /* VariableDeclaration */:
            return visitNodes(cbNode, cbNodes, node.modifiers) ||
                visitNode(cbNode, node.type) ||
                visitNode(cbNode, node.name) ||
                visitNode(cbNode, node.initializer);
        case 136 /* FunctionDeclaration */:
            return visitNodes(cbNode, cbNodes, node.modifiers) ||
                visitNode(cbNode, node.type) ||
                visitNode(cbNode, node.name) ||
                visitNodes(cbNode, cbNodes, node.parameters) ||
                visitNode(cbNode, node.body);
        case 134 /* StructDeclaration */:
            return visitNodes(cbNode, cbNodes, node.modifiers) ||
                visitNode(cbNode, node.name) ||
                visitNodes(cbNode, cbNodes, node.members);
        case 137 /* ParameterDeclaration */:
            return visitNodes(cbNode, cbNodes, node.modifiers) ||
                visitNode(cbNode, node.name) ||
                visitNode(cbNode, node.type);
        case 139 /* TypedefDeclaration */:
            return visitNode(cbNode, node.type) ||
                visitNode(cbNode, node.name);
        case 112 /* ArrayType */:
            return visitNode(cbNode, node.elementType) ||
                visitNode(cbNode, node.size);
        case 111 /* MappedType */:
            return visitNode(cbNode, node.returnType) ||
                visitNodes(cbNode, cbNodes, node.typeArguments);
        // case SyntaxKind.TypeReference:
        //     return visitNode(cbNode, (<Types.TypeReferenceNode>node).typeName) ||
        //         visitNodes(cbNode, cbNodes, (<Types.TypeReferenceNode>node).typeArguments);
        // case SyntaxKind.LiteralType:
        //     return visitNode(cbNode, (<Types.LiteralTypeNode>node).literal);
        // case SyntaxKind.ArrayLiteralExpression:
        //     return visitNodes(cbNode, cbNodes, (<Types.ArrayLiteralExpression>node).elements);
        // case SyntaxKind.ObjectLiteralExpression:
        //     return visitNodes(cbNode, cbNodes, (<Types.ObjectLiteralExpression>node).properties);
        case 115 /* PropertyAccessExpression */:
            return visitNode(cbNode, node.expression) ||
                visitNode(cbNode, node.name);
        case 114 /* ElementAccessExpression */:
            return visitNode(cbNode, node.expression) ||
                visitNode(cbNode, node.argumentExpression);
        case 116 /* CallExpression */:
            return visitNode(cbNode, node.expression) ||
                visitNodes(cbNode, cbNodes, node.arguments);
        case 121 /* ParenthesizedExpression */:
            return visitNode(cbNode, node.expression);
        case 117 /* PrefixUnaryExpression */:
            return visitNode(cbNode, node.operator) ||
                visitNode(cbNode, node.operand);
        case 118 /* PostfixUnaryExpression */:
            return visitNode(cbNode, node.operand) ||
                visitNode(cbNode, node.operator);
        case 119 /* BinaryExpression */:
            return visitNode(cbNode, node.left) ||
                visitNode(cbNode, node.operatorToken) ||
                visitNode(cbNode, node.right);
        case 123 /* Block */:
            return visitNodes(cbNode, cbNodes, node.statements);
        case 122 /* SourceFile */:
            return visitNodes(cbNode, cbNodes, node.statements);
        case 132 /* ExpressionStatement */:
            return visitNode(cbNode, node.expression);
        case 124 /* IfStatement */:
            return visitNode(cbNode, node.expression) ||
                visitNode(cbNode, node.thenStatement) ||
                visitNode(cbNode, node.elseStatement);
        case 125 /* DoStatement */:
            return visitNode(cbNode, node.statement) ||
                visitNode(cbNode, node.expression);
        case 126 /* WhileStatement */:
            return visitNode(cbNode, node.expression) ||
                visitNode(cbNode, node.statement);
        case 127 /* ForStatement */:
            return visitNode(cbNode, node.initializer) ||
                visitNode(cbNode, node.condition) ||
                visitNode(cbNode, node.incrementor) ||
                visitNode(cbNode, node.statement);
        case 129 /* ContinueStatement */:
        case 128 /* BreakStatement */:
            break;
        case 131 /* ReturnStatement */:
            return visitNode(cbNode, node.expression);
        case 130 /* IncludeStatement */:
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