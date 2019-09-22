import * as path from 'path';
import { assert } from 'chai';
import Uri from 'vscode-uri';
import { Store } from '../src/service/store';
import { getDocumentationOfSymbol } from '../src/service/s2meta';
import { mockupStoreFromS2Workspace } from './helpers';

describe('Store', () => {
    context('S2Workspace', async () => {
        let store: Store;

        before(async () => {
            store = await mockupStoreFromS2Workspace(
                path.join('tests', 'fixtures', 'sc2-map.SC2Map'),
                [path.join('tests', 'fixtures', 'sc2-data-trigger')]
            );
        });

        it('docs', () => {
            const doc = store.documents.get(Uri.file(path.resolve(path.join('tests', 'fixtures', 'sc2-map.SC2Map', 'MapScript.galaxy'))).toString());
            const metadata = store.s2metadata;
            assert.isDefined(metadata.getSymbolDoc('UnitGetOwner'));
        });
    });
});
