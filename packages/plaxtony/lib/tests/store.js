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
const path = require("path");
const chai_1 = require("chai");
const vscode_uri_1 = require("vscode-uri");
const helpers_1 = require("./helpers");
describe('Store', () => {
    // it('resolveWorkspaces', async () => {
    //     const rootDir = findWorkspaceArchive(path.join('tests', 'fixtures', 'sc2-data-trigger'));
    //     const watchers = await resolveWorkspaces(path.join('tests', 'fixtures', 'sc2-data-trigger'), []);
    //     assert.equal(watchers.length, 20);
    //     assert.equal(path.basename(watchers[19].workspacePath), 'war3data.sc2mod')
    // });
    context('S2Workspace', () => __awaiter(this, void 0, void 0, function* () {
        let store;
        before(() => __awaiter(this, void 0, void 0, function* () {
            store = yield helpers_1.mockupStoreFromS2Workspace(path.join('tests', 'fixtures', 'sc2-map.SC2Map'), [path.join('tests', 'fixtures', 'sc2-data-trigger')]);
        }));
        it('docs', () => {
            const doc = store.documents.get(vscode_uri_1.default.file(path.resolve(path.join('tests', 'fixtures', 'sc2-map.SC2Map', 'MapScript.galaxy'))).toString());
            const metadata = store.s2metadata;
            chai_1.assert.isDefined(metadata.getSymbolDoc('UnitGetOwner'));
        });
    }));
});
//# sourceMappingURL=store.js.map