import { Store, Workspace } from '../src/service/store';
import { DiagnosticsProvider } from '../src/service/diagnostics';
import { NavigationProvider } from '../src/service/navigation';
import { CompletionsProvider } from '../src/service/completions';
import { SignaturesProvider } from '../src/service/signatures';
import { getPositionOfLineAndCharacter, findPrecedingToken } from '../src/service/utils';
import * as Types from '../src/compiler/types';
import { mockupSourceFile, mockupTextDocument, mockupStore } from './helpers';
import { assert } from 'chai';
import * as path from 'path';
import 'mocha';


describe('Service', () => {
    describe('Utils', () => {
        const sourceFile = mockupSourceFile(path.join('service', 'navigation', 'declarations.galaxy'));

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

        it('should report about parse errors', () => {
            const diagnosticsProvider = new DiagnosticsProvider(store);
            const document = mockupTextDocument(path.join('service', 'diagnostics_parse_error.galaxy'));
            store.updateDocument(document);
            diagnosticsProvider.subscribe(document.uri);
            const diagnostics = diagnosticsProvider.diagnose(document.uri);
            assert(diagnostics.length === 1);
            assert.equal(diagnostics[0].messageText, 'Expected SemicolonToken, found CloseBraceToken');
        });
    });

    describe('Navigation', () => {
        const fixturesPath = 'tests/fixtures/service/navigation';

        it('should provide symbols navigation per document', () => {
            const store = new Store();
            const navigation = new NavigationProvider(store);
            const document = mockupTextDocument('service', 'navigation', 'declarations.galaxy');
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
        const document = mockupTextDocument('service', 'navigation', 'funcs.galaxy');
        const store = mockupStore(
            document,
            mockupTextDocument('service', 'navigation', 'declarations.galaxy')
        );
        const completions = new CompletionsProvider(store);

        it('should provide globaly declared symbols', () => {
            assert.lengthOf(completions.getCompletionsAt(document.uri, 0), 5);
        });

        it('should provide localy declared symbols', () => {
            assert.lengthOf(completions.getCompletionsAt(document.uri, 51), 8);
        });
    });

    describe('Signatures', () => {
        const document = mockupTextDocument('service', 'call.galaxy');
        const store = mockupStore(
            document,
            mockupTextDocument('service', 'navigation', 'funcs.galaxy')
        );
        const signaturesProvider = new SignaturesProvider(store);

        it('should provide signature help for global functions', () => {
            assert.lengthOf(signaturesProvider.getSignatureAt(document.uri, 28).signatures, 1);
        });

        it('should identify active parameter', () => {
            assert.equal(signaturesProvider.getSignatureAt(document.uri, 30).activeParameter, 1);
        });
    });
});
