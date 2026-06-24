import { assert } from 'chai';
import 'mocha';
import { ExpressionParser, PropertyBindExpr, PathSelector, SelHandleKind } from '../../src/parser/expressions';

describe('expression pass', function () {
    const exParser = new ExpressionParser();

    describe('path', function () {
        it('$this/$ancestor[@name=m]', function () {
            const psel = exParser.parsePathSelector(this.test.title);
            assert.lengthOf(psel.diagnostics, 0);
            assert.lengthOf(psel.path, 2);
            assert.equal(psel.path[0].selKind, SelHandleKind.This);
            assert.equal(psel.path[1].selKind, SelHandleKind.Ancestor);
            assert.equal(psel.path[1].parameter.key.name, 'name');
            assert.equal(psel.path[1].parameter.value.name, 'm');
        });

        it('$GameUI/$parent', function () {
            const psel = exParser.parsePathSelector(this.test.title);
            assert.lengthOf(psel.diagnostics, 0, (() => psel.diagnostics.map(x => `${x.message}`))().join('\n'));
            assert.lengthOf(psel.path, 2);
            assert.deepEqual({ pos: psel.path[0].name.pos, end: psel.path[0].name.end }, { pos: 1, end: 7 });
            assert.deepEqual({ pos: psel.path[1].name.pos, end: psel.path[1].name.end }, { pos: 9, end: 15 });
        })

        it('$GameUI//$parent', function () {
            const psel = exParser.parsePathSelector(this.test.title);
            assert.lengthOf(psel.diagnostics, 0, (() => psel.diagnostics.map(x => `${x.message}`))().join('\n'));
            assert.lengthOf(psel.path, 2);
            assert.deepEqual({ pos: psel.path[0].name.pos, end: psel.path[0].name.end }, { pos: 1, end: 7 });
            assert.deepEqual({ pos: psel.path[1].name.pos, end: psel.path[1].name.end }, { pos: 10, end: 16 });
        })

        it('$ancestor[@name=NHbrConstruct@AntiGround|stuff]', function () {
            const psel = exParser.parsePathSelector(this.test.title);
            assert.lengthOf(psel.diagnostics, 0, (() => psel.diagnostics.map(x => `${x.message}`))().join('\n'));
            assert.lengthOf(psel.path, 1);
            assert.deepEqual(psel.path[0].name.name, 'ancestor');
            assert.deepEqual(psel.path[0].parameter.key.name, 'name');
            assert.deepEqual(psel.path[0].parameter.value.name, 'NHbrConstruct@AntiGround|stuff');
        })
    });

    describe('property', function () {
        let propBind: PropertyBindExpr;

        it('{el/@prop}', function () {
            propBind = exParser.parsePropertyBind('{el/@prop}');
            assert.lengthOf(propBind.diagnostics, 0);
        });

        it('{el//@prop}', function () {
            propBind = exParser.parsePropertyBind(this.test.title);
            assert.lengthOf(propBind.diagnostics, 0);
            assert.lengthOf(propBind.path, 1);
            assert.equal(propBind.property.name, 'prop');
        });

        it('{$this/$ancestor[@name=m]/@prop}', function () {
            propBind = exParser.parsePropertyBind('{$this/$ancestor[@name=m]/@prop}');
            assert.lengthOf(propBind.diagnostics, 0);
        });

        it('{$parent/$sibling-1/@prop}', function () {
            propBind = exParser.parsePropertyBind('{$parent/$sibling-1/@prop}');
            assert.lengthOf(propBind.diagnostics, 0);
        });

        it('{$layer/UI/@Property[12]}', function () {
            propBind = exParser.parsePropertyBind('{$layer/UI/@Property[12]}');
            assert.lengthOf(propBind.diagnostics, 0);
        });
    });
});

describe('expression fail', function () {
    const exParser = new ExpressionParser();

    describe('property', function () {
        it('{$this/}', function () {
            const propBind = exParser.parsePropertyBind('{$this/}');
            assert.lengthOf(propBind.path, 2);
            assert.isAtLeast(propBind.diagnostics.length, 1);
        });

        it('{}', function () {
            const propBind = exParser.parsePropertyBind('{}');
            assert.lengthOf(propBind.path, 0);
            assert.isAtLeast(propBind.diagnostics.length, 1);
            assert.isUndefined(propBind.property);
        });

        it('{@Property}', function () {
            const propBind = exParser.parsePropertyBind('{@Property}');
            assert.lengthOf(propBind.path, 0);
            assert.isAtLeast(propBind.diagnostics.length, 1);
        });

        it('$ancestor[name=GameUI]', function () {
            const psel = exParser.parsePathSelector(this.test.title);
            assert.isAtLeast(psel.diagnostics.length, 1);
        });

        it('$ancestor[@NotAValidAncestorParam=GameUI]', function () {
            const psel = exParser.parsePathSelector(this.test.title);
            assert.isAtLeast(psel.diagnostics.length, 1);
        });
    });
});
