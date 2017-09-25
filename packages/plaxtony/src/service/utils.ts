import * as Types from '../compiler/types';
import { isToken, forEachChild } from '../compiler/utils';

export function getNodeChildren(node: Types.Node): Types.Node[] {
    let children: Types.Node[] = [];

    forEachChild(node, (child: Types.Node) => {
        children.push(child);
    })

    children = children.concat(node.syntaxTokens);
    children = children.sort((a: Types.Node, b: Types.Node): number => {
        if (a.pos === b.pos) {
            return 0;
        }
        return a.pos < b.pos ? -1 : 1;
    });

    return children;
}

export function getNodeTokens(node: Types.Node): Types.Node[] {
    return node.syntaxTokens;
}

export function nodeHasTokens(node: Types.Node): boolean {
    return node.end - node.pos > 0;
}

export function findPrecedingToken(position: number, sourceFile: Types.SourceFile, startNode?: Types.Node): Types.Node | undefined {
    return find(startNode || sourceFile);

    function findRightmostToken(n: Types.Node): Types.Node {
        if (isToken(n)) {
            return n;
        }

        const children = getNodeTokens(n);
        const candidate = findRightmostChildNodeWithTokens(children, /*exclusiveStartPosition*/ children.length);
        return candidate && findRightmostToken(candidate);

    }

    function find(n: Types.Node): Types.Node {
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
    function findRightmostChildNodeWithTokens(children: Types.Node[], exclusiveStartPosition: number): Types.Node {
        for (let i = exclusiveStartPosition - 1; i >= 0; i--) {
            if (nodeHasTokens(children[i])) {
                return children[i];
            }
        }
    }
}

/**
 * Returns the token if position is in [start, end).
 * If position === end, returns the preceding token if includeItemAtEndPosition(previousToken) === true
 */
export function getTouchingToken(sourceFile: Types.SourceFile, position: number, includePrecedingTokenAtEndPosition?: (n: Types.Node) => boolean): Types.Node {
    return getTokenAtPositionWorker(sourceFile, position, false, includePrecedingTokenAtEndPosition, false);
}

/** Returns a token if position is in [start-of-leading-trivia, end) */
export function getTokenAtPosition(sourceFile: Types.SourceFile, position: number, includeEndPosition?: boolean): Types.Node {
    return getTokenAtPositionWorker(sourceFile, position, true, undefined, includeEndPosition);
}

/** Get the token whose text contains the position */
function getTokenAtPositionWorker(sourceFile: Types.SourceFile, position: number, allowPositionInLeadingTrivia: boolean, includePrecedingTokenAtEndPosition: (n: Types.Node) => boolean, includeEndPosition: boolean): Types.Node {
    let current: Types.Node = sourceFile;
    outer: while (true) {
        if (isToken(current)) {
            // exit early
            return current;
        }

        // find the child that contains 'position'
        for (const child of getNodeTokens(current)) {
            const start = child.pos;
            if (start > position) {
                // If this child begins after position, then all subsequent children will as well.
                break;
            }

            const end = child.end;
            if (position < end || (position === end && (child.kind === Types.SyntaxKind.EndOfFileToken || includeEndPosition))) {
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

export function getPositionOfLineAndCharacter(sourceFile: Types.SourceFile, line: number, character: number): number {
    return sourceFile.lineMap[line] + character;
}
