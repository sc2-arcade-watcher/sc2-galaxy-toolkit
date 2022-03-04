import 'mocha';
import * as lsp from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { assert } from 'chai';
import { DefinitionProvider } from '../../src/service/definitions';
import { mockupTextDocument, mockupStore, fixtureFilePath, dump } from '../helpers';
import { createProvider } from '../../src/service/provider';
import { getPositionOfLineAndCharacter } from '../../src/service/utils';
import { SC2Workspace, SC2Archive } from '../../src/sc2mod/archive';

describe('Service Definition', () => {
    const refsDoc = mockupTextDocument('service', 'definition', 'refs.galaxy');
    const headerDoc = mockupTextDocument('service', 'definition', 'header.galaxy');
    const store = mockupStore(headerDoc, refsDoc);
    const defProvider = createProvider(DefinitionProvider, store);

    before(async () => {
        await store.updateS2Workspace(new SC2Workspace(
            new SC2Archive('definition', fixtureFilePath('service', 'definition'))
        ));
    });

    function getDefLinks(document: TextDocument, line: number, character: number) {
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

        loc = getDefLinks(refsDoc, 4, 8);
        assert.isAtLeast(loc.length, 1);
        assert.equal(loc[0].targetUri, refsDoc.uri);
        assert.deepEqual(loc[0].targetSelectionRange, {
            start: { line: 2, character: 16 },
            end: { line: 2, character: 21 },
        }, 'func param');

        loc = getDefLinks(refsDoc, 14, 7);
        assert.isAtLeast(loc.length, 1);
        assert.equal(loc[0].targetUri, refsDoc.uri);
        assert.deepEqual(loc[0].targetSelectionRange, {
            start: { line: 9, character: 9 },
            end: { line: 9, character: 14 },
        }, 'local variable: unit local');

        loc = getDefLinks(refsDoc, 13, 7);
        assert.isAtLeast(loc.length, 1);
        assert.equal(loc[0].targetUri, refsDoc.uri);
        assert.deepEqual(loc[0].targetSelectionRange, {
            start: { line: 2, character: 5 },
            end: { line: 2, character: 9 },
        }, 'function call: call');
    });

    it('should locate declarations within the same workspace', () => {
        let loc: lsp.DefinitionLink[];

        loc = getDefLinks(refsDoc, 11, 4);
        assert.isAtLeast(loc.length, 1);
        assert.equal(loc[0].targetUri, headerDoc.uri);
        assert.deepEqual(loc[0].targetSelectionRange, {
            start: { line: 9, character: 4 },
            end: { line: 9, character: 9 },
        }, 'global variable: aglob');

        loc = getDefLinks(refsDoc, 16, 14);
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

    it('include statement', () => {
        let loc: lsp.DefinitionLink[];

        loc = getDefLinks(refsDoc, 0, 10);
        assert.isAtLeast(loc.length, 1);
        assert.deepEqual(loc[0].originSelectionRange, {
            start: { line: 0, character: 8 },
            end: { line: 0, character: 16 },
        });
    });
});
