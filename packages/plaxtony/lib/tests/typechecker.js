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
require("mocha");
const fs = require("fs");
const path = require("path");
const chai_1 = require("chai");
const tc = require("../src/compiler/checker");
const checker_1 = require("../src/compiler/checker");
const helpers_1 = require("./helpers");
const utils_1 = require("../src/service/utils");
const binder_1 = require("../src/compiler/binder");
const vscode_uri_1 = require("vscode-uri");
function getSymbolAt(checker, sourceFile, line, character) {
    const token = utils_1.getTokenAtPosition(utils_1.getPositionOfLineAndCharacter(sourceFile, line, character), sourceFile);
    return checker.getSymbolAtLocation(token);
}
function getNodeTypeAt(checker, sourceFile, line, character) {
    const token = utils_1.findPrecedingToken(utils_1.getPositionOfLineAndCharacter(sourceFile, line, character), sourceFile);
    return checker.getTypeOfNode(token);
}
describe('Checker', () => {
    describe('Resolve', () => {
        const store = helpers_1.mockupStore();
        const checker = new checker_1.TypeChecker(store);
        context('typedef', () => {
            let type;
            let sourceFile;
            before(() => {
                const document = helpers_1.mockupTextDocument('type_checker', 'typedef.galaxy');
                store.updateDocument(document);
                sourceFile = store.documents.get(document.uri);
            });
            it('scalar', () => {
                type = getNodeTypeAt(checker, sourceFile, 11, 5);
                chai_1.assert.isOk(type.flags & 2097152 /* Typedef */);
                type = getNodeTypeAt(checker, sourceFile, 11, 12);
                chai_1.assert.isOk(type.flags & 32768 /* Complex */);
            });
            it('struct', () => {
                type = getNodeTypeAt(checker, sourceFile, 12, 6);
                chai_1.assert.isOk(type.flags & 2097152 /* Typedef */);
                type = getNodeTypeAt(checker, sourceFile, 12, 13);
                chai_1.assert.isOk(type.flags & 8192 /* Struct */);
            });
            it('struct deep', () => {
                type = getNodeTypeAt(checker, sourceFile, 13, 6);
                chai_1.assert.isOk(type.flags & 2097152 /* Typedef */);
                type = getNodeTypeAt(checker, sourceFile, 13, 18);
                chai_1.assert.isOk(type.flags & 8192 /* Struct */);
                chai_1.assert.equal(type.symbol.escapedName, 'obj_t');
            });
            it('struct deep property', () => {
                type = getNodeTypeAt(checker, sourceFile, 15, 15);
                chai_1.assert.isOk(type.flags & 4 /* Integer */);
            });
            it('funcref', () => {
                type = getNodeTypeAt(checker, sourceFile, 29, 6);
                chai_1.assert.isOk(type instanceof tc.ReferenceType);
                chai_1.assert.isOk(type.kind & 111 /* FuncrefKeyword */);
                chai_1.assert.isOk(type.declaredType.symbol.escapedName, 'fprototype');
            });
            it('code validation', () => {
                const diag = checker.checkSourceFile(sourceFile);
                chai_1.assert.equal(diag.length, 0);
            });
        });
        context('arrayref', () => {
            let type;
            let sourceFile;
            before(() => {
                const document = helpers_1.mockupTextDocument('type_checker', 'arrayref.galaxy');
                store.updateDocument(document);
                sourceFile = store.documents.get(document.uri);
            });
            it('ref []', () => {
                type = getNodeTypeAt(checker, sourceFile, 7, 5);
                chai_1.assert.isOk(type instanceof tc.ReferenceType);
                chai_1.assert.isOk(type.kind & 109 /* ArrayrefKeyword */);
                chai_1.assert.isOk(type.declaredType.flags & 65536 /* Array */);
                chai_1.assert.isOk(type.declaredType.elementType.flags & 2 /* String */);
            });
            it('ref [][]', () => {
                type = getNodeTypeAt(checker, sourceFile, 8, 5);
                chai_1.assert.isOk(type instanceof tc.ReferenceType);
                chai_1.assert.isOk(type.kind & 109 /* ArrayrefKeyword */);
                chai_1.assert.isOk(type.declaredType.flags & 65536 /* Array */);
                chai_1.assert.isOk(type.declaredType.elementType.flags & 65536 /* Array */);
            });
            it('typedef decl of [][]', () => {
                type = getNodeTypeAt(checker, sourceFile, 13, 2);
                chai_1.assert.isOk(type.flags & 2097152 /* Typedef */);
                chai_1.assert.isOk(type.referencedType.flags & 65536 /* Array */);
                chai_1.assert.isOk(type.referencedType.elementType.flags & 65536 /* Array */);
            });
            it('typedef var of [][]', () => {
                type = getNodeTypeAt(checker, sourceFile, 13, 11);
                chai_1.assert.isOk(type.flags & 65536 /* Array */);
            });
        });
        it('struct property', () => {
            let type;
            const document = helpers_1.mockupTextDocument('type_checker', 'struct.galaxy');
            store.updateDocument(document);
            const sourceFile = store.documents.get(document.uri);
            type = getNodeTypeAt(checker, sourceFile, 19, 21);
            chai_1.assert.isAbove(type.flags & 2 /* String */, 0, '.');
            type = getNodeTypeAt(checker, sourceFile, 20, 28);
            chai_1.assert.isAbove(type.flags & 4 /* Integer */, 0, '..');
            type = getNodeTypeAt(checker, sourceFile, 22, 27);
            chai_1.assert.isAbove(type.flags & 2 /* String */, 0, '[].');
            type = getNodeTypeAt(checker, sourceFile, 23, 37);
            chai_1.assert.isAbove(type.flags & 32768 /* Complex */, 0, '[].[].');
            chai_1.assert.equal(type.kind, 101 /* UnitKeyword */);
        });
        it('structref property', () => {
            let type;
            const document = helpers_1.mockupTextDocument('type_checker', 'ref.galaxy');
            store.updateDocument(document);
            const sourceFile = store.documents.get(document.uri);
            type = getNodeTypeAt(checker, sourceFile, 9, 12);
            chai_1.assert.isAbove(type.flags & 4 /* Integer */, 0);
        });
        it('funcref array', () => {
            let type;
            const document = helpers_1.mockupTextDocument('type_checker', 'funcref_arr.galaxy');
            store.updateDocument(document);
            const sourceFile = store.documents.get(document.uri);
            type = getNodeTypeAt(checker, sourceFile, 2, 31);
            chai_1.assert.isAbove(type.flags & 65536 /* Array */, 0);
            chai_1.assert.isAbove(type.elementType.flags & 262144 /* Reference */, 0);
        });
    });
    describe('Static', () => {
        const documentStatic1 = helpers_1.mockupTextDocument('type_checker', 'static_conflict1.galaxy');
        const documentStatic2 = helpers_1.mockupTextDocument('type_checker', 'static_conflict2.galaxy');
        const store = helpers_1.mockupStore(documentStatic1, documentStatic2);
        const sourceFileStatic1 = store.documents.get(documentStatic1.uri);
        const sourceFileStatic2 = store.documents.get(documentStatic2.uri);
        const checker = new checker_1.TypeChecker(store);
        it('name non-conflict', () => {
            chai_1.assert.equal(checker.checkSourceFile(sourceFileStatic1, true).length, 0);
            chai_1.assert.equal(checker.checkSourceFile(sourceFileStatic2, true).length, 0);
        });
    });
    describe('Resolve symbol', () => {
        const documentStruct = helpers_1.mockupTextDocument('type_checker', 'struct.galaxy');
        const documentRef = helpers_1.mockupTextDocument('type_checker', 'ref.galaxy');
        const store = helpers_1.mockupStore(documentStruct, documentRef);
        const sourceFileStruct = store.documents.get(documentStruct.uri);
        const sourceFileRef = store.documents.get(documentRef.uri);
        const checker = new checker_1.TypeChecker(store);
        it('variable', () => {
            let symbol;
            symbol = getSymbolAt(checker, sourceFileStruct, 14, 0);
            chai_1.assert.isDefined(symbol);
        });
        it('[]variable', () => {
            let symbol;
            symbol = getSymbolAt(checker, sourceFileStruct, 15, 0);
            chai_1.assert.isDefined(symbol);
        });
        it('structref', () => {
            let symbol;
            symbol = getSymbolAt(checker, sourceFileRef, 9, 11);
            chai_1.assert.isDefined(symbol);
            symbol = getSymbolAt(checker, sourceFileRef, 10, 11);
            chai_1.assert.isDefined(symbol);
        });
    });
    describe('Type', () => {
        function validateDocument(src) {
            const doc = helpers_1.mockupTextDocument('type_checker', 'diagnostics', src);
            const store = helpers_1.mockupStore(doc);
            const checker = new checker_1.TypeChecker(store);
            const sourceFile = store.documents.get(doc.uri);
            return checker.checkSourceFile(sourceFile);
        }
        it('numeric_assignment', () => {
            const diagnostics = validateDocument('numeric_assignment.galaxy');
            chai_1.assert.equal(diagnostics.length, 3);
            chai_1.assert.equal(diagnostics[0].messageText, 'Type \'1.0\' is not assignable to type \'integer\'');
            chai_1.assert.equal(diagnostics[1].messageText, 'Type \'fixed\' is not assignable to type \'integer\'');
            chai_1.assert.equal(diagnostics[2].messageText, 'Type \'fixed\' is not assignable to type \'byte\'');
        });
        it('numeric_comparison', () => {
            const diagnostics = validateDocument('numeric_comparison.galaxy');
            chai_1.assert.equal(diagnostics.length, 2);
            chai_1.assert.equal(diagnostics[0].messageText, 'Type \'null\' is not comparable to type \'integer\'');
            chai_1.assert.equal(diagnostics[1].messageText, 'Type \'""\' is not comparable to type \'integer\'');
        });
        it('string', () => {
            const diagnostics = validateDocument('string.galaxy');
            chai_1.assert.equal(diagnostics.length, 0);
        });
        it('bool', () => {
            const diagnostics = validateDocument('bool.galaxy');
            chai_1.assert.equal(diagnostics.length, 1);
            chai_1.assert.equal(diagnostics[0].messageText, 'Type \'1\' is not assignable to type \'bool\'');
        });
        it('bitwise', () => {
            const diagnostics = validateDocument('bitwise.galaxy');
            chai_1.assert.equal(diagnostics.length, 1);
            chai_1.assert.equal(diagnostics[0].messageText, 'Binary \'&\' operation not supported between \'integer\' type and \'false\' type');
        });
        it('complex', () => {
            const diagnostics = validateDocument('complex.galaxy');
            chai_1.assert.equal(diagnostics.length, 0);
        });
        it('loop', () => {
            const diagnostics = validateDocument('loop.galaxy');
            chai_1.assert.equal(diagnostics.length, 2);
            chai_1.assert.equal(diagnostics[0].messageText, 'break statement used outside of loop boundaries');
            chai_1.assert.equal(diagnostics[1].messageText, 'continue statement used outside of loop boundaries');
        });
        it('func_call', () => {
            const diagnostics = validateDocument('func_call.galaxy');
            chai_1.assert.equal(diagnostics.length, 3);
            chai_1.assert.equal(diagnostics[0].messageText, 'Type \'string\' is not assignable to type \'integer\'');
            chai_1.assert.equal(diagnostics[1].messageText, 'Type \'integer\' is not assignable to type \'string\'');
            chai_1.assert.equal(diagnostics[2].messageText, 'Type \'null\' is not assignable to type \'integer\'');
        });
        it('struct', () => {
            const diagnostics = validateDocument('struct.galaxy');
            chai_1.assert.equal(diagnostics.length, 5);
            chai_1.assert.equal(diagnostics[0].messageText, 'Can only pass basic types');
            chai_1.assert.equal(diagnostics[1].messageText, 'Type \'struct1_t\' is not assignable to type \'struct1_t\'');
            chai_1.assert.equal(diagnostics[2].messageText, 'Type \'struct2_t\' is not assignable to type \'struct1_t\'');
            chai_1.assert.equal(diagnostics[3].messageText, 'Type \'struct1_t\' is not assignable to type \'struct1_t\'');
            chai_1.assert.equal(diagnostics[4].messageText, 'Type \'struct2_t\' is not assignable to type \'structref<struct1_t>\'');
        });
        it('funcref', () => {
            const diagnostics = validateDocument('funcref.galaxy');
            chai_1.assert.equal(diagnostics.length, 3);
            chai_1.assert.equal(diagnostics[0].messageText, 'Type \'fn_prototype_c\' is not assignable to type \'funcref<fn_prototype_t>\'');
            chai_1.assert.equal(diagnostics[1].messageText, 'Expected 1 arguments, got 2');
            chai_1.assert.equal(diagnostics[2].messageText, 'Type \'void\' is not assignable to type \'integer\'');
        });
        it('array', () => {
            const diagnostics = validateDocument('array.galaxy');
            chai_1.assert.isAtLeast(diagnostics.length, 1);
            chai_1.assert.equal(diagnostics[0].messageText, 'Index access on non-array type');
        });
        it('typedef', () => {
            const diagnostics = validateDocument('../typedef.galaxy');
            chai_1.assert.equal(diagnostics.length, 0);
        });
        it('arrayref', () => {
            const diagnostics = validateDocument('../arrayref.galaxy');
            chai_1.assert.equal(diagnostics.length, 0);
        });
    });
    describe('Diagnostics', () => {
        function checkFile(filename) {
            const document = helpers_1.mockupTextDocument('type_checker', filename);
            const store = helpers_1.mockupStore(document);
            const sourceFile = store.documents.get(document.uri);
            const checker = new checker_1.TypeChecker(store);
            binder_1.unbindSourceFile(sourceFile, store);
            return checker.checkSourceFile(sourceFile, true);
        }
        describe('Error', () => {
            for (let filename of fs.readdirSync(path.resolve('tests/fixtures/type_checker/error'))) {
                it(filename, () => {
                    chai_1.assert.isAtLeast(checkFile(path.join('error', filename)).length, 1);
                });
            }
        });
        describe('Pass', () => {
            for (let filename of fs.readdirSync(path.resolve('tests/fixtures/type_checker/pass'))) {
                it(filename, () => {
                    chai_1.assert.equal(checkFile(path.join('pass', filename)).length, 0);
                });
            }
        });
    });
    describe('Diagnostics Recursive', () => {
        it('simple', () => __awaiter(this, void 0, void 0, function* () {
            const store = yield helpers_1.mockupStoreFromDirectory(path.resolve('tests/fixtures/type_checker/diagnostics_recursive/simple'));
            const checker = new checker_1.TypeChecker(store);
            const sourceFile = store.documents.get(vscode_uri_1.default.file(path.join(store.rootPath, 'MapScript.galaxy')).toString());
            const diagnostics = checker.checkSourceFileRecursively(sourceFile);
            chai_1.assert.isTrue(diagnostics.success);
        }));
    });
});
//# sourceMappingURL=typechecker.js.map