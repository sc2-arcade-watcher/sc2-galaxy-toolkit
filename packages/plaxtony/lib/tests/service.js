"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const store_1 = require("../src/service/store");
const provider_1 = require("../src/service/provider");
const diagnostics_1 = require("../src/service/diagnostics");
const navigation_1 = require("../src/service/navigation");
const completions_1 = require("../src/service/completions");
const signatures_1 = require("../src/service/signatures");
const definitions_1 = require("../src/service/definitions");
const hover_1 = require("../src/service/hover");
const references_1 = require("../src/service/references");
const utils_1 = require("../src/service/utils");
const helpers_1 = require("./helpers");
const lsp = require("vscode-languageserver");
const chai_1 = require("chai");
const path = require("path");
require("mocha");
describe('Service', () => {
    describe('Utils', () => {
        const sourceFile = helpers_1.mockupSourceFile(path.join('service', 'navigation', 'declarations.galaxy'));
        it('getPositionOfLineAndCharacter', () => {
            chai_1.assert.equal(utils_1.getPositionOfLineAndCharacter(sourceFile, 0, 0), 0);
            chai_1.assert.equal(utils_1.getPositionOfLineAndCharacter(sourceFile, 0, 20), 20);
            chai_1.assert.equal(utils_1.getPositionOfLineAndCharacter(sourceFile, 1, 0), 21);
            chai_1.assert.equal(utils_1.getPositionOfLineAndCharacter(sourceFile, 6, 20), 91);
        });
        it('findPrecedingToken', () => {
            chai_1.assert.equal(utils_1.findPrecedingToken(16, sourceFile).name, 'decl_struct');
            chai_1.assert.equal(utils_1.findPrecedingToken(1, sourceFile).kind, 51 /* StructKeyword */);
            chai_1.assert.equal(utils_1.findPrecedingToken(20, sourceFile).kind, 4 /* OpenBraceToken */);
            chai_1.assert.equal(utils_1.findPrecedingToken(0, sourceFile), undefined);
        });
        it('findPrecedingToken "incomplete_if_identifier"', () => {
            const sourceFile = helpers_1.mockupSourceFile(path.join('type_checker', 'find', 'incomplete_if_identifier.galaxy'));
            const t = utils_1.findPrecedingToken(utils_1.getPositionOfLineAndCharacter(sourceFile, 2, 25), sourceFile);
            chai_1.assert.equal(t.kind, 113 /* Identifier */, `not expected ${t.kindName}`);
            chai_1.assert.equal(t.name, 'UserDataGetFixed');
        });
    });
    describe('Diagnostics', () => {
        const store = new store_1.Store();
        it('should report about parse errors', () => {
            const diagnosticsProvider = provider_1.createProvider(diagnostics_1.DiagnosticsProvider, store);
            const document = helpers_1.mockupTextDocument(path.join('service', 'diagnostics_parse_error.galaxy'));
            store.updateDocument(document);
            diagnosticsProvider.subscribe(document.uri);
            const diagnostics = diagnosticsProvider.provideDiagnostics(document.uri);
            chai_1.assert.isAtLeast(diagnostics.length, 1);
            chai_1.assert.equal(diagnostics[0].message, 'Expected SemicolonToken, found CloseBraceToken');
        });
    });
    describe('Navigation', () => {
        const fixturesPath = 'tests/fixtures/service/navigation';
        it('should provide symbols navigation per document', () => {
            const store = new store_1.Store();
            const navigation = provider_1.createProvider(navigation_1.NavigationProvider, store);
            const document = helpers_1.mockupTextDocument('service', 'navigation', 'declarations.galaxy');
            store.updateDocument(document);
            const symbolDeclarations = navigation.getDocumentSymbols(document.uri);
            chai_1.assert.lengthOf(symbolDeclarations, 4);
            chai_1.assert.equal(symbolDeclarations[0].name.name, 'decl_struct');
            chai_1.assert.equal(symbolDeclarations[1].name.name, 'decl_var_string');
            chai_1.assert.equal(symbolDeclarations[2].name.name, 'decl_var_const_static_string');
            chai_1.assert.equal(symbolDeclarations[3].name.name, 'main');
        });
        it('should provide symbols navigation per workspace', () => __awaiter(this, void 0, void 0, function* () {
            const store = yield helpers_1.mockupStoreFromDirectory(fixturesPath);
            const navigation = provider_1.createProvider(navigation_1.NavigationProvider, store);
            const symbolDeclarations = navigation.getWorkspaceSymbols();
            chai_1.assert.lengthOf(symbolDeclarations, 7);
        }));
    });
    describe('Completions', () => {
        const document = helpers_1.mockupTextDocument('service', 'navigation', 'funcs.galaxy');
        const documentStruct = helpers_1.mockupTextDocument('service', 'completion', 'struct.galaxy');
        const documentCompletions = helpers_1.mockupTextDocument('service', 'completion', 'completion.galaxy');
        const documentTrigger = helpers_1.mockupTextDocument('service', 'completion', 'trigger.galaxy');
        const store = helpers_1.mockupStore(document, helpers_1.mockupTextDocument('service', 'navigation', 'declarations.galaxy'), documentStruct, documentCompletions, documentTrigger);
        const completionsProvider = provider_1.createProvider(completions_1.CompletionsProvider, store);
        completionsProvider.config.functionExpand = 2 /* ArgumentsNull */;
        function getCompletionsAt(doc, line, char) {
            return completionsProvider.getCompletionsAt(doc.uri, utils_1.getPositionOfLineAndCharacter(store.documents.get(doc.uri), line, char));
        }
        it('should provide globaly declared symbols', () => {
            const completions = completionsProvider.getCompletionsAt(document.uri, 0);
            chai_1.assert.isAbove(completions.items.length, 0);
            chai_1.assert.isDefined(completions.items.find((item) => {
                return item.label === 'decl_var_string';
            }));
        });
        it('should provide localy declared symbols', () => {
            const completions = completionsProvider.getCompletionsAt(document.uri, 51);
            chai_1.assert.isAbove(completions.items.length, 0);
            chai_1.assert.isDefined(completions.items.find((item) => {
                return item.label === 'local';
            }));
        });
        it('should provide struct scoped symbols', () => {
            let completionsList;
            completionsList = getCompletionsAt(documentStruct, 14, 9);
            chai_1.assert.lengthOf(completionsList.items, 3);
            completionsList = getCompletionsAt(documentStruct, 14, 10);
            chai_1.assert.lengthOf(completionsList.items, 3);
            completionsList = getCompletionsAt(documentStruct, 15, 13);
            chai_1.assert.lengthOf(completionsList.items, 1);
            completionsList = getCompletionsAt(documentStruct, 15, 14);
            chai_1.assert.lengthOf(completionsList.items, 1);
            completionsList = getCompletionsAt(documentStruct, 15, 12);
            chai_1.assert.lengthOf(completionsList.items, 3);
            completionsList = getCompletionsAt(documentStruct, 16, 21);
            chai_1.assert.lengthOf(completionsList.items, 1);
            chai_1.assert.equal(completionsList.items[0].label, 'submember');
            chai_1.assert.equal(completionsList.items[0].kind, lsp.CompletionItemKind.Property);
            chai_1.assert.equal(completionsProvider.resolveCompletion(completionsList.items[0]).detail, 'string submember;');
            completionsList = getCompletionsAt(documentStruct, 17, 18);
            chai_1.assert.notEqual(completionsList.items.length, 1);
        });
        it('string', () => {
            const completions = getCompletionsAt(documentCompletions, 2, 12);
            chai_1.assert.equal(completions.items.length, 0);
        });
        it('filter suggestions basing on preceding indentifier', () => {
            const completions = getCompletionsAt(documentCompletions, 3, 9);
            chai_1.assert.equal(completions.items.length, 2);
        });
        it('expand functions', () => {
            const completions = getCompletionsAt(documentCompletions, 3, 9);
            chai_1.assert.equal(completionsProvider.resolveCompletion(completions.items[0]).insertText, 'completion_test(${1:0});$0');
        });
        it('trigger handle function definitions', () => {
            let completions = getCompletionsAt(documentTrigger, 24, 19);
            chai_1.assert.equal(completions.items.length, 2);
            chai_1.assert.equal(completions.items[0].label, 'on_t1');
            chai_1.assert.isTrue(completionsProvider.resolveCompletion(completions.items[0]).insertText === undefined);
            completions = getCompletionsAt(documentTrigger, 25, 22);
            chai_1.assert.equal(completions.items.length, 0);
            completions = getCompletionsAt(documentTrigger, 26, 19);
            chai_1.assert.equal(completions.items.length, 2);
        });
    });
    describe('Signatures', () => {
        const document = helpers_1.mockupTextDocument('service', 'call.galaxy');
        const docSignature = helpers_1.mockupTextDocument('service', 'signature', 'signature.galaxy');
        const docFnref = helpers_1.mockupTextDocument('service', 'signature', 'funcref.galaxy');
        const store = helpers_1.mockupStore(document, helpers_1.mockupTextDocument('service', 'navigation', 'funcs.galaxy'), docSignature, docFnref);
        const srcFnref = store.documents.get(docFnref.uri);
        const signaturesProvider = provider_1.createProvider(signatures_1.SignaturesProvider, store);
        let signature;
        it('should provide signature help for global functions', () => {
            chai_1.assert.lengthOf(signaturesProvider.getSignatureAt(document.uri, 28).signatures, 1);
        });
        it('should identify active parameter', () => {
            chai_1.assert.equal(signaturesProvider.getSignatureAt(document.uri, 29).activeParameter, 0, 'no whitespace 1');
            chai_1.assert.equal(signaturesProvider.getSignatureAt(document.uri, 30).activeParameter, 1, 'no whitespace 2');
            chai_1.assert.equal(signaturesProvider.getSignatureAt(document.uri, 49).activeParameter, 0, 'no whitespace 0 - sec');
            chai_1.assert.equal(signaturesProvider.getSignatureAt(document.uri, 50).activeParameter, 1, 'right after comma token, before whitespace');
            chai_1.assert.equal(signaturesProvider.getSignatureAt(document.uri, 51).activeParameter, 1, 'after whitespace and comma');
            chai_1.assert.equal(signaturesProvider.getSignatureAt(document.uri, 71).activeParameter, 1, 'after comma empty param');
        });
        it('should properly identify bounds in nested calls', () => {
            signature = signaturesProvider.getSignatureAt(docSignature.uri, 115);
            chai_1.assert.lengthOf(signature.signatures, 1);
            chai_1.assert.equal(signature.signatures[0].label, 'string name_me(int id)');
            signature = signaturesProvider.getSignatureAt(docSignature.uri, 116);
            chai_1.assert.lengthOf(signature.signatures, 1);
            chai_1.assert.equal(signature.signatures[0].label, 'int randomize()');
            signature = signaturesProvider.getSignatureAt(docSignature.uri, 117);
            chai_1.assert.lengthOf(signature.signatures, 1);
            chai_1.assert.equal(signature.signatures[0].label, 'string name_me(int id)');
        });
        context('should provide signature help when cursor at: ', () => {
            it('end of binary expr, before ")"', () => {
                chai_1.assert.lengthOf(signaturesProvider.getSignatureAt(docSignature.uri, 137).signatures, 1);
            });
            it('begining of prefix expr, after "("', () => {
                chai_1.assert.lengthOf(signaturesProvider.getSignatureAt(docSignature.uri, 152).signatures, 1);
            });
            it('whitespace, inbetween "(" and ")"', () => {
                chai_1.assert.lengthOf(signaturesProvider.getSignatureAt(docSignature.uri, 172).signatures, 1);
                chai_1.assert.lengthOf(signaturesProvider.getSignatureAt(docSignature.uri, 171).signatures, 1);
            });
            it('whitespace, inbetween "," and prefixed expr of numeric literal', () => {
                chai_1.assert.lengthOf(signaturesProvider.getSignatureAt(docSignature.uri, 189).signatures, 1);
            });
            it('prefixed expr of numeric literal, inbetween operand and literal', () => {
                chai_1.assert.lengthOf(signaturesProvider.getSignatureAt(docSignature.uri, 195).signatures, 1);
            });
        });
        it('funcref', () => {
            signature = signaturesProvider.getSignatureAt(docFnref.uri, utils_1.getPositionOfLineAndCharacter(srcFnref, 13, 9));
            chai_1.assert.isDefined(signature);
            chai_1.assert.equal(signature.signatures[0].label, 'void fprototype(int a, string b)');
        });
        it('funcref in struct', () => {
            signature = signaturesProvider.getSignatureAt(docFnref.uri, utils_1.getPositionOfLineAndCharacter(srcFnref, 14, 16));
            chai_1.assert.isDefined(signature);
        });
        it('funcref in structref', () => {
            signature = signaturesProvider.getSignatureAt(docFnref.uri, utils_1.getPositionOfLineAndCharacter(srcFnref, 15, 16));
            chai_1.assert.isDefined(signature);
        });
    });
    describe('Definition', () => {
        const refsDoc = helpers_1.mockupTextDocument('service', 'definition', 'refs.galaxy');
        const headerDoc = helpers_1.mockupTextDocument('service', 'definition', 'header.galaxy');
        const store = helpers_1.mockupStore(headerDoc, refsDoc);
        const definitions = provider_1.createProvider(definitions_1.DefinitionProvider, store);
        function getDef(document, line, character) {
            return definitions.getDefinitionAt(document.uri, utils_1.getPositionOfLineAndCharacter(store.documents.get(document.uri), line, character));
        }
        it('should fail gracefully for non identifiers', () => {
            chai_1.assert.lengthOf(getDef(refsDoc, 0, 0), 0);
        });
        it('should fail gracefully for undeclared symbols', () => {
            chai_1.assert.lengthOf(getDef(headerDoc, 13, 0), 0);
        });
        it('should locate declarations within the same file', () => {
            let loc;
            loc = getDef(refsDoc, 2, 8);
            chai_1.assert.isAtLeast(loc.length, 1);
            chai_1.assert.deepEqual(loc[0], {
                uri: refsDoc.uri,
                range: {
                    start: {
                        line: 0,
                        character: 16,
                    },
                    end: {
                        line: 0,
                        character: 21,
                    },
                },
            }, 'func param');
            loc = getDef(refsDoc, 12, 7);
            chai_1.assert.isAtLeast(loc.length, 1);
            chai_1.assert.deepEqual(loc[0], {
                uri: refsDoc.uri,
                range: {
                    start: {
                        line: 7,
                        character: 9,
                    },
                    end: {
                        line: 7,
                        character: 14,
                    },
                },
            }, 'local variable: unit local');
            loc = getDef(refsDoc, 11, 7);
            chai_1.assert.isAtLeast(loc.length, 1);
            chai_1.assert.deepEqual(loc[0], {
                uri: refsDoc.uri,
                range: {
                    start: {
                        line: 0,
                        character: 5,
                    },
                    end: {
                        line: 0,
                        character: 9,
                    },
                },
            }, 'function call: call');
        });
        it('should locate declarations within the same workspace', () => {
            let loc;
            loc = getDef(refsDoc, 9, 4);
            chai_1.assert.isAtLeast(loc.length, 1);
            chai_1.assert.deepEqual(loc[0], {
                uri: headerDoc.uri,
                range: {
                    start: {
                        line: 9,
                        character: 4,
                    },
                    end: {
                        line: 9,
                        character: 9,
                    },
                },
            }, 'global variable: aglob');
            loc = getDef(refsDoc, 14, 14);
            chai_1.assert.isAtLeast(loc.length, 1);
            chai_1.assert.deepEqual(loc[0], {
                uri: headerDoc.uri,
                range: {
                    start: {
                        line: 1,
                        character: 11,
                    },
                    end: {
                        line: 1,
                        character: 20,
                    },
                },
            }, 'struct property access: submemeber');
        });
        it('should locate types of members in a struct', () => {
            let loc;
            loc = getDef(headerDoc, 6, 4);
            chai_1.assert.isAtLeast(loc.length, 1);
            chai_1.assert.deepEqual(loc[0], {
                uri: headerDoc.uri,
                range: {
                    start: {
                        line: 0,
                        character: 7,
                    },
                    end: {
                        line: 0,
                        character: 21,
                    },
                },
            }, 'struct decl member: container_t::sub');
        });
    });
    describe('Hover', () => {
        const hoverDoc = helpers_1.mockupTextDocument('service', 'hover', 'hover.galaxy');
        const store = helpers_1.mockupStore(hoverDoc);
        const hoverProvider = provider_1.createProvider(hover_1.HoverProvider, store);
        it('parameter', () => {
            const info = hoverProvider.getHoverAt({ textDocument: hoverDoc, position: { line: 8, character: 4 } });
            chai_1.assert.isDefined(info);
            const contents = info.contents;
            chai_1.assert.isAtLeast(contents.length, 1);
            chai_1.assert.equal(contents[0], '```galaxy\nint a\n```');
            // assert.isAtLeast(contents.length, 2)
            // assert.equal(contents[1], 'parameter of *print_num*');
        });
        it('local var', () => {
            const info = hoverProvider.getHoverAt({ textDocument: hoverDoc, position: { line: 9, character: 4 } });
            chai_1.assert.isDefined(info);
            const contents = info.contents;
            chai_1.assert.isAtLeast(contents.length, 1);
            chai_1.assert.equal(contents[0], '```galaxy\nstring b\n```');
            // assert.isAtLeast(contents.length, 2)
            // assert.equal(contents[1], 'local variable');
        });
        it('global constant', () => {
            const info = hoverProvider.getHoverAt({ textDocument: hoverDoc, position: { line: 17, character: 14 } });
            chai_1.assert.isDefined(info);
            const contents = info.contents;
            chai_1.assert.isAtLeast(contents.length, 1);
            chai_1.assert.equal(contents[0], '```galaxy\nconst int c_test = 0\n```');
            // assert.isAtLeast(contents.length, 2)
            // assert.equal(contents[1], 'global constant');
        });
        it('function', () => {
            const info = hoverProvider.getHoverAt({ textDocument: hoverDoc, position: { line: 17, character: 4 } });
            chai_1.assert.isDefined(info);
            const contents = info.contents;
            chai_1.assert.isAtLeast(contents.length, 1);
            chai_1.assert.equal(contents[0], '```galaxy\nvoid print_num(int a)\n```');
        });
        it('struct property', () => {
            const info = hoverProvider.getHoverAt({ textDocument: hoverDoc, position: { line: 18, character: 9 } });
            chai_1.assert.isDefined(info);
            const contents = info.contents;
            chai_1.assert.isAtLeast(contents.length, 1);
            chai_1.assert.equal(contents[0], '```galaxy\nint a\n```');
            chai_1.assert.isAtLeast(contents.length, 2);
            chai_1.assert.equal(contents[1], 'property of `info_t`');
        });
        it('struct', () => {
            const info = hoverProvider.getHoverAt({ textDocument: hoverDoc, position: { line: 0, character: 7 } });
            chai_1.assert.isDefined(info);
            const contents = info.contents;
            chai_1.assert.isAtLeast(contents.length, 1);
            chai_1.assert.equal(contents[0], '```galaxy\nstruct info_t {\n\tint a;\n}\n```');
        });
    });
    describe('References', () => {
        const refsDoc = helpers_1.mockupTextDocument('service', 'definition', 'refs.galaxy');
        const headerDoc = helpers_1.mockupTextDocument('service', 'definition', 'header.galaxy');
        const store = helpers_1.mockupStore(headerDoc, refsDoc);
        const referenceProvider = provider_1.createProvider(references_1.ReferencesProvider, store);
        it('local variable', () => {
            const result = referenceProvider.onReferences({ textDocument: refsDoc, position: { line: 7, character: 9 }, context: null });
            chai_1.assert.isDefined(result);
            chai_1.assert.equal(result.length, 2);
            chai_1.assert.equal(result[0].range.start.line, 7);
            chai_1.assert.equal(result[1].range.start.line, 12);
        });
        it('struct property', () => {
            const result = referenceProvider.onReferences({ textDocument: refsDoc, position: { line: 14, character: 10 }, context: null });
            chai_1.assert.isDefined(result);
            chai_1.assert.equal(result.length, 2);
            chai_1.assert.equal(result[0].uri, headerDoc.uri);
            chai_1.assert.equal(result[0].range.start.line, 6);
            chai_1.assert.equal(result[1].range.start.line, 14);
        });
    });
});
//# sourceMappingURL=service.js.map