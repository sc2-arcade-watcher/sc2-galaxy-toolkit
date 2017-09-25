"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Types = require("../compiler/types");
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
function getTouchingToken(sourceFile, position, includePrecedingTokenAtEndPosition) {
    return getTokenAtPositionWorker(sourceFile, position, false, includePrecedingTokenAtEndPosition, false);
}
exports.getTouchingToken = getTouchingToken;
function getTokenAtPosition(sourceFile, position, includeEndPosition) {
    return getTokenAtPositionWorker(sourceFile, position, true, undefined, includeEndPosition);
}
exports.getTokenAtPosition = getTokenAtPosition;
function getTokenAtPositionWorker(sourceFile, position, allowPositionInLeadingTrivia, includePrecedingTokenAtEndPosition, includeEndPosition) {
    let current = sourceFile;
    outer: while (true) {
        if (utils_1.isToken(current)) {
            return current;
        }
        for (const child of getNodeTokens(current)) {
            const start = child.pos;
            if (start > position) {
                break;
            }
            const end = child.end;
            if (position < end || (position === end && (child.kind === 108 || includeEndPosition))) {
                current = child;
                continue outer;
            }
            else if (includePrecedingTokenAtEndPosition && end === position) {
                const previousToken = findPrecedingToken(position, sourceFile, child);
                if (previousToken && includePrecedingTokenAtEndPosition(previousToken)) {
                    return previousToken;
                }
            }
        }
        return current;
    }
}
function getPositionOfLineAndCharacter(sourceFile, line, character) {
    return sourceFile.lineMap[line] + character;
}
exports.getPositionOfLineAndCharacter = getPositionOfLineAndCharacter;
