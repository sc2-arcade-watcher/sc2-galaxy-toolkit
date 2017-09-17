import { SyntaxKind, DiagnosticMessage } from './types';
export interface ErrorCallback {
    (message: DiagnosticMessage, length: number): void;
}
export declare function stringToToken(s: string): SyntaxKind | undefined;
export declare function tokenToString(t: SyntaxKind): string | undefined;
export declare function isIdentifierStart(ch: number): boolean;
export declare function isIdentifierPart(ch: number): boolean;
export declare function isLineBreak(ch: number): boolean;
export declare function isDigit(ch: number): boolean;
export declare function isOctalDigit(ch: number): boolean;
export declare class Scanner {
    private line;
    private col;
    private pos;
    private end;
    private startPos;
    private tokenPos;
    private text;
    private token;
    private tokenValue;
    private onError?;
    constructor(onError?: ErrorCallback);
    private error(msg);
    private speculationHelper<T>(callback, isLookahead);
    lookAhead<T>(callback: () => T): T;
    tryScan<T>(callback: () => T): T;
    private scanHexDigits(minCount, scanAsManyAsPossible);
    private scanEscapeSequence();
    private scanString(allowEscapes?);
    private scanNumber();
    private scanBinaryOrOctalDigits(base);
    private scanOctalDigits();
    private getIdentifierToken();
    setText(text: string): void;
    scan(): SyntaxKind;
    getLine(): number;
    getCol(): number;
    getStartPos(): number;
    getTokenPos(): number;
    getTextPos(): number;
    getTokenValue(): string;
}
