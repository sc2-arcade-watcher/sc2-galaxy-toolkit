import * as lsp from 'vscode-languageserver';
import * as sch from '../../schema/base';
import { AbstractProvider, errGuard } from '../provider';
import { XMLElement, XMLDocument } from '../../types';
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

function attrSchDocs(sAttr: sch.Attribute, opts?: { incLabel?: boolean }) {
    let s = '';
    s += `@\`${sAttr.name}\`${(sAttr.required ? '' : '*?*')} — [${sAttr.type.name}](${docsLink('type', sAttr.type.name)})`;
    if (opts?.incLabel && sAttr.label) {
        s += ' — ' + sAttr.label;
        if (sAttr.documentation) {
            s += '..';
        }
    }
    return s;
}

export class HoverProvider extends AbstractProvider {
    install() {
        this.slSrv.conn.onHover(this.provideHover.bind(this));
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
        contents += '\n\n' + Array.from(node.stype.attributes.values()).map(v => {
            return `&nbsp;&nbsp;` + attrSchDocs(v, { incLabel: true });
        }).join('\n\n');

        return <lsp.Hover>{
            contents: contents.trim(),
        };
    }

    protected processAttributeName(scAttr: sch.Attribute, xEl: XMLElement): lsp.Hover {
        const contents: string[] = [];

        contents.push(`Attribute of **<${xEl.sdef.name}>** — `);
        if (xEl.sdef.nodeKind === sch.ElementDefKind.Frame) {
            const sFrameType = this.store.schema.getFrameType(xEl.stype);
            if (sFrameType) {
                contents.push(`[${sFrameType.name}](${docsLink('frame-type', sFrameType.name)})`);
            }
            else {
                contents.push(`[${xEl.sdef.type.name}](${docsLink('complex-type', xEl.sdef.type.name)})`);
            }
        }
        else {
            contents.push(`[${xEl.sdef.type.name}](${docsLink('complex-type', xEl.sdef.type.name)})`);
        }
        contents.push('\n\n');

        contents.push(attrSchDocs(scAttr));
        if (scAttr.label || scAttr.documentation) {
            contents.push(`\n\n${scAttr.documentation ? scAttr.documentation : scAttr.label}`);
        }

        const flatEnum = this.store.schema.flattenSTypeEnumeration(scAttr.type);
        if (flatEnum.size) {
            contents.push(`\n\n---\n\n`);
            contents.push(`|  | Values |\n`);
            contents.push(`|---|---|\n`);
            contents.push(Array.from(flatEnum.values()).map((v, key) => {
                return `| ${key + 1}. | [\`${v.value}\`](#${v.label ? ` "${v.label.replace(/"/g, '\\"')}"` : ''}) |`;
            }).join('\n'));
        }
        return {
            contents: <lsp.MarkupContent>{ kind: 'markdown', value: contents.join('') },
        };
    }

    protected processAttributeValue(scAttr: sch.Attribute, context: { xDoc: XMLDocument, position: lsp.Position }): lsp.Hover | undefined {
        switch (scAttr.type.builtinType) {
            default:
            {
                const wordRange = context.xDoc.tdoc.getWordRangeAtPosition(context.position, this.slSrv.wordPattern);
                if (!wordRange) break;
                const flatEnum = this.store.schema.flattenSTypeEnumeration(scAttr.type);
                const matchedEn = flatEnum.get(context.xDoc.tdoc.getText(wordRange));
                if (!matchedEn || !matchedEn.label) break;

                let contents = `**${matchedEn.value}** — ${matchedEn.label}\n\n[${matchedEn.originType.name}](${docsLink('type', matchedEn.originType.name)})`;
                return {
                    contents: <lsp.MarkupContent>{ kind: 'markdown', value: contents },
                    range: wordRange,
                };
                break;
            }
        }
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

                    // fallback onto indeterminate attrs
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
                            hv = this.processAttributeName(scAttr, node);
                        }
                        else if (attr.startValue && (attr.startValue - 1) <= offset && attr.end >= offset) {
                            hv = this.processAttributeValue(scAttr, {
                                xDoc: sourceFile,
                                position: params.position,
                            });
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
