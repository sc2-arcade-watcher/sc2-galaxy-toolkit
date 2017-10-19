import 'mocha';
import { assert } from 'chai';
import { TypeChecker } from '../src/compiler/checker';
import { mockupStoreDocument, mockupStore, mockupSourceFile, mockupTextDocument } from './helpers';
import { getPositionOfLineAndCharacter, findPrecedingToken } from '../src/service/utils';
import * as gt from './../src/compiler/types';

describe('TypeChecker', () => {
    const document = mockupTextDocument('type_checker', 'struct.galaxy');
    const store = mockupStore(document);
    const sourceFile = store.documents.get(document.uri);
    const checker = new TypeChecker(store);

    function getNodeTypeAt(sourceFile: gt.SourceFile, line: number, character: number): gt.Type | undefined {
        const token = findPrecedingToken(getPositionOfLineAndCharacter(sourceFile, line, character), sourceFile);
        return checker.getTypeOfNode(token)
    }

    describe('Type resolver', () => {
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
});
