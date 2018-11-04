import * as util from 'util';
import * as vs from 'vscode';
import * as sch from '../schema/base';
import { AbstractProvider, svcRequest, ILoggerConsole } from './provider';
import { ServiceContext } from '../service';
import { createScanner, CharacterCodes } from '../parser/scanner';
import { TokenType, ScannerState, XMLElement, AttrValueKind } from '../types';
import { DescIndex, DescNamespace, DescKind } from '../index/desc';
import * as s2 from '../index/s2mod';
import { Store } from '../index/store';
import { ExpressionParser, SelHandleKind, SelectorFragment, PathSelector } from '../parser/expressions';
import { UINavigator, UIBuilder } from '../index/hierarchy';
import { getSelectionIndexAtPosition, getAttrValueKind } from '../parser/utils';
import { LayoutProcessor } from '../index/processor';

function completionsForSimpleType(smType: sch.SimpleType) {
    let items = <vs.CompletionItem[]> [];

    if (smType.union) {
        for (const unSmType of smType.union) {
            items = items.concat(completionsForSimpleType(unSmType));
        }
    }

    if (smType.evalues) {
        for (const e of smType.emap.values()) {
            const tc = <vs.CompletionItem>{
                label: e.name,
                kind: vs.CompletionItemKind.EnumMember,
                detail: `[${smType.name}]` + (e.label ? ` ${e.label}` : ''),
            };
            items.push(tc);
        }
    }

    return items;
}

function descKindToCompletionKind(dkind: DescKind) {
    switch (dkind) {
        case DescKind.Root:
        case DescKind.File:
            return vs.CompletionItemKind.Module;
        case DescKind.Frame:
            return vs.CompletionItemKind.Struct;
        case DescKind.Animation:
            return vs.CompletionItemKind.Event;
        case DescKind.StateGroup:
            return vs.CompletionItemKind.Class;
    }
    return vs.CompletionItemKind.Folder;
}

interface ComplContext {
    citems: vs.CompletionItem[];
    node: XMLElement;
    offset: number;
    xtokenText: string;
    xtoken: TokenType;
    xstate: ScannerState;
}

interface AtComplContext extends ComplContext {
    attrName: string;
}

interface AtValComplContext extends AtComplContext {
    attrValue: string;
    atOffsetRelative: number;
}

class SuggestionsProvider {
    protected exParser = new ExpressionParser();
    protected uNavigator: UINavigator;
    protected uBuilder: UIBuilder;
    protected processor: LayoutProcessor;
    protected dIndex: DescIndex;

    protected prepare() {
        this.uNavigator = new UINavigator(this.store.schema, this.store.index);
        this.uBuilder = new UIBuilder(this.store.schema, this.store.index);
        this.processor = new LayoutProcessor(this.store, this.store.index);
        this.dIndex = this.store.index;
    }

    constructor(protected store: Store, protected console: ILoggerConsole) {
        this.prepare();
    }
}

// ====

class AttrValueProvider extends SuggestionsProvider {
    protected suggestPropNames(ctx: AtComplContext) {
        for (const props of this.store.schema.frameClassProps.values()) {
            ctx.citems.push({
                kind: vs.CompletionItemKind.Property,
                label: props[0].name,
                detail: `[${props[0].fclass.name}] ${props[0].etype.type.name}`,
                documentation: props[0].etype.label,
            });
        }
    }

    protected suggestPropertyBind(ctx: AtValComplContext, currentDesc: DescNamespace) {
        const pbindSel = this.exParser.parsePropertyBind(ctx.attrValue);

        if (pbindSel.path.pos <= ctx.atOffsetRelative && pbindSel.path.end >= ctx.atOffsetRelative) {
            this.suggestSelection(ctx, <any>pbindSel, sch.BuiltinTypeKind.FrameReference, currentDesc);
        }
        else {
            this.suggestPropNames(ctx);
        }
    }

