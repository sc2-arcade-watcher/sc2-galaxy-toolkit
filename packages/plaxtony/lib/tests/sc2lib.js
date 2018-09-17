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
require("mocha");
const path = require("path");
const fs = require("fs");
const chai_1 = require("chai");
const archive_1 = require("../src/sc2mod/archive");
const trig = require("../src/sc2mod/trigger");
const cat = require("../src/sc2mod/datacatalog");
const loc = require("../src/sc2mod/localization");
const resourcesPath = path.join('tests', 'fixtures', 'sc2-data-trigger');
describe('SC2Mod', () => {
    describe('General', () => {
        let archives;
        let modArchives;
        before(() => __awaiter(this, void 0, void 0, function* () {
            archives = yield archive_1.findSC2ArchiveDirectories(resourcesPath);
            modArchives = yield archive_1.findSC2ArchiveDirectories(path.join(resourcesPath, 'mods'));
        }));
        it('should find SC2 archives within directory', () => {
            chai_1.assert.isAtLeast(archives.length, 22);
            chai_1.assert.isAtLeast(archives.length, 15);
            chai_1.assert.include(archives, path.resolve(path.join(resourcesPath, 'mods', 'core.sc2mod')));
        });
        it('should find SC2 all galaxy files', () => __awaiter(this, void 0, void 0, function* () {
            const core = new archive_1.SC2Archive('core/sc2.mod', path.join(resourcesPath, 'mods', 'core.sc2mod'));
            const gf = yield core.findFiles('**/*.galaxy');
            chai_1.assert.isAbove(gf.length, 124);
        }));
    });
    context('Archive', () => {
        // let s2archive: SC2Archive;
        // before(async () => {
        //     s2archive = new SC2Archive('mods/core.sc2mod', path.resolve(path.join(resourcesPath, 'mods', 'core.sc2mod')));
        // });
        it('dependency list', () => __awaiter(this, void 0, void 0, function* () {
            const s2archive = new archive_1.SC2Archive('mods/core.sc2mod', path.resolve(path.join(resourcesPath, 'mods', 'core.sc2mod')));
            const list = yield s2archive.getDependencyList();
            chai_1.assert.equal(list.length, 0);
        }));
        it('campaign dependency list', () => __awaiter(this, void 0, void 0, function* () {
            const s2archive = new archive_1.SC2Archive('campaigns/voidstory.sc2campaign', path.resolve(path.join(resourcesPath, 'campaigns', 'voidstory.sc2campaign')));
            const result = yield archive_1.resolveArchiveDependencyList(s2archive, [resourcesPath]);
            chai_1.assert.equal(result.list.length, 7);
            chai_1.assert.equal(result.list[0].name, 'mods/core.sc2mod');
            chai_1.assert.equal(result.list[1].name, 'mods/liberty.sc2mod');
            chai_1.assert.equal(result.list[2].name, 'campaigns/liberty.sc2campaign');
            chai_1.assert.equal(result.list[3].name, 'mods/swarm.sc2mod');
            chai_1.assert.equal(result.list[4].name, 'campaigns/swarm.sc2campaign');
            chai_1.assert.equal(result.list[5].name, 'mods/void.sc2mod');
            chai_1.assert.equal(result.list[6].name, 'campaigns/void.sc2campaign');
        }));
        it('void mod dependency list', () => __awaiter(this, void 0, void 0, function* () {
            const s2archive = new archive_1.SC2Archive('mods/void.sc2mod', path.resolve(path.join(resourcesPath, 'mods', 'void.sc2mod')));
            const result = yield archive_1.resolveArchiveDependencyList(s2archive, [resourcesPath]);
            chai_1.assert.equal(result.list.length, 3);
            chai_1.assert.equal(result.list[0].name, 'mods/core.sc2mod');
            chai_1.assert.equal(result.list[1].name, 'mods/liberty.sc2mod');
            chai_1.assert.equal(result.list[2].name, 'mods/swarm.sc2mod');
        }));
    });
    context('Workspace', () => {
        let s2work;
        before(() => __awaiter(this, void 0, void 0, function* () {
            const sources = [
                path.resolve(path.join(resourcesPath)),
            ];
            const dir = path.resolve(path.join('tests', 'fixtures', 'sc2-map.SC2Map'));
            const rootArchive = new archive_1.SC2Archive(path.basename(dir), dir);
            s2work = yield archive_1.openArchiveWorkspace(rootArchive, sources);
        }));
        it('load triggers', () => __awaiter(this, void 0, void 0, function* () {
            yield s2work.trigComponent.load();
            const trigStore = s2work.trigComponent.getStore();
            chai_1.assert.equal(trigStore.getLibraries().size, 3);
            chai_1.assert.isTrue(trigStore.getLibraries().has('Ntve'));
            chai_1.assert.isTrue(trigStore.getLibraries().has('Lbty'));
        }));
        it('load localization', () => __awaiter(this, void 0, void 0, function* () {
            yield s2work.locComponent.load();
            chai_1.assert.equal(s2work.locComponent.triggers.elementName('Library/Name/Ntve'), 'Built-In');
        }));
        it('localization text for trigger elements', () => __awaiter(this, void 0, void 0, function* () {
            yield s2work.trigComponent.load();
            yield s2work.locComponent.load();
            const el = s2work.trigComponent.getStore().findElementById('BF1FA304', trig.FunctionDef);
            chai_1.assert.equal(s2work.locComponent.triggers.elementName('Name', el), 'Action1');
        }));
    });
    describe('TriggerLib', () => {
        const trigStore = new trig.TriggerStore();
        let ntveLib;
        before(() => __awaiter(this, void 0, void 0, function* () {
            const reader = new trig.XMLReader(trigStore);
            ntveLib = yield reader.loadLibrary(fs.readFileSync(path.join(resourcesPath, 'mods', 'core.sc2mod/base.sc2data/TriggerLibs/NativeLib.TriggerLib'), 'utf8'));
        }));
        it('should find native elements by name', () => {
            const el = ntveLib.findElementByName('UnitGetHeight');
            chai_1.assert.isDefined(el);
        });
        it('should find non native elements by its full prefixed name', () => {
            // const el = ntveLib.findElementByName('libNtve_gf_DifficultyValueInt');
            const el = ntveLib.findElementByName('DifficultyValueInt');
            chai_1.assert.isDefined(el);
        });
        it('element IDs should scoped per type', () => {
            chai_1.assert.notEqual((ntveLib.findElementById('00000102', trig.ParamDef)), (ntveLib.findElementById('00000102', trig.Param)));
        }),
            context('FunctionDef', () => {
                let el;
                let params;
                before(() => {
                    el = ntveLib.findElementByName('UnitCreate');
                    chai_1.assert.isDefined(el);
                    params = el.getParameters();
                    chai_1.assert.isDefined(params);
                });
                it('should fetch returnType', () => {
                    chai_1.assert.equal(el.returnType.type, 'unitgroup');
                });
                it('should fetch parameters names', () => {
                    chai_1.assert.lengthOf(params, 6);
                    chai_1.assert.equal(params[0].name, 'count');
                    chai_1.assert.equal(params[1].name, 'type');
                    chai_1.assert.equal(params[2].name, 'flags');
                    chai_1.assert.equal(params[3].name, 'player');
                    chai_1.assert.equal(params[4].name, 'pos');
                    chai_1.assert.equal(params[5].name, 'angle');
                });
                context('parameters type', () => {
                    it('should fetch primitive', () => {
                        chai_1.assert.equal(params[0].type.type, 'int');
                    });
                    it('should fetch gamelink', () => {
                        chai_1.assert.equal(params[1].type.type, 'gamelink');
                        chai_1.assert.equal(params[1].type.gameType, 'Unit');
                    });
                    it('should fetch preset', () => {
                        chai_1.assert.equal(params[2].type.type, 'preset');
                        const preset = params[2].type.typeElement.resolve();
                        chai_1.assert.isDefined(preset);
                        chai_1.assert.lengthOf(preset.values, 2);
                        chai_1.assert.equal(preset.values[0].resolve().value, 'c_unitCreateConstruct');
                        chai_1.assert.equal(preset.values[1].resolve().value, 'c_unitCreateIgnorePlacement');
                    });
                });
            });
        it('find PresetValue by str', () => {
            const presetValue = ntveLib.findPresetValueByStr('c_unitCountAll');
            chai_1.assert.isDefined(presetValue);
            chai_1.assert.equal(presetValue.name, 'All');
        });
        it('find Preset by PresetValue', () => {
            const presetValue = ntveLib.findPresetValueByStr('c_unitCountAll');
            chai_1.assert.isDefined(presetValue);
            const preset = ntveLib.findPresetByValue(presetValue);
            chai_1.assert.isDefined(preset);
            chai_1.assert.equal(preset.name, 'UnitCountType');
        });
    });
    describe('Catalog', () => {
        it('file', () => __awaiter(this, void 0, void 0, function* () {
            const s2archive = new archive_1.SC2Archive('sc2-map.SC2Map', path.resolve('tests/fixtures/sc2-map.SC2Map'));
            const catalogFile = new cat.CatalogFile(s2archive, 'Unit');
            yield catalogFile.load();
            chai_1.assert.isAtLeast(catalogFile.entries.size, 1);
        }));
        it('store', () => __awaiter(this, void 0, void 0, function* () {
            const coreArchive = new archive_1.SC2Archive('core.sc2mod', path.join(resourcesPath, 'mods', 'core.sc2mod'));
            const libertyArchive = new archive_1.SC2Archive('liberty.sc2mod', path.join(resourcesPath, 'mods', 'liberty.sc2mod'));
            const catalogStore = new cat.CatalogStore('Unit');
            yield catalogStore.addArchive(coreArchive);
            yield catalogStore.addArchive(libertyArchive);
            catalogStore.merge();
            chai_1.assert.isAtLeast(catalogStore.entries.size, 1);
        }));
        it('component', () => __awaiter(this, void 0, void 0, function* () {
            let s2work;
            const sources = [
                path.resolve(resourcesPath),
            ];
            const dir = path.resolve(path.join('tests', 'fixtures', 'sc2-map.SC2Map'));
            const rootArchive = new archive_1.SC2Archive(path.basename(dir), dir);
            s2work = yield archive_1.openArchiveWorkspace(rootArchive, sources);
            yield s2work.catalogComponent.load();
            chai_1.assert.isAtLeast(s2work.catalogComponent.getStore().catalogs.size, 99);
            chai_1.assert.isTrue(s2work.catalogComponent.getStore().catalogs.has('Actor'));
        }));
    });
    describe('Localization', () => {
        const enus = new loc.LocalizationFile();
        before(() => {
            enus.readFromFile(path.join(resourcesPath, 'mods', 'core.sc2mod/enus.sc2data/LocalizedData/TriggerStrings.txt'));
        });
        it('should read all entries', () => {
            chai_1.assert.isAtLeast(enus.size, 18000);
        });
        it('should provide actual values', () => {
            chai_1.assert.equal(enus.get('Category/Name/lib_Ntve_00000001'), 'Melee');
            chai_1.assert.equal(enus.get('Category/Name/lib_Ntve_00000003'), 'Comparisons');
            chai_1.assert.isUndefined(enus.get('43bpo24b23'));
        });
    });
});
//# sourceMappingURL=sc2lib.js.map