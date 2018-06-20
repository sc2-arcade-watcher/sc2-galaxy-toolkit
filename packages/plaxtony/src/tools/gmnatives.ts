import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { Store, createTextDocumentFromFs } from '../service/store';
import * as trig from '../sc2mod/trigger';
import * as loc from '../sc2mod/localization';

(async function () {
    const store = new Store();
    const tstore = new trig.TriggerStore();
    const treader = new trig.XMLReader(tstore);
    const locStrings = new loc.LocalizationTriggers();
    const ntveLib = await treader.loadLibrary(fs.readFileSync(`${process.argv[2]}/base.sc2data/TriggerLibs/NativeLib.TriggerLib`, 'utf8'));
    const ntveStrings = new loc.LocalizationFile();
    ntveStrings.readFromFile(`${process.argv[2]}/enus.sc2data/LocalizedData/TriggerStrings.txt`);
    locStrings.merge(ntveStrings);

    function trigTypeToGalaxy(type: trig.ParameterType): string {
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
        store.updateDocument(createTextDocumentFromFs(filepath));
    }

    const ntveElements: trig.FunctionDef[] = [];
    for (const curEl of ntveLib.getElements().values()) {
        if (!(curEl.flags & trig.ElementFlag.Native)) continue;
        if (!(curEl instanceof trig.FunctionDef)) continue;
        const name = curEl.name || locStrings.elementName('Name', curEl).replace(/[^a-zA-Z0-9_]+/g, '');
        if (store.resolveGlobalSymbol(name)) continue;

        let out: string[] = [];
        out.push('native ');
        out.push(curEl.returnType ? trigTypeToGalaxy(curEl.returnType) : 'void');
        out.push(' ');
        out.push(name)
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
})();
