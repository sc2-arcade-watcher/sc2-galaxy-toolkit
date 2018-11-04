import { assert } from 'chai';
import 'mocha';
import * as fs from 'fs';
import * as path from 'path';
import { buildStore, getFixturePath } from '../helpers';
import { LayoutChecker } from '../../src/index/checker';
import { DiagnosticReport } from '../../src/types';

function mockupChecker(...src: string[]) {
    const store = buildStore({fprefix: 'checker'}, ...src);
    return new LayoutChecker(store, store.index);
}

function checkAll(...src: string[]) {
    const store = buildStore({fprefix: 'checker'}, ...src);
    const checker = new LayoutChecker(store, store.index);
    const reports: DiagnosticReport[] = [];
    for (const xDoc of store.documents.values()) {
        reports.push(...checker.checkFile(xDoc));
    }
    return reports;
}

describe('checker', function () {
    describe('invalid', function () {
        const fpath = getFixturePath('checker', 'invalid');
        for (const filename of fs.readdirSync(fpath)) {
            it(filename, function () {
                const r = checkAll(path.join(fpath, filename));
                assert.isAbove(r.length, 0);
            });
        }
    });
});
