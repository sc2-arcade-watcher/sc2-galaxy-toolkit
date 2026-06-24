import { assert } from 'chai';
import 'mocha';
import { buildStoreFromDir, tlog } from '../helpers';
import { Store } from '../../src/index/store';
import { XRay } from '../../src/index/xray';
import { XMLDocument, XMLElement } from '../../src/types';
import { FrameNode } from '../../src/index/hierarchy';

describe('xray', function () {
    let store: Store;
    let xray: XRay;

    before(async function () {
        store = await buildStoreFromDir('xray');
        xray = new XRay(store);
    });

    describe('determineTargetFrameNode', function () {
        let xDoc: XMLDocument;

        before(function () {
            xDoc = <XMLDocument>Array.from(store.index.rootNs.get('XR_Anim').xDecls)[0];
        });

        it('animation key', function () {
            let xEl: XMLElement;
            let uFrame: FrameNode;

            xEl = <XMLElement>xDoc.findNodeAt(xDoc.tdoc.offsetAt({line: 6, character: 22}));
            uFrame = xray.determineTargetFrameNode(xEl);
            assert.equal(xEl.tag, 'Key');
            assert.equal(uFrame.fqn, 'Container/C1');

            xEl = <XMLElement>xDoc.findNodeAt(xDoc.tdoc.offsetAt({line: 10, character: 22}));
            uFrame = xray.determineTargetFrameNode(xEl);
            assert.equal(xEl.tag, 'Key');
            assert.equal(uFrame.fqn, 'Container');
        });

        it('animation controller', function () {
            let xEl: XMLElement;
            let uFrame: FrameNode;

            xEl = <XMLElement>xDoc.findNodeAt(xDoc.tdoc.offsetAt({line: 6, character: 18}));
            uFrame = xray.determineTargetFrameNode(xEl);
            assert.equal(xEl.tag, 'Controller');
            assert.equal(uFrame.fqn, 'Container/C1');

            xEl = <XMLElement>xDoc.findNodeAt(xDoc.tdoc.offsetAt({line: 10, character: 18}));
            uFrame = xray.determineTargetFrameNode(xEl);
            assert.equal(xEl.tag, 'Controller');
            assert.equal(uFrame.fqn, 'Container');
        });
    });
});
