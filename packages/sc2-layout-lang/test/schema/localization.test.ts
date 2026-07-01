import { assert } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as path from 'path';
import { getFixturePath } from '../helpers.js';
import { readMdFile } from '../../src/schema/localization.js';

describe('schema localization', function () {
    describe('mdread', function () {
        it('EAnimationEventNative', async function () {
            const mdContent = readMdFile(await fsp.readFile(getFixturePath('schema', 'EAnimationEventNative.md'), { encoding: 'utf8' }));
            assert.isUndefined(mdContent.title);
            assert.isUndefined(mdContent.content);
            assert.equal(mdContent.entries[0]['OnMouseWheelIncrement'].title, '-');
            assert.equal(mdContent.entries[0]['OnClick'].title, 'When the user clicks the target frame. Can only target `Control` frames or subtypes such as `Button`.');
        });
    });
});
