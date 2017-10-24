"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gt = require("./types");
const scanner_1 = require("./scanner");
const utils_1 = require("./utils");
class Printer {
    write(text) {
        this.output.push(text);
    }
    whitespace(text = ' ') {
        this.output.push(text);
    }
    newLine() {
        this.output.push('\n');
    }
    increaseIndent() {
        ++this.indent;
    }
    decreaseIndent() {
        --this.indent;
    }
    emitNode(node) {
        switch (node.kind) {
            case 135:
                {
                    const func = node;
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
            case 136:
                {
                    const param = node;
                    if (param.modifiers && param.modifiers.length > 0) {
                        this.emitNodeList(param.modifiers, ' ');
                        this.write(' ');
                    }
                    this.emitNode(param.type);
                    this.write(' ');
                    this.emitNode(param.name);
                    break;
                }
            case 107:
                {
                    const identifier = node;
                    this.write(identifier.name);
                    break;
                }
            case 1:
            case 2:
                {
                    const literal = node;
                    this.write(literal.text);
                    break;
                }
            case 111:
                {
                    const type = node;
                    this.emitNode(type.elementType);
                    this.write('[');
                    this.emitNode(type.size);
                    this.write(']');
                    break;
                }
            case 110:
                {
                    const type = node;
                    this.emitNode(type.returnType);
                    this.write('<');
                    this.emitNodeList(type.typeArguments, ',', ' ');
                    this.write('>');
                    break;
                }
            case 118:
                {
                    const expr = node;
                    this.emitNode(expr.left);
                    this.write(' ');
                    this.emitNode(expr.operatorToken);
                    this.write(' ');
                    this.emitNode(expr.right);
                    break;
                }
            default:
                {
                    if (utils_1.isToken(node)) {
                        this.write(scanner_1.tokenToString(node.kind));
                        break;
                    }
                    throw new Error(`unhandled node '${utils_1.getKindName(node.kind)}'`);
                }
        }
    }
    emitNodeList(nodesList, textSeparator = undefined, whitespaceSeparator = undefined) {
        nodesList.forEach((node, index) => {
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
    reset() {
        this.output = [];
        this.indent = 0;
    }
    flush() {
        const text = this.output.join('');
        this.reset();
        return text;
    }
    printNode(node) {
        this.emitNode(node);
        return this.flush();
    }
    printFile(sourceFile) {
        this.newLine();
        return this.flush();
    }
    constructor() {
        this.reset();
    }
}
exports.Printer = Printer;
//# sourceMappingURL=printer.js.map