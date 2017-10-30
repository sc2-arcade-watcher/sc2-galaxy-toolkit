import 'mocha';
import { assert } from 'chai';
import { TypeChecker } from '../src/compiler/checker';
import { mockupStoreDocument, mockupStore, mockupSourceFile, mockupTextDocument } from './helpers';
import { getPositionOfLineAndCharacter, findPrecedingToken, getTokenAtPosition } from '../src/service/utils';
import * as lsp from 'vscode-languageserver';
import * as gt from './../src/compiler/types';

function getSymbolAt(checker: TypeChecker, sourceFile: gt.SourceFile, line: number, character: number): gt.Symbol | undefined {
    const token = getTokenAtPosition(getPositionOfLineAndCharacter(sourceFile, line, character), sourceFile);
    return checker.getSymbolAtLocation(token)
}

function getNodeTypeAt(checker: TypeChecker, sourceFile: gt.SourceFile, line: number, character: number): gt.Type | undefined {
    const token = findPrecedingToken(getPositionOfLineAndCharacter(sourceFile, line, character), sourceFile);
    return checker.getTypeOfNode(token)
}

describe('TypeChecker', () => {
    describe('Resolve type', () => {
        const store = mockupStore();
        const checker = new TypeChecker(store);

        it('struct property', () => {
            let type: gt.Type;

            const document = mockupTextDocument('type_checker', 'struct.galaxy');
            store.updateDocument(document);
            const sourceFile = store.documents.get(document.uri);

            type = getNodeTypeAt(checker, sourceFile, 19, 21);
            assert.isAbove(type.flags & gt.TypeFlags.String, 0, '.');

            type = getNodeTypeAt(checker, sourceFile, 20, 28);
            assert.isAbove(type.flags & gt.TypeFlags.Integer, 0, '..');

            type = getNodeTypeAt(checker, sourceFile, 22, 27);
            assert.isAbove(type.flags & gt.TypeFlags.String, 0, '[].');

            type = getNodeTypeAt(checker, sourceFile, 23, 37);
            assert.isAbove(type.flags & gt.TypeFlags.Complex, 0, '[].[].');
            assert.equal((<gt.ComplexType>type).kind, gt.SyntaxKind.UnitKeyword);
        });

        it('structref property', () => {
            let type: gt.Type;

            const document = mockupTextDocument('type_checker', 'ref.galaxy');
            store.updateDocument(document);
            const sourceFile = store.documents.get(document.uri);

            type = getNodeTypeAt(checker, sourceFile, 9, 12);
            assert.isAbove(type.flags & gt.TypeFlags.Integer, 0);
        })
    });

    describe('Resolve symbol', () => {
        const documentStruct = mockupTextDocument('type_checker', 'struct.galaxy');
        const documentRef = mockupTextDocument('type_checker', 'ref.galaxy');
        const store = mockupStore(documentStruct, documentRef);
        const sourceFileStruct = store.documents.get(documentStruct.uri);
        const sourceFileRef = store.documents.get(documentRef.uri);
        const checker = new TypeChecker(store);

        it('variable', () => {
            let symbol: gt.Symbol;

            symbol = getSymbolAt(checker, sourceFileStruct, 14, 0);
            assert.isDefined(symbol);
        });

        it('[]variable', () => {
            let symbol: gt.Symbol;

            symbol = getSymbolAt(checker, sourceFileStruct, 15, 0);
            assert.isDefined(symbol);
        });

        it('structref', () => {
            let symbol: gt.Symbol;

            symbol = getSymbolAt(checker, sourceFileRef, 9, 11);
            assert.isDefined(symbol);

            symbol = getSymbolAt(checker, sourceFileRef, 10, 11);
            assert.isDefined(symbol);
        });
    });

    describe('Diagnostics', () => {
        it('undeclared symbol', () => {
            const document = mockupTextDocument('type_checker', 'undeclared.galaxy');
            const store = mockupStore(document);
            const checker = new TypeChecker(store);

            const diagnostics = checker.checkSourceFile(store.documents.get(document.uri));
            assert.lengthOf(diagnostics, 3);
            assert.equal(diagnostics[0].messageText, 'undeclared symbol');
        });

        it('call params', () => {
            const document = mockupTextDocument('type_checker', 'call_params.galaxy');
            const store = mockupStore(document);
            const checker = new TypeChecker(store);

            const diagnostics = checker.checkSourceFile(store.documents.get(document.uri));
            assert.lengthOf(diagnostics, 1);
            assert.equal(diagnostics[0].messageText, 'expected 2 arguments, got 1');
        });

        it('callable', () => {
            const document = mockupTextDocument('type_checker', 'callable.galaxy');
            const store = mockupStore(document);
            const checker = new TypeChecker(store);

            const diagnostics = checker.checkSourceFile(store.documents.get(document.uri));
            assert.lengthOf(diagnostics, 1);
            assert.equal(diagnostics[0].messageText, 'not calllable');
        });
    });
});
