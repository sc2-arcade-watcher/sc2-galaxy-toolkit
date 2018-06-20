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
const glob = require("glob");
const store_1 = require("../service/store");
const trig = require("../sc2mod/trigger");
const loc = require("../sc2mod/localization");
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        const store = new store_1.Store();
        const tstore = new trig.TriggerStore();
        const treader = new trig.XMLReader(tstore);
        const locStrings = new loc.LocalizationTriggers();
        const ntveLib = yield treader.loadLibrary(fs.readFileSync(`${process.argv[2]}/base.sc2data/TriggerLibs/NativeLib.TriggerLib`, 'utf8'));
        const ntveStrings = new loc.LocalizationFile();
        ntveStrings.readFromFile(`${process.argv[2]}/enus.sc2data/LocalizedData/TriggerStrings.txt`);
        locStrings.merge(ntveStrings);
        function trigTypeToGalaxy(type) {
            switch (type.type) {
                case 'gamelink':
                case 'convline':
                case 'filepath':
                case 'gameoption':
                case 'gameoptionvalue':
                case 'modelanim':
                    return 'string';
                case 'control':
                case 'transmission':
                case 'portrait':
                    return 'int';
                case 'preset':
                    return type.typeElement.resolve().baseType;
                default:
                    return type.type;
            }
        }
        for (let filepath of glob.sync(path.join(path.resolve(process.argv[2]), 'base.sc2data', 'TriggerLibs', '**/*.galaxy'))) {
            store.updateDocument(store_1.createTextDocumentFromFs(filepath));
        }
        const ntveElements = [];
        for (const curEl of ntveLib.getElements().values()) {
            if (!(curEl.flags & 2 /* Native */))
                continue;
            if (!(curEl instanceof trig.FunctionDef))
                continue;
            const name = curEl.name || locStrings.elementName('Name', curEl).replace(/[^a-zA-Z0-9_]+/g, '');
            if (store.resolveGlobalSymbol(name))
                continue;
            let out = [];
            out.push('native ');
            out.push(curEl.returnType ? trigTypeToGalaxy(curEl.returnType) : 'void');
            out.push(' ');
            out.push(name);
            out.push('(');
            for (const [key, param] of curEl.getParameters().entries()) {
                out.push(trigTypeToGalaxy(param.type));
                out.push(' lp_');
                out.push(param.name);
                if (key < curEl.parameters.length - 1) {
                    out.push(', ');
                }
            }
            out.push(');');
            console.log(out.join(''));
        }
    });
})();
//# sourceMappingURL=gmnatives.js.map