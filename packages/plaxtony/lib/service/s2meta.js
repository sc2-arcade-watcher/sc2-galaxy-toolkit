"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../compiler/utils");
function getDocumentationOfSymbol(store, functionSymbol) {
    const functionDeclaration = functionSymbol.declarations[0];
    let documentation = '';
    const s2archive = store.getArchiveOfSourceFile(utils_1.getSourceFileOfNode(functionDeclaration));
    const elementDef = store.getSymbolMetadata(functionSymbol);
    if (!s2archive || !elementDef) {
        return undefined;
    }
    for (const prop of ['Name', 'Hint']) {
        const textKey = elementDef.textKey(prop);
        if (s2archive.trigStrings.has(textKey)) {
            if (documentation.length) {
                documentation += '\n\n';
            }
            if (prop === 'Name') {
                documentation += '### ' + s2archive.trigStrings.get(textKey);
            }
            else {
                documentation += s2archive.trigStrings.get(textKey);
            }
        }
    }
    return documentation;
}
exports.getDocumentationOfSymbol = getDocumentationOfSymbol;
//# sourceMappingURL=s2meta.js.map