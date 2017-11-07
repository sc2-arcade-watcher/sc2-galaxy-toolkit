"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../compiler/utils");
const trig = require("../sc2mod/trigger");
function getLocalizedName(key, element, s2archive) {
    return s2archive.trigStrings.get(element.textKey(key));
}
function getDocumentationOfSymbol(store, symbol) {
    const functionDeclaration = symbol.declarations[0];
    let documentation = '';
    const s2archive = store.getArchiveOfSourceFile(utils_1.getSourceFileOfNode(functionDeclaration));
    const elementDef = store.getSymbolMetadata(symbol);
    if (!s2archive || !elementDef) {
        return undefined;
    }
    let tmp;
    if (elementDef instanceof trig.FunctionDef) {
        tmp = getLocalizedName('Name', elementDef, s2archive);
        if (tmp) {
            documentation += '### ' + tmp + '\n';
        }
        tmp = getLocalizedName('Hint', elementDef, s2archive);
        if (tmp) {
            documentation += tmp + '\n';
        }
    }
    else if (elementDef instanceof trig.PresetValue) {
        const preset = s2archive.trigLibs.findPresetByValue(elementDef);
        tmp = getLocalizedName('Name', elementDef, s2archive);
        if (tmp) {
            documentation += '**' + tmp + '**\n\n';
        }
        tmp = getLocalizedName('Name', preset, s2archive);
        if (tmp) {
            documentation += 'Preset of **' + tmp + '**\n';
        }
    }
    return documentation.trim();
}
exports.getDocumentationOfSymbol = getDocumentationOfSymbol;
//# sourceMappingURL=s2meta.js.map