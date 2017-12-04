import 'mocha';
import * as path from 'path';
import * as fs from 'fs';
import { assert } from 'chai';
import { findSC2ArchiveDirectories, SC2Archive, SC2Workspace, openArchiveWorkspace, resolveArchiveDependencyList } from '../src/sc2mod/archive';
import * as trig from '../src/sc2mod/trigger';
import * as cat from '../src/sc2mod/datacatalog';
import * as loc from '../src/sc2mod/localization';

const resourcesPath = path.join('tests', 'fixtures', 'sc2-data-trigger');

describe('SC2Mod', () => {
    describe('General', () => {
        let archives: string[];
        let modArchives: string[];

        before(async () => {
            archives = await findSC2ArchiveDirectories(resourcesPath);
            modArchives = await findSC2ArchiveDirectories(path.join(resourcesPath, 'mods'));
        });

        it('should find SC2 archives within directory', () => {
            assert.lengthOf(archives, 22);
            assert.lengthOf(modArchives, 15);
            assert.include(archives, path.resolve(path.join(resourcesPath, 'mods', 'core.sc2mod')));
        })

        it('should find SC2 all galaxy files', async () => {
            const core = new SC2Archive('core/sc2.mod', path.join(resourcesPath, 'mods', 'core.sc2mod'));
            const gf = await core.findFiles('**/*.galaxy');
            assert.lengthOf(gf, 124);
        });
    });

    context('Archive', () => {
        // let s2archive: SC2Archive;

        // before(async () => {
        //     s2archive = new SC2Archive('mods/core.sc2mod', path.resolve(path.join(resourcesPath, 'mods', 'core.sc2mod')));
        // });

        it('dependency list', async () => {
            const s2archive = new SC2Archive('mods/core.sc2mod', path.resolve(path.join(resourcesPath, 'mods', 'core.sc2mod')));
            const list = await s2archive.getDependencyList();
            assert.equal(list.length, 0);
        });

        it('campaign dependency list', async () => {
            const s2archive = new SC2Archive(
                'campaigns/voidstory.sc2campaign',
                path.resolve(path.join(resourcesPath, 'campaigns', 'voidstory.sc2campaign'))
            );
            const list = await resolveArchiveDependencyList(s2archive, [resourcesPath]);
            assert.equal(list.length, 7);
            assert.equal(list[0].name, 'mods/core.sc2mod');
            assert.equal(list[1].name, 'mods/liberty.sc2mod');
            assert.equal(list[2].name, 'campaigns/liberty.sc2campaign');
            assert.equal(list[3].name, 'mods/swarm.sc2mod');
            assert.equal(list[4].name, 'campaigns/swarm.sc2campaign');
            assert.equal(list[5].name, 'mods/void.sc2mod');
            assert.equal(list[6].name, 'campaigns/void.sc2campaign');
        });

        it('void mod dependency list', async () => {
            const s2archive = new SC2Archive(
                'mods/void.sc2mod',
                path.resolve(path.join(resourcesPath, 'mods', 'void.sc2mod'))
            );
            const list = await resolveArchiveDependencyList(s2archive, [resourcesPath]);
            assert.equal(list.length, 3);
            assert.equal(list[0].name, 'mods/core.sc2mod');
            assert.equal(list[1].name, 'mods/liberty.sc2mod');
            assert.equal(list[2].name, 'mods/swarm.sc2mod');
        });
    });

    context('Workspace', () => {
        let s2work: SC2Workspace;

        before(async () => {
            const sources = [
                path.resolve(path.join(resourcesPath)),
            ];
            const dir = path.resolve(path.join('tests', 'fixtures', 'sc2-map.SC2Map'));
            const rootArchive = new SC2Archive(path.basename(dir), dir);
            s2work = await openArchiveWorkspace(rootArchive, sources);
        });

        it('load triggers', async () => {
            await s2work.trigComponent.load();
            const trigStore = s2work.trigComponent.getStore();
            assert.equal(trigStore.getLibraries().size, 3);
            assert.isTrue(trigStore.getLibraries().has('Ntve'));
            assert.isTrue(trigStore.getLibraries().has('Lbty'));
        });

        it('load localization', async () => {
            await s2work.locComponent.load();
            assert.equal(s2work.locComponent.triggers.elementName('Library/Name/Ntve'), 'Built-In');
        });

        it('localization text for trigger elements', async () => {
            await s2work.trigComponent.load();
            await s2work.locComponent.load();
            const el = <trig.FunctionDef>s2work.trigComponent.getStore().findElementById('BF1FA304', trig.FunctionDef)
            assert.equal(s2work.locComponent.triggers.elementName('Name', el), 'Action1');
        });
    });

    describe('TriggerLib', () => {
        const trigStore = new trig.TriggerStore();
        let ntveLib: trig.Library;

        before(async () => {
            const reader = new trig.XMLReader(trigStore);
            ntveLib = await reader.loadLibrary(fs.readFileSync(path.join(resourcesPath, 'mods', 'core.sc2mod/base.sc2data/TriggerLibs/NativeLib.TriggerLib'), 'utf8'));
        });


        it('should find native elements by name', () => {
            const el = ntveLib.findElementByName('UnitGetHeight');
            assert.isDefined(el)
        });

        it('should find non native elements by its full prefixed name', () => {
            // const el = ntveLib.findElementByName('libNtve_gf_DifficultyValueInt');
            const el = ntveLib.findElementByName('DifficultyValueInt');
            assert.isDefined(el)
        });

        it('element IDs should scoped per type', () => {
            assert.notEqual(<any>(ntveLib.findElementById('00000102', trig.ParamDef)), <any>(ntveLib.findElementById('00000102', trig.Param)))
        }),

        context('FunctionDef', () => {
            let el: trig.FunctionDef;
            let params: trig.ParamDef[];

            before(() => {
                el = ntveLib.findElementByName('UnitCreate') as trig.FunctionDef;
                assert.isDefined(el)
                params = el.getParameters();
                assert.isDefined(params)
            });

            it('should fetch returnType', () => {
                assert.equal(el.returnType, 'unitgroup');
            });

            it('should fetch parameters names', () => {
                assert.lengthOf(params, 6);
                assert.equal(params[0].name, 'count');
                assert.equal(params[1].name, 'type');
                assert.equal(params[2].name, 'flags');
                assert.equal(params[3].name, 'player');
                assert.equal(params[4].name, 'pos');
                assert.equal(params[5].name, 'angle');
            });

            context('parameters type', () => {
                it('should fetch primitive', () => {
                    assert.equal(params[0].type.type, 'int');
                })

                it('should fetch gamelink', () => {
                    assert.equal(params[1].type.type, 'gamelink');
                    assert.equal(params[1].type.gameType, 'Unit');
                })

                it('should fetch preset', () => {
                    assert.equal(params[2].type.type, 'preset');
                    const preset = params[2].type.typeElement.resolve();
                    assert.isDefined(preset);
                    assert.lengthOf(preset.values, 2);
                    assert.equal(preset.values[0].resolve().value, 'c_unitCreateConstruct');
                    assert.equal(preset.values[1].resolve().value, 'c_unitCreateIgnorePlacement');
                })
            });
        });

        it('find PresetValue by str', () => {
            const presetValue = ntveLib.findPresetValueByStr('c_unitCountAll');
            assert.isDefined(presetValue);
            assert.equal(presetValue.name, 'All');
        });

        it('find Preset by PresetValue', () => {
            const presetValue = ntveLib.findPresetValueByStr('c_unitCountAll');
            assert.isDefined(presetValue);
            const preset = ntveLib.findPresetByValue(presetValue);
            assert.isDefined(preset);
            assert.equal(preset.name, 'UnitCountType');
        });
    });

    describe('Catalog', () => {
        it('file', async () => {
            const s2archive = new SC2Archive('sc2-map.SC2Map', path.resolve('tests/fixtures/sc2-map.SC2Map'));
            const catalogFile = new cat.CatalogFile(s2archive, 'Unit');
            await catalogFile.load();
            assert.isAtLeast(catalogFile.entries.size, 1);
        });

        it('store', async () => {
            const coreArchive = new SC2Archive('core.sc2mod', path.join(resourcesPath, 'mods', 'core.sc2mod'));
            const libertyArchive = new SC2Archive('liberty.sc2mod', path.join(resourcesPath, 'mods', 'liberty.sc2mod'));
            const catalogStore = new cat.CatalogStore('Unit');
            await catalogStore.addArchive(coreArchive);
            await catalogStore.addArchive(libertyArchive);
            catalogStore.merge();
            assert.isAtLeast(catalogStore.entries.size, 1);
        });

        it('component', async () => {
            let s2work: SC2Workspace;
            const sources = [
                path.resolve(resourcesPath),
            ];
            const dir = path.resolve(path.join('tests', 'fixtures', 'sc2-map.SC2Map'));
            const rootArchive = new SC2Archive(path.basename(dir), dir);
            s2work = await openArchiveWorkspace(rootArchive, sources);
            await s2work.catalogComponent.load();
            assert.isAtLeast(s2work.catalogComponent.getStore().catalogs.size, 99);
            assert.isTrue(s2work.catalogComponent.getStore().catalogs.has('Actor'));
        });
    });

    describe('Localization', () => {
        const enus = new loc.LocalizationFile();

        before(() => {
            enus.readFromFile(path.join(resourcesPath, 'mods', 'core.sc2mod/enus.sc2data/LocalizedData/TriggerStrings.txt'));
        });

        it('should read all entries', () => {
            assert.isAtLeast(enus.size, 18000);
        })

        it('should provide actual values', () => {
            assert.equal(enus.get('Category/Name/lib_Ntve_00000001'), 'Melee');
            assert.equal(enus.get('Category/Name/lib_Ntve_00000003'), 'Comparisons');
            assert.isUndefined(enus.get('43bpo24b23'));
        })
    });
});
