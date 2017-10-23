import * as gt from '../compiler/types';
import { getSourceFileOfNode } from '../compiler/utils';
import { Store } from './store';
import * as trig from '../sc2mod/trigger';
import * as lsp from 'vscode-languageserver';

export function getDocumentationOfSymbol(store: Store, functionSymbol: gt.Symbol): string | undefined {
    const functionDeclaration = <gt.FunctionDeclaration>functionSymbol.declarations[0];
    let documentation: string = '';

    const s2archive = store.getArchiveOfSourceFile(getSourceFileOfNode(functionDeclaration));
    const elementDef = store.getSymbolMetadata(functionSymbol);
    if (!s2archive || !elementDef) {
        return undefined;
    }

    for (const prop of ['Name', 'Hint']) {
        const textKey = elementDef.textKey(prop);
        if (s2archive.trigStrings.has(textKey)) {
            if (documentation.length) {
                documentation += '\n\n';
            }
            if (prop === 'Name') {
                documentation += '### ' + s2archive.trigStrings.get(textKey);
            }
            else {
                documentation += s2archive.trigStrings.get(textKey);
            }
        }
    }

    return documentation;
}
