"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gt = require("../compiler/types");
const utils_1 = require("../compiler/utils");
const printer_1 = require("../compiler/printer");
const checker_1 = require("../compiler/checker");
const provider_1 = require("./provider");
const utils_2 = require("./utils");
const s2meta_1 = require("./s2meta");
class SignaturesProvider extends provider_1.AbstractProvider {
    constructor() {
        super(...arguments);
        this.printer = new printer_1.Printer();
    }
    evaluateActiveParameter(callExpr, position) {
        let activeParam = null;
        let prevArg;
        callExpr.arguments.some((argument, index, args) => {
            if (argument.pos <= position) {
                activeParam = index;
                prevArg = argument;
                // exit early when confirmed it is in bounds
                // in other case keep going to acomodate whitespaces
                if (argument.end >= position) {
                    return true;
                }
                // offset is after last existing arg, it means the current argument wasn't yet parsed
                if (index === args.length - 1 && position > args[index].end) {
                    activeParam++;
                }
            }
            else if (prevArg) {
                activeParam = index;
                return true;
            }
            return;
        });
        return activeParam;
    }
    getSignatureOfFunction(functionSymbol) {
        const functionDeclaration = functionSymbol.declarations[0];
        let code = this.printer.printNode(Object.assign({}, functionDeclaration, { body: null })).trim();
        // strip ;
        if (code.substr(code.length - 1, 1) === ';') {
            code = code.substr(0, code.length - 1);
        }
        const signatureInfo = {
            label: code,
            documentation: '',
            parameters: [],
        };
        signatureInfo.documentation = s2meta_1.getDocumentationOfSymbol(this.store, functionSymbol);
        const argsDoc = this.store.s2metadata ? this.store.s2metadata.getFunctionArgumentsDoc(functionSymbol.escapedName) : null;
        for (const [index, paramDeclaration] of functionDeclaration.parameters.entries()) {
            const paramInfo = {
                label: this.printer.printNode(paramDeclaration),
                documentation: null,
            };
            if (argsDoc && argsDoc[index]) {
                paramInfo.documentation = argsDoc[index];
            }
            signatureInfo.parameters.push(paramInfo);
        }
        return signatureInfo;
    }
    getSignatureAt(uri, position) {
        const signatureHelp = {
            signatures: [],
            activeSignature: null,
            activeParameter: null,
        };
        const sourceFile = this.store.documents.get(uri);
        if (!sourceFile)
            return;
        const currentToken = utils_2.getTokenAtPosition(position, sourceFile, true);
        if (!currentToken) {
            return null;
        }
        let node = currentToken.parent;
        const callNode = utils_1.findAncestor(node, (element) => {
            if (element.kind !== 115 /* CallExpression */) {
                return false;
            }
            // we don't want to provide signature for left side of CallExpression
            if (element.arguments.pos > position) {
                return false;
            }
            // skip if goes over range - we must've hit CloseParenToken
            if (element.end <= position) {
                return false;
            }
            return true;
        });
        if (!callNode) {
            return null;
        }
        const checker = new checker_1.TypeChecker(this.store);
        const type = checker.getTypeOfNode(callNode.expression, true);
        if (type.flags & 16384 /* Function */) {
            const signatureInfo = this.getSignatureOfFunction(type.symbol);
            signatureHelp.activeSignature = 0;
            signatureHelp.activeParameter = this.evaluateActiveParameter(callNode, position);
            signatureHelp.signatures.push(signatureInfo);
        }
        return signatureHelp;
    }
}
exports.SignaturesProvider = SignaturesProvider;
//# sourceMappingURL=signatures.js.map