import { assert } from 'chai';
import 'mocha';
import { buildStore } from '../helpers';
import { buildPartialTree, buildContextTree, FrameNode } from '../../src/index/hierarchy';

function mockupIndex(...src: string[]) {
    const store = buildStore({fprefix: 'hierarchy'}, ...src);
    return store.index;
}

describe('hierarchy build', function () {
    const dindex = mockupIndex('Extension', 'GameUI');

    it('full', function () {
        const node = buildPartialTree(dindex, dindex.rootNs.getMulti('GameUI', 'GameUI'));
        assert.isDefined(node.getChild('WorldPanel', 'ContainerC'));
        assert.isDefined(node.getChild('WorldPanel', 'ContainerB'));
    });

    it('context', function () {
        const node = buildContextTree(dindex, dindex.rootNs.getMulti('Extension', 'GameUI', 'WorldPanel'));
        assert.isDefined(node.getChild('UnitStatusPanel'));
    });
});

describe('hierarchy selection', function () {
    const dindex = mockupIndex('Extension', 'GameUI');
    const gameFrameDesc = dindex.rootNs.getMulti('GameUI', 'GameUI');
    const gameUi = buildContextTree(dindex, gameFrameDesc);

    it('ancestorByName', function () {
        const node = buildContextTree(dindex, gameFrameDesc.getMulti('WorldPanel', 'UnitStatusPanel', 'Title')) as FrameNode;
        assert.equal(node.ancestorByName('WorldPanel').fqn, gameUi.getChild('WorldPanel').fqn);
    });

    it('ancestorByType', function () {
        const node = buildContextTree(dindex, gameFrameDesc.getMulti('btn', 'Title')) as FrameNode;
        assert.equal(node.ancestorByType('Button').fqn, gameUi.getChild('btn').fqn);
    });
});
