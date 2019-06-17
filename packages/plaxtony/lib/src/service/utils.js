"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("util");
const glob = require("glob");
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
        const children = getNodeChildren(n);
        const candidate = findRightmostChildNodeWithTokens(children, /*exclusiveStartPosition*/ children.length);
        return candidate && findRightmostToken(candidate);
    }
    function find(n) {
        if (utils_1.isToken(n)) {
            return n;
        }
        const children = getNodeChildren(n);
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            // condition 'position < child.end' checks if child node end after the position
            // in the example below this condition will be false for 'aaaa' and 'bbbb' and true for 'ccc'
            // aaaa___bbbb___$__ccc
            // after we found child node with end after the position we check if start of the node is after the position.
            // if yes - then position is in the trivia and we need to look into the previous child to find the token in question.
            // if no - position is in the node itself so we should recurse in it.
            if (position < child.end && nodeHasTokens(child)) {
                const start = child.pos;
                const lookInPreviousChild = (start >= position); // cursor in the leading trivia
                if (lookInPreviousChild) {
                    // actual start of the node is past the position - previous token should be at the end of previous child
                    const candidate = findRightmostChildNodeWithTokens(children, /*exclusiveStartPosition*/ i);
                    return candidate && findRightmostToken(candidate);
                }
                else {
                    // candidate should be in this node
                    return find(child);
                }
            }
        }
        // Here we know that none of child token nodes embrace the position,
        // Try to find the rightmost token in the file without filtering.
        // Namely we are skipping the check: 'position < node.end'
        if (children.length) {
            const candidate = findRightmostChildNodeWithTokens(children, /*exclusiveStartPosition*/ children.length);
            return candidate && findRightmostToken(candidate);
        }
    }
    /// finds last node that is considered as candidate for search (isCandidate(node) === true) starting from 'exclusiveStartPosition'
    function findRightmostChildNodeWithTokens(children, exclusiveStartPosition) {
        for (let i = exclusiveStartPosition - 1; i >= 0; i--) {
            if (nodeHasTokens(children[i])) {
                return children[i];
            }
        }
    }
}
exports.findPrecedingToken = findPrecedingToken;
function getTokenAtPosition(position, sourceFile, preferFollowing) {
    return getTokenAtPositionWorker(position, sourceFile, undefined, preferFollowing);
}
exports.getTokenAtPosition = getTokenAtPosition;
/** Get the token whose text contains the position */
function getTokenAtPositionWorker(position, sourceFile, includePrecedingTokenAtEndPosition, preferFollowing) {
    return find(sourceFile);
    // TODO: includePrecedingTokenAtEndPosition ?
    function find(n) {
        const children = getNodeChildren(n);
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.pos > position) {
                const candidate = findRightmostChildNodeWithTokens(children, preferFollowing ? i : i - 1);
                return candidate && findRightmostToken(candidate);
            }
            else if (position < child.end) {
                if (utils_1.isToken(child)) {
                    return child;
                }
                if (nodeHasTokens(child)) {
                    return find(child);
                }
            }
        }
        // supress error to ignore missing nodes and whitespace/comments
        // throw new Error(`failed to find token at position ${position} in ${sourceFile.fileName}`);
    }
    function findRightmostChildNodeWithTokens(children, exclusiveStartPosition) {
        for (let i = exclusiveStartPosition; i >= 0; i--) {
            if (nodeHasTokens(children[i]) && position < children[i].end) {
                return children[i];
            }
        }
    }
    function findRightmostToken(n) {
        if (utils_1.isToken(n)) {
            return n;
        }
        const children = getNodeChildren(n);
        const candidate = findRightmostChildNodeWithTokens(children, children.length - 1);
        return candidate && findRightmostToken(candidate);
    }
}
function getAdjacentIdentfier(position, sourceFile) {
    let token = getTokenAtPosition(position, sourceFile);
    if (token && token.kind === 113 /* Identifier */)
        return token;
    token = findPrecedingToken(position, sourceFile);
    if (token && token.kind === 113 /* Identifier */)
        return token;
    return null;
}
exports.getAdjacentIdentfier = getAdjacentIdentfier;
function getAdjacentToken(position, sourceFile) {
    let token = getTokenAtPosition(position, sourceFile);
    if (token)
        return token;
    token = findPrecedingToken(position, sourceFile);
    if (token)
        return token;
    return null;
}
exports.getAdjacentToken = getAdjacentToken;
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
// github.com/bevacqua/fuzzysearch
function fuzzysearch(needle, haystack) {
    var hlen = haystack.length;
    var nlen = needle.length;
    if (nlen > hlen) {
        return false;
    }
    if (nlen === hlen) {
        return needle === haystack;
    }
    outer: for (let i = 0, j = 0; i < nlen; i++) {
        let nch = needle.charCodeAt(i);
        while (j < hlen) {
            let hch = haystack.charCodeAt(j++);
            // case sensitive
            if (hch === nch) {
                continue outer;
            }
            // try case insensitive
            if (nch >= 65 && nch <= 90) {
                nch += 32;
            }
            else if (nch >= 97 && nch <= 122) {
                nch -= 32;
            }
            else {
                break;
            }
            if (hch === nch) {
                continue outer;
            }
        }
        return false;
    }
    return true;
}
exports.fuzzysearch = fuzzysearch;
exports.globify = util.promisify(glob);
//# sourceMappingURL=utils.js.map