import * as util from 'util';
import * as vs from 'vscode';
import * as sch from '../schema/base';
import { AbstractProvider, svcRequest } from './provider';
import { createDocumentFromVS } from '../service';
import { createScanner, CharacterCodes } from '../parser/scanner';
import { TokenType, ScannerState, XMLElement, AttrValueKind } from '../types';
import { parseDescSelector, SelectionFragmentKind, builtinHandlesTable, parseAttrValue, FramePropSelect, SelectionFragment, BuiltinHandleKind, builtinHandlesNameTable } from '../parser/selector';
import { DescIndex, DescItemContainer, FrameDesc, FileDesc } from '../index/desc';

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

export class CompletionsProvider extends AbstractProvider implements vs.CompletionItemProvider {
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

    protected *provideBuiltinFrameHandles() {
        for (const item of builtinHandlesTable.keys()) {
            if (item === 'layer' || item === 'root') continue;
            yield <vs.CompletionItem>{
                kind: vs.CompletionItemKind.Reference,
                label: `\$${item}`,
            };
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

        if (!sbind.fragments.length) return;
        if (!sfrag) sfrag = sbind.fragments[sbind.fragments.length - 1];

        if (skey === sbind.fragments.length - 1 && ctx.atOffsetRelative > slOffset) {
            if (ctx.attrValue.charCodeAt(slOffset + 1) === CharacterCodes.at) {
                if (ctx.atOffsetRelative <= (slOffset + 2 + sbind.propertyName.length)) {
                    this.suggestPropNames(ctx);
                }
                else if (sbind.propertyIndex !== void 0) {
                }
            }
        }
        else {
            if (sfrag.kind === SelectionFragmentKind.BuiltinHandle) {
                const hlen = (builtinHandlesNameTable.get(sfrag.builtinHandle).length + 1);
                // ctx.attrValue.charAt(ctx.atOffsetRelative-1)
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
                                    // TODO:
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
                }
            }
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
        if (!sAttrItem) return;

        switch (ctx.node.sdef.nodeKind) {
            case sch.ElementDefKind.FrameProperty:
            {
                if (ctx.attrName !== 'val') break;
                const pv = parseAttrValue(ctx.attrValue);
                if (pv.kind === AttrValueKind.PropertyBind) {
                    this.suggestPropBind(ctx, <FramePropSelect>pv.value, ctx.fileDesc.mappedNodes.get(<XMLElement>ctx.node.parent));
                    return;
                }
                break;
            }
        }

        let dcontext: DescItemContainer = ctx.fileDesc.mappedNodes.get(<XMLElement>ctx.node.parent);

        switch (sAttrItem.type.builtinType) {
            case sch.BuiltinTypeKind.FileDescName:
            {
                this.provideFileDescName(ctx.citems);
                break;
            }

            case sch.BuiltinTypeKind.FrameDescName:
            {
                let sepOffset = ctx.attrValue.indexOf('\/');
                if (sepOffset !== -1 && sepOffset > 0 && ctx.atOffsetRelative > sepOffset) {
                    const sel = parseDescSelector(ctx.attrValue.substring(0, sepOffset));
                    if (sel.fragments[0].kind === SelectionFragmentKind.Identifier) {
                        const tmpcontext = this.store.index.docmap.get(sel.fragments[0].identifier);
                        if (tmpcontext) {
                            return Array.from(this.provideDescName(tmpcontext));
                        }
                    }
                }
                else {
                    this.provideFileDescName(ctx.citems);
                }
                break;
            }

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
                    if (dcontext.constructor === FrameDesc) {
                        ctx.citems = ctx.citems.concat(Array.from(this.provideBuiltinFrameHandles()));
                    }
                    let sepOffset = ctx.atOffsetRelative - 1;
                    while (sepOffset > 0 && ctx.attrValue.charCodeAt(sepOffset) !== CharacterCodes.slash) --sepOffset;
                    // while (sepOffset !== ctx.attrValue.indexOf('\/', sepOffset) && aOffset > sepOffset) {
                    // }
                    let scontext: DescItemContainer = dcontext;
                    if (sepOffset > 0) {
                        const sel = parseDescSelector(ctx.attrValue.substr(0, sepOffset));
                        scontext = this.store.index.resolveSelection(sel, dcontext);
                    }
                    if (scontext) {
                        ctx.citems = ctx.citems.concat(Array.from(this.provideDescName(scontext)));
                    }
                }
                break;
            }

            default:
            {
                completionsForSimpleType(sAttrItem.type).forEach(r => { ctx.citems.push(r) })
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
                    if (!stInfo.required) continue;
                    complItem.insertText += ` ${stInfo.name}="\$${++i}"`;
                    // if (stInfo.type.evalues) {
                    if (stInfo.type.builtinType !== sch.BuiltinTypeKind.String) {
                        complItem.command = {command: 'editor.action.triggerSuggest', title: ''};
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

    @svcRequest(false)
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
        const fdesc = this.store.index.docmap.get(sourceFile.getDescName());
        const cmCtx = <ComplContext>{
            citems: items,
            offset: offset,
            node: node,
            fileDesc: this.store.index.docmap.get(sourceFile.getDescName()),
            xtoken: token,
            xstate: scanner.getScannerState(),
            xtokenText: scanner.getTokenText(),
        };

        if (!node.stype) return;

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
                const cmAtCtx = <AtComplContext>cmCtx;
                cmAtCtx.attrName = currentAttrName;
                this.processAttrName(cmAtCtx);
                break;
            }

            case TokenType.StartTag:
            case TokenType.StartTagOpen:
            case TokenType.Content:
            {
                if (!node.closed && (token === TokenType.Content || token === TokenType.StartTagOpen)) {
                    const ctag = token === TokenType.StartTagOpen ? (<XMLElement>node.parent).tag : node.tag;
                    items.push(<vs.CompletionItem>{
                        label: `/${ctag}`,
                        kind: vs.CompletionItemKind.Struct,
                        insertText: (token === TokenType.Content ? '<' : '') + `/${ctag}>`,
                        command: { command: 'editor.action.reindentselectedlines' },
                    });
                }
                this.suggestElements(cmCtx);
                break;
            }

            case TokenType.AttributeValue:
            {
                const arVal = tokenText.substring(1, tokenText.length - 1);
                const aOffset = offset - (scanner.getTokenOffset() + 1);

                if (arVal.length > 0 && arVal.charCodeAt(0) === CharacterCodes.hash) {
                    this.provideConstants(items, arVal.length > 1 && arVal.charCodeAt(1) === CharacterCodes.hash);
                    break;
                }

                if (!node.stype) break;
                const sAttrItem = node.stype.attributes.get(currentAttrName);
                if (!sAttrItem) break;

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