    protected suggestSelection(ctx: AtValComplContext, pathSel: PathSelector, smType: sch.BuiltinTypeKind, currentDesc: DescNamespace) {
        let pathIndex = getSelectionIndexAtPosition(pathSel, ctx.atOffsetRelative);

        switch (smType) {
            case sch.BuiltinTypeKind.FileDescName:
            case sch.BuiltinTypeKind.DescTemplateName:
            {
                if (pathIndex === void 0) pathIndex = 0;
                if (smType === sch.BuiltinTypeKind.FileDescName && pathIndex > 0) break

                const fragments = pathSel.path.map(item => item.name.name).slice(0, pathIndex);

                for (const item of this.dIndex.rootNs.getMulti(...fragments).children.values()) {
                    const compl = <vs.CompletionItem>{
                        kind: descKindToCompletionKind(item.kind),
                        label: `${item.name}`,
                        detail: item.stype.name,
                    };
                    ctx.citems.push(compl);
                }
                break;
            }

            case sch.BuiltinTypeKind.FrameName:
            {
                if (!currentDesc.file) break;
                const fileDesc = this.dIndex.rootNs.get(currentDesc.file);
                if (!fileDesc) break;

                if (pathIndex === void 0 || pathIndex === 0) {
                    for (const item of fileDesc.children.values()) {
                        ctx.citems.push(<vs.CompletionItem>{
                            kind: descKindToCompletionKind(item.kind),
                            label: `${item.name}`,
                            detail: item.stype.name,
                        });
                    }
                    break;
                }

                const topDesc = fileDesc.get(pathSel.path[0].name.name);
                if (!topDesc) break;
                const fragments = pathSel.path.map(item => item).slice(1);

                const uNode = this.uBuilder.buildNodeFromDesc(topDesc);
                let uTargetNode = uNode;
                if (pathIndex !== void 0 && pathIndex > 1) {
                    const resolvedSel = this.uNavigator.resolveSelection(uNode, fragments);
                    if (resolvedSel.chain.length <= pathIndex - 2) break;
                    uTargetNode = resolvedSel.chain[pathIndex - 2];
                }

                for (const item of uTargetNode.children.values()) {
                    const mDesc = item.mainDesc;
                    if (mDesc.kind !== DescKind.Frame) continue;
                    const compl = <vs.CompletionItem>{
                        kind: descKindToCompletionKind(mDesc.kind),
                        label: `${item.name}`,
                        detail: mDesc.stype.name,
                    };
                    ctx.citems.push(compl);
                }
                break;
            }

            case sch.BuiltinTypeKind.FrameReference:
            {
                switch (currentDesc.kind) {
                    case DescKind.Frame:
                        break;
                    default:
                        // TODO:
                        return;
                }

                const uNode = this.uBuilder.buildNodeFromDesc(currentDesc);
                let uTargetNode = uNode;
                if (pathIndex !== void 0 && pathIndex > 0) {
                    const resolvedSel = this.uNavigator.resolveSelection(uNode, pathSel.path);
                    if (resolvedSel.chain.length <= pathIndex - 1) break;
                    uTargetNode = resolvedSel.chain[pathIndex - 1];
                }

                let selFrag: SelectorFragment;
                if (pathIndex !== void 0) {
                    selFrag = pathSel.path[pathIndex];
                    if (
                        (selFrag.selKind === SelHandleKind.Ancestor && selFrag.parameter) &&
                        (selFrag.parameter.pos <= ctx.atOffsetRelative && selFrag.parameter.end >= ctx.atOffsetRelative)
                    ) {
                        if (selFrag.parameter.key && selFrag.parameter.key.pos <= ctx.atOffsetRelative && selFrag.parameter.key.end >= ctx.atOffsetRelative) {
                            ctx.citems.push({kind: vs.CompletionItemKind.Operator, label: 'type',});
                            ctx.citems.push({kind: vs.CompletionItemKind.Operator, label: 'oftype',});
                            ctx.citems.push({kind: vs.CompletionItemKind.Operator, label: 'name',});
                        }
                        else if (selFrag.parameter.value && selFrag.parameter.value.pos <= ctx.atOffsetRelative && selFrag.parameter.value.end >= ctx.atOffsetRelative) {
                            switch (selFrag.parameter.key.name) {
                                case 'oftype':
                                case 'type':
                                {
                                    for (const tmp of this.store.schema.frameTypes.values()) {
                                        ctx.citems.push({
                                            kind: vs.CompletionItemKind.EnumMember,
                                            label: tmp.name,
                                            detail: Array.from(tmp.fclasses.values()).map(fc => `${fc.name}`).join(' :: '),
                                        });
                                    }
                                    break;
                                }

                                case 'name':
                                {
                                    let cparent = uTargetNode;
                                    while (cparent = cparent.parent) {
                                        if (cparent.mainDesc.kind !== DescKind.Frame) break;
                                        ctx.citems.push({
                                            kind: descKindToCompletionKind(cparent.mainDesc.kind),
                                            label: `${cparent.name}`,
                                            detail: `[${cparent.mainDesc.stype.name}]\n${cparent.mainDesc.fqn}`,
                                        });
                                    }
                                    break;
                                }
                            }
                        }
                        break;
                    }
                }

                for (const item of uTargetNode.children.values()) {
                    const mDesc = item.mainDesc;
                    if (mDesc.kind !== DescKind.Frame) continue;
                    const compl = <vs.CompletionItem>{
                        kind: descKindToCompletionKind(mDesc.kind),
                        label: `${item.name}`,
                        detail: mDesc.stype.name,
                    };
                    ctx.citems.push(compl);
                }

                ctx.citems.push({kind: vs.CompletionItemKind.Keyword, label: '$parent'});
                ctx.citems.push({kind: vs.CompletionItemKind.Keyword, label: '$this'});
                ctx.citems.push({kind: vs.CompletionItemKind.Keyword, label: '$sibling'});
                ctx.citems.push({kind: vs.CompletionItemKind.Keyword, label: '$ancestor'});
                if (pathIndex === 0) {
                    ctx.citems.push({kind: vs.CompletionItemKind.Keyword, label: '$layer'});

                    if (selFrag.selKind !== SelHandleKind.Identifier) {
                        for (const item of this.dIndex.handles.values()) {
                            ctx.citems.push({
                                kind: vs.CompletionItemKind.Variable,
                                label: `$${item.name}`,
                                detail: `[${item.desc.stype.name}]\n${item.desc.fqn}`,
                            });
                        }
                    }
                }
                break;
            }
        }
    }

