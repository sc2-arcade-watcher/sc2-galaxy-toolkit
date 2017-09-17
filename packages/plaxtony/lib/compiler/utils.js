"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Types = require("./types");
function formatStringFromArgs(text, args, baseIndex) {
    baseIndex = baseIndex || 0;
    return text.replace(/{(\d+)}/g, (_match, index) => args[+index + baseIndex]);
}
exports.formatStringFromArgs = formatStringFromArgs;
function createFileDiagnostic(file, start, length, message) {
    const end = start + length;
    let text = message.message;
    if (arguments.length > 4) {
        text = formatStringFromArgs(text, arguments, 4);
    }
    return {
        file,
        start,
        length,
        messageText: text,
        category: message.category,
        code: message.code,
    };
}
exports.createFileDiagnostic = createFileDiagnostic;
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
            return true;
    }
    return false;
}
exports.isKeywordTypeKind = isKeywordTypeKind;
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
        || kind === 108
        || kind === 1
        || kind === 2
        || kind === 63
        || kind === 64
        || kind === 62;
}
function isLeftHandSideExpression(node) {
    return isLeftHandSideExpressionKind(node.kind);
}
exports.isLeftHandSideExpression = isLeftHandSideExpression;
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
function fixupParentReferences(rootNode) {
    let parent = rootNode;
    forEachChild(rootNode, visitNode);
    return;
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
        case 121:
            return visitNodes(cbNode, cbNodes, node.statements);
    }
}
exports.forEachChild = forEachChild;
