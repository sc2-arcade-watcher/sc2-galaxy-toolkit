import * as vs from 'vscode';
import * as sch from '../schema/base';
import { AbstractProvider, svcRequest } from './provider';
import { createScanner, CharacterCodes } from '../parser/scanner';
import { TokenType, XMLElement, AttrValueKind, XMLDocument } from '../types';
import { getAttrValueKind, getSelectionFragmentAtPosition, getSelectionIndexAtPosition } from '../parser/utils';
import URI from 'vscode-uri';
import { ExpressionParser } from '../parser/expressions';
import { UINavigator, UIBuilder } from '../index/hierarchy';
import { LayoutProcessor } from '../index/processor';

interface DefinitionLinkXNodeOptions {
    originXDoc?: XMLDocument;
    originRange?: {pos: number, end: number};
}

function createDefinitionLinkFromXNode(xdecl: XMLElement, opts: DefinitionLinkXNodeOptions = {}) {
    const xdoc = xdecl.getDocument();
    const posSta = xdoc.tdoc.positionAt(xdecl.start);
    const posEnd = xdoc.tdoc.positionAt(xdecl.startTagEnd ? xdecl.startTagEnd : xdecl.end);

    let originSelectionRange;
    if (opts.originRange) {
        if (!opts.originXDoc) opts.originXDoc = xdoc;
        const originPos = {
            start: opts.originXDoc.tdoc.positionAt(opts.originRange.pos),
            end: opts.originXDoc.tdoc.positionAt(opts.originRange.end),
        };
        originSelectionRange = new vs.Range(
            new vs.Position(originPos.start.line, originPos.start.character),
            new vs.Position(originPos.end.line, originPos.end.character)
        );
    }

    return <vs.DefinitionLink>{
        targetUri: URI.parse(xdoc.tdoc.uri),
        originSelectionRange: originSelectionRange,
        targetRange: new vs.Range(
            new vs.Position(posSta.line, posSta.character),
            new vs.Position(posEnd.line, posEnd.character),
        ),
    };
}

export class DefinitionProvider extends AbstractProvider implements vs.DefinitionProvider {
    protected exParser = new ExpressionParser();
    protected uNavigator: UINavigator;
    protected uBuilder: UIBuilder;
    protected processor: LayoutProcessor;

    protected prepare() {
        this.uNavigator = new UINavigator(this.store.schema, this.store.index);
        this.uBuilder = new UIBuilder(this.store.schema, this.store.index);
        this.processor = new LayoutProcessor(this.store, this.store.index);
    }

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
        const sAttrType = this.processor.getElPropertyType(node, nattr.name);

        if (sAttrType) {
            switch (sAttrType.builtinType) {
                case sch.BuiltinTypeKind.FrameReference:
                {
                    const pathSel = this.exParser.parsePathSelector(nattr.value);
                    const pathIndex = getSelectionIndexAtPosition(pathSel, offset - nattr.startValue + 1);
                    if (pathIndex === void 0) break;

                    const currentDesc = this.store.index.resolveElementDesc(node);
                    const uNode = this.uBuilder.buildNodeFromDesc(currentDesc);
                    const resolvedSel = this.uNavigator.resolveSelection(uNode, pathSel.path);
                    if (resolvedSel.chain.length <= pathIndex) break;

                    for (const xDecl of resolvedSel.chain[pathIndex].mainDesc.xDecls) {
                        dlinks.push(createDefinitionLinkFromXNode(<XMLElement>xDecl, {
                            originXDoc: sourceFile,
                            originRange: {
                                pos: (nattr.startValue + 1) + pathSel.path[pathIndex].pos,
                                end: (nattr.startValue + 1) + pathSel.path[pathIndex].end,
                            }
                        }));
                    }

                    break;
                }
            }
        }

        switch (getAttrValueKind(nattr.value)) {
            case AttrValueKind.Constant:
            case AttrValueKind.ConstantRacial:
            {
                const name = nattr.value.substr(nattr.value.charCodeAt(1) === CharacterCodes.hash ? 2 : 1);
                const citem = this.store.index.constants.get(name);
                if (citem) {
                    for (const decl of citem.declarations) {
                        dlinks.push(createDefinitionLinkFromXNode(decl));
                    }
                }
                break;
            }
        }

        return dlinks.length ? dlinks : void 0;
    }
}
