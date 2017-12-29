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
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        const store = new store_1.Store();
        const tstore = new trig.TriggerStore();
        const treader = new trig.XMLReader(tstore);
        const ntveLib = yield treader.loadLibrary(fs.readFileSync(process.argv[2], 'utf8'));
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
        for (let filepath of glob.sync(path.join(path.resolve(process.argv[3]), '**/*.galaxy'))) {
            store.updateDocument(store_1.createTextDocumentFromFs(filepath));
        }
        const ntveElements = [];
        for (const curEl of ntveLib.getElements().values()) {
            if (!(curEl.flags & 2 /* Native */))
                continue;
            if (!(curEl instanceof trig.FunctionDef))
                continue;
            if (store.resolveGlobalSymbol(curEl.name))
                continue;
            let out = [];
            out.push('native ');
            out.push(curEl.returnType ? trigTypeToGalaxy(curEl.returnType) : 'void');
            out.push(' ');
            out.push(curEl.name);
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