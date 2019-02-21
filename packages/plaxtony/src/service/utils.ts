import * as util from 'util';
import * as glob from 'glob';
import * as gt from '../compiler/types';
import { isToken, forEachChild, getSourceFileOfNode } from '../compiler/utils';
import * as lsp from 'vscode-languageserver';

export function getNodeChildren(node: gt.Node): gt.Node[] {
    let children: gt.Node[] = [];

    forEachChild(node, (child: gt.Node) => {
        children.push(child);
    })

    children = children.concat(node.syntaxTokens);
    children = children.sort((a: gt.Node, b: gt.Node): number => {
        if (a.pos === b.pos) {
            return 0;
        }
        return a.pos < b.pos ? -1 : 1;
    });

    return children;
}

export function getNodeTokens(node: gt.Node): gt.Node[] {
    return node.syntaxTokens;
}

export function nodeHasTokens(node: gt.Node): boolean {
    return node.end - node.pos > 0;
}

export function findPrecedingToken(position: number, sourceFile: gt.SourceFile, startNode?: gt.Node): gt.Node | undefined {
    return find(startNode || sourceFile);

    function findRightmostToken(n: gt.Node): gt.Node {
        if (isToken(n)) {
            return n;
        }

        const children = getNodeChildren(n);
        const candidate = findRightmostChildNodeWithTokens(children, /*exclusiveStartPosition*/ children.length);
        return candidate && findRightmostToken(candidate);

    }

    function find(n: gt.Node): gt.Node {
        if (isToken(n)) {
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
                const lookInPreviousChild =
                    (start >= position); // cursor in the leading trivia

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
    function findRightmostChildNodeWithTokens(children: gt.Node[], exclusiveStartPosition: number): gt.Node {
        for (let i = exclusiveStartPosition - 1; i >= 0; i--) {
            if (nodeHasTokens(children[i])) {
                return children[i];
            }
        }
    }
}

export function getTokenAtPosition(position: number, sourceFile: gt.SourceFile, preferFollowing?: boolean): gt.Node {
    return getTokenAtPositionWorker(position, sourceFile, undefined, preferFollowing);
}

/** Get the token whose text contains the position */
function getTokenAtPositionWorker(position: number, sourceFile: gt.SourceFile, includePrecedingTokenAtEndPosition: (n: gt.Node) => boolean, preferFollowing: boolean): gt.Node | undefined {
    return find(sourceFile);
    // TODO: includePrecedingTokenAtEndPosition ?
    function find(n: gt.Node): gt.Node {
        const children = getNodeChildren(n);
        for (let i = 0; i < children.length; i++) {
            const child = children[i];

            if (child.pos > position) {
                const candidate = findRightmostChildNodeWithTokens(children, preferFollowing ? i : i - 1);
                return candidate && findRightmostToken(candidate);
            }
            else if (position < child.end) {
                if (isToken(child)) {
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

    function findRightmostChildNodeWithTokens(children: gt.Node[], exclusiveStartPosition: number): gt.Node {
        for (let i = exclusiveStartPosition; i >= 0; i--) {
            if (nodeHasTokens(children[i]) && position < children[i].end) {
                return children[i];
            }
        }
    }

    function findRightmostToken(n: gt.Node): gt.Node {
        if (isToken(n)) {
            return n;
        }

        const children = getNodeChildren(n);
        const candidate = findRightmostChildNodeWithTokens(children, children.length - 1);
        return candidate && findRightmostToken(candidate);
    }
}

export function getAdjacentIdentfier(position: number, sourceFile: gt.SourceFile): gt.Identifier {
    let token = getTokenAtPosition(position, sourceFile);
    if (token && token.kind === gt.SyntaxKind.Identifier) return <gt.Identifier>token;

    token = findPrecedingToken(position, sourceFile);
    if (token && token.kind === gt.SyntaxKind.Identifier) return <gt.Identifier>token;

    return null;
}

export function getAdjacentToken(position: number, sourceFile: gt.SourceFile) {
    let token = getTokenAtPosition(position, sourceFile);
    if (token) return token;

    token = findPrecedingToken(position, sourceFile);
    if (token) return token;

    return null;
}

export function getPositionOfLineAndCharacter(sourceFile: gt.SourceFile, line: number, character: number): number {
    return sourceFile.lineMap[line] + character;
}

export function getLineAndCharacterOfPosition(sourceFile: gt.SourceFile, pos: number): lsp.Position {
    let loc = {line: 0, character: 0};
    for (var i = 0; i < sourceFile.lineMap.length; i++) {
        if (sourceFile.lineMap[i] <= pos) {
            loc = {
                line: i,
                character: pos - sourceFile.lineMap[i],
            }
            continue;
        }
        break;
    }
    return loc;
}

// github.com/bevacqua/fuzzysearch
export function fuzzysearch (needle: string, haystack: string) {
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

export const globify = util.promisify(glob);
