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

    it('property bind', function () {
        let propBind: PropertyBindExpr;

        propBind = exParser.parsePropertyBind('{$this/$ancestor[@name=m]/@prop}');
        assert.lengthOf(propBind.diagnostics, 0);

        propBind = exParser.parsePropertyBind('{$parent/$sibling-1/@prop}');
        assert.lengthOf(propBind.diagnostics, 0);

        propBind = exParser.parsePropertyBind('{$layer/UI/@Property[12]}');
        assert.lengthOf(propBind.diagnostics, 0);
    });
});
