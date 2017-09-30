import { Parser } from '../src/compiler/parser';
import { createTextDocumentFromFs } from '../src/service/store';
import { assert } from 'chai';
import * as path from 'path';
import * as fs from 'fs';
import 'mocha';

describe('Compiler', () => {
    describe('Parser', () => {
        const fixturesPath = 'tests/fixtures';
        const parser = new Parser();

        for (let filename of fs.readdirSync('tests/fixtures/parser')) {
            it(`should parse "${filename}" without errors`, () => {
                const document = createTextDocumentFromFs(path.join(fixturesPath, 'parser', filename));
                const sourceFile = parser.parseFile(filename, document.getText());
                assert.lengthOf(sourceFile.parseDiagnostics, 0);
            });
        }

        for (let filename of fs.readdirSync('tests/fixtures/parser_recovery')) {
            it(`should parse "${filename}" with error recovery`, () => {
                const document = createTextDocumentFromFs(path.join(fixturesPath, 'parser_recovery', filename));
                const sourceFile = parser.parseFile(filename, document.getText());
                assert.isAtLeast(sourceFile.parseDiagnostics.length, 1);
            });
        }
    });
});
