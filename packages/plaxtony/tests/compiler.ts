import { Parser } from '../src/compiler/parser';
import { createTextDocumentFromFs } from '../src/service/store';
import { createServer } from '../src/service/server';
import { sourceFileToJSON } from '../src/compiler/utils';
import { assert } from 'chai';
import * as path from 'path';
import * as fs from 'fs';
import 'mocha';

describe('Compiler', () => {
    describe('Parser', () => {
        const fixturesPath = 'tests/fixtures/parser';
        const parser = new Parser();

        for (let filename of fs.readdirSync('tests/fixtures/parser')) {
            it(`should parse "${filename}"`, () => {
                const document = createTextDocumentFromFs(path.join(fixturesPath, filename));
                const sourceFile = parser.parseFile(filename, document.getText());
                assert.lengthOf(sourceFile.parseDiagnostics, 0);
            });
        }
    });
});
