import * as path from 'path';
import { Store, createTextDocumentFromFs } from '../service/store';
import * as trig from '../sc2mod/trigger';
import { openArchiveWorkspace, SC2Archive } from '../sc2mod/archive';
import { logger } from '../common';
import { isKeywordTypeKind } from '../compiler/utils';
import { stringToToken } from '../compiler/scanner';

const undocumentedNatives = `
native void DebugDump(int lp_1);
native void AISetNukeNukeCastTime(int lp_1, fixed lp_2);
native void AISetNukeCloak(int lp_1, string lp_2);
native void AISetNukeCloakCost(int lp_1, fixed lp_2);
native void AISetNukeCloakRegenRate(int lp_1, fixed lp_2);
native void AISetNukeGhost(int lp_1, string lp_2);
native void AISetNukeNukeEffect(int lp_1, string lp_2);
native void AISetNukeNukeAbilLink(int lp_1, string lp_2);
native void AISetNukeCloakAbilLink(int lp_1, string lp_2);
native void AISetNukeDamage(int lp_1, fixed lp_2, fixed lp_3);
native void AISetNukeRadiusClose(int lp_1, fixed lp_2, fixed lp_3);
native void AISetNukeRadiusMedium(int lp_1, fixed lp_2, fixed lp_3);
native void AISetNukeRadiusFar(int lp_1, fixed lp_2, fixed lp_3);
native string AutomationBuildNumberGet();
native text AutomationComputerNameGet();
native string AutomationMapNameGet();
native void DataTableInstanceValueRemove(int lp_1, string lp_2);
native void DataTableInstanceSetGenericHandle(int lp_1, string lp_2, generichandle lp_3);
native generichandle DataTableInstanceGetGenericHandle(int lp_1, string lp_2);
native unitref DataTableInstanceGetUnitRef(int lp_1, string lp_2);
native void BankBackupLoopBegin(bank lp_1, bool lp_2);
native void BankBackupLoopStep();
native bool BankBackupLoopDone();
native void BankBackupLoopEnd();
native int ObservedPlayerId();
native string TextToString(text lp_1);
native int EventType();
native string EventTypeName();
native text EventTypeDescription();
native void UnitMagazineAssign(unit lp_1, abilcmd lp_2, unit lp_3, int lp_4);
native void UnitMagazineRemove(unit lp_1, abilcmd lp_2, unit lp_3);
native void UnitInventoryDrop(unit lp_1);
`;

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

    console.log(undocumentedNatives);
})();
