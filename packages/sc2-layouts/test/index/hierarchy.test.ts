import { assert } from 'chai';
import 'mocha';
import { buildStore, getSchema, tlog } from '../helpers';
import { FrameNode, UINavigator, UIBuilder, AnimationNode } from '../../src/index/hierarchy';
import { ExpressionParser } from '../../src/parser/expressions';
import { DescKind } from '../../src/index/desc';

function mockupIndex(...src: string[]) {
    const store = buildStore({fprefix: 'hierarchy'}, ...src);
    return store.index;
}

describe('hierarchy builder', function () {
    const dIndex = mockupIndex('GameUI', 'Extension', 'Extension2');
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

        it('handle extension of desc contributed from file override by yet another file', function () {
            const uNode = uBuilder.buildNodeFromDesc(topDesc);
            uBuilder.expandNode(uNode, ['WorldPanel', 'ContainerC']);
            assert.isDefined(uNode.getChild('WorldPanel', 'ContainerC', 'FBNat'));
            assert.isDefined(uNode.getChild('WorldPanel', 'ContainerC', 'FBExt'));
        });
    });
});

describe('hierarchy navigator', function () {
    const dIndex = mockupIndex('Extension', 'GameUI', 'Control', 'Animation', 'Tpl1');
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

        it('[Tpl1/BTemplate] L1/L2', function () {
            const tplNode = uBuilder.buildNodeFromDesc(dIndex.rootNs.getMulti('Tpl1', 'BTemplate'));
            const psel = exParser.parsePathSelector('L1/L2');
            const resolvedSel = navigator.resolveSelection(tplNode, psel.path);
            assert.isDefined(resolvedSel.target);
        });
    });

    describe('AnimationNode', function () {
        const uFrame = <FrameNode>uBuilder.buildNodeFromDesc(dIndex.rootNs.getMulti('Animation', 'Frame'));
        const uAnims = navigator.getChildrenOfType<AnimationNode>(uFrame, DescKind.Animation);

        it('valid', function () {
            assert.equal(uAnims.size, 2);
        });

        it('getEvents', function () {
            const animPrimary = <AnimationNode>navigator.resolveChild(uFrame, 'Primary');
            assert.isDefined(animPrimary);
            assert.equal(animPrimary.getEvents().size, 3);
            assert.isDefined(animPrimary.getEvents().has('EventTemplate'));
        });
    });

    describe('getContextFrameNode', function () {
        it('animation', function () {
            const uaNode = uBuilder.buildNodeFromDesc(dIndex.rootNs.getMulti('Animation', 'ATpl1'));
            const ufNode = navigator.getContextFrameNode(uaNode);
            assert.isDefined(ufNode);
        });
    });
});
