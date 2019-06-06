import * as vs from 'vscode';
import * as sch from '../schema/base';
import { AbstractProvider, svcRequest } from './provider';
import { XMLElement } from '../types';
import { DefinitionProvider, DefinitionItemKind, DefinitionDescNode, DefinitionContainer, DefinitionXNode } from './definition';
import { vsRangeOrPositionOfXNode } from './helpers';

function attrSchDocs(sAttr: sch.Attribute)  {
    let s = '';
    s += `&nbsp;**@**${sAttr.name}${(sAttr.required ? '' : '?')} — [${sAttr.type.name}](https://mapster.talv.space/layouts/frame)`;
    if (sAttr.documentation) {
        s += ' — ' + sAttr.documentation;
    }
    return s;
}

export class HoverProvider extends AbstractProvider implements vs.HoverProvider {
    defProvider: DefinitionProvider;

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

    protected tooltipDefinitionDesc(defContainer: DefinitionContainer, dscNode: DefinitionDescNode): vs.MarkdownString {
        const contents: string[] = [];
        contents.push(`**\`${dscNode.selectedDescs[0].name}\`** — [${dscNode.selectedDescs[0].stype.name}](https://mapster.talv.space/layouts/frame)`);
        for (const desc of dscNode.selectedDescs) {
            contents.push(desc.fqn);
        }
        return new vs.MarkdownString(contents.join('\n\n'));
    }

    @svcRequest(
        false,
        (document: vs.TextDocument, position: vs.Position) => {
            return {
                filename: document.uri.fsPath,
                position: {line: position.line, char: position.character},
            };
        },
        (r: vs.Hover) => typeof r
    )
    async provideHover(document: vs.TextDocument, position: vs.Position, token: vs.CancellationToken) {
        const sourceFile = await this.svcContext.syncVsDocument(document);

        const offset = document.offsetAt(position);
        const node = sourceFile.findNodeAt(offset);
        let hv: vs.Hover;

        if (node instanceof XMLElement && node.stype) {
            if (node.start <= offset && (node.start + node.tag.length + 1) > offset) {
                if (node.sdef) {
                    let contents = '';
                    contents += `**<${node.sdef.name}>** — [${node.sdef.type.name}](https://mapster.talv.space/layouts/frame)`;
                    if (node.sdef.label) {
                        contents += '\n\n' + node.sdef.label;
                    }
                    if (node.stype.label) {
                        contents += `\n\n[${node.stype.name}](https://mapster.talv.space/layouts/frame)\\\n` + node.stype.label;
                    }
                    contents += '\n\n' + Array.from(node.stype.attributes.values()).map(v => attrSchDocs(v)).join('\n\n');
                    hv = new vs.Hover(contents.trim());
                }
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
                            hv = new vs.Hover(
                                new vs.MarkdownString(contents),
                            );
                        }
                        else if (attr.startValue && (attr.startValue - 1) <= offset && attr.end >= offset) {
                            switch (scAttr.type.builtinType) {
                                default:
                                {
                                    const wordRange = document.getWordRangeAtPosition(position);
                                    const matchedEn = this.matchAttrValueEnum(scAttr.type, document.getText(wordRange));
                                    if (matchedEn && matchedEn.label) {
                                        let contents = `**${matchedEn.name}** — ${matchedEn.label}\n\n[${matchedEn.type.name}](https://mapster.talv.space/layouts/frame)`;
                                        hv = new vs.Hover(
                                            new vs.MarkdownString(contents),
                                            wordRange
                                        );
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
            const defContainer = this.defProvider.getDefinitionAtOffset(sourceFile, offset);
            if (!defContainer) return;

            switch (defContainer.itemKind) {
                case DefinitionItemKind.DescNode:
                case DefinitionItemKind.UINode:
                {
                    hv = new vs.Hover(
                        this.tooltipDefinitionDesc(defContainer, <DefinitionDescNode>defContainer.itemData),
                        defContainer.srcTextRange
                    );
                    break;
                }

                case DefinitionItemKind.XNode:
                {
                    const mstr = new vs.MarkdownString();
                    for (const xEl of (<DefinitionXNode>defContainer.itemData).xNodes) {
                        if ((<vs.Range>vsRangeOrPositionOfXNode(xEl)).contains(position)) continue;
                        mstr.appendCodeblock(
                            xEl.getDocument().tdoc.getText(<vs.Range>vsRangeOrPositionOfXNode(xEl)),
                            'sc2layout'
                        )
                    }
                    hv = new vs.Hover(
                        mstr,
                        defContainer.srcTextRange
                    );
                }
            }
        }

        return hv;
    }
}