    protected suggestFontStyles(ctx: AtValComplContext) {
        for (const item of this.store.s2ws.styles.values) {
            ctx.citems.push({
                kind: vs.CompletionItemKind.Reference,
                label: item.name,
                detail: Array.from(item.archives.values()).map(a => a.name).join(' ; '),
            });
        }
    }

    protected suggestStrings(ctx: AtValComplContext, strfKind: s2.StringFileKind) {
        const rl = this.store.s2ws.strings.file(strfKind).entriesStartingWith(
            ctx.attrValue.substring(
                getAttrValueKind(ctx.attrValue) === AttrValueKind.AssetRacial ? 2 : 1,
                ctx.atOffsetRelative
            )
        );
        for (const [ikey, item] of rl) {
            if (item.partial) {
                ctx.citems.push({
                    kind: vs.CompletionItemKind.Folder,
                    label: ikey,
                });
            }
            else {
                ctx.citems.push({
                    kind: vs.CompletionItemKind.Reference,
                    label: ikey,
                    detail: item.result.value,
                    documentation: item.result.archive.name,
                });
            }
        }
    }

    public provide(ctx: AtValComplContext) {
        const sAttrItem = ctx.node.stype.attributes.get(ctx.attrName);
        let sAttrType: sch.SimpleType;
        if (sAttrItem) {
            sAttrType = sAttrItem.type;
        }
        else {
            sAttrType = this.processor.getElPropertyType(ctx.node, ctx.attrName);
            if (!sAttrType) return;
        }
        const pvKind = getAttrValueKind(ctx.attrValue);
        const isAssetRef = (pvKind === AttrValueKind.Asset || pvKind === AttrValueKind.AssetRacial);
        const currentDesc = this.store.index.resolveElementDesc(ctx.node);

        if (this.store.schema.isPropertyBindAllowed(ctx.node.sdef, ctx.node.stype, ctx.attrName) && pvKind === AttrValueKind.PropertyBind) {
            this.suggestPropertyBind(ctx, currentDesc);
            return;
        }

        switch (sAttrType.builtinType) {
            case sch.BuiltinTypeKind.Style:
                this.suggestFontStyles(ctx);
                break;

            case sch.BuiltinTypeKind.Image:
                if (isAssetRef) this.suggestStrings(ctx, s2.StringFileKind.Assets);
                break;

            case sch.BuiltinTypeKind.Text:
                if (isAssetRef) this.suggestStrings(ctx, s2.StringFileKind.GameStrings);
                break;

            case sch.BuiltinTypeKind.Hotkey:
                if (isAssetRef) this.suggestStrings(ctx, s2.StringFileKind.GameHotkeys);
                break;

            case sch.BuiltinTypeKind.DescTemplateName:
            case sch.BuiltinTypeKind.FileDescName:
            case sch.BuiltinTypeKind.FrameName:
            case sch.BuiltinTypeKind.FrameReference:
            {
                if (!currentDesc) break;
                this.suggestSelection(ctx, this.exParser.parsePathSelector(ctx.attrValue), sAttrType.builtinType, currentDesc);
                break;
            }

            default:
            {
                completionsForSimpleType(sAttrType).forEach(r => { ctx.citems.push(r) })
                break;
            }
        }
    }
}

