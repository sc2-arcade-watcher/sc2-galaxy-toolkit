"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("./helpers");
const chai_1 = require("chai");
const fs = require("fs");
require("mocha");
describe('Compiler', () => {
    describe('Parser', () => {
        for (let filename of fs.readdirSync('tests/fixtures/parser')) {
            it(`should parse "${filename}" without errors`, () => {
                const sourceFile = helpers_1.mockupSourceFile('parser', filename);
                chai_1.assert.lengthOf(sourceFile.parseDiagnostics, 0);
            });
        }
        for (let filename of fs.readdirSync('tests/fixtures/parser_recovery')) {
            it(`should parse "${filename}" with error recovery`, () => {
                const sourceFile = helpers_1.mockupSourceFile('parser_recovery', filename);
                chai_1.assert.isAtLeast(sourceFile.parseDiagnostics.length, 1);
            });
        }
    });
    describe('Store', () => {
        it('merge global symbols', () => {
            const store = helpers_1.mockupStore(helpers_1.mockupTextDocument('service', 'navigation', 'funcs.galaxy'), helpers_1.mockupTextDocument('service', 'navigation', 'funcs_dupl.galaxy'));
            chai_1.assert.lengthOf(store.resolveGlobalSymbol('something').declarations, 3);
        });
    });
});
//# sourceMappingURL=compiler.js.map