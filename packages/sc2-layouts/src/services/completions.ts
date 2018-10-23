import * as util from 'util';
import * as vs from 'vscode';
import * as sch from '../schema/base';
import { AbstractProvider, svcRequest, ILoggerConsole } from './provider';
import { createDocumentFromVS, ServiceContext } from '../service';
import { createScanner, CharacterCodes } from '../parser/scanner';
import { TokenType, ScannerState, XMLElement, AttrValueKind } from '../types';
import { parseDescSelector, SelectionFragmentKind, builtinHandlesTable, parseAttrValue, FramePropSelect, SelectionFragment, BuiltinHandleKind, builtinHandlesNameTable, getAttrValueKind, FrameSelect } from '../parser/selector';
import { DescIndex, DescItemContainer, FrameDesc, FileDesc } from '../index/desc';
import * as s2 from '../index/s2mod';
import { Store } from '../index/store';

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

interface ComplContext {
    citems: vs.CompletionItem[];
    node: XMLElement;
    offset: number;
    xtokenText: string;
    xtoken: TokenType;
    xstate: ScannerState;
    fileDesc: FileDesc;
}

interface AtComplContext extends ComplContext {
    attrName: string;
}

interface AtValComplContext extends AtComplContext {
    attrValue: string;
    atOffsetRelative: number;
}

