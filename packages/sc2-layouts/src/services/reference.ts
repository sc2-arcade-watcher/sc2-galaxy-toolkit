import * as vs from 'vscode';
import { AbstractProvider, svcRequest } from './provider';
import { DefinitionProvider, DefinitionItemKind, DefinitionDescNode } from './definition';
import { DescKind } from '../index/desc';
import { vsLocationOfXEl, getAttrInfoAtPosition } from './helpers';
import { BuiltinTypeKind } from '../schema/base';


export class ReferenceProvider extends AbstractProvider implements vs.ReferenceProvider {
    defProvider: DefinitionProvider;

    @svcRequest()
    async provideReferences(document: vs.TextDocument, position: vs.Position, context: vs.ReferenceContext, token: vs.CancellationToken): Promise<vs.Location[]> {
        const xDoc = await this.svcContext.syncVsDocument(document);
        const offset = xDoc.tdoc.offsetAt(position);

        const attrInfo = getAttrInfoAtPosition(xDoc, offset);
        if (!attrInfo || !attrInfo.sType) return;

        const results: vs.Location[] = [];

        switch (attrInfo.sType.builtinType) {
            case BuiltinTypeKind.ConstantName:
            {
                const cItem = this.store.index.constants.get(attrInfo.xAttr.value);
                if (!cItem) break;
                // TODO:
                break;
            }
        }

        const defContainer = this.defProvider.getDefinitionAtOffset(xDoc, offset);
        if (defContainer) {
            switch (defContainer.itemKind) {
                case DefinitionItemKind.DescNode:
                {
                    const selectedDescs = (<DefinitionDescNode>defContainer.itemData).selectedDescs;
                    switch (selectedDescs[0].kind) {
                        case DescKind.File:
                        {
                            const descItem = this.dIndex.rootNs.get(selectedDescs[0].fqn);
                            if (!descItem) break;
                            for (const xDecl of descItem.xDecls) {
                                results.push(vsLocationOfXEl(xDecl));
                            }
                            break;
                        }

                        case DescKind.Frame:
                        case DescKind.Animation:
                        case DescKind.StateGroup:
                        {
                            const tpls = this.dIndex.tplRefs.get(selectedDescs[0].fqn);
                            if (!tpls) break;
                            for (const descItem of tpls) {
                                for (const xDecl of descItem.xDecls) {
                                    results.push(vsLocationOfXEl(xDecl));
                                }
                            }
                            break;
                        }
                    }
                    break;
                }

                case DefinitionItemKind.XNode:
                {
                    break;
                }
            }
        }

        return results;
    }
}
