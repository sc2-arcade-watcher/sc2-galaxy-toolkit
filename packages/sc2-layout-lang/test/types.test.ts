import { assert } from 'chai';
import 'mocha';
import { TextDocument } from '../src/types';

const wordPattern = /(-?\d*\.\d\w*)|([^\`\~\!\@\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g;

describe('types', function () {
    describe('TextDocument', function () {
        const tDoc = new TextDocument('untitled://newfile.sc2layout', '<Event event="OnClick" action="DirectionReverse,Play" frame="CancelButton"/>');

        it('getWordRangeAtPosition', function () {
            let range = tDoc.getWordRangeAtPosition(tDoc.positionAt(38), wordPattern);
            assert.equal(tDoc.getText(range), 'DirectionReverse');

            range = tDoc.getWordRangeAtPosition(tDoc.positionAt(14), wordPattern);
            assert.equal(tDoc.getText(range), 'OnClick');
            range = tDoc.getWordRangeAtPosition(tDoc.positionAt(21), wordPattern);
            assert.equal(tDoc.getText(range), 'OnClick');

            range = tDoc.getWordRangeAtPosition(tDoc.positionAt(22), wordPattern);
            assert.isUndefined(range);
        });

        it('positionAt', function () {
            assert.deepEqual(tDoc.positionAt(77), { line: 0, character: 76 })
            assert.deepEqual(tDoc.positionAt(-1), { line: 0, character: 0 })
        });
    });
});