// ====

export class CompletionsProvider extends AbstractProvider implements vs.CompletionItemProvider {
    protected atValueProvider: AttrValueProvider;

    protected provideConstants(compls: vs.CompletionItem[], dblSlash = false) {
        for (const item of this.store.index.constants.values()) {
            compls.push(<vs.CompletionItem>{
                kind: vs.CompletionItemKind.Constant,
                label: (dblSlash ? '##' : '#') + `${item.name}`,
                detail: Array.from(item.declarations.values()).map(decl => decl.getAttributeValue('val')).join('\n'),
            });
        }
    }

    protected processAttrName(ctx: AtComplContext) {
        for (const [sAttrKey, sAttrItem] of ctx.node.stype.attributes) {
            if (
                (ctx.node.attributes[sAttrKey] && ctx.node.attributes[sAttrKey].startValue) &&
                (ctx.xtoken !== TokenType.AttributeName || ctx.attrName !== sAttrItem.name)
            ) {
                continue;
            }
            const tmpc = <vs.CompletionItem>{
                label: sAttrItem.name + (sAttrItem.required ? '' : '?'),
                filterText: sAttrItem.name,
                kind: vs.CompletionItemKind.Field,
                detail: sAttrItem.type.name,
                documentation: new vs.MarkdownString(sAttrItem.documentation),
                insertText: new vs.SnippetString(`${sAttrItem.name}="\$0"`),
                command: sAttrItem.type.builtinType !== sch.BuiltinTypeKind.String ? {command: 'editor.action.triggerSuggest'} : void 0,
            };
            ctx.citems.push(tmpc);
        }
    }

