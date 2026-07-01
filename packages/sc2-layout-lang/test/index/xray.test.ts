import { assert } from 'vitest';
import { buildStoreFromDir, tlog } from '../helpers.js';
import { Store } from '../../src/index/store.js';
import { XRay } from '../../src/index/xray.js';
import { XMLDocument, XMLElement } from '../../src/types.js';
import { FrameNode } from '../../src/index/hierarchy.js';

describe('xray', function () {
    let store: Store;
    let xray: XRay;

    beforeAll(async function () {
        store = await buildStoreFromDir('xray');
        xray = new XRay(store);
    });

    describe('determineTargetFrameNode', function () {
        let xDoc: XMLDocument;

        beforeAll(function () {
            xDoc = <XMLDocument>Array.from(store.index.rootNs.get('XR_Anim').xDecls)[0];
        });

        it('animation key', function () {
            let xEl: XMLElement;
            let uFrame: FrameNode;

            xEl = <XMLElement>xDoc.findNodeAt(xDoc.lang.tdoc.offsetAt({line: 6, character: 22}));
            uFrame = xray.determineTargetFrameNode(xEl);
            assert.equal(xEl.tag, 'Key');
            assert.equal(uFrame.fqn, 'Container/C1');

            xEl = <XMLElement>xDoc.findNodeAt(xDoc.lang.tdoc.offsetAt({line: 10, character: 22}));
            uFrame = xray.determineTargetFrameNode(xEl);
            assert.equal(xEl.tag, 'Key');
            assert.equal(uFrame.fqn, 'Container');
        });

        it('animation controller', function () {
            let xEl: XMLElement;
            let uFrame: FrameNode;

            xEl = <XMLElement>xDoc.findNodeAt(xDoc.lang.tdoc.offsetAt({line: 6, character: 18}));
            uFrame = xray.determineTargetFrameNode(xEl);
            assert.equal(xEl.tag, 'Controller');
            assert.equal(uFrame.fqn, 'Container/C1');

            xEl = <XMLElement>xDoc.findNodeAt(xDoc.lang.tdoc.offsetAt({line: 10, character: 18}));
            uFrame = xray.determineTargetFrameNode(xEl);
            assert.equal(xEl.tag, 'Controller');
            assert.equal(uFrame.fqn, 'Container');
        });
    });
});
