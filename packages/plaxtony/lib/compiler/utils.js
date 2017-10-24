"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Types = require("./types");
function isToken(n) {
    return n.kind >= 1 && n.kind <= 107;
}
exports.isToken = isToken;
function isModifierKind(token) {
    switch (token) {
        case 52:
        case 51:
        case 53:
            return true;
    }
    return false;
}
exports.isModifierKind = isModifierKind;
function isKeywordTypeKind(token) {
    switch (token) {
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 66:
        case 67:
        case 78:
        case 68:
        case 79:
        case 80:
        case 70:
        case 81:
        case 82:
        case 83:
        case 69:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 91:
        case 71:
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
            return true;
    }
    return false;
}
exports.isKeywordTypeKind = isKeywordTypeKind;
function isReferenceKeywordKind(token) {
    switch (token) {
        case 104:
        case 105:
        case 106:
            return true;
    }
    return false;
}
exports.isReferenceKeywordKind = isReferenceKeywordKind;
function isAssignmentOperator(token) {
    return token >= 38 && token <= 48;
}
exports.isAssignmentOperator = isAssignmentOperator;
function isLeftHandSideExpressionKind(kind) {
    return kind === 114
        || kind === 113
        || kind === 115
        || kind === 120
        || kind === 112
        || kind === 107
        || kind === 1
        || kind === 2
        || kind === 63
        || kind === 64
        || kind === 62;
}
exports.isLeftHandSideExpressionKind = isLeftHandSideExpressionKind;
function isContainerKind(kind) {
    return kind === 121
        || kind === 135
        || kind === 133;
}
exports.isContainerKind = isContainerKind;
function isNamedDeclarationKind(kind) {
    return kind === 121
        || kind === 134
        || kind === 135
        || kind === 133
        || kind === 137
        || kind === 114
        || kind === 136;
}
exports.isNamedDeclarationKind = isNamedDeclarationKind;
function isDeclarationKind(kind) {
    return isNamedDeclarationKind(kind)
        || kind === 115;
}
exports.isDeclarationKind = isDeclarationKind;
function isLeftHandSideExpression(node) {
    return isLeftHandSideExpressionKind(node.kind);
}
exports.isLeftHandSideExpression = isLeftHandSideExpression;
function isPartOfExpression(node) {
    switch (node.kind) {
        case 64:
        case 62:
        case 63:
        case 112:
        case 114:
        case 113:
        case 115:
        case 119:
        case 120:
        case 116:
        case 117:
        case 118:
        case 107:
            return true;
        case 1:
        case 2:
            const parent = node.parent;
            switch (parent.kind) {
                case 134:
                case 137:
                case 131:
                case 123:
                case 124:
                case 125:
                case 130:
                case 126:
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
    if (109 <= node.kind && node.kind <= 111) {
        return true;
    }
    switch (node.kind) {
        case 69:
        case 70:
        case 71:
        case 66:
        case 100:
            return true;
        case 107:
            if (node.parent.kind === 114 && node.parent.name === node) {
                node = node.parent;
            }
        case 114:
            const parent = node.parent;
            if (109 <= parent.kind && parent.kind <= 111) {
                return true;
            }
            switch (parent.kind) {
                case 137:
                case 136:
                case 134:
                    return node === parent.type;
                case 135:
                    return node === parent.type;
            }
    }
    return false;
}
exports.isPartOfTypeNode = isPartOfTypeNode;
function isRightSideOfPropertyAccess(node) {
    return (node.parent.kind === 114 && node.parent.name === node);
}
exports.isRightSideOfPropertyAccess = isRightSideOfPropertyAccess;
function isNodeOrArray(a) {
    return a !== undefined && a.kind !== undefined;
}
function getKindName(k) {
    if (typeof k === "string") {
        return k;
    }
    return Types.SyntaxKind[k];
}
exports.getKindName = getKindName;
function sourceFileToJSON(file) {
    return JSON.stringify(file, (_, v) => isNodeOrArray(v) ? serializeNode(v) : v, "    ");
    function serializeNode(n) {
        const o = { kind: getKindName(n.kind) };
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
                    break;
                case "originalKeywordKind":
                    o[propertyName] = getKindName(n[propertyName]);
                    break;
                case "flags":
                    break;
                case "referenceDiagnostics":
                case "parseDiagnostics":
                    break;
                case "text":
                    if (n.kind !== 121) {
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
    while (node && node.kind !== 121) {
        node = node.parent;
    }
    return node;
}
exports.getSourceFileOfNode = getSourceFileOfNode;
function fixupParentReferences(rootNode) {
    let parent = rootNode;
    forEachChild(rootNode, visitNode);
    function visitNode(n) {
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
function forEachChild(node, cbNode, cbNodes) {
    if (!node || !node.kind) {
        return;
    }
    switch (node.kind) {
        case 137:
            return visitNodes(cbNode, cbNodes, node.modifiers) ||
                visitNode(cbNode, node.type) ||
                visitNode(cbNode, node.name);
        case 134:
            return visitNodes(cbNode, cbNodes, node.modifiers) ||
                visitNode(cbNode, node.type) ||
                visitNode(cbNode, node.name) ||
                visitNode(cbNode, node.initializer);
        case 135:
            return visitNodes(cbNode, cbNodes, node.modifiers) ||
                visitNode(cbNode, node.type) ||
                visitNode(cbNode, node.name) ||
                visitNodes(cbNode, cbNodes, node.parameters) ||
                visitNode(cbNode, node.body);
        case 133:
            return visitNodes(cbNode, cbNodes, node.modifiers) ||
                visitNode(cbNode, node.name) ||
                visitNodes(cbNode, cbNodes, node.members);
        case 136:
            return visitNodes(cbNode, cbNodes, node.modifiers) ||
                visitNode(cbNode, node.name) ||
                visitNode(cbNode, node.type);
        case 111:
            return visitNode(cbNode, node.elementType) ||
                visitNode(cbNode, node.size);
        case 114:
            return visitNode(cbNode, node.expression) ||
                visitNode(cbNode, node.name);
        case 113:
            return visitNode(cbNode, node.expression) ||
                visitNode(cbNode, node.argumentExpression);
        case 115:
            return visitNode(cbNode, node.expression) ||
                visitNodes(cbNode, cbNodes, node.typeArguments) ||
                visitNodes(cbNode, cbNodes, node.arguments);
        case 120:
            return visitNode(cbNode, node.expression);
        case 116:
            return visitNode(cbNode, node.operand);
        case 117:
            return visitNode(cbNode, node.operand);
        case 118:
            return visitNode(cbNode, node.left) ||
                visitNode(cbNode, node.operatorToken) ||
                visitNode(cbNode, node.right);
        case 122:
            return visitNodes(cbNode, cbNodes, node.statements);
        case 121:
            return visitNodes(cbNode, cbNodes, node.statements);
        case 131:
            return visitNode(cbNode, node.expression);
        case 123:
            return visitNode(cbNode, node.expression) ||
                visitNode(cbNode, node.thenStatement) ||
                visitNode(cbNode, node.elseStatement);
        case 124:
            return visitNode(cbNode, node.statement) ||
                visitNode(cbNode, node.expression);
        case 125:
            return visitNode(cbNode, node.expression) ||
                visitNode(cbNode, node.statement);
        case 126:
            return visitNode(cbNode, node.initializer) ||
                visitNode(cbNode, node.condition) ||
                visitNode(cbNode, node.incrementor) ||
                visitNode(cbNode, node.statement);
        case 128:
        case 127:
            break;
        case 130:
            return visitNode(cbNode, node.expression);
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