import { Store, Workspace } from '../src/service/store';
import { createProvider } from '../src/service/provider';
import { DiagnosticsProvider } from '../src/service/diagnostics';
import { NavigationProvider } from '../src/service/navigation';
import { CompletionsProvider } from '../src/service/completions';
import { SignaturesProvider } from '../src/service/signatures';
import { DefinitionProvider } from '../src/service/definitions';
import { getPositionOfLineAndCharacter, findPrecedingToken } from '../src/service/utils';
import * as gt from '../src/compiler/types';
import { mockupSourceFile, mockupTextDocument, mockupStore, mockupStoreFromDirectory } from './helpers';
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
            const diagnosticsProvider = createProvider(DiagnosticsProvider, store);
            const document = mockupTextDocument(path.join('service', 'diagnostics_parse_error.galaxy'));
            store.updateDocument(document);
            diagnosticsProvider.subscribe(document.uri);
            const diagnostics = diagnosticsProvider.diagnose(document.uri);
            assert.lengthOf(diagnostics, 1);
            assert.equal(diagnostics[0].messageText, 'Expected SemicolonToken, found CloseBraceToken');
        });
    });

    describe('Navigation', () => {
        const fixturesPath = 'tests/fixtures/service/navigation';

        it('should provide symbols navigation per document', () => {
            const store = new Store();
            const navigation = createProvider(NavigationProvider, store);
            const document = mockupTextDocument('service', 'navigation', 'declarations.galaxy');
            store.updateDocument(document);
            const symbolDeclarations = navigation.getDocumentSymbols(document.uri);
            assert.lengthOf(symbolDeclarations, 4);
            assert.equal(symbolDeclarations[0].name.name, 'decl_struct');
            assert.equal(symbolDeclarations[1].name.name, 'decl_var_string');
            assert.equal(symbolDeclarations[2].name.name, 'decl_var_const_static_string');
            assert.equal(symbolDeclarations[3].name.name, 'main');
        });

        it('should provide symbols navigation per workspace', async () => {
            const store = await mockupStoreFromDirectory(fixturesPath);
            const navigation = createProvider(NavigationProvider, store);
            const symbolDeclarations = navigation.getWorkspaceSymbols();
            assert.lengthOf(symbolDeclarations, 6);
        });
    });

    describe('Completions', () => {
        const document = mockupTextDocument('service', 'navigation', 'funcs.galaxy');
        const documentStruct = mockupTextDocument('service', 'completion', 'struct.galaxy');
        const store = mockupStore(
            document,
            mockupTextDocument('service', 'navigation', 'declarations.galaxy'),
            documentStruct
        );
        const completionsProvider = createProvider(CompletionsProvider, store);

        function getCompletionsAt(doc: lsp.TextDocument, line: number, char: number) {
            return completionsProvider.getCompletionsAt(
                doc.uri,
                getPositionOfLineAndCharacter(store.documents.get(documentStruct.uri), line, char)
            );
        }

        it('should provide globaly declared symbols', () => {
            assert.lengthOf(completionsProvider.getCompletionsAt(document.uri, 0), 8);
        });

        it('should provide localy declared symbols', () => {
            assert.lengthOf(completionsProvider.getCompletionsAt(document.uri, 51), 11);
        });

        it('should provide struct scoped symbols', () => {
            let items: lsp.CompletionItem[];

            items = getCompletionsAt(documentStruct, 14, 9);
            assert.lengthOf(items, 3);
            items = getCompletionsAt(documentStruct, 14, 10);
            assert.lengthOf(items, 3);

            items = getCompletionsAt(documentStruct, 15, 13);
            assert.lengthOf(items, 1);
            items = getCompletionsAt(documentStruct, 15, 14);
            assert.lengthOf(items, 1);
            items = getCompletionsAt(documentStruct, 15, 12);
            assert.lengthOf(items, 3);

            items = getCompletionsAt(documentStruct, 16, 21);
            assert.lengthOf(items, 1);
            assert.equal(items[0].label, 'submember');
            assert.equal(items[0].kind, lsp.CompletionItemKind.Property);

            items = getCompletionsAt(documentStruct, 17, 18);
            assert.notEqual(items.length, 1);
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
        const signaturesProvider = createProvider(SignaturesProvider, store);

        it('should provide signature help for global functions', () => {
            assert.lengthOf(signaturesProvider.getSignatureAt(document.uri, 28).signatures, 1);
        });

        it('should identify active parameter', () => {
            assert.equal(signaturesProvider.getSignatureAt(document.uri, 29).activeParameter, 0, 'no whitespace 1');
            assert.equal(signaturesProvider.getSignatureAt(document.uri, 30).activeParameter, 1, 'no whitespace 2');

            assert.equal(signaturesProvider.getSignatureAt(document.uri, 49).activeParameter, 0, 'no whitespace 0 - sec');
            assert.equal(signaturesProvider.getSignatureAt(document.uri, 50).activeParameter, 1, 'right after comma token, before whitespace');
            assert.equal(signaturesProvider.getSignatureAt(document.uri, 51).activeParameter, 1, 'after whitespace and comma');

            assert.equal(signaturesProvider.getSignatureAt(document.uri, 71).activeParameter, 1, 'after comma empty param');
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

        const definitions = createProvider(DefinitionProvider, store);

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
                        character: 2,
                    },
                },
            }, 'struct decl member: container_t::sub');
        });
    });
});
