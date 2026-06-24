import { Parser } from '../src/compiler/parser';
import { bindSourceFile } from '../src/compiler/binder';
import { mockupStoreDocument, mockupStore, mockupSourceFile, mockupTextDocument } from './helpers';
import { assert } from 'chai';
import * as path from 'path';
import * as fs from 'fs';
import 'mocha';

describe('Compiler', () => {
    describe('Parser', () => {
        for (let filename of fs.readdirSync('tests/fixtures/parser')) {
            it(`should parse "${filename}" without errors`, () => {
                const sourceFile = mockupSourceFile('parser', filename);
                assert.lengthOf(sourceFile.parseDiagnostics, 0);
            });
        }

        for (let filename of fs.readdirSync('tests/fixtures/parser_recovery')) {
            it(`should parse "${filename}" with error recovery`, () => {
                const sourceFile = mockupSourceFile('parser_recovery', filename);
                assert.isAtLeast(sourceFile.parseDiagnostics.length, 1);
            });
        }
    });

    describe('Store', () => {
        it('merge global symbols', () => {
            const store = mockupStore(
                mockupTextDocument('service', 'navigation', 'funcs.galaxy'),
                mockupTextDocument('service', 'navigation', 'funcs_dupl.galaxy')
            );
            assert.lengthOf(store.resolveGlobalSymbol('something').declarations, 3);
        });
    });
});
