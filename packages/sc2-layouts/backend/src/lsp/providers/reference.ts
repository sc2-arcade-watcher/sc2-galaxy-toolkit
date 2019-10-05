import * as lsp from 'vscode-languageserver';
import { AbstractProvider, errGuard } from '../provider';
import { DefinitionProvider, DefinitionItemKind, DefinitionDescNode } from './definition';
import { DescKind } from '../../index/desc';
import { vsLocationOfXEl, getAttrInfoAtPosition } from '../helpers';
import { BuiltinTypeKind } from '../../schema/base';
import { logIt } from '../../logger';


export class ReferenceProvider extends AbstractProvider {
    install() {
        this.slSrv.conn.onReferences(this.provideReferences.bind(this))
    }

    @errGuard()
    @logIt()
    async provideReferences(params: lsp.ReferenceParams, token: lsp.CancellationToken): Promise<lsp.Location[]> {
        const xDoc = await this.slSrv.flushDocumentByUri(params.textDocument.uri);
        if (!xDoc) return;

        const offset = xDoc.tdoc.offsetAt(params.position);

        const attrInfo = getAttrInfoAtPosition(xDoc, offset);
        if (!attrInfo || !attrInfo.sType) return;

        const results: lsp.Location[] = [];

        switch (attrInfo.sType.builtinType) {
            case BuiltinTypeKind.ConstantName:
            {
                const cItem = this.store.index.constants.get(attrInfo.xAttr.value);
                if (!cItem) break;
                // TODO:
                break;
            }
        }

        const defContainer = this.slSrv.providers.definition.getDefinitionAtOffset(xDoc, offset);
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
