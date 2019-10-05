import * as lsp from 'vscode-languageserver';
import { DescIndex } from '../../../index/desc';
import { ExpressionParser } from '../../../parser/expressions';
import { UINavigator, UIBuilder } from '../../../index/hierarchy';
import { LayoutProcessor } from '../../../index/processor';
import { LayoutChecker } from '../../../index/checker';
import { XRay } from '../../../index/xray';
import { Store } from '../../../index/store';
import * as sch from '../../../schema/base';
import { ExtConfigCompletionTabStopKind, S2LConfig } from '../../config';

export function createMarkdownString(s: string = ''): lsp.MarkupContent {
    return {
        kind: 'markdown',
        value: s,
    };
}

export class SuggestionsProvider {
    protected exParser = new ExpressionParser();
    protected uNavigator: UINavigator;
    protected uBuilder: UIBuilder;
    protected processor: LayoutProcessor;
    protected checker: LayoutChecker;
    protected dIndex: DescIndex;
    protected xray: XRay;

    protected prepare() {
        this.uNavigator = new UINavigator(this.store.schema, this.store.index);
        this.uBuilder = new UIBuilder(this.store.schema, this.store.index);
        this.processor = new LayoutProcessor(this.store, this.store.index);
        this.checker = new LayoutChecker(this.store, this.store.index);
        this.dIndex = this.store.index;
        this.xray = new XRay(this.store);
    }

    constructor(protected store: Store, protected config: S2LConfig) {
        this.prepare();
    }

    protected snippetForElement(eDef: sch.ElementDef) {
        const insertText: string[] = [];
        insertText.push(`<${eDef.name}`);
        let i = 0;
        for (const atInfo of eDef.type.attributes.values()) {
            if (!atInfo.required && !atInfo.default) continue;

            if (atInfo.default) {
                insertText.push(` ${atInfo.name}="\${${++i}:${atInfo.default.replace('$', '\\$')}}"`);
            }
            else if (atInfo.type.emap) {
                const choices = Array.from(atInfo.type.emap.values()).map(v => v.name);
                insertText.push(` ${atInfo.name}="\${${++i}|${choices.join(',')}|}"`);
            }
            else {
                insertText.push(` ${atInfo.name}="\$${++i}"`);
            }
        }
        if (!eDef.type.struct.size && eDef.nodeKind !== sch.ElementDefKind.Frame) {
            if (i === 1 && this.config.completion.tabStop === ExtConfigCompletionTabStopKind.Attr) {
                insertText[insertText.length - 1] = insertText[insertText.length - 1].replace('$1', '$0');
            }
            insertText.push('/>');
        }
        else {
            insertText.push(`>\$0</${eDef.name}>`);
        }
        return insertText.join('');
    }
}
