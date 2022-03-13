import * as gt from '../compiler/types';
import { getSourceFileOfNode } from '../compiler/utils';
import { Store } from './store';
import * as trig from '../sc2mod/trigger';
import * as cat from '../sc2mod/datacatalog';
import * as dtypes from '../sc2mod/dtypes';
import { SC2Workspace } from '../sc2mod/archive';
import { getLineAndCharacterOfPosition } from './utils';
import { logIt, logger } from '../common';
import { MetadataConfig } from './server';

const elementNotValidCharsRE = /[^a-zA-Z0-9_]+/g;
const elementValidCharsRE = /^[a-z][a-z0-9_]*$/i;
const quationMarkRE = /"/g;
const tildeRE = /~/g;

export class S2WorkspaceMetadata {
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
                switch (el.constructor) {
                    case trig.FunctionDef:
                    case trig.Preset:
                    {
                        parts.push('lib' + el.libId);
                        break;
                    }
                }
            }

            if (el instanceof trig.FunctionDef) {
                if (el.flags & trig.ElementFlag.Operator) parts.push('op');
                else parts.push('gf');
            }
            else if (el instanceof trig.Preset) {
                parts.push('ge');
            }

            if (parts.length || el.constructor === trig.PresetValue) {
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
                if (!(el.flags & trig.ElementFlag.PresetGenConstVar) && !(el.flags & trig.ElementFlag.PresetCustom)) continue;
                if ((<trig.Preset>el).baseType === 'bool') continue;

                for (const presetRef of (<trig.Preset>el).values) {
                    const presetValue = presetRef.resolve();
                    this.presetValueParentMap.set(presetValue.link(), el);
                    const pname = this.getNameOfPresetValue(el, presetValue);

                    if (!pname || pname === 'null' || !pname.match(elementValidCharsRE)) {
                        continue;
                    }

                    if (this.symbolMap.has(pname)) {
                        // logger.warn(
                        //     `Already exists: "${pname}"`,
                        //     [el.name, presetValue.name, presetValue.value],
                        //     [this.symbolMap.get(pname)]
                        // );
                        continue;
                    }

                    this.symbolMap.set(pname, presetValue);
                }
            }
        }
    }

    @logIt()
    public async build() {
        this.workspace.locComponent.lang = this.metadataCfg.localization;
        this.workspace.metadataArchives = this.workspace.allArchives.filter(item => {
            switch (this.metadataCfg.loadLevel) {
                case 'Default':
                {
                    return true;
                }

                case 'Builtin':
                {
                    return item.isBuiltin;
                }

                case 'Core':
                {
                    return item.name === 'mods/core.sc2mod';
                }

                case 'None':
                default:
                {
                    return false;
                }
            }
        });
        logger.info('metadata archives', ...this.workspace.metadataArchives.map(item => item.name));
        await this.workspace.loadComponents();

        for (const lib of this.workspace.trigComponent.getStore().getLibraries().values()) {
            this.mapContainer(lib);
        }
        this.mapContainer(this.workspace.trigComponent.getStore());
    }

    constructor(protected workspace: SC2Workspace, protected metadataCfg: MetadataConfig) {
    }

    public findElementByName(name: string) {
        return this.symbolMap.get(name);
    }

    public findPresetDef(presetValue: trig.PresetValue) {
        return this.presetValueParentMap.get(presetValue.link());
    }

    public getNameOfPresetValue(preset: trig.Preset, presetValue: trig.PresetValue) {
        if (preset.baseType === 'bool') return;

        if (preset.flags & trig.ElementFlag.PresetCustom) {
            return presetValue.value;
        }
        else {
            return this.getElementSymbolName(preset) + '_' + this.getElementSymbolName(presetValue);
        }
    }

    public getConstantNamesOfPreset(preset: trig.Preset) {
        let names: string[] = [];

        for (const link of preset.values) {
            const presetValue = link.resolve();
            const tmp = this.getNameOfPresetValue(preset, presetValue);
            if (tmp) {
                names.push(tmp);
            }
        }

        return names;
    }

    public getParameterTypeDoc(el: trig.ParameterType) {
        let typeName: string;
        let type: string;
        if (el.type === 'gamelink') {
            type = `${el.type}<${(el.gameType || 'any')}>`;
        }
        else if (el.type === 'preset') {
            typeName = this.workspace.locComponent.triggers.elementName('Name', el.typeElement.resolve());
            type = `Preset<${this.getElementSymbolName(el.typeElement.resolve())}>`;
        }
        else {
            type = el.type;
        }
        return { typeName, type};
    }

    public getParamDoc(el: trig.ParamDef) {
        const name = this.workspace.locComponent.triggers.elementName('Name', el);
        const type = this.getParameterTypeDoc(el.type).type;
        return { name, type };
    }

    public getElementDoc(el: trig.Element, extended: boolean) {
        let name = '**' + this.workspace.locComponent.triggers.elementName('Name', el) + '**';

        if (el instanceof trig.FunctionDef) {
            if (extended) {
                const grammar = this.workspace.locComponent.triggers.elementName('Grammar', el);
                if (grammar) {
                    name += ' (' + grammar.replace(tildeRE, '`') + ')';
                }
            }
            if (el.flags & trig.ElementFlag.Restricted) {
                name += '\n\n__Blizzard only__';
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

    public getSymbolDoc(symbolName: string, extended: boolean = true) {
        const el = this.findElementByName(symbolName);
        if (!el) return null;
        return this.getElementDoc(el, extended);
    }

    public getFunctionArgumentsDoc(symbolName: string) {
        const el = <trig.FunctionDef>this.findElementByName(symbolName);

        if (!el) return null;

        const docs: string[] = [];

        if (el.flags & trig.ElementFlag.Event) {
            docs.push('**Trigger**');
        }

        for (const param of el.getParameters()) {
            docs.push(this.getElementDoc(param, false));
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

    public getGameLinkItem(gameType: string, id?: string) {
        const family = (dtypes as any).S2DataCatalogDomain[gameType];
        let results = Array
            .from(this.workspace.catalogComponent.getStore().findEntry(family))
            .map(x => Array.from(x))
            .flat()
        ;
        if (id) {
            results = results.filter(x => x.id === id);
        }
        return new Set(results);
    }

    public getGameLinkDetails(entity: cat.CatalogDeclaration) {
        return this.workspace.resolvePath(entity.uri);
    }

    public getGameLinkLocalizedName(gameType: string, gameLink: string, includePrefix: boolean = false) {
        const name = (
            this.workspace.locComponent.strings.get('Game').text(`${gameType}/Name/${gameLink}`) ??
            this.workspace.locComponent.strings.get('Object').text(`${gameType}/Name/${gameLink}`)
        );
        if (!includePrefix) {
            return name;
        }
        if (!name) {
            return undefined;
        }
        const prefix = this.workspace.locComponent.strings.get('Object').text(`${gameType}/EditorPrefix/${gameLink}`);
        const suffix = this.workspace.locComponent.strings.get('Object').text(`${gameType}/EditorSuffix/${gameLink}`);
        return (prefix ? prefix + ' ' : '') + (name ?? gameLink) + (suffix ? ' ' + suffix : '');
    }
}

export function getDocumentationOfSymbol(store: Store, symbol: gt.Symbol, extended: boolean = true) {
    if (store.s2metadata) {
        const r = store.s2metadata.getSymbolDoc(symbol.escapedName, extended);
        if (r) return r;
    }

    for (const decl of symbol.declarations) {
        const sourceFile = getSourceFileOfNode(decl);
        const linesTxt: string[] = [];
        let currLine = decl.line;

        if (!sourceFile.commentsLineMap.has(currLine)) {
            --currLine;
        }
        while (currLine > 0 && sourceFile.commentsLineMap.has(currLine)) {
            const ctoken = sourceFile.commentsLineMap.get(currLine);
            const cpos = getLineAndCharacterOfPosition(sourceFile, ctoken.pos);
            if (ctoken.line !== decl.line && cpos.character > 0) break;
            linesTxt.push(sourceFile.text.substring(ctoken.pos + 2, ctoken.end));
            --currLine;
        }
        if (linesTxt.length) {
            return linesTxt.reverse().map((line) => line.replace(/^ /, '')).join('  \n');
        }
    }

    return null;
}
