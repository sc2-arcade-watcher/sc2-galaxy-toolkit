import * as vs from 'vscode';
import * as sch from '../schema/base';
import { AbstractProvider, svcRequest } from './provider';
import { createDocumentFromVS } from '../service';
import { createScanner, CharacterCodes } from '../parser/scanner';
import { TokenType, XMLElement, AttrValueKind } from '../types';
import { getAttrValueKind } from '../parser/selector';
import URI from 'vscode-uri';

export class DefinitionProvider extends AbstractProvider implements vs.DefinitionProvider {
    @svcRequest(false)
    async provideDefinition(document: vs.TextDocument, position: vs.Position, cancToken: vs.CancellationToken) {
        const sourceFile = await this.svcContext.syncVsDocument(document);
        const dlinks: vs.DefinitionLink[] = [];

        const offset = sourceFile.tdoc.offsetAt(position);
        const node = <XMLElement>sourceFile.findNodeAt(offset);

        if (!node || !(node instanceof XMLElement) || !node.stype) return void 0;
        if (node.closed) {
            if (node.selfClosed && offset > node.end) return void 0;
            if (!node.selfClosed && offset > node.startTagEnd) return void 0;
        }

        const nattr = node.findAttributeAt(offset);
        if (!nattr || !nattr.startValue || nattr.startValue > offset) return void 0;

        switch (getAttrValueKind(nattr.value)) {
            case AttrValueKind.Constant:
            {
                const name = nattr.value.substr(nattr.value.charCodeAt(1) === CharacterCodes.hash ? 2 : 1);
                const citem = this.store.index.constants.get(name);
                if (citem) {
                    for (const decl of citem.declarations) {
                        const xdoc = decl.getDocument();
                        const posSta = xdoc.tdoc.positionAt(decl.start);
                        const posEnd = xdoc.tdoc.positionAt(decl.end);
                        dlinks.push({
                            targetUri: URI.parse(xdoc.tdoc.uri),
                            targetRange: new vs.Range(
                                new vs.Position(posSta.line, posSta.character),
                                new vs.Position(posEnd.line, posEnd.character),
                            ),
                        });
                    }
                }
                break;
            }
        }

        return dlinks.length ? dlinks : void 0;
    }
}