    protected suggestAnchors(ctx: ComplContext, nodeCtx: XMLElement) {
        const scElAnchor = nodeCtx.stype.struct.get('Anchor');
        for (const side of ['Left', 'Right', 'Top', 'Bottom']) {
            const complItem = <vs.CompletionItem>{
                label: `${scElAnchor.name}:${side}`,
                kind: vs.CompletionItemKind.Property,
                detail: scElAnchor.label,
            };
            complItem.insertText = (ctx.xtoken === TokenType.Content ? '<' : '') + `${scElAnchor.name}`;
            let i = 0;
            for (const stInfo of scElAnchor.type.attributes.values()) {
                let v: string;
                switch (stInfo.name) {
                    case 'side':
                        v = side;
                        break;
                    case 'relative':
                        v = '${' + (++i) + ':\\$parent}';
                        break;
                    case 'pos':
                        switch (side) {
                            case 'Left':
                            case 'Top':
                                v = '${' + (++i) + ':Min}';
                                break;
                            case 'Right':
                            case 'Bottom':
                                v = '${' + (++i) + ':Max}';
                                break;
                        }
                        break;
                    case 'offset':
                        v = '${' + (++i) + ':0}';
                        break;
                    default:
                        v = `\$${++i}`;
                        break;
                }
                complItem.insertText += ` ${stInfo.name}="${v}"`;
            }
            complItem.insertText += '/>';
            complItem.insertText = new vs.SnippetString(complItem.insertText);
            ctx.citems.push(complItem);
        }
    }

    protected suggestElements(ctx: ComplContext) {
        let nodeCtx = ctx.node;
        if (ctx.offset < ctx.node.startTagEnd || ctx.offset >= ctx.node.end) {
            nodeCtx = <XMLElement>ctx.node.parent;
        }
        if (!nodeCtx.stype) return;

        if (nodeCtx.sdef.nodeKind === sch.ElementDefKind.Frame && (ctx.xtoken === TokenType.Content || !ctx.node.closed)) {
            this.suggestAnchors(ctx, nodeCtx);
        }

        for (const [sElKey, sElItem] of nodeCtx.stype.struct) {
            const complItem = <vs.CompletionItem>{
                label: sElKey,
                kind: sElItem.nodeKind === sch.ElementDefKind.FrameProperty ? vs.CompletionItemKind.Property : vs.CompletionItemKind.Struct,
                // detail: sElItem.type.name,
                detail: typeof sElItem.label !== 'undefined' ? sElItem.label : void 0
            };

            switch (sElItem.nodeKind) {
                case sch.ElementDefKind.FrameProperty:
                {
                    complItem.label = `${sElKey} [${this.store.schema.getFrameProperty(sElItem).fclass.name}]`;
                    complItem.filterText = sElKey;
                    complItem.insertText = sElKey;
                    break;
                }
            }

            if (ctx.xtoken === TokenType.Content || !ctx.node.closed) {
                complItem.insertText = (ctx.xtoken === TokenType.Content ? '<' : '') + `${sElKey}`;
                let i = 0;
                for (const stInfo of sElItem.type.attributes.values()) {
                    if (!stInfo.required && !stInfo.default) continue;
                    if (stInfo.default) {
                        complItem.insertText += ` ${stInfo.name}="\${${++i}:${stInfo.default.replace('$', '\\$')}}"`;
                    }
                    else {
                        complItem.insertText += ` ${stInfo.name}="\$${++i}"`;
                    }
                }
                if (!sElItem.type.struct.size && sElItem.nodeKind !== sch.ElementDefKind.Frame) {
                    if (i === 1) complItem.insertText = complItem.insertText.replace('$1', '$0');
                    complItem.insertText += '/>';
                }
                else {
                    complItem.insertText += `>\$0</${sElKey}>`;
                }
                complItem.insertText = new vs.SnippetString(complItem.insertText);
            }

            ctx.citems.push(complItem);
        }
    }

    public init(svcContext: ServiceContext, store: Store, console: ILoggerConsole) {
        super.init(svcContext, store, console);
        this.atValueProvider = new AttrValueProvider(this.store, console);
    }

