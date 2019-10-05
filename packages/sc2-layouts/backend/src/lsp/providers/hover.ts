import * as lsp from 'vscode-languageserver';
import * as sch from '../../schema/base';
import { AbstractProvider, errGuard } from '../provider';
import { XMLElement } from '../../types';
import { DefinitionProvider, DefinitionItemKind, DefinitionDescNode, DefinitionContainer, DefinitionXNode, DefinitionUINode } from './definition';
import { vsRangeOrPositionOfXNode, rangeContainsPosition } from '../helpers';
import { DescKind } from '../../index/desc';
import { logIt, logger } from '../../logger';

export function slugify(str: string) {
    str = str.replace(/[_\\:<>\.]/g, '-');
    str = str.replace(/[A-Z]+/g, (m) => '-' + m.toLowerCase());
    str = str.replace(/(^[\-]+)|([\-]+$)/g, '');
    str = str.replace(/[\/]+/g, '');
    str = str.replace(/\s*\-+\s*/g, '-');
    return str;
}

function docsLink(category: 'type' | 'frame-type' | 'complex-type', name: string) {
    return `https://mapster.talv.space/ui-layout/${category}/${slugify(name)}`;
}

function attrSchDocs(sAttr: sch.Attribute)  {
    let s = '';
    s += `&nbsp;**@**${sAttr.name}${(sAttr.required ? '' : '?')} — [${sAttr.type.name}](${docsLink('type', sAttr.type.name)})`;
    if (sAttr.label) {
        s += ' — ' + sAttr.label;
    }
    return s;
}

export class HoverProvider extends AbstractProvider {
    install() {
        this.slSrv.conn.onHover(this.provideHover.bind(this));
    }

    protected matchAttrValueEnum(smType: sch.SimpleType, value: string) {
        value = value.toLowerCase();

        function processSmType(smType: sch.SimpleType): { type: sch.SimpleType, name: string, label?: string } | undefined {
            if (smType.emap) {
                const r = smType.emap.get(value);
                if (!r) return void 0;
                return {
                    type: smType,
                    name: r.name,
                    label: r.label,
                };
            }

            if (smType.union) {
                for (const unSmType of smType.union) {
                    const r = processSmType(unSmType);
                    if (r) return r;
                }
            }
        }

        return processSmType(smType);
    }

    protected tooltipDefinitionDesc(defContainer: DefinitionContainer, dscNode: DefinitionDescNode | DefinitionUINode): lsp.MarkupContent {
        const contents: string[] = [];

        if (dscNode.selectedDescs.length) {
            const dNode = dscNode.selectedDescs[0];
            let dLink = '#';
            switch (dNode.kind) {
                case DescKind.Frame:
                {
                    const sFrameType = this.store.schema.getFrameType(dNode.stype);
                    if (sFrameType) {
                        dLink = docsLink('frame-type', sFrameType.name);
                    }
                    break;
                }
            }
            contents.push(`**\`${dNode.name}\`** — [${dNode.stype.name}](${dLink})`);
        }
        else if ((<DefinitionUINode>dscNode).selectedNode) {
            contents.push(`**\`${(<DefinitionUINode>dscNode).selectedNode.name}\`** — ?`);
        }

        for (const desc of dscNode.selectedDescs) {
            contents.push(desc.fqn);
        }
        return {
            kind: 'markdown',
            value: contents.join('\n\n'),
        };
    }

    protected processElement(node: XMLElement) {
        if (!node.stype) return;
        let contents = `**<${node.sdef.name}>**`;
        let dLink = '#';

        switch (node.sdef.nodeKind) {
            case sch.ElementDefKind.Frame:
            {
                const sFrameType = this.store.schema.getFrameType(node.stype);
                if (sFrameType) {
                    dLink = docsLink('frame-type', sFrameType.name);
                    contents += ` — [${sFrameType.name}](${dLink})`;
                    if (sFrameType.blizzOnly) {
                        contents += ' — Blizzard restricted';
                    }
                }
                break;
            }

            default:
            {
                dLink = docsLink('complex-type', node.sdef.type.name);
                contents += ` — [${node.sdef.type.name}](${dLink})`;
                break;
            }
        }

        if (node.sdef.label) {
            contents += '\n\n' + node.sdef.label;
        }
        if (node.stype.label) {
            contents += `\n\n` + node.stype.label;
        }
        contents += '\n\n' + Array.from(node.stype.attributes.values()).map(v => attrSchDocs(v)).join('\n\n');

        return <lsp.Hover>{
            contents: contents.trim(),
        };
    }

