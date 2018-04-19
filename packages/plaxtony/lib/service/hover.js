"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const checker_1 = require("../compiler/checker");
const provider_1 = require("./provider");
const utils_1 = require("./utils");
const printer_1 = require("../compiler/printer");
const s2meta_1 = require("./s2meta");
class HoverProvider extends provider_1.AbstractProvider {
    constructor() {
        super(...arguments);
        this.printer = new printer_1.Printer();
    }
    getHoverAt(params) {
        const sourceFile = this.store.documents.get(params.textDocument.uri);
        if (!sourceFile)
            return;
        const position = utils_1.getPositionOfLineAndCharacter(sourceFile, params.position.line, params.position.character);
        const currentToken = utils_1.getAdjacentIdentfier(position, sourceFile);
        if (!currentToken || currentToken.kind !== 110 /* Identifier */) {
            return null;
        }
        const checker = new checker_1.TypeChecker(this.store);
        const symbol = checker.getSymbolAtLocation(currentToken);
        if (!symbol) {
            return null;
        }
        const content = [];
        let decl = symbol.declarations[0];
        if (decl.kind === 138 /* FunctionDeclaration */) {
            decl = Object.assign({}, decl, { body: null });
        }
        let code = this.printer.printNode(decl).trim();
        // strip ;
        if (code.substr(code.length - 1, 1) === ';') {
            code = code.substr(0, code.length - 1);
        }
        content.push('```galaxy\n' + code + '\n```');
        // if (symbol.flags & gt.SymbolFlags.FunctionParameter) {
        //     content.push('parameter of `' + symbol.parent.escapedName + '`');
        // }
        // else if (symbol.flags & gt.SymbolFlags.Variable) {
        //     const isConstant = (<gt.VariableDeclaration>decl).modifiers.find((modifier) => {
        //         return modifier.kind === gt.SyntaxKind.ConstKeyword;
        //     })
        //     let scope: string = 'global';
        //     if (symbol.flags & gt.SymbolFlags.LocalVariable) {
        //         scope = 'local';
        //     }
        //     content.push('' + scope + ' ' + (isConstant ? 'constant' : 'variable') + '');
        // }
        if (symbol.flags & 16 /* Property */) {
            content.push('property of `' + symbol.parent.escapedName + '`');
        }
        const docs = s2meta_1.getDocumentationOfSymbol(this.store, symbol);
        if (docs) {
            content.push(docs);
        }
        return {
            contents: content,
            range: {
                start: utils_1.getLineAndCharacterOfPosition(sourceFile, currentToken.pos),
                end: utils_1.getLineAndCharacterOfPosition(sourceFile, currentToken.end),
            }
        };
    }
}
exports.HoverProvider = HoverProvider;
//# sourceMappingURL=hover.js.map