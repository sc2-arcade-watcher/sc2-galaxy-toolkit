import * as gt from './types';
import { tokenToString } from './scanner';
import { getKindName, isToken} from './utils';

export class Printer {
    output: string[];
    indent: number;
    emptyLine: boolean = true;

    private write(text: string) {
        if (this.emptyLine) {
            this.output.push('\t'.repeat(this.indent));
            this.emptyLine = false;
        }
        this.output.push(text);
    }

    private whitespace(text: string = ' ') {
        if (this.emptyLine) {
            this.output.push('\t'.repeat(this.indent));
            this.emptyLine = false;
        }
        if (text === '\n') {
            this.newLine();
        }
        else {
            this.output.push(text);
        }
    }

    private newLine() {
        this.output.push('\n');
        this.emptyLine = true;
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

            case gt.SyntaxKind.StructDeclaration:
            {
                const struct = <gt.StructDeclaration>node;
                this.write('struct ');
                this.emitNode(struct.name);
                this.write(' {');
                this.newLine();
                this.increaseIndent();
                this.emitNodeList(struct.members, '', '\n', true);
                this.decreaseIndent();
                this.write('};');
                this.newLine();
                break;
            }

            case gt.SyntaxKind.VariableDeclaration:
            case gt.SyntaxKind.PropertyDeclaration:
            {
                const variable = <gt.VariableDeclaration>node;
                if (variable.modifiers && variable.modifiers.length > 0) {
                    this.emitNodeList(variable.modifiers, ' ');
                    this.write(' ');
                }
                this.emitNode(variable.type);
                this.write(' ');
                this.emitNode(variable.name);
                if (variable.kind === gt.SyntaxKind.VariableDeclaration && variable.initializer) {
                    this.whitespace(' ');
                    this.write('=');
                    this.whitespace(' ');
                    this.emitNode(variable.initializer);
                }
                this.write(';');
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

            case gt.SyntaxKind.TypedefDeclaration:
            {
                const typedef = <gt.TypedefDeclaration>node;
                this.write('typedef ');
                this.emitNode(typedef.type);
                this.write(' ');
                this.emitNode(typedef.name);
                this.write(';');
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

            case gt.SyntaxKind.ArrayType:
            {
                const type = <gt.ArrayTypeNode>node;
                this.emitNode(type.elementType);
                this.write('[');
                this.emitNode(type.size);
                this.write(']');
                break;
            }

            case gt.SyntaxKind.MappedType:
            {
                const type = <gt.MappedTypeNode>node;
                this.emitNode(type.returnType);
                this.write('<');
                this.emitNodeList(type.typeArguments, ',', ' ');
                this.write('>');
                break;
            }

            case gt.SyntaxKind.BinaryExpression:
            {
                const expr = <gt.BinaryExpression>node;
                this.emitNode(expr.left);
                this.whitespace(' ');
                this.emitNode(expr.operatorToken);
                this.whitespace(' ');
                this.emitNode(expr.right);
                break;
            }

            case gt.SyntaxKind.PrefixUnaryExpression:
            {
                const expr = <gt.PrefixUnaryExpression>node;
                this.emitNode(expr.operator);
                this.emitNode(expr.operand);
                break;
            }

            case gt.SyntaxKind.PostfixUnaryExpression:
            {
                const expr = <gt.PostfixUnaryExpression>node;
                this.emitNode(expr.operand);
                this.emitNode(expr.operator);
                break;
            }

            case gt.SyntaxKind.ParenthesizedExpression:
            {
                const expr = <gt.ParenthesizedExpression>node;
                this.write('(');
                this.emitNode(expr.expression);
                this.write(')');
                break;
            }

            case gt.SyntaxKind.CallExpression:
            {
                const expr = <gt.CallExpression>node;
                this.emitNode(expr.expression);
                this.write('(');
                this.emitNodeList(expr.arguments, ',', ' ');
                this.write(')');
                break;
            }

            case gt.SyntaxKind.ElementAccessExpression:
            {
                const expr = <gt.ElementAccessExpression>node;
                this.emitNode(expr.expression);
                this.write('[');
                this.emitNode(expr.argumentExpression);
                this.write(']');
                break;
            }

            case gt.SyntaxKind.PropertyAccessExpression:
            {
                const expr = <gt.PropertyAccessExpression>node;
                this.emitNode(expr.expression);
                this.write('.');
                this.emitNode(expr.name);
                break;
            }

            default:
            {
                if (isToken(node)) {
                    this.write(tokenToString(node.kind));
                    break;
                }

                throw new Error(`unhandled node '${getKindName(node.kind)}'`);
            }
        }
    }

    private emitNodeList(nodesList: ReadonlyArray<gt.Node>, textSeparator: string = undefined, whitespaceSeparator: string = undefined, includeSeparatorAtEnd: boolean = false) {
        nodesList.forEach((node: gt.Node, index: number) => {
            this.emitNode(node);
            if (includeSeparatorAtEnd || nodesList.length !== (index + 1)) {
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
