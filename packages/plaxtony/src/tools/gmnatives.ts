import * as path from 'path';
import { Store, createTextDocumentFromFs } from '../service/store';
import * as trig from '../sc2mod/trigger';
import { openArchiveWorkspace, SC2Archive } from '../sc2mod/archive';
import { logger } from '../common';
import { isKeywordTypeKind } from '../compiler/utils';
import { stringToToken } from '../compiler/scanner';

(async function () {
    const store = new Store();
    const rootArchive = new SC2Archive('mods/core.sc2mod', path.join(process.argv[2], 'mods/core.sc2mod'));

    for (const filepath of await rootArchive.findFiles('**/*.galaxy')) {
        if (filepath.match(/natives_missing\.galaxy$/)) continue;
        logger.verbose(` :: ${filepath}`);
        store.updateDocument(createTextDocumentFromFs(path.join(rootArchive.directory, filepath)));
    }

    const s2work = await openArchiveWorkspace(rootArchive, [process.argv[2]]);
    await store.updateS2Workspace(s2work);
    await store.rebuildS2Metadata({ loadLevel: 'Core', localization: 'enUS' });
    const ntveLib = s2work.trigComponent.getStore().getLibraries().get('Ntve');
    const locStrings = s2work.locComponent.triggers;

    for (const curEl of ntveLib.getElements().values()) {
        if (!(curEl.flags & trig.ElementFlag.Native)) continue;
        if (!(curEl instanceof trig.FunctionDef)) continue;
        const name = curEl.name || locStrings.elementName('Name', curEl).replace(/[^a-zA-Z0-9_]+/g, '');
        if (store.resolveGlobalSymbol(name)) continue;

        let out: string[] = [];
        out.push(`/// # ${locStrings.elementName('Name', curEl)}\n`);
        if (locStrings.elementName('Hint', curEl)) {
            out.push(`///\n/// ${locStrings.elementName('Hint', curEl).trim().replace(/  /g, '\n/// ')}\n`);
        }

        if (curEl.returnType && curEl.returnType.type !== curEl.returnType.galaxyType) {
            out.push(`///\n/// # Returns \`${store.s2metadata.getParameterTypeDoc(curEl.returnType).type}\`\n`);
            if (curEl.returnType.type === 'preset') {
                const pValues = store.s2metadata.getConstantNamesOfPreset(curEl.returnType.typeElement.resolve());
            }
        }

        const rType = curEl.returnType ? curEl.returnType.galaxyType : 'void';
        out.push(`native ${rType} ${name}(`);
        for (const [key, param] of curEl.getParameters().entries()) {
            const paramDoc = store.s2metadata.getParamDoc(param);
            let paramName = param.name;
            if (isKeywordTypeKind(stringToToken(param.name.toLowerCase()))) {
                paramName = `in${paramName.charAt(0).toUpperCase()}${paramName.slice(1)}`;
            }

            out.push('\n');
            out.push(`    ${param.galaxyType} ${paramName}${(key < curEl.parameters.length - 1 ? ',' : '')}`.padEnd(35));
            out.push(` /// * ${paramDoc.name}`.padEnd(25) + ` :: ${paramDoc.type}`);
            if (key >= curEl.parameters.length - 1) {
                out.push('\n');
            }
        }
        out.push(');\n');
        console.log(out.join(''));
    }
})();