    @errGuard()
    @logIt({
        argsDump: (p: lsp.TextDocumentPositionParams) => p,
        resDump: (r: lsp.Hover) => typeof r,
    })
    async provideHover(params: lsp.TextDocumentPositionParams, token: lsp.CancellationToken) {
        const sourceFile = await this.slSrv.flushDocumentByUri(params.textDocument.uri);
        if (!sourceFile) return;

        const offset = sourceFile.tdoc.offsetAt(params.position);
        const node = sourceFile.findNodeAt(offset);
        let hv: lsp.Hover;

        if (node instanceof XMLElement && node.stype) {
            if (node.start <= offset && (node.start + node.tag.length + 1) > offset) {
                hv = this.processElement(node);
            }
            else {
                const attr = node.findAttributeAt(offset);
                if (attr) {
                    let scAttr = node.stype.attributes.get(attr.name.toLowerCase());
                    if (!scAttr) {
                        const indType = this.xray.matchIndeterminateAttr(node, attr.name);
                        if (indType) {
                            scAttr = {
                                name: indType.key.name,
                                type: indType.value,
                                required: true,
                            };
                        }
                    }

                    if (scAttr) {
                        if ((attr.start + attr.name.length) > offset) {
                            let contents = attrSchDocs(scAttr);
                            hv = {
                                contents: <lsp.MarkupContent>{ kind: 'markdown', value: contents },
                            };
                        }
                        else if (attr.startValue && (attr.startValue - 1) <= offset && attr.end >= offset) {
                            switch (scAttr.type.builtinType) {
                                default:
                                {
                                    const wordRange = sourceFile.tdoc.getWordRangeAtPosition(params.position, this.slSrv.wordPattern);
                                    if (!wordRange) break;
                                    const matchedEn = this.matchAttrValueEnum(scAttr.type, sourceFile.tdoc.getText(wordRange));
                                    if (matchedEn && matchedEn.label) {
                                        let contents = `**${matchedEn.name}** — ${matchedEn.label}\n\n[${matchedEn.type.name}](${docsLink('type', matchedEn.type.name)})`;
                                        hv = {
                                            contents: <lsp.MarkupContent>{ kind: 'markdown', value: contents },
                                            range: wordRange,
                                        };
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        if (!hv) {
            const defContainer = this.slSrv.providers.definition.getDefinitionAtOffset(sourceFile, offset);
            if (!defContainer) return;

            switch (defContainer.itemKind) {
                case DefinitionItemKind.DescNode:
                case DefinitionItemKind.UINode:
                {
                    hv = {
                        contents: this.tooltipDefinitionDesc(defContainer, <DefinitionDescNode>defContainer.itemData),
                        range: defContainer.srcTextRange
                    };
                    break;
                }

                case DefinitionItemKind.XNode:
                {
                    const mstr: lsp.MarkedString[] = [];
                    for (const xEl of (<DefinitionXNode>defContainer.itemData).xNodes) {
                        if (rangeContainsPosition(vsRangeOrPositionOfXNode(xEl), params.position)) continue;
                        mstr.push({
                            language: 'sc2layout',
                            value: xEl.getDocument().tdoc.getText(<lsp.Range>vsRangeOrPositionOfXNode(xEl)),
                        });
                    }
                    hv = {
                        contents: mstr,
                        range: defContainer.srcTextRange,
                    };
                }
            }
        }

        return hv;
    }
}
