import * as gt from './types';
import { tokenToString } from './scanner';
import { getKindName} from './utils';

export class Printer {
    output: string[];
    indent: number;

    private write(text: string) {
        this.output.push(text);
    }

    private whitespace(text: string = ' ') {
        this.output.push(text);
    }

    private newLine() {
        this.output.push('\n');
    }

    private increaseIndent() {
        ++this.indent;
    }

    private decreaseIndent() {
        --this.indent;
    }

    private emitNode(node: gt.Node) {
        switch (node.kind) {
            case gt.SyntaxKind.FunctionDeclaration:
            {
                const func = <gt.FunctionDeclaration>node;
                if (func.modifiers && func.modifiers.length > 0) {
                    this.emitNodeList(func.modifiers, ' ');
                    this.write(' ');
                }
                this.emitNode(func.type);
                this.write(' ');
                this.emitNode(func.name);
                this.write('(');
                this.emitNodeList(func.parameters, ',', ' ');
                this.write(')');
                if (func.body) {
                    this.newLine();
                    this.emitNode(func.body);
                }
                else {
                    this.write(';');
                }
                this.newLine();
                break;
            }

            case gt.SyntaxKind.ParameterDeclaration:
            {
                const param = <gt.ParameterDeclaration>node;
                if (param.modifiers && param.modifiers.length > 0) {
                    this.emitNodeList(param.modifiers, ' ');
                    this.write(' ');
                }
                this.emitNode(param.type);
                this.write(' ');
                this.emitNode(param.name);
                break;
            }

            case gt.SyntaxKind.KeywordTypeNode:
            {
                const keyword = <gt.KeywordTypeNode>node;
                this.write(tokenToString(keyword.keyword.kind));
                break;
            }

            case gt.SyntaxKind.Identifier:
            {
                const identifier = <gt.Identifier>node;
                this.write(identifier.name);
                break;
            }

            case gt.SyntaxKind.NumericLiteral:
            case gt.SyntaxKind.StringLiteral:
            {
                const literal = <gt.Literal>node;
                this.write(literal.text);
                break;
            }

            default:
            {
                throw new Error(`unhandled node '${getKindName(node.kind)}'`);
            }
        }
    }

    private emitNodeList(nodesList: ReadonlyArray<gt.Node>, textSeparator: string = undefined, whitespaceSeparator: string = undefined) {
        nodesList.forEach((node: gt.Node, index: number) => {
            this.emitNode(node);
            if (nodesList.length !== (index + 1)) {
                if (textSeparator) {
                    this.write(textSeparator);
                }
                if (whitespaceSeparator) {
                    this.whitespace(whitespaceSeparator);
                }
            }
        });
    }

    private reset() {
        this.output = [];
        this.indent = 0;
    }

    private flush(): string {
        const text = this.output.join('');
        this.reset();
        return text;
    }

    public printNode(node: gt.Node): string {
        this.emitNode(node);
        return this.flush();
    }

    public printFile(sourceFile: gt.SourceFile): string {
        this.newLine();
        return this.flush();
    }

    constructor() {
        this.reset();
    }
}
