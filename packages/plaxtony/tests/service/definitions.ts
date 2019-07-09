import 'mocha';
import * as lsp from 'vscode-languageserver';
import { assert } from 'chai';
import { DefinitionProvider } from '../../src/service/definitions';
import { mockupTextDocument, mockupStore } from '../helpers';
import { createProvider } from '../../src/service/provider';
import { getPositionOfLineAndCharacter } from '../../src/service/utils';

describe('Service Definition', () => {
    const refsDoc = mockupTextDocument('service', 'definition', 'refs.galaxy');
    const headerDoc = mockupTextDocument('service', 'definition', 'header.galaxy');
    const store = mockupStore(headerDoc, refsDoc);
    const defProvider = createProvider(DefinitionProvider, store);

    function getDefLinks(document: lsp.TextDocument, line: number, character: number) {
        return defProvider.getDefinitionAt(document.uri, getPositionOfLineAndCharacter(store.documents.get(document.uri), line, character));
    }

    it('should fail gracefully for non identifiers', () => {
        assert.isUndefined(getDefLinks(refsDoc, 0, 0));
    });

    it('should fail gracefully for undeclared symbols', () => {
        assert.isUndefined(getDefLinks(headerDoc, 13, 0));
    });

    it('should locate declarations within the same file', () => {
        let loc: lsp.DefinitionLink[];

        loc = getDefLinks(refsDoc, 2, 8);
        assert.isAtLeast(loc.length, 1);
        assert.equal(loc[0].targetUri, refsDoc.uri);
        assert.deepEqual(loc[0].targetSelectionRange, {
            start: { line: 0, character: 16 },
            end: { line: 0, character: 21 },
        }, 'func param');

        loc = getDefLinks(refsDoc, 12, 7);
        assert.isAtLeast(loc.length, 1);
        assert.equal(loc[0].targetUri, refsDoc.uri);
        assert.deepEqual(loc[0].targetSelectionRange, {
            start: { line: 7, character: 9 },
            end: { line: 7, character: 14 },
        }, 'local variable: unit local');

        loc = getDefLinks(refsDoc, 11, 7);
        assert.isAtLeast(loc.length, 1);
        assert.equal(loc[0].targetUri, refsDoc.uri);
        assert.deepEqual(loc[0].targetSelectionRange, {
            start: { line: 0, character: 5 },
            end: { line: 0, character: 9 },
        }, 'function call: call');
    });

    it('should locate declarations within the same workspace', () => {
        let loc: lsp.DefinitionLink[];

        loc = getDefLinks(refsDoc, 9, 4);
        assert.isAtLeast(loc.length, 1);
        assert.equal(loc[0].targetUri, headerDoc.uri);
        assert.deepEqual(loc[0].targetSelectionRange, {
            start: { line: 9, character: 4 },
            end: { line: 9, character: 9 },
        }, 'global variable: aglob');

        loc = getDefLinks(refsDoc, 14, 14);
        assert.isAtLeast(loc.length, 1);
        assert.equal(loc[0].targetUri, headerDoc.uri);
        assert.deepEqual(loc[0].targetSelectionRange, {
            start: { line: 1, character: 11 },
            end: { line: 1, character: 20 },
        }, 'struct property access: submemeber');
    });

    it('should locate types of members in a struct', () => {
        let loc: lsp.DefinitionLink[];

        loc = getDefLinks(headerDoc, 6, 4);
        assert.isAtLeast(loc.length, 1);
        assert.equal(loc[0].targetUri, headerDoc.uri);
        assert.deepEqual(loc[0].targetSelectionRange, {
            start: { line: 0, character: 7 },
            end: { line: 0, character: 21 },
        }, 'struct decl member: container_t::sub');
    });
});
