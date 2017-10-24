import 'mocha';
import { assert } from 'chai';
import * as path from 'path';
import { mockupStoreFromDirectory, mockupStoreFromS2Workspace } from './helpers';
import * as gt from '../src/compiler/types';
import { findSC2Archives, SC2Archive } from '../src/sc2mod/archive';
import { createProvider } from '../src/service/provider';
import { SignaturesProvider } from '../src/service/signatures';
import Uri from 'vscode-uri';

const resourcesPath = path.join('tests', 'fixtures', 'sc2-data-trigger');

describe('SC2Data', function () {
    var dirs: string[];

    before(async () => {
        dirs = await findSC2Archives(resourcesPath);
    });

    // it('parse code', async function () {
    //     for (const item of dirs) {
    //         await mockupStoreFromDirectory(item);
    //     }
    // })

    // it('process components', async function () {
    //     for (const item of dirs) {
    //         const archive = new SC2Archive();
    //         await archive.openFromDirectory(item);
    //     }
    // })

    it('core.sc2mod', async () => {
        const modpath = path.resolve(path.join(resourcesPath, 'mods', 'core.sc2mod'));
        const store = await mockupStoreFromS2Workspace(modpath);

        assert.include(dirs, modpath);
        assert.equal(store.s2archives.size, 1);

        const archive = store.s2archives.values().next().value;

        const natives = store.documents.get(
            Uri.file(path.join(archive.directory, 'base.sc2data', 'TriggerLibs', 'natives.galaxy')).toString()
        );

        assert.isDefined(archive);
        assert.isDefined(natives);
        assert.equal(store.getArchiveOfSourceFile(natives), archive);

        const signaturesProvider = createProvider(SignaturesProvider, store);
        const sigInfo = signaturesProvider.getSignatureOfFunction(natives.symbol.members.get('DialogControlSetPropertyAsString'));

        assert.isDefined(sigInfo.documentation.indexOf('Set Dialog Item String Value'));
        assert.equal(sigInfo.parameters[0].documentation, '#### Dialog Item - *control*\n');
        assert.isDefined(sigInfo.parameters[1].documentation.indexOf('c_triggerControlPropertyText'));
    });
});
