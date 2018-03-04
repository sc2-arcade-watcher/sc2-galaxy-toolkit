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
const fs = require("fs");
const path = require("path");
const gt = require("../compiler/types");
const printer_1 = require("../compiler/printer");
const store_1 = require("../service/store");
const archive_1 = require("../sc2mod/archive");
const trig = require("../sc2mod/trigger");
// https://github.com/palantir/documentalist/blob/master/src/client/typescript.ts
// I mean the clutter from all these auto generated pages living along the tutorials. We would easly hit 1k, and that just from the beginning - I prefer to to not be restricted. Since there's possibility that more auto docs from code will come in future.
// Also not sure how Jekyll behaves when you alter layout that is shared between all Galaxy subpages - will it instantly attempt to regenerate them, before showing preview of the one I'm looking at?
// I just don't think its right tool for this task. And since I don't know Ruby, there's no way I'm gonna extend it's capability via plugins, so I'd rather base it on the things I'm familiar with.
// As I understand you choosed Jekyll, because it integrates well with Github pages and is relatively easy to submit fix for someone not deeply familiar with Git.
// But these advantages are redundant for the case I want to use it.
var DKind;
(function (DKind) {
    DKind["Library"] = "Library";
    DKind["Category"] = "Category";
    DKind["Function"] = "Function";
    DKind["FunctionParameter"] = "FunctionParameter";
    DKind["Preset"] = "Preset";
    DKind["PresetValue"] = "PresetValue";
})(DKind || (DKind = {}));
;
var DFunctionFlags;
(function (DFunctionFlags) {
    DFunctionFlags["Native"] = "Native";
    DFunctionFlags["Operator"] = "Operator";
    DFunctionFlags["SubFunctions"] = "SubFunctions";
    DFunctionFlags["CustomScript"] = "CustomScript";
})(DFunctionFlags || (DFunctionFlags = {}));
;
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        const store = new store_1.Store();
        const printer = new printer_1.Printer();
        const workspace = new archive_1.SC2Workspace(null, [new archive_1.SC2Archive('temp', archive_1.resolveArchiveDirectory('mods/core.sc2mod', ['/run/media/kk/nt1/ntdev/sc2-archive-trigger/repository']))]);
        yield store.updateS2Workspace(workspace, 'enUS');
        for (const modArchive of workspace.dependencies) {
            for (const extSrc of yield modArchive.findFiles('**/*.galaxy')) {
                store.updateDocument(store_1.createTextDocumentFromFs(path.join(modArchive.directory, extSrc)));
            }
        }
        const tlang = store.s2workspace.locComponent.triggers;
        // const tstore = new trig.TriggerStore();
        // const treader = new trig.XMLReader(tstore);
        // const ntveLib = await treader.loadLibrary(fs.readFileSync('/run/media/kk/nt1/ntdev/sc2-res-v4/mods/core.sc2mod/base.sc2data/TriggerLibs/NativeLib.TriggerLib', 'utf8'));
        // const enus = new loc.LocalizationFile();
        // await enus.readFromFile('/run/media/kk/nt1/ntdev/sc2-res-v4/mods/core.sc2mod/enus.sc2data/LocalizedData/TriggerStrings.txt');
        const categories = [];
        const labels = [];
        const docs = [];
        function processElement(el, listing) {
            if (el.label)
                labels.push(el.label.resolve());
            const parentListing = listing;
            if (el instanceof trig.Category) {
                categories.push(tlang.elementName('Name', el));
                listing = {
                    name: tlang.elementName('Name', el),
                    categories: [],
                    items: [],
                };
                parentListing.categories.push(listing);
            }
            let traverse = false;
            switch (el.constructor) {
                case trig.FunctionDef:
                    {
                        if (el.flags & 8192 /* Hidden */)
                            break;
                        if (el.flags & 32 /* Template */)
                            break;
                        const de = {
                            kind: DKind.Function,
                        };
                        de.name = tlang.elementName('Name', el);
                        de.grammar = tlang.elementName('Grammar', el) || null;
                        de.hint = tlang.elementName('Hint', el) || null;
                        de.categories = Object.assign([], categories);
                        const sym = store.resolveGlobalSymbol(store.s2metadata.getElementSymbolName(el));
                        if (sym) {
                            const decl = Object.assign({}, sym.declarations[0]);
                            if (decl.kind === 135 /* FunctionDeclaration */) {
                                decl.body = null;
                            }
                            de.id = sym.escapedName;
                            de.rawCode = printer.printNode(decl).trim();
                        }
                        else {
                            if (el.scriptCode) {
                                de.rawCode = el.scriptCode;
                            }
                        }
                        de.parameters = [];
                        for (const item of el.getParameters()) {
                            de.parameters.push({
                                kind: DKind.FunctionParameter,
                                // rawName: null,
                                name: tlang.elementName('Name', item),
                                type: item.type.type,
                                galaxyType: item.type.galaxyType(),
                                gameLink: item.type.gameType || null,
                                preset: item.type.typeElement ? item.type.typeElement.resolve().name : null,
                            });
                        }
                        if (el.returnType) {
                            const rtype = el.returnType;
                            de.returnType = {
                                kind: DKind.FunctionParameter,
                                name: '',
                                type: rtype.type,
                                galaxyType: rtype.galaxyType(),
                                gameLink: rtype.gameType || null,
                                preset: rtype.typeElement ? rtype.typeElement.resolve().name : null,
                            };
                        }
                        de.flags = [];
                        if (el.flags & 2 /* Native */)
                            de.flags.push(DFunctionFlags.Native);
                        if (el.flags & 512 /* Operator */)
                            de.flags.push(DFunctionFlags.Operator);
                        if (el.flags & 2048 /* SubFunctions */)
                            de.flags.push(DFunctionFlags.SubFunctions);
                        if (el.flags & 256 /* CustomScript */)
                            de.flags.push(DFunctionFlags.CustomScript);
                        docs.push(de);
                        // if (el.flags & trig.ElementFlag.CustomAI) {
                        //     console.log('- AI Custom -');
                        // }
                        // else if (el.flags & trig.ElementFlag.SubFunctions) {
                        //     console.log('- Sub funs -');
                        // }
                        // else if (el.flags & trig.ElementFlag.Operator) {
                        //     console.log('- Operator -');
                        // }
                        // else if (el.flags & trig.ElementFlag.CustomScript) {
                        //     console.log('- Custom script w/o code -');
                        // }
                        break;
                    }
                case trig.Preset:
                    {
                        const de = {
                            kind: DKind.Preset,
                        };
                        const preset = el;
                        de.name = tlang.elementName('Name', el);
                        de.presets = [];
                        if (preset.flags & 64 /* PresetGenConstVar */) {
                            for (const link of preset.values) {
                                const presetValue = link.resolve();
                                const dpValue = {
                                    kind: DKind.PresetValue,
                                };
                                dpValue.name = tlang.elementName('Name', presetValue);
                                if (preset.flags & 128 /* PresetCustom */) {
                                    if (presetValue.value.match(/[a-zA-Z]+/g)) {
                                        dpValue.rawName = presetValue.value;
                                    }
                                }
                                else {
                                    dpValue.rawName = store.s2metadata.getElementSymbolName(preset) + '_' + presetValue.name;
                                }
                                if (dpValue.rawName) {
                                    const sym = store.resolveGlobalSymbol(dpValue.rawName);
                                    if (sym) {
                                        dpValue.rawCode = printer.printNode(sym.declarations[0]).trim();
                                    }
                                }
                                de.presets.push(dpValue);
                            }
                        }
                        else if (preset.baseType === 'bool') {
                        }
                        docs.push(de);
                        break;
                    }
                case trig.Category:
                    {
                        const de = {
                            kind: DKind.Category,
                            label: el.label ? el.label.resolve().icon : null,
                        };
                        de.name = tlang.elementName('Name', el);
                        docs.push(de);
                        traverse = true;
                        break;
                    }
                default:
                    {
                        traverse = true;
                        break;
                    }
            }
            if (traverse) {
                for (const item of el.items) {
                    processElement(item.resolve(), listing);
                }
            }
            if (el instanceof trig.Category) {
                categories.pop();
            }
            if (el.label)
                labels.pop();
        }
        const rootListing = {
            name: 'ntve',
            categories: [],
            items: [],
        };
        processElement(workspace.trigComponent.getStore().getLibraries().get('Ntve'), rootListing);
        fs.writeFileSync('docs.json', JSON.stringify(docs));
        function generateMd() {
            const md = [];
            for (const item of docs) {
                if (md.length)
                    md.push('\n---\n');
                switch (item.kind) {
                    case DKind.Category:
                        {
                            md.push(`## ${item.name}`);
                            if (item.label)
                                md.push(`> Label: *${item.label}*\n`);
                            md.push('\n');
                            break;
                        }
                    case DKind.Function:
                        {
                            const dfunc = item;
                            md.push(`### ${dfunc.name}`);
                            if (dfunc.grammar)
                                md.push(`>**Grammar:** ${dfunc.grammar.replace(/~/g, '`')}` + (dfunc.flags.length ? ' \\' : ''));
                            if (dfunc.flags.length)
                                md.push(`>**Flags:** ${dfunc.flags.join(' | ')}`);
                            md.push('');
                            if (dfunc.hint) {
                                let hint = dfunc.hint;
                                hint = hint.replace(/"/g, '__');
                                md.push(`${hint}`);
                                // md.push('');
                            }
                            if (dfunc.rawCode) {
                                md.push('```c\n' + dfunc.rawCode + '\n```');
                                // md.push('');
                            }
                            if (dfunc.parameters.length) {
                                md.push('**Parameters**\n');
                                md.push(`Name | Type | Default value`);
                                md.push(`--- | --- | ---`);
                                for (const item of dfunc.parameters) {
                                    const isNativeType = item.type === item.galaxyType;
                                    let type = item.type;
                                    if (!isNativeType) {
                                        type += '&lt;' + (item.gameLink ? item.gameLink : `[${item.preset}](#${item.preset})`) + '&gt;';
                                    }
                                    else {
                                        type = `\`${type}\``;
                                    }
                                    md.push(`${item.name} | ` + (!isNativeType ? '`' + item.galaxyType + '` ' : '') + `${type} | -`);
                                }
                                md.push('');
                            }
                            md.push('**Return type**: ' +
                                (dfunc.returnType ? (dfunc.returnType.type === dfunc.returnType.galaxyType ?
                                    `\`${dfunc.returnType.galaxyType}\`` : `\`${dfunc.returnType.galaxyType}\` ` + '&lt;' + (dfunc.returnType.gameLink ? dfunc.returnType.gameLink : `[${dfunc.returnType.preset}](#${dfunc.returnType.preset})`) + '&gt;') : '`void`'));
                            md.push('');
                            break;
                        }
                    case DKind.Preset:
                        {
                            const dpreset = item;
                            md.push(`### ${dpreset.name}\n`);
                            if (dpreset.presets.length) {
                                md.push(`Name | Identifier | Code`);
                                md.push(`--- | --- | ---`);
                                for (const item of dpreset.presets) {
                                    let line = item.name;
                                    line += ' | ' + (item.rawName ? item.rawName : '-');
                                    line += ' | ' + (item.rawCode ? `\`${item.rawCode}\`` : '-');
                                    md.push(line);
                                }
                                md.push('');
                            }
                            break;
                        }
                }
            }
            fs.writeFileSync('docs.md', md.join('\n'));
        }
    });
})();
//# sourceMappingURL=gendoc.js.map