    @svcRequest(
        false,
        (document: vs.TextDocument, position: vs.Position, cancToken: vs.CancellationToken, context: vs.CompletionContext) => {
            return {
                filename: document.uri.fsPath,
                position: {line: position.line, char: position.character},
                context,
            };
        },
        (r: vs.CompletionList) => r.items.length
    )
    async provideCompletionItems(document: vs.TextDocument, position: vs.Position, cancToken: vs.CancellationToken, context: vs.CompletionContext) {
        let items = <vs.CompletionItem[]> [];
        const sourceFile = await this.svcContext.syncVsDocument(document);
        const offset = document.offsetAt(position);
        const node = sourceFile.findNodeAt(offset);

        if (!node || !(node instanceof XMLElement)) return;

        let startOffset = offset;
        if (node) {
            // console.log('node', node.start, node.end, node.stype ? node.stype.name : '?');
            startOffset = node.start;
        }
        else {
            startOffset = document.offsetAt(document.getWordRangeAtPosition(position).start);
        }

        // console.log('offset', offset);
        let scanner = createScanner(document.getText(), startOffset);
        let token = scanner.scan();
        let currentAttrName: string;
        outer: while (token !== TokenType.EOS) {
            // console.log(scanner.getTokenOffset(), scanner.getTokenEnd(), TokenType[token], ScannerState[scanner.getScannerState()], scanner.getTokenText());
            if (token === TokenType.AttributeName) {
                currentAttrName = scanner.getTokenText();
            }
            if (scanner.getTokenEnd() > offset) break;
            if (scanner.getTokenEnd() === offset) {
                switch (token) {
                    case TokenType.StartTagOpen:
                    case TokenType.StartTag:
                    case TokenType.EndTag:
                    case TokenType.Content:
                    case TokenType.AttributeName:
                    case TokenType.DelimiterAssign:
                        break outer;
                    default:
                        break;
                }
            }
            token = scanner.scan();
        }
        const tokenText = scanner.getTokenText();
        const cmCtx = <ComplContext>{
            citems: items,
            offset: offset,
            node: node,
            xtoken: token,
            xstate: scanner.getScannerState(),
            xtokenText: scanner.getTokenText(),
        };

        if (scanner.getScannerState() === ScannerState.AfterOpeningEndTag || scanner.getScannerState() === ScannerState.WithinEndTag) {
            if (!node.closed && node.tag) {
                items.push(<vs.CompletionItem>{
                    label: `/${node.tag}`,
                    kind: vs.CompletionItemKind.Struct,
                    insertText: `${node.tag}>`,
                    command: { command: 'editor.action.reindentselectedlines' },
                });
            }
        }

        switch (token) {
            case TokenType.AttributeName:
            case TokenType.Whitespace:
            case TokenType.StartTagClose:
            case TokenType.StartTagSelfClose:
            {
                if (scanner.getScannerState() === ScannerState.AfterOpeningEndTag) break;
                if (!node.stype) return;
                const cmAtCtx = <AtComplContext>cmCtx;
                cmAtCtx.attrName = currentAttrName;
                this.processAttrName(cmAtCtx);
                break;
            }

            case TokenType.StartTag:
            case TokenType.StartTagOpen:
            case TokenType.Content:
            {
                this.suggestElements(cmCtx);
                break;
            }

            case TokenType.AttributeValue:
            {
                if (!node.stype) return;
                const arVal = tokenText.substring(1, tokenText.length - 1);
                const aOffset = offset - (scanner.getTokenOffset() + 1);

                if (arVal.length > 0 && arVal.charCodeAt(0) === CharacterCodes.hash) {
                    this.provideConstants(items, arVal.length > 1 && arVal.charCodeAt(1) === CharacterCodes.hash);
                    break;
                }

                if (!node.stype) break;

                const cmAtCtx = <AtValComplContext>cmCtx;
                cmAtCtx.attrName = currentAttrName;
                cmAtCtx.attrValue = arVal;
                cmAtCtx.atOffsetRelative = aOffset;
                this.atValueProvider.provide(cmAtCtx);

                break;
            }
        }

        return {
            items: cmCtx.citems,
        };
    }
}
