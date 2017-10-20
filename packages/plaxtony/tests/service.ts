import { Store, Workspace } from '../src/service/store';
import { DiagnosticsProvider } from '../src/service/diagnostics';
import { NavigationProvider } from '../src/service/navigation';
import { CompletionsProvider } from '../src/service/completions';
import { SignaturesProvider } from '../src/service/signatures';
import { DefinitionProvider } from '../src/service/definitions';
import { getPositionOfLineAndCharacter, findPrecedingToken } from '../src/service/utils';
import * as gt from '../src/compiler/types';
import { mockupSourceFile, mockupTextDocument, mockupStore } from './helpers';
import * as lsp from 'vscode-languageserver';
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
            assert.equal((<gt.Identifier>findPrecedingToken(16, sourceFile)).name, 'decl_struct');
            assert.equal(findPrecedingToken(1, sourceFile).kind, gt.SyntaxKind.StructKeyword);
            assert.equal(findPrecedingToken(20, sourceFile).kind, gt.SyntaxKind.OpenBraceToken);
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
            workspace.onDidOpen((ev) => {
                store.updateDocument(ev.document);
            })
            workspace.watch();
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
        const docSignature = mockupTextDocument('service', 'signature', 'signature.galaxy');
        const store = mockupStore(
            document,
            mockupTextDocument('service', 'navigation', 'funcs.galaxy'),
            docSignature
        );
        const signaturesProvider = new SignaturesProvider(store);

        it('should provide signature help for global functions', () => {
            assert.lengthOf(signaturesProvider.getSignatureAt(document.uri, 28).signatures, 1);
        });

        it('should identify active parameter', () => {
            assert.equal(signaturesProvider.getSignatureAt(document.uri, 29).activeParameter, 0, 'no whitespace 1');
            assert.equal(signaturesProvider.getSignatureAt(document.uri, 30).activeParameter, 1, 'no whitespace 2');

            assert.equal(signaturesProvider.getSignatureAt(document.uri, 49).activeParameter, 0, 'no whitespace 0 - sec');
            assert.equal(signaturesProvider.getSignatureAt(document.uri, 50).activeParameter, 1, 'right after comma token, before whitespace');
            assert.equal(signaturesProvider.getSignatureAt(document.uri, 51).activeParameter, 1, 'after whitespace and comma');

            // assert.equal(signaturesProvider.getSignatureAt(document.uri, 74).activeParameter, null, 'after comma for not existing parameter');
        });

        it('should properly identify bounds in nested calls', () => {
            let signature: lsp.SignatureHelp;

            signature = signaturesProvider.getSignatureAt(docSignature.uri, 115)
            assert.lengthOf(signature.signatures, 1);
            assert.equal(signature.signatures[0].label, 'string name_me(int id);');

            signature = signaturesProvider.getSignatureAt(docSignature.uri, 116)
            assert.lengthOf(signature.signatures, 1);
            assert.equal(signature.signatures[0].label, 'int randomize();');

            signature = signaturesProvider.getSignatureAt(docSignature.uri, 117)
            assert.lengthOf(signature.signatures, 1);
            assert.equal(signature.signatures[0].label, 'string name_me(int id);');
        });
    });

    describe('Definition', () => {
        const refsDoc = mockupTextDocument('service', 'definition', 'refs.galaxy');
        const headerDoc = mockupTextDocument('service', 'definition', 'header.galaxy');
        const store = mockupStore(
            headerDoc,
            refsDoc
        );

        const definitions = new DefinitionProvider(store);

        function getDef(document: lsp.TextDocument, line: number, character: number) {
            return definitions.getDefinitionAt(document.uri, getPositionOfLineAndCharacter(store.documents.get(document.uri), line, character));
        }

        it('should fail gracefully for non identifiers', () => {
            assert.lengthOf(<lsp.Location[]>getDef(refsDoc, 0, 0), 0);
        });

        it('should fail gracefully for undeclared symbols', () => {
            assert.lengthOf(<lsp.Location[]>getDef(headerDoc, 13, 0), 0);
        });

        it('should locate declarations within the same file', () => {
            let loc: lsp.Definition;

            loc = getDef(refsDoc, 2, 8);
            assert.isAtLeast((<lsp.Location[]>loc).length, 1);
            assert.deepEqual((<lsp.Location[]>loc)[0], <lsp.Location>{
                uri: refsDoc.uri,
                range: {
                    start: {
                        line: 0,
                        character: 10,
                    },
                    end: {
                        line: 0,
                        character: 21,
                    },
                },
            }, 'func param');

            loc = getDef(refsDoc, 12, 7);
            assert.isAtLeast((<lsp.Location[]>loc).length, 1);
            assert.deepEqual((<lsp.Location[]>loc)[0], <lsp.Location>{
                uri: refsDoc.uri,
                range: {
                    start: {
                        line: 7,
                        character: 4,
                    },
                    end: {
                        line: 7,
                        character: 15,
                    },
                },
            }, 'local variable: unit local');

            loc = getDef(refsDoc, 11, 7);
            assert.isAtLeast((<lsp.Location[]>loc).length, 1);
            assert.deepEqual((<lsp.Location[]>loc)[0], <lsp.Location>{
                uri: refsDoc.uri,
                range: {
                    start: {
                        line: 0,
                        character: 0,
                    },
                    end: {
                        line: 3,
                        character: 1,
                    },
                },
            }, 'function call: call');
        });

        it('should locate declarations within the same workspace', () => {
            let loc: lsp.Definition;

            loc = getDef(refsDoc, 9, 4);
            assert.isAtLeast((<lsp.Location[]>loc).length, 1);
            assert.deepEqual((<lsp.Location[]>loc)[0], <lsp.Location>{
                uri: headerDoc.uri,
                range: {
                    start: {
                        line: 9,
                        character: 0,
                    },
                    end: {
                        line: 9,
                        character: 10,
                    },
                },
            }, 'global variable: aglob');

            loc = getDef(refsDoc, 14, 14);
            assert.isAtLeast((<lsp.Location[]>loc).length, 1);
            assert.deepEqual((<lsp.Location[]>loc)[0], <lsp.Location>{
                uri: headerDoc.uri,
                range: {
                    start: {
                        line: 1,
                        character: 4,
                    },
                    end: {
                        line: 1,
                        character: 21,
                    },
                },
            }, 'struct property access: submemeber');
        });

        it('should locate types of members in a struct', () => {
            let loc: lsp.Definition;

            loc = getDef(headerDoc, 6, 4);
            assert.isAtLeast((<lsp.Location[]>loc).length, 1);
            assert.deepEqual((<lsp.Location[]>loc)[0], <lsp.Location>{
                uri: headerDoc.uri,
                range: {
                    start: {
                        line: 0,
                        character: 0,
                    },
                    end: {
                        line: 2,
                        character: 1,
                    },
                },
            }, 'struct decl member: container_t::sub');
        });
    });
});
