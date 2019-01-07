import * as vs from 'vscode';
import * as sch from '../schema/base';
import { AbstractProvider, svcRequest } from './provider';
import { createScanner, CharacterCodes } from '../parser/scanner';
import { TokenType, XMLElement, AttrValueKind, XMLDocument, AttrValueKindOffset } from '../types';
import { getAttrValueKind, getSelectionFragmentAtPosition, getSelectionIndexAtPosition } from '../parser/utils';
import URI from 'vscode-uri';
import { ExpressionParser, PathSelector, PropertyBindExpr, SelectorFragment, SyntaxKind } from '../parser/expressions';
import { UINavigator, UIBuilder, FrameNode, AnimationNode, UINode } from '../index/hierarchy';
import { LayoutProcessor } from '../index/processor';
import { DescKind, DescNamespace } from '../index/desc';

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

interface SelectionInfoDesc {
    pathIndex: number;
    selectedFragment: SelectorFragment;
    selectedDesc: DescNamespace;
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

    getSelectedNodeFromPath(pathSel: PathSelector | PropertyBindExpr, xEl: XMLElement, offsRelative: number, pathIndex?: number) {
        if (pathIndex === void 0) {
            pathIndex = getSelectionIndexAtPosition(pathSel, offsRelative);
        }
        if (pathIndex === void 0) return;

        let uNode: UINode;
        if (pathSel.kind === SyntaxKind.PropertyBindExpr) {
            uNode = this.xray.determineActionFrameNode(xEl);
        }
        else {
            uNode = this.xray.determineCurrentFrameNode(xEl);
        }
        if (!uNode) return;

        const resolvedSel = this.uNavigator.resolveSelection(uNode, pathSel.path);
        if (resolvedSel.chain.length <= pathIndex) return;
        return {
            resolvedSel: resolvedSel,
            pathIndex: pathIndex,
            selectedFragment: pathSel.path[pathIndex],
            selectedNode: resolvedSel.chain[pathIndex],
        };
    }

