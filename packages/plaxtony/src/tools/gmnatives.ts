import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { Store, createTextDocumentFromFs } from '../service/store';
import * as trig from '../sc2mod/trigger';

(async function () {
    const store = new Store();
    const tstore = new trig.TriggerStore();
    const treader = new trig.XMLReader(tstore);
    const ntveLib = await treader.loadLibrary(fs.readFileSync(process.argv[2], 'utf8'));

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

    for (let filepath of glob.sync(path.join(path.resolve(process.argv[3]), '**/*.galaxy'))) {
        store.updateDocument(createTextDocumentFromFs(filepath));
    }

    const ntveElements: trig.FunctionDef[] = [];
    for (const curEl of ntveLib.getElements().values()) {
        if (!(curEl.flags & trig.ElementFlag.Native)) continue;
        if (!(curEl instanceof trig.FunctionDef)) continue;
        if (store.resolveGlobalSymbol(curEl.name)) continue;
        let out: string[] = [];
        out.push('native ');
        out.push(curEl.returnType ? trigTypeToGalaxy(curEl.returnType) : 'void');
        out.push(' ');
        out.push(curEl.name)
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
