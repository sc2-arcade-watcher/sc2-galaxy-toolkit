import * as gt from '../compiler/types';
import { getSourceFileOfNode } from '../compiler/utils';
import { Store } from './store';
import * as trig from '../sc2mod/trigger';
import { SC2Archive } from '../sc2mod/archive';
import * as lsp from 'vscode-languageserver';

function getLocalizedName(key: string, element: trig.Element, s2archive: SC2Archive) {
    return s2archive.trigStrings.get(element.textKey(key));
}

export function getDocumentationOfSymbol(store: Store, symbol: gt.Symbol): string | undefined {
    const functionDeclaration = <gt.FunctionDeclaration>symbol.declarations[0];
    let documentation: string = '';

    const s2archive = store.getArchiveOfSourceFile(getSourceFileOfNode(functionDeclaration));
    const elementDef = store.getSymbolMetadata(symbol);
    if (!s2archive || !elementDef) {
        return undefined;
    }

    let tmp: string;
    if (elementDef instanceof trig.FunctionDef) {
        tmp = getLocalizedName('Name', elementDef, s2archive);
        if (tmp) {
            documentation += '### ' + tmp + '\n';
        }

        tmp = getLocalizedName('Hint', elementDef, s2archive);
        if (tmp) {
            documentation += tmp + '\n';
        }
    }
    else if (elementDef instanceof trig.PresetValue) {
        const preset = s2archive.trigLibs.findPresetByValue(elementDef)

        tmp = getLocalizedName('Name', elementDef, s2archive);
        if (tmp) {
            documentation += '**' + tmp + '**\n\n';
        }

        tmp = getLocalizedName('Name', preset, s2archive);
        if (tmp) {
            documentation += 'Preset of **' + tmp + '**\n';
        }
    }

    return documentation.trim();
}
