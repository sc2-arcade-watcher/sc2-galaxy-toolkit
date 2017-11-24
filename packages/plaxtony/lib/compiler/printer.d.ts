import * as gt from './types';
export declare class Printer {
    output: string[];
    indent: number;
    emptyLine: boolean;
    private write(text);
    private whitespace(text?);
    private newLine();
    private increaseIndent();
    private decreaseIndent();
    private emitNode(node);
    private emitNodeList(nodesList, textSeparator?, whitespaceSeparator?, includeSeparatorAtEnd?);
    private reset();
    private flush();
    printNode(node: gt.Node): string;
    printFile(sourceFile: gt.SourceFile): string;
    constructor();
}
