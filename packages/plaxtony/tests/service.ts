import { Store, createTextDocumentFromFs } from '../src/service/store';
import { DiagnosticsProvider } from '../src/service/diagnostics';
import { assert } from 'chai';
import * as path from 'path';
import 'mocha';

describe('Service', () => {
    let store = new Store();

    describe('Diagnostics', () => {
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
});
