import 'mocha';
import * as path from 'path';
import { assert } from 'chai';
import { findSC2Archives, SC2Archive } from '../src/sc2mod/archive';
import * as trig from '../src/sc2mod/trigger';
import * as loc from '../src/sc2mod/localization';

const resourcesPath = path.join('tests', 'fixtures', 'sc2-data-trigger');

describe('SC2Mod', () => {
    describe('Archive', () => {
        let archives: string[];

        before(async () => {
            archives = await findSC2Archives(resourcesPath);
        });

        it('should find SC2 archives within directory', () => {
            assert.lengthOf(archives, 20);
            assert.include(archives, path.join(resourcesPath, 'mods', 'core.sc2mod'));
        })

        context('open archive', () => {
            const s2archive = new SC2Archive();
            before(async () => {
                await s2archive.openFromDirectory(path.join(resourcesPath, 'mods', 'core.sc2mod'));
            });

            it('trigger libraries', () => {
                assert.equal(s2archive.trigLibs.size, 1);
            });

            it('trigger strings', () => {
                assert.isAtLeast(s2archive.trigStrings.size, 1);
            });

            it('provide text strings for trigger elements', () => {
                function getTextOfElement(elName: string, kind: string) {
                    return s2archive.trigStrings.get(
                        s2archive.trigLibs.findElementByName(elName).textKey(kind)
                    );
                }
                assert.equal(getTextOfElement('UnitGetHeight', 'Name'), 'Height Of Unit');
                assert.equal(getTextOfElement('UnitGetHeight', 'Hint'), 'Returns the height of the specified unit.');
                assert.equal(getTextOfElement('UnitGetHeight', 'Grammar'), 'Height of ~u~');
            });
        });
    });

    describe('TriggerLib', () => {
        const trigContainer = new trig.LibraryContainer();

        before(async () => {
            await trigContainer.addFromFile(path.join(resourcesPath, 'mods', 'core.sc2mod/base.sc2data/TriggerLibs/NativeLib.TriggerLib'));
        });


        it('should find native elements by name', () => {
            const el = trigContainer.findElementByName('UnitGetHeight');
            assert.isDefined(el)
        });

        it('should find non native elements by its full prefixed name', () => {
            const el = trigContainer.findElementByName('libNtve_gf_DifficultyValueInt');
            assert.isDefined(el)
        });

        context('FunctionDef', () => {
            let el: trig.FunctionDef;
            let params: trig.ParamDef[];

            before(() => {
                el = trigContainer.findElementByName('UnitCreate') as trig.FunctionDef;
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
    });

    describe('Localization', () => {
        const enus = new loc.LocalizationFile();

        before(() => {
            enus.readFromFile(path.join(resourcesPath, 'mods', 'core.sc2mod/enus.sc2data/LocalizedData/TriggerStrings.txt'));
        });

        it('should read all entries', () => {
            assert.equal(enus.size, 18669);
        })

        it('should provide actual values', () => {
            assert.equal(enus.get('Category/Name/lib_Ntve_00000001'), 'Melee');
            assert.equal(enus.get('Category/Name/lib_Ntve_00000003'), 'Comparisons');
            assert.isUndefined(enus.get('43bpo24b23'));
        })
    });
});
