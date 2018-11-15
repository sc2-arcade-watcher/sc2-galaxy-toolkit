import { assert } from 'chai';
import 'mocha';
import { buildStore, getSchema } from '../helpers';
import { FrameNode, UINavigator, UIBuilder } from '../../src/index/hierarchy';
import { ExpressionParser } from '../../src/parser/expressions';

function mockupIndex(...src: string[]) {
    const store = buildStore({fprefix: 'hierarchy'}, ...src);
    return store.index;
}

describe('hierarchy builder', function () {
    const dIndex = mockupIndex('Extension', 'GameUI');
    const rootNs =  dIndex.rootNs;
    const uBuilder = new UIBuilder(getSchema(), dIndex);

    describe('determineContextOfDesc', function () {
        it('childs', function () {
            const pDescInfo = uBuilder.determineContextOfDesc(rootNs.getMulti('GameUI', 'GameUI', 'WorldPanel', 'UnitStatusPanel'));
            assert.isDefined(pDescInfo);
            assert.equal(pDescInfo.hierarchyRoot.descRelativeName, 'GameUI');
        });

        it('direct child of FileDesc', function () {
            const pDescInfo = uBuilder.determineContextOfDesc(rootNs.getMulti('GameUI', 'GameUI'));
            assert.isDefined(pDescInfo);
            assert.equal(pDescInfo.hierarchyRoot.descRelativeName, 'GameUI');
        });

        it('file override', function () {
            const pDescInfo = uBuilder.determineContextOfDesc(rootNs.getMulti('Extension', 'GameUI', 'WorldPanel'));
            assert.isDefined(pDescInfo);

            assert.equal(pDescInfo.hierarchyRoot.descRelativeName, 'GameUI');
        });

        it('fail nicely if not found', function () {
            let pDescInfo = uBuilder.determineContextOfDesc(rootNs.getMulti('Extension', 'GameUI', 'WorldPanela'));
            assert.isUndefined(pDescInfo);

            pDescInfo = uBuilder.determineContextOfDesc(rootNs.getMulti('GameUI', 'GameUI', 'WorldPanelTemplaTEE', 'ContainerA'));
            assert.isUndefined(pDescInfo);
        });
    });

    describe('node builder', function () {
        const topDesc = rootNs.getMulti('GameUI', 'GameUI');

        it('entire tree', function () {
            const uNode = uBuilder.buildNodeFromDesc(topDesc);
            uBuilder.expandNode(uNode, null);
            assert.isDefined(uNode.getChild('WorldPanel', 'ContainerB'));
            assert.isDefined(uNode.getChild('WorldPanel', 'UnitStatusPanel'));
            assert.isDefined(uNode.getChild('WorldPanel', 'ContainerC'));

            assert.isDefined(uNode.getChild('WorldPanel', 'UnitStatusPanel', 'Title'));
        });

        it('depth1', function () {
            const uNode = uBuilder.buildNodeFromDesc(topDesc);
            uBuilder.expandNode(uNode, ['WorldPanel']);
            assert.isDefined(uNode.getChild('WorldPanel', 'ContainerB'));
            assert.isDefined(uNode.getChild('WorldPanel', 'UnitStatusPanel'));
            assert.isDefined(uNode.getChild('WorldPanel', 'ContainerC'));

            assert.isUndefined(uNode.getChild('WorldPanel', 'UnitStatusPanel', 'Title'));
            assert.isUndefined(uNode.getChild('Button'));
        });

        it('incremental expansion', function () {
            const uNode = uBuilder.buildNodeFromDesc(topDesc);
            uBuilder.expandNode(uNode, ['WorldPanel']);
            assert.isDefined(uNode.getChild('WorldPanel', 'ContainerB'));
            assert.isDefined(uNode.getChild('WorldPanel', 'UnitStatusPanel'));
            assert.isDefined(uNode.getChild('WorldPanel', 'ContainerC'));

            uBuilder.expandNode(uNode.getChild('WorldPanel', 'UnitStatusPanel'), ['Title']);
            assert.isDefined(uNode.getChild('WorldPanel', 'UnitStatusPanel', 'Title'));
            assert.isUndefined(uNode.getChild('Button'));

            uBuilder.expandNode(uNode.getChild('WorldPanel', 'UnitStatusPanel'), ['Title']);
            assert.isUndefined(uNode.getChild('Button'));
        });
    });
});