class SuggestionsProvider {
    constructor(protected store: Store, protected console: ILoggerConsole) {
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

    protected suggestBuiltinFrameHandles(ctx: AtComplContext) {
        for (const item of builtinHandlesTable.keys()) {
            if (item === 'root') continue;
            ctx.citems.push({
                kind: vs.CompletionItemKind.Reference,
                label: `\$${item}`,
            });
        }
    }

    protected suggestDescNames(ctx: AtComplContext, dcontext: DescItemContainer) {
        for (const item of dcontext.children.values()) {
            const r = <vs.CompletionItem>{
                kind: vs.CompletionItemKind.Struct,
                label: `${item.name}`,
            };
            if (item.constructor === FrameDesc) {
                r.detail = `Frame[${(<FrameDesc>item).ctype}]`;
            }
            ctx.citems.push(r);
        }
    }

    protected suggestSelectionFragment(ctx: AtValComplContext, fsel: FrameSelect, selStartOffset: number, dframe: FrameDesc) {
        let slOffset = 0;
        let sfrag: SelectionFragment;
        let skey: number;
        for ([skey, sfrag] of fsel.fragments.entries()) {
            slOffset += sfrag.len + 1;
            if (ctx.atOffsetRelative < slOffset) {
                break;
            }
        }

        if (!fsel.fragments.length) return;
        if (!sfrag) sfrag = fsel.fragments[fsel.fragments.length - 1];

        switch (sfrag.kind) {
            case SelectionFragmentKind.BuiltinHandle:
            {
                const hlen = (builtinHandlesNameTable.get(sfrag.builtinHandle).length + selStartOffset);
                if (sfrag.builtinHandle === BuiltinHandleKind.Ancestor && sfrag.len > hlen) {
                    if (sfrag.len - hlen > 2 && ctx.attrValue.charCodeAt(slOffset - (sfrag.len - hlen) + 1) === CharacterCodes.at) {
                        if (sfrag.argument && (slOffset - (sfrag.len - hlen) + 1 + sfrag.argument.name.length + 1) <= ctx.atOffsetRelative) {
                            switch (sfrag.argument.name) {
                                case 'oftype':
                                case 'type':
                                {
                                    for (const tmp of this.store.schema.frameTypes.values()) {
                                        ctx.citems.push({
                                            kind: vs.CompletionItemKind.EnumMember,
                                            label: tmp.name,
                                            detail: Array.from(tmp.fclasses.values()).map(fc => `[${fc.name}]`).join(' <- '),
                                        });
                                    }
                                    break;
                                }

                                case 'name':
                                {
                                    let cparent = dframe;
                                    while (cparent = <FrameDesc>cparent.parent) {
                                        if (cparent.constructor !== FrameDesc) break;
                                        ctx.citems.push({
                                            kind: vs.CompletionItemKind.Struct,
                                            label: `${cparent.name}`,
                                            detail: `Frame[${(<FrameDesc>cparent).ctype}]`,
                                        });
                                    }
                                    break;
                                }
                            }
                        }
                        else {
                            ctx.citems.push({kind: vs.CompletionItemKind.Operator, label: 'type',});
                            ctx.citems.push({kind: vs.CompletionItemKind.Operator, label: 'oftype',});
                            ctx.citems.push({kind: vs.CompletionItemKind.Operator, label: 'name',});
                        }
                    }
                    return;
                }
            }
        }

        //
        let sepOffset = ctx.atOffsetRelative - 1 + selStartOffset;
        while (sepOffset >= selStartOffset && ctx.attrValue.charCodeAt(sepOffset) !== CharacterCodes.slash) --sepOffset;

        let scontext: DescItemContainer = dframe;
        if (sepOffset > selStartOffset) {
            const sel = parseDescSelector(ctx.attrValue.substr(selStartOffset, sepOffset - selStartOffset));
            scontext = this.store.index.resolveSelection(sel, dframe);
        }
        if (ctx.attrValue.charCodeAt(sepOffset + 1) === CharacterCodes.$) {
            this.suggestBuiltinFrameHandles(ctx);
        }
        if (scontext) {
            this.suggestDescNames(ctx, scontext);
        }
    }

    protected suggestPropBind(ctx: AtValComplContext, sbind: FramePropSelect, dframe: FrameDesc) {
        let slOffset = 0;
        let sfrag: SelectionFragment;
        let skey: number;
        for ([skey, sfrag] of sbind.fragments.entries()) {
            slOffset += sfrag.len + 1;
            if (ctx.atOffsetRelative < slOffset) {
                break;
            }
        }

        if (
            (sbind.fragments.length > 0 && skey === sbind.fragments.length - 1) &&
            (ctx.atOffsetRelative > slOffset && ctx.attrValue.charCodeAt(slOffset + 1) === CharacterCodes.at)
        ) {
            if (ctx.atOffsetRelative <= (slOffset + 2 + sbind.propertyName.length)) {
                this.suggestPropNames(ctx);
            }
            else if (sbind.propertyIndex !== void 0) {
            }
        }
        else {
            this.suggestSelectionFragment(ctx, sbind, 1, dframe)
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
        let isFClassProperty = false;
        if (sAttrItem) {
            sAttrType = sAttrItem.type;
            isFClassProperty = ctx.node.sdef.nodeKind === sch.ElementDefKind.FrameProperty && sAttrItem.name === 'val';
        }
        else {
            sAttrType = this.store.processor.getFClassPropertyType(ctx.node, ctx.attrName);
            if (!sAttrType) return;
            isFClassProperty = true;
        }
        const pvKind = getAttrValueKind(ctx.attrValue);
        const isAssetRef = (pvKind === AttrValueKind.Asset || pvKind === AttrValueKind.AssetRacial);
        const frameDescContext = this.store.processor.determineFrameDescContext(ctx.node, ctx.fileDesc);
        let dcontext = <DescItemContainer>frameDescContext;

        if (isFClassProperty && pvKind === AttrValueKind.PropertyBind) {
            const pv = parseAttrValue(ctx.attrValue);
            this.suggestPropBind(ctx, <FramePropSelect>pv.value, frameDescContext);
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

            case sch.BuiltinTypeKind.FrameName:
            {
                dcontext = ctx.fileDesc.mappedNodes.get(ctx.node);
                if (!dcontext) break;
                if (!(<FrameDesc>dcontext).fileDesc) break;
                dcontext = this.store.index.docmap.get((<FrameDesc>dcontext).fileDesc);
                // pass-through
            }

            case sch.BuiltinTypeKind.FrameReference:
            {
                if (dcontext) {
                    this.suggestSelectionFragment(ctx, parseDescSelector(ctx.attrValue), 0, <FrameDesc>dcontext);
                }
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

    protected provideFileDescName(compls: vs.CompletionItem[]) {
        for (const item of this.store.index.docmap.values()) {
            compls.push(<vs.CompletionItem>{
                kind: vs.CompletionItemKind.Folder,
                label: `${item.name}`,
            });
        }
    }

    protected *provideDescName(dcontext: DescItemContainer) {
        for (const item of dcontext.children.values()) {
            const r = <vs.CompletionItem>{
                kind: vs.CompletionItemKind.Struct,
                label: `${item.name}`,
            };
            if (item.constructor === FrameDesc) {
                r.detail = `Frame[${(<FrameDesc>item).ctype}]`;
            }
            yield r;
        }
    }

    protected processAttrName(ctx: AtComplContext) {
        for (const [sAttrKey, sAttrItem] of ctx.node.stype.attributes) {
            if (
                (ctx.node.attributes[sAttrKey] && ctx.node.attributes[sAttrKey].startValue) &&
                (ctx.xtoken !== TokenType.AttributeName || ctx.attrName !== sAttrKey)
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

    protected processAttrValue(ctx: AtValComplContext) {
        const sAttrItem = ctx.node.stype.attributes.get(ctx.attrName);
        let sAttrType: sch.SimpleType;
        let isFClassProperty = false;
        if (sAttrItem) {
            sAttrType = sAttrItem.type;
        }
        else {
            sAttrType = this.store.processor.getFClassPropertyType(ctx.node, ctx.attrName);
            if (!sAttrType) return;
            isFClassProperty = true;
        }
        let dcontext: DescItemContainer = this.store.processor.determineFrameDescContext(ctx.node, ctx.fileDesc);

        this.atValueProvider.provide(ctx);

        switch (sAttrType.builtinType) {
            case sch.BuiltinTypeKind.FileDescName:
            {
                this.provideFileDescName(ctx.citems);
                break;
            }

            case sch.BuiltinTypeKind.DescTemplateName:
            {
                let sepOffset = ctx.attrValue.indexOf('\/');
                if (sepOffset !== -1 && sepOffset > 0 && ctx.atOffsetRelative > sepOffset) {
                    const sel = parseDescSelector(ctx.attrValue.substring(0, sepOffset));
                    if (sel.fragments[0].kind === SelectionFragmentKind.Identifier) {
                        const tmpcontext = this.store.index.docmap.get(sel.fragments[0].identifier);
                        if (tmpcontext) {
                            ctx.citems = ctx.citems.concat(Array.from(this.provideDescName(tmpcontext)));
                        }
                    }
                }
                else {
                    this.provideFileDescName(ctx.citems);
                }
                break;
            }
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
            fileDesc: this.store.index.docmap.get(sourceFile.descName),
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
                this.processAttrValue(cmAtCtx);

                break;
            }
        }

        return {
            items: cmCtx.citems,
        };
    }
}