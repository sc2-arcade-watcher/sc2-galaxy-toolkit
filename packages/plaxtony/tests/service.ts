import { Store, Workspace, createTextDocumentFromFs } from '../src/service/store';
import { DiagnosticsProvider } from '../src/service/diagnostics';
import { NavigationProvider } from '../src/service/navigation';
import { CompletionsProvider } from '../src/service/completions';
import { getPositionOfLineAndCharacter, findPrecedingToken } from '../src/service/utils';
import * as Types from '../src/compiler/types';
import { assert } from 'chai';
import * as path from 'path';
import 'mocha';

function mockupSourceFile(filepath: string) {
    const store = new Store();
    const document = createTextDocumentFromFs(filepath);
    store.updateDocument(document);
    return store.documents.get(document.uri);
}

describe('Service', () => {
    describe('Utils', () => {
        const fixturesPath = 'tests/fixtures/service/navigation';
        const sourceFile = mockupSourceFile(path.join(fixturesPath, 'declarations.galaxy'));

        it('getPositionOfLineAndCharacter', () => {
            assert.equal(getPositionOfLineAndCharacter(sourceFile, 0, 0), 0);
            assert.equal(getPositionOfLineAndCharacter(sourceFile, 0, 20), 20);
            assert.equal(getPositionOfLineAndCharacter(sourceFile, 1, 0), 21);
            assert.equal(getPositionOfLineAndCharacter(sourceFile, 6, 20), 91);
        });

        it('findPrecedingToken', () => {
            assert.equal((<Types.Identifier>findPrecedingToken(16, sourceFile)).name, 'decl_struct');
            assert.equal(findPrecedingToken(1, sourceFile).kind, Types.SyntaxKind.StructKeyword);
            assert.equal(findPrecedingToken(20, sourceFile).kind, Types.SyntaxKind.OpenBraceToken);
            assert.equal(findPrecedingToken(0, sourceFile), undefined);
        });
    });

    describe('Diagnostics', () => {
        const store = new Store();
        const fixturesPath = 'tests/fixtures/service';

        it('should report about parse errors', () => {
            const diagnosticsProvider = new DiagnosticsProvider(store);
            const document = createTextDocumentFromFs(path.join(fixturesPath, 'diagnostics_parse_error.galaxy'));
            store.updateDocument(document);
            diagnosticsProvider.subscribe(document.uri);
            const diagnostics = diagnosticsProvider.diagnose();
            assert(diagnostics.length === 1);
            assert.equal(diagnostics[0].messageText, 'Expected SemicolonToken, found CloseBraceToken');
        });
    });

    describe('Navigation', () => {
        const fixturesPath = 'tests/fixtures/service/navigation';

        it('should provide symbols navigation per document', () => {
            const store = new Store();
            const navigation = new NavigationProvider(store);
            const document = createTextDocumentFromFs(path.join(fixturesPath, 'declarations.galaxy'));
            store.updateDocument(document);
            const symbolDeclarations = navigation.getDocumentSymbols(document.uri);
            assert.lengthOf(symbolDeclarations, 4);
            assert.equal(symbolDeclarations[0].name.name, 'decl_struct');
            assert.equal(symbolDeclarations[1].name.name, 'decl_var_string');
            assert.equal(symbolDeclarations[2].name.name, 'decl_var_const_static_string');
            assert.equal(symbolDeclarations[3].name.name, 'main');
        });

        it('should provide symbols navigation per workspace', () => {
            const store = new Store();
            const navigation = new NavigationProvider(store);
            const workspace = new Workspace(fixturesPath, store);
            const symbolDeclarations = navigation.getWorkspaceSymbols();
            assert.lengthOf(symbolDeclarations, 6);
        });
    });

    describe('Completions', () => {
        const fixturesPath = 'tests/fixtures/service/navigation';
        const store = new Store();
        const completions = new CompletionsProvider(store);
        const document = createTextDocumentFromFs(path.join(fixturesPath, 'funcs.galaxy'));
        store.updateDocument(document);
        store.updateDocument(createTextDocumentFromFs(path.join(fixturesPath, 'declarations.galaxy')));

        it('should provide globaly declared symbols', () => {
            assert.lengthOf(completions.getCompletionsAt(document.uri, 0), 5);
        });

        it('should provide localy declared symbols', () => {
            assert.lengthOf(completions.getCompletionsAt(document.uri, 51), 8);
        });
    });
});