    getSelectedDescFromPath(pathSel: PathSelector, offsRelative: number, fileDesc?: DescNamespace): SelectionInfoDesc {
        if (fileDesc === void 0) {
            fileDesc = this.dIndex.rootNs;
        }

        const pathIndex = getSelectionIndexAtPosition(pathSel, offsRelative);

        const fragments = pathSel.path.map(item => item.name.name).slice(0, pathIndex + 1);
        const dsItem = fileDesc.getMulti(...fragments);

        return {
            pathIndex: pathIndex,
            selectedFragment: pathSel.path[pathIndex],
            selectedDesc: dsItem,
        };
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
        const offsRelative = offset - (nattr.startValue + 1);

        function processUNode(uNode: UINode, selFrag: SelectorFragment) {
            for (const xDecl of uNode.mainDesc.xDecls) {
                dlinks.push(createDefinitionLinkFromXNode(<XMLElement>xDecl, {
                    originXDoc: sourceFile,
                    originRange: {
                        pos: (nattr.startValue + 1) + selFrag.pos,
                        end: (nattr.startValue + 1) + selFrag.end,
                    }
                }));
            }
        }

        function processDesc(cdesc: DescNamespace) {
            for (const xDecl of cdesc.xDecls) {
                dlinks.push(createDefinitionLinkFromXNode(<XMLElement>xDecl));
            }
        }

        function processSelectionInfoDesc(selectionInfo: SelectionInfoDesc) {
            for (const xDecl of selectionInfo.selectedDesc.xDecls) {
                dlinks.push(createDefinitionLinkFromXNode(<XMLElement>xDecl, {
                    originXDoc: sourceFile,
                    originRange: {
                        pos: (nattr.startValue + 1) + selectionInfo.selectedFragment.pos,
                        end: (nattr.startValue + 1) + selectionInfo.selectedFragment.end,
                    }
                }));
            }
        }

        if (sAttrType) {
            switch (sAttrType.builtinType) {
                case sch.BuiltinTypeKind.FrameReference:
                {
                    const pathSel = this.exParser.parsePathSelector(nattr.value);
                    const selectionInfo = this.getSelectedNodeFromPath(pathSel, node, offsRelative);
                    if (!selectionInfo) break;

                    processUNode(selectionInfo.selectedNode, selectionInfo.selectedFragment);

                    break;
                }

                case sch.BuiltinTypeKind.DescName:
                {
                    const currentDesc = this.store.index.resolveElementDesc(node);
                    if (node.hasAttribute('file')) {
                        const fileDesc = this.store.index.rootNs.get(node.getAttributeValue('file'));
                        if (!fileDesc) break;

                        const pathSel = this.exParser.parsePathSelector(nattr.value);
                        const selectionInfo = this.getSelectedDescFromPath(pathSel, offsRelative, fileDesc);
                        if (!selectionInfo) break;

                        processSelectionInfoDesc(selectionInfo);
                    }
                    else {
                        let uNode = this.uBuilder.buildNodeFromDesc(currentDesc);
                        if (!uNode) break;
                        for (const cdesc of uNode.descs) {
                            if (cdesc === currentDesc) continue;
                            processDesc(cdesc);
                        }
                    }
                    break;
                }

                case sch.BuiltinTypeKind.FileDescName:
                {
                    const fileDesc = this.dIndex.rootNs.get(nattr.value);
                    if (!fileDesc) break;
                    for (const xDecl of fileDesc.xDecls) {
                        dlinks.push(createDefinitionLinkFromXNode(<XMLElement>xDecl));
                    }
                    break;
                }

                case sch.BuiltinTypeKind.DescTemplateName:
                {
                    const pathSel = this.exParser.parsePathSelector(nattr.value);
                    const selectionInfo = this.getSelectedDescFromPath(pathSel, offsRelative);
                    if (!selectionInfo) break;

                    processSelectionInfoDesc(selectionInfo);
                    break;
                }

                case sch.BuiltinTypeKind.EventName:
                {
                    const uNode = this.xray.determineTargetFrameNode(node);
                    if (!uNode) return;
                    for (const uAnim of this.uNavigator.getChildrenOfType<AnimationNode>(uNode, DescKind.Animation).values()) {
                        const matchingEvs = uAnim.getEvents().get(nattr.value);
                        if (!matchingEvs) continue;
                        for (const xDecl of matchingEvs) {
                            dlinks.push(createDefinitionLinkFromXNode(xDecl));
                        }
                    }
                }
            }
        }

        const vKind = getAttrValueKind(nattr.value);
        switch (vKind) {
            case AttrValueKind.Constant:
            case AttrValueKind.ConstantRacial:
            case AttrValueKind.ConstantFactional:
            {
                const name = nattr.value.substr(AttrValueKindOffset[vKind]);
                const citem = this.store.index.constants.get(name);
                if (citem) {
                    for (const decl of citem.declarations) {
                        dlinks.push(createDefinitionLinkFromXNode(decl));
                    }
                }
                break;
            }

            case AttrValueKind.PropertyBind:
            {
                const pbindSel = this.exParser.parsePropertyBind(nattr.value);

                if (pbindSel.path.pos <= offsRelative && pbindSel.path.end >= offsRelative) {
                    const selectionInfo = this.getSelectedNodeFromPath(pbindSel, node, offsRelative);
                    if (!selectionInfo) break;

                    processUNode(selectionInfo.selectedNode, selectionInfo.selectedFragment);
                }
                else if (pbindSel.property.pos <= offsRelative && pbindSel.property.end >= offsRelative) {
                    const selectionInfo = this.getSelectedNodeFromPath(pbindSel, node, offsRelative, pbindSel.path.length - 1);
                    if (!selectionInfo) break;

                    for (const xDecl of selectionInfo.selectedNode.mainDesc.xDecls) {
                        for (const xField of xDecl.children) {
                            if (xField.tag.toLowerCase() !== pbindSel.property.name.toLowerCase()) continue;
                            dlinks.push(createDefinitionLinkFromXNode(xField, {
                                originXDoc: sourceFile,
                                originRange: {
                                    pos: (nattr.startValue + 1) + pbindSel.property.pos,
                                    end: (nattr.startValue + 1) + pbindSel.property.end,
                                }
                            }));
                        }
                    }
                }
                break;
            }
        }

        return dlinks.length ? dlinks : void 0;
    }
}
