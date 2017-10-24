"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gt = require("../compiler/types");
const utils_1 = require("../compiler/utils");
const printer_1 = require("../compiler/printer");
const provider_1 = require("./provider");
const utils_2 = require("./utils");
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
                if (argument.end >= position) {
                    return true;
                }
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
        const signatureInfo = {
            label: this.printer.printNode(Object.assign({}, functionDeclaration, { body: null })).trim(),
            documentation: '',
            parameters: [],
        };
        const s2archive = this.store.getArchiveOfSourceFile(utils_1.getSourceFileOfNode(functionDeclaration));
        const funcEl = this.store.getSymbolMetadata(functionSymbol);
        if (s2archive && funcEl) {
            for (const prop of ['Name', 'Hint']) {
                const textKey = funcEl.textKey(prop);
                if (s2archive.trigStrings.has(textKey)) {
                    if (signatureInfo.documentation.length) {
                        signatureInfo.documentation += '\n\n';
                    }
                    if (prop === 'Name') {
                        signatureInfo.documentation += '### ' + s2archive.trigStrings.get(textKey);
                    }
                    else {
                        signatureInfo.documentation += s2archive.trigStrings.get(textKey);
                    }
                }
            }
        }
        for (const [index, paramDeclaration] of functionDeclaration.parameters.entries()) {
            const paramInfo = {
                label: this.printer.printNode(paramDeclaration),
                documentation: '',
            };
            if (funcEl) {
                const paramEl = funcEl.getParameters()[index];
                if (paramEl) {
                    const textKey = paramEl.textKey('Name');
                    if (s2archive.trigStrings.has(textKey)) {
                        paramInfo.documentation += '#### ' + s2archive.trigStrings.get(textKey) + ` - *${paramEl.type.type}*` + '\n';
                    }
                    if (paramEl.type.type === 'preset') {
                        paramInfo.documentation += '---\n';
                        const preset = paramEl.type.typeElement.resolve();
                        for (const presetValueRef of preset.values) {
                            const presetValue = presetValueRef.resolve();
                            const locName = s2archive.trigStrings.get(presetValue.textKey('Name'));
                            paramInfo.documentation += `- \`${presetValue.value}\` - **${locName}**\n`;
                        }
                    }
                }
            }
            signatureInfo.parameters.push(paramInfo);
        }
        return signatureInfo;
    }
    getSignatureAt(uri, position) {
        const currentDocument = this.store.documents.get(uri);
        const currentToken = utils_2.findPrecedingToken(position, currentDocument);
        let node = currentToken.parent;
        if (currentToken.parent.kind === 115 && currentToken.parent.expression === currentToken) {
            node = currentToken.parent.parent;
        }
        const callNode = utils_1.findAncestor(node, (element) => {
            if (element.kind !== 115) {
                return false;
            }
            if (element.end <= position) {
                return false;
            }
            return true;
        });
        if (!callNode) {
            return null;
        }
        if (callNode.expression.kind !== 107) {
            return null;
        }
        const callIdentifier = (callNode.expression);
        const signatureHelp = {
            signatures: [],
            activeSignature: null,
            activeParameter: null,
        };
        for (const document of this.store.documents.values()) {
            const functionSymbol = document.symbol.members.get(callIdentifier.name);
            if (!functionSymbol) {
                continue;
            }
            const signatureInfo = this.getSignatureOfFunction(functionSymbol);
            signatureHelp.activeSignature = 0;
            signatureHelp.activeParameter = this.evaluateActiveParameter(callNode, position);
            signatureHelp.signatures.push(signatureInfo);
            break;
        }
        return signatureHelp;
    }
}
exports.SignaturesProvider = SignaturesProvider;
//# sourceMappingURL=signatures.js.map