describe('hierarchy navigator', function () {
    const dIndex = mockupIndex('Extension', 'GameUI', 'Control');
    const gameFrameDesc = dIndex.rootNs.getMulti('GameUI', 'GameUI');

    const navigator = new UINavigator(getSchema(), dIndex);
    const uBuilder = new UIBuilder(getSchema(), dIndex);
    const exParser = new ExpressionParser();

    describe('selector', function () {
        it('identifier', function () {
            const uNode = uBuilder.buildNodeFromDesc(gameFrameDesc.getMulti('WorldPanel', 'UnitStatusPanel')) as FrameNode;

            let resolvedNode = navigator.resolveSelectorFragment(uNode, exParser.parsePathSelector('Title').path[0]);
            assert.equal(resolvedNode.name, 'Title');
        });

        it('custom handle', function () {
            const uNode = uBuilder.buildNodeFromDesc(gameFrameDesc.getMulti('WorldPanel', 'UnitStatusPanel')) as FrameNode;

            let resolvedNode = navigator.resolveSelectorFragment(uNode, exParser.parsePathSelector('$GameUI').path[0]);
            assert.equal(resolvedNode.name, 'GameUI');

            resolvedNode = navigator.resolveSelectorFragment(uNode, exParser.parsePathSelector('$NotExistingHandle').path[0]);
            assert.isUndefined(resolvedNode);
        });

        it('$this', function () {
            const uNode = uBuilder.buildNodeFromDesc(gameFrameDesc.getMulti('WorldPanel', 'UnitStatusPanel')) as FrameNode;

            let resolvedNode = navigator.resolveSelectorFragment(uNode, exParser.parsePathSelector('$this').path[0]);
            assert.equal(resolvedNode.name, 'UnitStatusPanel');
        });

        it('$parent', function () {
            const uNode = uBuilder.buildNodeFromDesc(gameFrameDesc.getMulti('WorldPanel', 'UnitStatusPanel')) as FrameNode;

            let resolvedNode = navigator.resolveSelectorFragment(uNode, exParser.parsePathSelector('$parent').path[0]);
            assert.equal(resolvedNode.name, 'WorldPanel');
        });

        // it('$sibling', function () {
        //     const uNode = uBuilder.buildNodeFromDesc(gameFrameDesc.getMulti('btn')) as FrameNode;

        //     let resolvedNode = navigator.resolveSelectorFragment(uNode, exParser.parsePathSelector('$sibling-1').path[0]);
        //     assert.equal(resolvedNode.name, 'WorldPanel');
        // });

        it('$ancestor[name]', function () {
            const uNode = uBuilder.buildNodeFromDesc(gameFrameDesc.getMulti('WorldPanel', 'UnitStatusPanel')) as FrameNode;

            let resolvedNode = navigator.resolveSelectorFragment(uNode, exParser.parsePathSelector('$ancestor[name=WorldPanel]').path[0]);
            assert.equal(resolvedNode.name, 'WorldPanel');
        });

        it('$ancestor[type]', function () {
            const uNode = uBuilder.buildNodeFromDesc(gameFrameDesc.getMulti('btn', 'Title')) as FrameNode;

            let resolvedNode = navigator.resolveSelectorFragment(uNode, exParser.parsePathSelector('$ancestor[type=Button]').path[0]);
            assert.equal(resolvedNode.name, 'btn');
        });

        it('$ancestor[oftype]', function () {
            const controlDesc = dIndex.rootNs.getMulti('Control', 'GameUI', 'Container');
            const uNode = uBuilder.buildNodeFromDesc(controlDesc.getMulti('StandardGlueButton', 'Name')) as FrameNode;

            let resolvedNode = navigator.resolveSelectorFragment(uNode, exParser.parsePathSelector('$ancestor[oftype=Control]').path[0]);
            assert.equal(resolvedNode.name, 'StandardGlueButton');
            resolvedNode = navigator.resolveSelectorFragment(uNode, exParser.parsePathSelector('$ancestor[oftype=Frame]').path[0]);
            assert.equal(resolvedNode.name, 'StandardGlueButton');
            resolvedNode = navigator.resolveSelectorFragment(uNode, exParser.parsePathSelector('$ancestor[oftype=GameUI]').path[0]);
            assert.equal(resolvedNode.name, 'GameUI');
        });
    });

    describe('resolveSelection', function () {
        const uGameNode = uBuilder.buildNodeFromDesc(dIndex.rootNs.getMulti('GameUI', 'GameUI'));

        it('[GameUI] WorldPanel/$parent/Group/FillImageContainer/Background', function () {
            const psel = exParser.parsePathSelector('WorldPanel/$parent/Group/FillImageContainer/Background');
            const resolvedSel = navigator.resolveSelection(uGameNode, psel.path);
            assert.isDefined(resolvedSel.target);
            assert.equal(resolvedSel.target.fqn, 'GameUI/Group/FillImageContainer/Background');
        });
    });
});
