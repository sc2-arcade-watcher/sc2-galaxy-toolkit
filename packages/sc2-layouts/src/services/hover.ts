import * as util from 'util';
import * as vs from 'vscode';
import * as sch from '../schema/base';
import { AbstractProvider, svcRequest } from './provider';
import { createDocumentFromVS } from '../service';
import { XMLElement } from '../types';

function attrSchDocs(sAttr: sch.Attribute)  {
    const ms: vs.MarkdownString[] = [];
    ms.push(new vs.MarkdownString(`&nbsp;**@**${sAttr.name}${(sAttr.required ? '' : '?')} — \`${sAttr.type.name}\``));
    if (sAttr.documentation) {
        ms[0].appendMarkdown(' — ' + sAttr.documentation);
    }
    return ms;
}

export class HoverProvider extends AbstractProvider implements vs.HoverProvider {
    @svcRequest(false)
    async provideHover(document: vs.TextDocument, position: vs.Position, token: vs.CancellationToken) {
        const sourceFile = await this.svcContext.syncVsDocument(document);

        const offset = document.offsetAt(position);
        const node = sourceFile.findNodeAt(offset);
        let hv: vs.Hover;

        // console.log(util.inspect(node, {depth: 1}));

        if (node instanceof XMLElement) {
            if (node.start <= offset && (node.start + node.tag.length + 1) > offset) {
                if (node.sdef) {
                    hv = <vs.Hover>{
                        contents: [],
                    };
                    hv.contents.push(new vs.MarkdownString(`**${node.sdef.name}** — [${node.sdef.type.name}]`));
                    if (node.sdef.label) {
                        hv.contents.push(new vs.MarkdownString('\n' + node.sdef.label));
                    }
                    for (const sAttr of node.stype.attributes.values()) {
                        hv.contents = hv.contents.concat(attrSchDocs(sAttr));
                    }
                    if (node.sdef.documentation) {
                        hv.contents.push(new vs.MarkdownString('---\n' + node.sdef.documentation));
                    }
                }
            }
            else {
                const attr = node.findAttributeAt(offset);
                if (attr && attr.startValue && attr.startValue >= offset) {
                    const scAttr = node.stype.attributes.get(attr.name);
                    if (scAttr) {
                        hv = <vs.Hover>{
                            contents: attrSchDocs(scAttr),
                        };
                    }
                }
            }
        }

        if (token.isCancellationRequested) return void 0;

        if (hv) {
            hv.range = document.getWordRangeAtPosition(position);
        }

        return hv;
    }
}