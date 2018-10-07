import * as util from 'util';
import * as vs from 'vscode';
import * as sch from '../schema/base';
import { AbstractProvider, svcRequest } from './provider';
import { createDocumentFromVS } from '../service';
import { createScanner, CharacterCodes } from '../parser/scanner';
import { TokenType, ScannerState, XMLElement } from '../types';
import { parseDescSelector, SelectionFragmentKind, builtinHandlesTable } from '../parser/selector';
import { DescIndex, DescItemContainer, FrameDesc } from '../index/desc';

function completionsForSimpleType(smType: sch.SimpleType) {
    let items = <vs.CompletionItem[]> [];

    if (smType.union) {
        for (const unSmType of smType.union) {
            items = items.concat(completionsForSimpleType(unSmType));
        }
    }

    if (smType.evalues) {
        items = items.concat(smType.evalues.map(eValue => <vs.CompletionItem>{
            label: eValue,
            kind: vs.CompletionItemKind.EnumMember,
            detail: smType.name,
        }));
    }

    return items;
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

    protected *provideFileDescName() {
        for (const item of this.store.index.docmap.values()) {
            yield <vs.CompletionItem>{
                kind: vs.CompletionItemKind.Folder,
                label: `${item.name}`,
            };
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

    @svcRequest(false)
    async provideCompletionItems(document: vs.TextDocument, position: vs.Position, cancToken: vs.CancellationToken, context: vs.CompletionContext) {
        let items = <vs.CompletionItem[]> [];
        const sourceFile = await this.svcContext.syncVsDocument(document);

        const offset = document.offsetAt(position);
        const node = sourceFile.findNodeAt(offset);

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

        if (node && node instanceof XMLElement) {
            const fdesc = this.store.index.docmap.get(sourceFile.getDescName());
            let dcontext: DescItemContainer = fdesc.mappedNodes.get(<XMLElement>node.parent);

            if (scanner.getScannerState() === ScannerState.AfterOpeningEndTag || scanner.getScannerState() === ScannerState.WithinEndTag) {
                if (!node.closed && node.tag) {
                    items.push(<vs.CompletionItem>{
                        label: `/${node.tag}`,
                        kind: vs.CompletionItemKind.Struct,
                        insertText: `${node.tag}>`,
                        command: {
                            command: 'editor.action.reindentselectedlines',
                        },
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
                    if (!node.stype) break;
                    for (const [sAttrKey, sAttrItem] of node.stype.attributes) {
                        if (
                            (node.attributes[sAttrKey] && node.attributes[sAttrKey].startValue) &&
                            (token !== TokenType.AttributeName || currentAttrName != sAttrKey)
                        ) {
                            continue;
                        }
                        items.push(<vs.CompletionItem>{
                            label: sAttrKey,
                            kind: vs.CompletionItemKind.Field,
                            detail: sAttrItem.type.name + (sAttrItem.required ? ' [required]' : ' [optional]'),
                            documentation: new vs.MarkdownString(sAttrItem.documentation),
                            insertText: new vs.SnippetString(`${sAttrKey}="\$0"`),
                            command: node.stype.name !== 'String' ? {command: 'editor.action.triggerSuggest', title: ''} : void 0,
                        });
                    }
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
                            command: {
                                command: 'editor.action.reindentselectedlines',
                            },
                        });
                    }
                    let tmpn = node;
                    if (offset < node.startTagEnd || offset >= node.end) {
                        tmpn = <XMLElement>node.parent;
                    }
                    if (!tmpn.stype) break;
                    for (const [sElKey, sElItem] of tmpn.stype.struct) {
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

                        if (token === TokenType.Content || !node.closed && !node.selfClosed) {
                            complItem.insertText = '';
                            if (token === TokenType.Content) {
                                complItem.insertText += '<';
                            }
                            complItem.insertText += `${sElKey}`;
                            let i = 0;
                            for (const [stName, stInfo] of sElItem.type.attributes) {
                                if (!stInfo.required) continue;
                                complItem.insertText += ` ${stName}="\$${++i}"`;
                                // if (stInfo.type.evalues) {
                                if (stInfo.type.name !== 'String') {
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

                        items.push(complItem);
                    }
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

                    switch (sAttrItem.type.builtinType) {
                        case sch.BuiltinTypeKind.FileDescName:
                        {
                            return Array.from(this.provideFileDescName());
                            break;
                        }

                        case sch.BuiltinTypeKind.FrameDescName:
                        {
                            let sepOffset = arVal.indexOf('\/');
                            if (sepOffset !== -1 && sepOffset > 0 && aOffset > sepOffset) {
                                const sel = parseDescSelector(arVal.substring(0, sepOffset));
                                if (sel.fragments[0].kind === SelectionFragmentKind.Identifier) {
                                    const tmpcontext = this.store.index.docmap.get(sel.fragments[0].identifier);
                                    if (tmpcontext) {
                                        return Array.from(this.provideDescName(tmpcontext));
                                    }
                                }
                            }
                            else {
                                return Array.from(this.provideFileDescName());
                            }
                            break;
                        }

                        case sch.BuiltinTypeKind.FrameName:
                        {
                            dcontext = fdesc.mappedNodes.get(<XMLElement>node);
                            if (!dcontext) break;
                            if (!(<FrameDesc>dcontext).fileDesc) break;
                            dcontext = this.store.index.docmap.get((<FrameDesc>dcontext).fileDesc);
                            // pass-through
                        }

                        case sch.BuiltinTypeKind.FrameReference:
                        {
                            if (dcontext) {
                                if (dcontext.constructor === FrameDesc) {
                                    items = items.concat(Array.from(this.provideBuiltinFrameHandles()));
                                }
                                let sepOffset = aOffset - 1;
                                while (sepOffset > 0 && arVal.charCodeAt(sepOffset) !== CharacterCodes.slash) --sepOffset;
                                // while (sepOffset !== arVal.indexOf('\/', sepOffset) && aOffset > sepOffset) {
                                // }
                                let scontext: DescItemContainer = dcontext;
                                if (sepOffset > 0) {
                                    const sel = parseDescSelector(arVal.substr(0, sepOffset));
                                    scontext = this.store.index.resolveSelection(sel, dcontext);
                                }
                                if (scontext) {
                                    items = items.concat(Array.from(this.provideDescName(scontext)));
                                }
                            }
                            break;
                        }

                        default:
                        {
                            items = items.concat(completionsForSimpleType(sAttrItem.type));
                            break;
                        }
                    }
                    break;
                }
            }
        }

        return {
            items: items,
        };
    }
}