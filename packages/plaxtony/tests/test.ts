// import hello from './hello';
import { Parser } from '../src/parser';
import { sourceFileToJSON } from '../src/utils';
import { expect } from 'chai';
import * as fs from 'fs';
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
// import 'mocha';

describe('Parser', () => {
    let parser = new Parser();

    parser.parseFile('', fs.readFileSync('tests/fixtures/parser/expr.galaxy', 'utf8'));

    for (let filename of fs.readdirSync('tests/fixtures/parser')) {
        let filepath = 'tests/fixtures/parser/' + filename;
        it(`should parse "${filename}"`, () => {
            const sfile = parser.parseFile(filename, fs.readFileSync(filepath, 'utf8'));
            fs.readFileSync(filepath, 'utf8');
            fs.writeFileSync('tests/tmp/' + filename + '.json', sourceFileToJSON(sfile));
        });
    }
});
