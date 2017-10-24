"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../compiler/utils");
function getNodeChildren(node) {
    let children = [];
    utils_1.forEachChild(node, (child) => {
        children.push(child);
    });
    children = children.concat(node.syntaxTokens);
    children = children.sort((a, b) => {
        if (a.pos === b.pos) {
            return 0;
        }
        return a.pos < b.pos ? -1 : 1;
    });
    return children;
}
exports.getNodeChildren = getNodeChildren;
function getNodeTokens(node) {
    return node.syntaxTokens;
}
exports.getNodeTokens = getNodeTokens;
function nodeHasTokens(node) {
    return node.end - node.pos > 0;
}
exports.nodeHasTokens = nodeHasTokens;
function findPrecedingToken(position, sourceFile, startNode) {
    return find(startNode || sourceFile);
    function findRightmostToken(n) {
        if (utils_1.isToken(n)) {
            return n;
        }
        const children = getNodeTokens(n);
        const candidate = findRightmostChildNodeWithTokens(children, children.length);
        return candidate && findRightmostToken(candidate);
    }
    function find(n) {
        if (utils_1.isToken(n)) {
            return n;
        }
        const children = getNodeChildren(n);
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (position < child.end && nodeHasTokens(child)) {
                const start = child.pos;
                const lookInPreviousChild = (start >= position);
                if (lookInPreviousChild) {
                    const candidate = findRightmostChildNodeWithTokens(children, i);
                    return candidate && findRightmostToken(candidate);
                }
                else {
                    return find(child);
                }
            }
        }
        if (children.length) {
            const candidate = findRightmostChildNodeWithTokens(children, children.length);
            return candidate && findRightmostToken(candidate);
        }
    }
    function findRightmostChildNodeWithTokens(children, exclusiveStartPosition) {
        for (let i = exclusiveStartPosition - 1; i >= 0; i--) {
            if (nodeHasTokens(children[i])) {
                return children[i];
            }
        }
    }
}
exports.findPrecedingToken = findPrecedingToken;
function getTokenAtPosition(position, sourceFile, includeEndPosition) {
    return getTokenAtPositionWorker(position, sourceFile, undefined, includeEndPosition);
}
exports.getTokenAtPosition = getTokenAtPosition;
function getTokenAtPositionWorker(position, sourceFile, includePrecedingTokenAtEndPosition, includeEndPosition) {
    return find(sourceFile);
    function find(n) {
        const children = getNodeChildren(n);
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.pos > position) {
                break;
            }
            if (utils_1.isToken(child)) {
                if (child.end > position) {
                    return child;
                }
                continue;
            }
            if (nodeHasTokens(child) && child.end >= position) {
                return find(child);
            }
        }
    }
}
function getPositionOfLineAndCharacter(sourceFile, line, character) {
    return sourceFile.lineMap[line] + character;
}
exports.getPositionOfLineAndCharacter = getPositionOfLineAndCharacter;
function getLineAndCharacterOfPosition(sourceFile, pos) {
    let loc = { line: 0, character: 0 };
    for (var i = 0; i < sourceFile.lineMap.length; i++) {
        if (sourceFile.lineMap[i] <= pos) {
            loc = {
                line: i,
                character: pos - sourceFile.lineMap[i],
            };
            continue;
        }
        break;
    }
    return loc;
}
exports.getLineAndCharacterOfPosition = getLineAndCharacterOfPosition;
//# sourceMappingURL=utils.js.map