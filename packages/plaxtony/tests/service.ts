import { Store, Workspace, createTextDocumentFromFs } from '../src/service/store';
import { DiagnosticsProvider } from '../src/service/diagnostics';
import { NavigationProvider } from '../src/service/navigation';
import { assert } from 'chai';
import * as path from 'path';
import 'mocha';

describe('Service', () => {
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
            assert.lengthOf(symbolDeclarations, 5);
        });
    });
});
