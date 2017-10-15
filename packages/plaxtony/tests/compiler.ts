import { SourceFile } from './../src/compiler/types';
import { Parser } from '../src/compiler/parser';
import { bindSourceFile } from '../src/compiler/binder';
import { TypeChecker } from '../src/compiler/checker';
import { mockupStoreDocument, mockupStore, mockupSourceFile, mockupTextDocument } from './helpers';
import { getPositionOfLineAndCharacter, findPrecedingToken } from '../src/service/utils';
import { assert } from 'chai';
import * as path from 'path';
import * as fs from 'fs';
import 'mocha';

describe('Compiler', () => {
    describe('Parser', () => {
        for (let filename of fs.readdirSync('tests/fixtures/parser')) {
            it(`should parse "${filename}" without errors`, () => {
                const sourceFile = mockupSourceFile('parser', filename);
                assert.lengthOf(sourceFile.parseDiagnostics, 0);
            });
        }

        for (let filename of fs.readdirSync('tests/fixtures/parser_recovery')) {
            it(`should parse "${filename}" with error recovery`, () => {
                const sourceFile = mockupSourceFile('parser_recovery', filename);
                assert.isAtLeast(sourceFile.parseDiagnostics.length, 1);
            });
        }
    });

    // describe('Binder', () => {
    //     it('', () => {
    //         const sourceFile = mockupSourceFile('type_checker', 'type1.galaxy');
    //         bindSourceFile(sourceFile);
    //     });
    // });

    describe('TypeChecker', () => {
        it('-', () => {
            const document = mockupTextDocument('type_checker', 'type1.galaxy');
            const store = mockupStore(document);
            const sourceFile = store.documents.get(document.uri);
            const checker = new TypeChecker(store);
            // const token = findPrecedingToken(getPositionOfLineAndCharacter(sourceFile, 8, 11), sourceFile);
            // console.log(checker.getSymbolAtLocation(token));
            checker.computeSymbolTargets(sourceFile);
        });
    });
});
