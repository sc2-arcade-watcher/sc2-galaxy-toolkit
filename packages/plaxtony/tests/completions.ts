import 'mocha';
import { assert } from 'chai';
import * as path from 'path';
import * as gt from '../src/compiler/types';
import { mockupStoreFromDirectory, fixtureFilePath, mapStoreFilesByBasename, mockupStoreDocument } from './helpers';
import { createProvider } from '../src/service/provider';
import { Store } from '../src/service/store';
import { CompletionsProvider, CompletionFunctionExpand } from '../src/service/completions';
import { getPositionOfLineAndCharacter } from '../src/service/utils';
import * as lsp from 'vscode-languageserver';

function completionsContains(completions: lsp.CompletionList, name: string) {
    for (const x of completions.items) {
        if (x.label === name) return true;
    }
    return false;
}

describe('Completions', () => {
    describe('Static', () => {
        let store: Store;
        let complProvider: CompletionsProvider;
        let docsMap: Map<string, gt.SourceFile>;

        before(async () => {
            store = await mockupStoreFromDirectory(fixtureFilePath('service', 'completion', 'static'));
            complProvider = createProvider(CompletionsProvider, store);
            docsMap = mapStoreFilesByBasename(store);
        });

        it('not proposed in other files', () => {
            const results = complProvider.getCompletionsAt(
                docsMap.get('non_static.galaxy').fileName,
                getPositionOfLineAndCharacter(docsMap.get('non_static.galaxy'), 4, 0)
            );
            assert.isFalse(completionsContains(results, 'static_a_var'));
            assert.isFalse(completionsContains(results, 'static_a_func'));
            assert.isFalse(completionsContains(results, 'static_b_var'));
            assert.isFalse(completionsContains(results, 'static_b_func'));
        })

        it('aware about own A', () => {
            const results = complProvider.getCompletionsAt(
                docsMap.get('static_a.galaxy').fileName,
                getPositionOfLineAndCharacter(docsMap.get('static_a.galaxy'), 4, 0)
            );
            assert.isTrue(completionsContains(results, 'static_a_var'));
            assert.isTrue(completionsContains(results, 'static_a_func'));
            assert.isFalse(completionsContains(results, 'static_b_var'));
            assert.isFalse(completionsContains(results, 'static_b_func'));
            assert.isTrue(completionsContains(results, 'non_static_var'));
        })

        it('aware about own B', () => {
            const results = complProvider.getCompletionsAt(
                docsMap.get('static_b.galaxy').fileName,
                getPositionOfLineAndCharacter(docsMap.get('static_b.galaxy'), 4, 0)
            );
            assert.isTrue(completionsContains(results, 'static_b_var'));
            assert.isTrue(completionsContains(results, 'static_b_func'));
            assert.isFalse(completionsContains(results, 'static_a_var'));
            assert.isFalse(completionsContains(results, 'static_a_func'));
            assert.isTrue(completionsContains(results, 'non_static_var'));
        })
    });

    it('incomplete variable declaration', function () {
        const [store, sourceFile] = mockupStoreDocument('service', 'completion', 'incomplete_variable_decl.galaxy');
        const complProvider = createProvider(CompletionsProvider, store);

        const results = complProvider.getCompletionsAt(
            sourceFile.fileName,
            getPositionOfLineAndCharacter(sourceFile, 1, 11)
        );

        assert.lengthOf(results.items, 1);
        assert.isTrue(completionsContains(results, 'MAX_PLAYERS'));
    });
});
