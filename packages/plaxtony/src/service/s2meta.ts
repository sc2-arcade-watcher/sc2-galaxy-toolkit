import * as gt from '../compiler/types';
import { getSourceFileOfNode } from '../compiler/utils';
import { Store } from './store';
import * as trig from '../sc2mod/trigger';
import * as cat from '../sc2mod/datacatalog';
import { SC2Workspace } from '../sc2mod/archive';
import * as lsp from 'vscode-languageserver';

const elementNotValidCharsRE = /[^a-zA-Z0-9_]+/g;
const elementValidCharsRE = /[a-zA-Z]+/g;
const quationMarkRE = /"/g;
const tildeRE = /~/g;

export class S2WorkspaceMetadata {
    protected workspace: SC2Workspace;
    protected symbolMap: Map<string, trig.Element> = new Map();
    protected presetValueParentMap: Map<string, trig.Preset> = new Map();

    public getElementSymbolName(el: trig.Element) {
        let parts: string[] = [];
        let elemName: string = '';

        if (el.name) {
            elemName = el.name;
        }
        else {
            const localizedName = this.workspace.locComponent.triggers.elementName('Name', el);
            if (localizedName) {
                elemName = localizedName.replace(elementNotValidCharsRE, '');
            }
        }

        if (el instanceof trig.FunctionDef && (el.flags & trig.ElementFlag.Native || el.flags & trig.ElementFlag.NoScriptPrefix)) {
            parts.push(elemName);
        }
        else if (
            (<trig.PresetValue>el).value && (
                (<trig.PresetValue>el).value.startsWith('c_') ||
                (<trig.PresetValue>el).value === 'null' ||
                (<trig.PresetValue>el).value === 'true' ||
                (<trig.PresetValue>el).value === 'false'
            )
        ) {
            parts.push((<trig.PresetValue>el).value);
        }
        else {
            if (el.libId) {
                parts.push('lib' + el.libId);
            }

            if (el instanceof trig.FunctionDef) {
                if (el.flags & trig.ElementFlag.Operator) parts.push('op');
                else parts.push('gf');
            }
            else if (el instanceof trig.Preset) {
                parts.push('ge');
            }

            if (parts.length) {
                parts.push(elemName);
            }
            else {
                parts.push(elemName.charAt(0).toLowerCase() + elemName.substr(1));
            }
        }

        return parts.join('_');
    }

    private mapContainer(container: trig.ElementContainer) {
        for (const el of container.getElements().values()) {
            if (el instanceof trig.FunctionDef) {
                if (el.flags & trig.ElementFlag.Template) continue;

                this.symbolMap.set(this.getElementSymbolName(el), el);
            }
            else if (el instanceof trig.Preset) {
                if (!(el.flags & trig.ElementFlag.PresetGenConstVar)) continue;
                if ((<trig.Preset>el).baseType === 'bool') continue;

                for (const presetRef of (<trig.Preset>el).values) {
                    const presetValue = presetRef.resolve();
                    this.presetValueParentMap.set(presetValue.link(), el);

                    if (el.flags & trig.ElementFlag.PresetCustom) {
                        if (presetValue.value.match(elementValidCharsRE)) {
                            this.symbolMap.set(presetValue.value, presetValue);
                        }
                    }
                    else {
                        const pname = this.getElementSymbolName(el) + '_' + presetValue.name;
                        this.symbolMap.set(pname, presetValue);
                    }
                }
            }
        }
    }

    public async build(lang: string) {
        this.workspace.locComponent.lang = lang;
        await this.workspace.trigComponent.sync();
        await this.workspace.locComponent.sync();
        await this.workspace.catalogComponent.sync();

        for (const lib of this.workspace.trigComponent.getStore().getLibraries().values()) {
            this.mapContainer(lib);
        }
        this.mapContainer(this.workspace.trigComponent.getStore());
    }

    constructor(workspace: SC2Workspace) {
        this.workspace = workspace;
    }

    public findElementByName(name: string) {
        return this.symbolMap.get(name);
    }

    public findPresetDef(presetValue: trig.PresetValue) {
        return this.presetValueParentMap.get(presetValue.link());
    }

    public getConstantNamesOfPreset(preset: trig.Preset) {
        let names: string[] = [];

        if (!(preset.flags & trig.ElementFlag.PresetGenConstVar)) return [];
        if (preset.baseType === 'bool') return [];

        for (const link of preset.values) {
            const presetValue = link.resolve();

            if (preset.flags & trig.ElementFlag.PresetCustom) {
                if (presetValue.value.match(elementValidCharsRE)) {
                    names.push(presetValue.value);
                }
            }
            else {
                names.push(this.getElementSymbolName(preset) + '_' + presetValue.name);
            }
        }

        return names;
    }

