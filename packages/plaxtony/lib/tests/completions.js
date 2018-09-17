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
const helpers_1 = require("./helpers");
const provider_1 = require("../src/service/provider");
const completions_1 = require("../src/service/completions");
const utils_1 = require("../src/service/utils");
function completionsContains(completions, name) {
    for (const x of completions.items) {
        if (x.label === name)
            return true;
    }
    return false;
}
describe('Completions', () => {
    describe('Static', () => {
        let store;
        let complProvider;
        let docsMap;
        before(() => __awaiter(this, void 0, void 0, function* () {
            store = yield helpers_1.mockupStoreFromDirectory(helpers_1.fixtureFilePath('service', 'completion', 'static'));
            complProvider = provider_1.createProvider(completions_1.CompletionsProvider, store);
            docsMap = helpers_1.mapStoreFilesByBasename(store);
        }));
        it('not proposed in other files', () => {
            const results = complProvider.getCompletionsAt(docsMap.get('non_static.galaxy').fileName, utils_1.getPositionOfLineAndCharacter(docsMap.get('non_static.galaxy'), 4, 0));
            chai_1.assert.isFalse(completionsContains(results, 'static_a_var'));
            chai_1.assert.isFalse(completionsContains(results, 'static_a_func'));
            chai_1.assert.isFalse(completionsContains(results, 'static_b_var'));
            chai_1.assert.isFalse(completionsContains(results, 'static_b_func'));
        });
        it('aware about own A', () => {
            const results = complProvider.getCompletionsAt(docsMap.get('static_a.galaxy').fileName, utils_1.getPositionOfLineAndCharacter(docsMap.get('static_a.galaxy'), 4, 0));
            chai_1.assert.isTrue(completionsContains(results, 'static_a_var'));
            chai_1.assert.isTrue(completionsContains(results, 'static_a_func'));
            chai_1.assert.isFalse(completionsContains(results, 'static_b_var'));
            chai_1.assert.isFalse(completionsContains(results, 'static_b_func'));
            chai_1.assert.isTrue(completionsContains(results, 'non_static_var'));
        });
        it('aware about own B', () => {
            const results = complProvider.getCompletionsAt(docsMap.get('static_b.galaxy').fileName, utils_1.getPositionOfLineAndCharacter(docsMap.get('static_b.galaxy'), 4, 0));
            chai_1.assert.isTrue(completionsContains(results, 'static_b_var'));
            chai_1.assert.isTrue(completionsContains(results, 'static_b_func'));
            chai_1.assert.isFalse(completionsContains(results, 'static_a_var'));
            chai_1.assert.isFalse(completionsContains(results, 'static_a_func'));
            chai_1.assert.isTrue(completionsContains(results, 'non_static_var'));
        });
    });
});
//# sourceMappingURL=completions.js.map