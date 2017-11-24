"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const trig = require("../sc2mod/trigger");
const elementNotValidCharsRE = /[^a-zA-Z0-9_]+/g;
const elementValidCharsRE = /[a-zA-Z]+/g;
const quationMarkRE = /"/g;
class S2WorkspaceMetadata {
    constructor(workspace) {
        this.symbolMap = new Map();
        this.presetValueParentMap = new Map();
        this.workspace = workspace;
    }
    getElementSymbolName(el) {
        let parts = [];
        let elemName;
        if (el.name) {
            elemName = el.name;
        }
        else {
            elemName = this.workspace.locComponent.triggers.text('Name', el).replace(elementNotValidCharsRE, '');
        }
        if ((el instanceof trig.FunctionDef && el.flags & 2 /* Native */) ||
            el.value) {
            parts.push(elemName);
        }
        else {
            if (el.libId) {
                parts.push('lib' + el.libId);
            }
            if (el instanceof trig.FunctionDef) {
                parts.push('gf');
            }
            else if (el instanceof trig.Preset) {
                parts.push('ge');
            }
            if (parts.length) {
                parts.push(elemName);
            }
            else {
                parts.push(elemName.charAt(0).toLowerCase() + elemName.substr(1));
            }
        }
        return parts.join('_');
    }
    mapContainer(container) {
        for (const el of container.getElements().values()) {
            if (el instanceof trig.FunctionDef) {
                if (el.flags & 32 /* Template */)
                    continue;
                this.symbolMap.set(this.getElementSymbolName(el), el);
            }
            else if (el instanceof trig.Preset) {
                if (!(el.flags & 64 /* PresetGenConstVar */))
                    continue;
                if (el.baseType === 'bool')
                    continue;
                for (const presetRef of el.values) {
                    const presetValue = presetRef.resolve();
                    this.presetValueParentMap.set(presetValue.link(), el);
                    if (el.flags & 128 /* PresetCustom */) {
                        if (presetValue.value.match(elementValidCharsRE)) {
                            this.symbolMap.set(presetValue.value, presetValue);
                        }
                    }
                    else {
                        const pname = this.getElementSymbolName(el) + '_' + presetValue.name;
                        this.symbolMap.set(pname, presetValue);
                    }
                }
            }
        }
    }
    build() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.workspace.trigComponent.sync();
            yield this.workspace.locComponent.sync();
            for (const lib of this.workspace.trigComponent.getStore().getLibraries().values()) {
                this.mapContainer(lib);
            }
            this.mapContainer(this.workspace.trigComponent.getStore());
        });
    }
    findElementByName(name) {
        return this.symbolMap.get(name);
    }
    findPresetDef(presetValue) {
        return this.presetValueParentMap.get(presetValue.link());
    }
    getElementDoc(el) {
        const name = '**' + this.workspace.locComponent.triggers.text('Name', el) + '**';
        if (el instanceof trig.FunctionDef) {
            const hint = this.workspace.locComponent.triggers.text('Hint', el);
            return name + (hint ? '\n\n' + hint.replace(quationMarkRE, '*') : '');
        }
        else if (el instanceof trig.PresetValue) {
            const presetName = this.workspace.locComponent.triggers.text('Name', this.findPresetDef(el));
            return name + (presetName ? ' - ' + presetName : '');
        }
        else if (el instanceof trig.ParamDef) {
            let type;
            if (el.type.type === 'gamelink') {
                type = '`gamelink<' + el.type.gameType + '>`';
            }
            else if (el.type.type === 'preset') {
                type = '' + this.workspace.locComponent.triggers.text('Name', el.type.typeElement.resolve()) + '';
            }
            else {
                type = '`' + el.type.type + '`';
            }
            return name + ' - ' + type + '';
        }
        else {
            return name;
        }
    }
    getSymbolDoc(symbolName) {
        const el = this.findElementByName(symbolName);
        if (!el)
            return null;
        return this.getElementDoc(el);
    }
    getFunctionArgumentsDoc(symbolName) {
        const el = this.findElementByName(symbolName);
        if (!el)
            return null;
        const docs = [];
        if (el.flags & 16 /* Event */) {
            docs.push('**Trigger**');
        }
        for (const param of el.getParameters()) {
            docs.push(this.getElementDoc(param));
        }
        return docs;
    }
}
exports.S2WorkspaceMetadata = S2WorkspaceMetadata;
function getDocumentationOfSymbol(store, symbol) {
    if (!store.s2metadata)
        return null;
    return store.s2metadata.getSymbolDoc(symbol.escapedName);
}
exports.getDocumentationOfSymbol = getDocumentationOfSymbol;
//# sourceMappingURL=s2meta.js.map