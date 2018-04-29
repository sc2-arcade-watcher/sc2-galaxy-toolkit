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
const tildeRE = /~/g;
class S2WorkspaceMetadata {
    constructor(workspace) {
        this.symbolMap = new Map();
        this.presetValueParentMap = new Map();
        this.workspace = workspace;
    }
    getElementSymbolName(el) {
        let parts = [];
        let elemName = '';
        if (el.name) {
            elemName = el.name;
        }
        else {
            const localizedName = this.workspace.locComponent.triggers.elementName('Name', el);
            if (localizedName) {
                elemName = localizedName.replace(elementNotValidCharsRE, '');
            }
        }
        if (el instanceof trig.FunctionDef && (el.flags & 2 /* Native */ || el.flags & 16384 /* NoScriptPrefix */)) {
            parts.push(elemName);
        }
        else if (el.value && (el.value.startsWith('c_') ||
            el.value === 'null' ||
            el.value === 'true' ||
            el.value === 'false')) {
            parts.push(el.value);
        }
        else {
            if (el.libId) {
                parts.push('lib' + el.libId);
            }
            if (el instanceof trig.FunctionDef) {
                if (el.flags & 512 /* Operator */)
                    parts.push('op');
                else
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
                        if (presetValue.value.match(elementValidCharsRE) && !this.symbolMap.has(presetValue.value)) {
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
    build(lang) {
        return __awaiter(this, void 0, void 0, function* () {
            this.workspace.locComponent.lang = lang;
            yield this.workspace.loadComponents();
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
    getConstantNamesOfPreset(preset) {
        let names = [];
        if (!(preset.flags & 64 /* PresetGenConstVar */))
            return [];
        if (preset.baseType === 'bool')
            return [];
        for (const link of preset.values) {
            const presetValue = link.resolve();
            if (preset.flags & 128 /* PresetCustom */) {
                if (presetValue.value.match(elementValidCharsRE)) {
                    names.push(presetValue.value);
                }
            }
            else {
                names.push(this.getElementSymbolName(preset) + '_' + presetValue.name);
            }
        }
        return names;
    }
    getElementDoc(el, extended) {
        let name = '**' + this.workspace.locComponent.triggers.elementName('Name', el) + '**';
        if (el instanceof trig.FunctionDef) {
            if (extended) {
                const grammar = this.workspace.locComponent.triggers.elementName('Grammar', el);
                if (grammar) {
                    name += ' (' + grammar.replace(tildeRE, '`') + ')';
                }
            }
            const hint = this.workspace.locComponent.triggers.elementName('Hint', el);
            if (hint) {
                name += '\n\n' + hint.replace(quationMarkRE, '*');
            }
            return name;
        }
        else if (el instanceof trig.PresetValue) {
            const presetName = this.workspace.locComponent.triggers.elementName('Name', this.findPresetDef(el));
            return name + (presetName ? ' - ' + presetName : '');
        }
        else if (el instanceof trig.ParamDef) {
            let type;
            if (el.type.type === 'gamelink') {
                type = '`gamelink<' + (el.type.gameType || 'any') + '>`';
            }
            else if (el.type.type === 'preset') {
                type = '' + this.workspace.locComponent.triggers.elementName('Name', el.type.typeElement.resolve()) + '';
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
    getSymbolDoc(symbolName, extended = true) {
        const el = this.findElementByName(symbolName);
        if (!el)
            return null;
        return this.getElementDoc(el, extended);
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
            docs.push(this.getElementDoc(param, false));
        }
        return docs;
    }
    getElementTypeOfNode(node) {
        // if (node.kind !== gt.SyntaxKind.StringLiteral) return null;
        if (node.parent.kind !== 119 /* CallExpression */)
            return null;
        const callExpr = node.parent;
        if (callExpr.expression.kind !== 111 /* Identifier */)
            return null;
        const el = this.findElementByName(callExpr.expression.name);
        if (!el)
            return null;
        let index = null;
        if (node.kind === 12 /* CommaToken */ || node.kind === 6 /* OpenParenToken */) {
            for (const [key, token] of callExpr.syntaxTokens.entries()) {
                index = key - 1;
                if (node.end < token.end) {
                    break;
                }
            }
        }
        else {
            for (const [key, arg] of callExpr.arguments.entries()) {
                if (arg === node) {
                    index = key;
                    break;
                }
            }
        }
        if (index === null)
            return null;
        if (el.flags & 16 /* Event */) {
            index--;
        }
        if (el.getParameters().length <= index || index < 0)
            return null;
        return el.getParameters()[index].type;
    }
    getLinksForGameType(gameType) {
        const catalog = this.workspace.catalogComponent.getStore().catalogs.get(gameType);
        if (!catalog)
            return null;
        return catalog.entries;
    }
    getGameLinkLocalizedName(gameType, gameLink, includePrefix = false) {
        const name = this.workspace.locComponent.strings.get('Game').text(`${gameType}/Name/${gameLink}`);
        const prefix = this.workspace.locComponent.strings.get('Object').text(`${gameType}/EditorPrefix/${gameLink}`);
        const sufix = this.workspace.locComponent.strings.get('Object').text(`${gameType}/EditorSuffix/${gameLink}`);
        return (prefix ? prefix + ' ' : '') + (name ? name : '') + (sufix ? ' ' + sufix : '');
    }
    getGameLinkKind(gameType, gameLink) {
        return this.workspace.catalogComponent.getStore().catalogs.get(gameType).entries.get(gameLink).kind;
    }
}
exports.S2WorkspaceMetadata = S2WorkspaceMetadata;
function getDocumentationOfSymbol(store, symbol, extended = true) {
    if (!store.s2metadata)
        return null;
    return store.s2metadata.getSymbolDoc(symbol.escapedName, extended);
}
exports.getDocumentationOfSymbol = getDocumentationOfSymbol;
//# sourceMappingURL=s2meta.js.map