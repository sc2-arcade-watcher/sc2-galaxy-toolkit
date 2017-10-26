import 'mocha';
import { assert } from 'chai';
import { TypeChecker } from '../src/compiler/checker';
import { mockupStoreDocument, mockupStore, mockupSourceFile, mockupTextDocument } from './helpers';
import { getPositionOfLineAndCharacter, findPrecedingToken, getTokenAtPosition } from '../src/service/utils';
import * as gt from './../src/compiler/types';

describe('TypeChecker', () => {
    describe('Type', () => {
        const document = mockupTextDocument('type_checker', 'struct.galaxy');
        const store = mockupStore(document);
        const sourceFile = store.documents.get(document.uri);
        const checker = new TypeChecker(store);

        function getNodeTypeAt(sourceFile: gt.SourceFile, line: number, character: number): gt.Type | undefined {
            const token = findPrecedingToken(getPositionOfLineAndCharacter(sourceFile, line, character), sourceFile);
            return checker.getTypeOfNode(token)
        }

        it('should resolve struct properties', () => {
            let type: gt.Type;

            type = getNodeTypeAt(sourceFile, 19, 21);
            assert.isAbove(type.flags & gt.TypeFlags.String, 0, '.');

            type = getNodeTypeAt(sourceFile, 20, 28);
            assert.isAbove(type.flags & gt.TypeFlags.Integer, 0, '..');

            type = getNodeTypeAt(sourceFile, 22, 27);
            assert.isAbove(type.flags & gt.TypeFlags.String, 0, '[].');

            type = getNodeTypeAt(sourceFile, 23, 37);
            assert.isAbove(type.flags & gt.TypeFlags.Complex, 0, '[].[].');
            assert.equal((<gt.ComplexType>type).kind, gt.SyntaxKind.UnitKeyword);
        });
    });

    describe('Symbol', () => {
        const document = mockupTextDocument('type_checker', 'struct.galaxy');
        const store = mockupStore(document);
        const sourceFile = store.documents.get(document.uri);
        const checker = new TypeChecker(store);

        function getSymbolAt(sourceFile: gt.SourceFile, line: number, character: number): gt.Symbol | undefined {
            const token = getTokenAtPosition(getPositionOfLineAndCharacter(sourceFile, line, character), sourceFile);
            return checker.getSymbolAtLocation(token)
        }

        it('should resolve type of variable', () => {
            let symbol: gt.Symbol;

            symbol = getSymbolAt(sourceFile, 14, 0);
            assert.isDefined(symbol);
        });

        it('should resolve type[] of variable', () => {
            let symbol: gt.Symbol;

            symbol = getSymbolAt(sourceFile, 15, 0);
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
