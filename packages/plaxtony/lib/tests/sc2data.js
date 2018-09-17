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
const chai_1 = require("chai");
const path = require("path");
const archive_1 = require("../src/sc2mod/archive");
const s2meta_1 = require("../src/service/s2meta");
const resourcesPath = path.join('tests', 'fixtures');
describe('SC2Metadata', function () {
    const dir = path.resolve(path.join(resourcesPath, 'sc2-map.SC2Map'));
    let s2work;
    let s2meta;
    before(() => __awaiter(this, void 0, void 0, function* () {
        const sources = [
            path.resolve(path.join(resourcesPath, 'sc2-data-trigger')),
        ];
        const dir = path.resolve(path.join('tests', 'fixtures', 'sc2-map.SC2Map'));
        const rootArchive = new archive_1.SC2Archive(path.basename(dir), dir);
        s2work = yield archive_1.openArchiveWorkspace(rootArchive, sources);
        s2meta = new s2meta_1.S2WorkspaceMetadata(s2work);
        yield s2meta.build('enUS');
    }));
    it('find elements by name', () => {
        chai_1.assert.isDefined(s2meta.findElementByName('libLbty_gf_OrderWorkerstoGatherNearbyResources'));
        chai_1.assert.isDefined(s2meta.findElementByName('gf_Action1'));
        chai_1.assert.isDefined(s2meta.findElementByName('gf_action_custom_name'));
        chai_1.assert.isDefined(s2meta.findElementByName('c_unitCountAll'));
        chai_1.assert.isDefined(s2meta.findElementByName('libNtve_ge_FlyerHelperDisplay_c_flyerDisplaySelected'));
    });
    it('find preset', () => {
        const presetValue = s2meta.findElementByName('c_unitCountAll');
        chai_1.assert.isDefined(s2meta.findPresetDef(presetValue));
    });
    it('documentation', () => {
        chai_1.assert.equal(s2meta.getSymbolDoc('c_unitCountAll'), '**Any** - Unit Count Type');
        chai_1.assert.equal(s2meta.getSymbolDoc('UnitCreate'), '**Create Units Facing Angle** (Create `count|Number` `type|Unit` for player `player` at `pos` facing `angle` degrees (`flags`))\n\nCreates units facing a specified angle.  Use the *Last Created Unit* and *Last Created Units* functions to refer to the created units.');
    });
    it('documentation function args', () => {
        const args = s2meta.getFunctionArgumentsDoc('UnitCreate');
        chai_1.assert.equal(args.length, 6);
        chai_1.assert.equal(args[0], '**Count** - `int`');
        chai_1.assert.equal(args[1], '**Type** - `gamelink<Unit>`');
        chai_1.assert.equal(args[2], '**Flags** - Unit Create Flags');
    });
    it('gamelinks', () => {
        chai_1.assert.isTrue(s2meta.getLinksForGameType('Unit').has('AberrationACGluescreenDummy'));
    });
});
//# sourceMappingURL=sc2data.js.map