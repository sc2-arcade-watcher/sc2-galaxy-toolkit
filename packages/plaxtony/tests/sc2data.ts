import 'mocha';
import { assert } from 'chai';
import * as path from 'path';
import { mockupStoreFromDirectory } from './helpers';
import { findSC2Archives, SC2Archive } from '../src/sc2mod/archive';

const resourcesPath = path.join('tests', 'fixtures', 'sc2-data-trigger');

describe('SC2Data', function () {
    var dirs: string[];

    before(async () => {
        dirs = await findSC2Archives(resourcesPath);
    });

    it('parse code', async function () {
        for (const item of dirs) {
            await mockupStoreFromDirectory(item);
        }
    })

    it('process components', async function () {
        for (const item of dirs) {
            const archive = new SC2Archive();
            await archive.openFromDirectory(item);
        }
    })
});
