import { assert } from 'chai';
import 'mocha';
import * as fs from 'fs-extra';
import * as path from 'path';
import { getFixturePath } from '../helpers';
import { readMdFile } from '../../src/schema/localization';

describe('schema localization', function () {
    describe('mdread', function () {
        it('EAnimationEventNative', async function () {
            const mdContent = readMdFile(await fs.readFile(getFixturePath('schema', 'EAnimationEventNative.md'), { encoding: 'utf8' }));
            assert.isUndefined(mdContent.title);
            assert.isUndefined(mdContent.content);
            assert.equal(mdContent.entries[0]['OnMouseWheelIncrement'].title, '-');
            assert.equal(mdContent.entries[0]['OnClick'].title, 'When the user clicks the target frame. Can only target `Control` frames or subtypes such as `Button`.');
        });
    });
});
