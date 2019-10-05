import { assert } from 'chai';
import 'mocha';
import { ExpressionParser, PropertyBindExpr, PathSelector, SelHandleKind } from '../../src/parser/expressions';

describe('expressions', function () {
    const exParser = new ExpressionParser();

    it('path selector', function () {
        let psel: PathSelector;

        psel = exParser.parsePathSelector('$this/$ancestor[@name=m]');
        assert.lengthOf(psel.diagnostics, 0);
        assert.lengthOf(psel.path, 2);
        assert.equal(psel.path[0].selKind, SelHandleKind.This);
        assert.equal(psel.path[1].selKind, SelHandleKind.Ancestor);
        assert.equal(psel.path[1].parameter.key.name, 'name');
        assert.equal(psel.path[1].parameter.value.name, 'm');
    });

    describe('property bind', function () {
        let propBind: PropertyBindExpr;

        it('{el/@prop}', function () {
            propBind = exParser.parsePropertyBind('{el/@prop}');
            assert.lengthOf(propBind.diagnostics, 0);
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

        it('{$this/}', function () {
            propBind = exParser.parsePropertyBind('{$this/}');
            assert.lengthOf(propBind.path, 2);
            assert.isAtLeast(propBind.diagnostics.length, 1);
        });
    });
});
