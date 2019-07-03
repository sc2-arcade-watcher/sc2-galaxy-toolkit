import * as vs from 'vscode';
import { XMLElement } from '../types';
import { DescKind, DescIndex } from '../index/desc';
import { ExpressionParser } from '../parser/expressions';
import { UINavigator, UIBuilder, UINode } from '../index/hierarchy';
import { LayoutProcessor } from '../index/processor';
import { LayoutChecker } from '../index/checker';
import { XRay } from '../index/xray';
import { Store } from '../index/store';
import { ILoggerConsole } from './provider';
import { descKindToCompletionKind } from './completions';
import { getSelectionIndexAtPosition } from '../parser/utils';

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

    constructor(protected store: Store, protected console: ILoggerConsole) {
        this.prepare();
    }
}

export interface AbbrComplContext {
    vDoc: vs.TextDocument;
    xEl: XMLElement;
    abbrvRange: vs.Range;
    curPosition: vs.Position;
}

export const reAbbrvWord = /(-?\d*\.\d\w*)|([^\`\~\!\@\%\^\&\*\(\)\+\[\{\]\}\\\'\"\<\>\?\s]+)/g;

export class CodeAbbreviations extends SuggestionsProvider {
    protected provideFrameTypes(ctx: AbbrComplContext) {
        const cList = new vs.CompletionList();

        for (const sFrameType of this.store.schema.frameTypes.values()) {
            let tmpCI: vs.CompletionItem;
            tmpCI = {
                kind: vs.CompletionItemKind.Struct,
                label: `${sFrameType.name}`,
                insertText: new vs.SnippetString(`<Frame type="${sFrameType.name}" name="\${1:${sFrameType.name}}">\$0</Frame>`),
                range: ctx.abbrvRange,
                detail: (sFrameType.blizzOnly ? '[BLZ] ' : '') + (sFrameType.complexType.label ? sFrameType.complexType.label : ''),
                documentation: new vs.MarkdownString(sFrameType.complexType.documentation ? sFrameType.complexType.documentation : ''),
            };
            (<vs.MarkdownString>tmpCI.documentation).appendCodeblock(
                (<vs.SnippetString>tmpCI.insertText).value.replace('$0', '\n'),
                'xml'
            );
            tmpCI.filterText = `:${tmpCI.label}`;
            cList.items.push(tmpCI);
        }

        return cList;
    }

    protected provideDescOverrides(ctx: AbbrComplContext) {
        const cList = new vs.CompletionList();

        const phrase = ctx.vDoc.getText(ctx.abbrvRange);
        const relativeOffset = ctx.vDoc.offsetAt(ctx.curPosition) - ctx.vDoc.offsetAt(ctx.abbrvRange.start) - 1;
        const pathSel = this.exParser.parsePathSelector(phrase.substr(1));

        let pathIndex = getSelectionIndexAtPosition(pathSel, relativeOffset);
        if (pathIndex === void 0) {
            if (pathSel.path.length > 0) {
                pathIndex = pathSel.path.length;
            }
            else {
                pathIndex = 0;
            }
        }

        const topDesc = this.store.index.rootNs.getMulti(...pathSel.path.slice(0, Math.min(pathIndex, 2)).map(v => v.name.name));

        if (!topDesc) return;

        if (pathIndex >= 2) {
            const uNode = this.uBuilder.buildNodeFromDesc(topDesc);
            if (!uNode) return;

            let uTargetNode = uNode;
            if (pathIndex >= 3) {
                const resolvedSel = this.uNavigator.resolveSelection(uNode, pathSel.path.slice(2));
                uTargetNode = resolvedSel.chain[pathIndex - 3];
            }

            if (!uTargetNode) return;

            if (pathIndex === pathSel.path.length || pathSel.path[pathSel.path.length - 1].pos === pathSel.path[pathSel.path.length - 1].end) {
                const xTargetEl = <XMLElement>Array.from(uTargetNode.mainDesc.xDecls.values())[0];
                let rawTagName = xTargetEl.sdef.name;
                let rawAttrType = uTargetNode.mainDesc.kind === DescKind.Frame ? ` type="${xTargetEl.stype.name}"` : '';
                const insertText = `<${rawTagName}${rawAttrType} name="${pathSel.path.slice(1, pathIndex).map(v => v.name.name).join('/')}" file="${pathSel.path[0].name.name}">\$0</${rawTagName}>`;
                cList.items.push({
                    kind: vs.CompletionItemKind.Method,
                    label: `${uTargetNode.name}# [expand]`,
                    filterText: phrase,
                    sortText: phrase,
                    insertText: new vs.SnippetString(insertText),
                    detail: `${uTargetNode.name}[${(<XMLElement>Array.from(uTargetNode.mainDesc.xDecls)[0]).sdef.name}]`,
                    documentation: new vs.MarkdownString('```xml\n' + insertText.replace('$0', '\n') + '\n```'),
                    range: ctx.abbrvRange,
                    preselect: true,
                    // commitCharacters: ['#'],
                });
                cList.isIncomplete = true;
            }
            if (pathIndex !== pathSel.path.length) {
                for (const childName of uTargetNode.children.keys()) {
                    const uChild = this.uNavigator.resolveChild(uTargetNode, childName);
                    cList.items.push({
                        kind: descKindToCompletionKind(uChild.mainDesc.kind),
                        label: uChild.name,
                        detail: `${uChild.mainDesc.stype.name} (${uChild.children.size})`,
                        commitCharacters: ['/'],
                    });
                }
            }
        }
        else {
            for (const dChild of topDesc.children.values()) {
                cList.items.push({
                    kind: descKindToCompletionKind(dChild.kind),
                    label: dChild.name,
                    detail: `${dChild.stype.name} (${dChild.children.size})`,
                    commitCharacters: ['/'],
                });
            }
        }

        return cList;
    }

    protected provideChildrenNodes(ctx: AbbrComplContext, uNode: UINode) {
        const cList = new vs.CompletionList();

        outer: for (const uChildNode of uNode.children.values()) {
            const dscList = Array.from(uChildNode.descs);
            const mIndex = dscList.findIndex((value) => {
                if (value.xDecls.has(ctx.xEl) && uChildNode.descs.size > 1) return false;
                if (value.parent !== uNode.mainDesc) return false;
                return true;
            });
            if (mIndex !== -1) continue;

            let tmpCI: vs.CompletionItem;
            switch (uChildNode.mainDesc.kind) {
                case DescKind.Frame:
                {
                    const sFrameType = this.store.schema.getFrameType(uChildNode.mainDesc.stype);
                    tmpCI = {
                        label: `${uChildNode.name}[${sFrameType.name}]`,
                        insertText: new vs.SnippetString(`<Frame type="${sFrameType.name}" name="${uChildNode.name}">\$0</Frame>`),
                    };
                    break;
                }

                case DescKind.Animation:
                {
                    tmpCI = {
                        label: `${uChildNode.name}[Animation]`,
                        insertText: new vs.SnippetString(`<Animation name="${uChildNode.name}">\$0</Animation>`),
                    };
                    break;
                }

                case DescKind.StateGroup:
                {
                    tmpCI = {
                        label: `${uChildNode.name}[StateGroup]`,
                        insertText: new vs.SnippetString(`<StateGroup name="${uChildNode.name}">\$0</StateGroup>`),
                    };
                    break;
                }

                default:
                {
                    continue outer;
                }
            }

            tmpCI.kind = descKindToCompletionKind(uChildNode.mainDesc.kind);
            tmpCI.range = ctx.abbrvRange;
            tmpCI.filterText = `.${tmpCI.label}`;
            tmpCI.detail = uChildNode.fqn;
            tmpCI.documentation = new vs.MarkdownString('```xml\n' + (<vs.SnippetString>tmpCI.insertText).value.replace('$0', '\n') + '\n```');
            cList.items.push(tmpCI);
        }

        return cList;
    }

    processAbbrv(ctx: AbbrComplContext) {
        const phraseValue = ctx.vDoc.getText(ctx.abbrvRange);
        const m = phraseValue.match(/^(:|\/|\.)([^\s]*)/i);
        if (!m) return;

        const currentDesc = this.store.index.resolveElementDesc(ctx.xEl);

        switch (m[1]) {
            case ':':
            {
                if (currentDesc.kind !== DescKind.Frame && currentDesc.kind !== DescKind.File) break;

                return this.provideFrameTypes(ctx);
            }

            case '/':
            {
                if (currentDesc.kind !== DescKind.File) break;

                return this.provideDescOverrides(ctx);
            }

            case '.':
            {
                if (currentDesc.kind !== DescKind.Frame) break;

                const uNode = this.xray.determineCurrentFrameNode(ctx.xEl);
                if (!uNode) break;

                return this.provideChildrenNodes(ctx, uNode);
            }
        }
    }
}