    public getElementDoc(el: trig.Element) {
        let name = '**' + this.workspace.locComponent.triggers.elementName('Name', el) + '**';

        if (el instanceof trig.FunctionDef) {
            const grammar = this.workspace.locComponent.triggers.elementName('Grammar', el);
            if (grammar) {
                name += ' (' + grammar.replace(tildeRE, '`') + ')';
            }
            const hint = this.workspace.locComponent.triggers.elementName('Hint', el);
            if (hint) {
                name += '\n\n' + hint.replace(quationMarkRE, '*');
            }
            return name;
        }
        else if (el instanceof trig.PresetValue) {
            const presetName = this.workspace.locComponent.triggers.elementName('Name', this.findPresetDef(el));
            return name + (presetName ? ' - ' + presetName : '');
        }
        else if (el instanceof trig.ParamDef) {
            let type: string;
            if ((<trig.ParamDef>el).type.type === 'gamelink') {
                type = '`gamelink<' + ((<trig.ParamDef>el).type.gameType || 'any') + '>`';
            }
            else if ((<trig.ParamDef>el).type.type === 'preset') {
                type = '' + this.workspace.locComponent.triggers.elementName('Name', (<trig.ParamDef>el).type.typeElement.resolve()) + '';
            }
            else {
                type = '`' + (<trig.ParamDef>el).type.type + '`';
            }
            return name + ' - ' + type + '';
        }
        else {
            return name;
        }
    }

    public getSymbolDoc(symbolName: string) {
        const el = this.findElementByName(symbolName);
        if (!el) return null;
        return this.getElementDoc(el);
    }

    public getFunctionArgumentsDoc(symbolName: string) {
        const el = <trig.FunctionDef>this.findElementByName(symbolName);

        if (!el) return null;

        const docs: string[] = [];

        if (el.flags & trig.ElementFlag.Event) {
            docs.push('**Trigger**');
        }

        for (const param of el.getParameters()) {
            docs.push(this.getElementDoc(param));
        }

        return docs;
    }

    public getElementTypeOfNode(node: gt.Node) {
        // if (node.kind !== gt.SyntaxKind.StringLiteral) return null;
        if (node.parent.kind !== gt.SyntaxKind.CallExpression) return null;
        const callExpr = <gt.CallExpression>node.parent;
        if (callExpr.expression.kind !== gt.SyntaxKind.Identifier) return null;
        const el = <trig.FunctionDef>this.findElementByName((<gt.Identifier>callExpr.expression).name);
        if (!el) return null;

        let index: number = null;
        if (node.kind === gt.SyntaxKind.CommaToken || node.kind === gt.SyntaxKind.OpenParenToken) {
            for (const [key, token] of callExpr.syntaxTokens.entries()) {
                index = key - 1;
                if (node.end < token.end) {
                    break;
                }
            }
        }
        else {
            for (const [key, arg] of callExpr.arguments.entries()) {
                if (arg === node) {
                    index = key;
                    break;
                }
            }
        }
        if (index === null) return null;

        if (el.flags & trig.ElementFlag.Event) {
            index--;
        }

        if (el.getParameters().length <= index || index < 0) return null;

        return el.getParameters()[index].type;
    }

    public getLinksForGameType(gameType: string) {
        const catalog = this.workspace.catalogComponent.getStore().catalogs.get(gameType);
        if (!catalog) return null;
        return <ReadonlyMap<string, cat.CatalogEntry>>catalog.entries;
    }

    public getGameLinkLocalizedName(gameType: string, gameLink: string, includePrefix: boolean = false) {
        const name = this.workspace.locComponent.strings.get('Game').text(`${gameType}/Name/${gameLink}`);
        const prefix = this.workspace.locComponent.strings.get('Object').text(`${gameType}/EditorPrefix/${gameLink}`);
        const sufix = this.workspace.locComponent.strings.get('Object').text(`${gameType}/EditorSuffix/${gameLink}`);
        return (prefix ? prefix + ' ' : '') + (name ? name : '') + (sufix ? ' ' + sufix : '');
    }

    public getGameLinkKind(gameType: string, gameLink: string) {
        return this.workspace.catalogComponent.getStore().catalogs.get(gameType).entries.get(gameLink).kind;
    }
}

export function getDocumentationOfSymbol(store: Store, symbol: gt.Symbol) {
    if (!store.s2metadata) return null;
    return store.s2metadata.getSymbolDoc(symbol.escapedName);
}
