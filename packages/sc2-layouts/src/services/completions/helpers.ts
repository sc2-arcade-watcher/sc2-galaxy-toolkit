import * as vs from 'vscode';
import { DescIndex } from '../../index/desc';
import { ExpressionParser } from '../../parser/expressions';
import { UINavigator, UIBuilder } from '../../index/hierarchy';
import { LayoutProcessor } from '../../index/processor';
import { LayoutChecker } from '../../index/checker';
import { XRay } from '../../index/xray';
import { Store } from '../../index/store';
import { ILoggerConsole } from '../provider';
import * as sch from '../../schema/base';
import { ExtConfigCompletionTabStopKind, ExtConfig } from '../../service';

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

    constructor(protected store: Store, protected console: ILoggerConsole, protected config: ExtConfig) {
        this.prepare();
    }

    protected snippetForElement(eDef: sch.ElementDef) {
        const insertText = new vs.SnippetString();
        insertText.appendText(`<${eDef.name}`);
        let i = 0;
        for (const atInfo of eDef.type.attributes.values()) {
            if (!atInfo.required && !atInfo.default) continue;

            if (atInfo.default) {
                insertText.value += ` ${atInfo.name}="\${${++i}:${atInfo.default.replace('$', '\\$')}}"`;
            }
            else if (atInfo.type.emap) {
                const choices = Array.from(atInfo.type.emap.values()).map(v => v.name);
                insertText.value += ` ${atInfo.name}="\${${++i}|${choices.join(',')}|}"`;
            }
            else {
                insertText.value += ` ${atInfo.name}="\$${++i}"`;
            }
        }
        if (!eDef.type.struct.size && eDef.nodeKind !== sch.ElementDefKind.Frame) {
            if (i === 1 && this.config.completion.tabStop === ExtConfigCompletionTabStopKind.Attr) {
                insertText.value = insertText.value.replace('$1', '$0');
            }
            insertText.value += '/>';
        }
        else {
            insertText.value += `>\$0</${eDef.name}>`;
        }
        return insertText;
    }
}
