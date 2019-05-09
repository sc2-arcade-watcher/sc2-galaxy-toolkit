import * as vs from 'vscode';
import * as sch from '../schema/base';
import { AbstractProvider, svcRequest } from './provider';
import { createScanner, CharacterCodes } from '../parser/scanner';
import { TokenType, XMLElement, AttrValueKind, XMLDocument, AttrValueKindOffset, XMLAttr, XMLNode } from '../types';
import { getAttrValueKind, getSelectionFragmentAtPosition, getSelectionIndexAtPosition } from '../parser/utils';
import URI from 'vscode-uri';
import { ExpressionParser, PathSelector, PropertyBindExpr, SelectorFragment, SyntaxKind } from '../parser/expressions';
import { UINavigator, UIBuilder, FrameNode, AnimationNode, UINode } from '../index/hierarchy';
import { LayoutProcessor } from '../index/processor';
import { DescKind, DescNamespace } from '../index/desc';
import { LayoutChecker } from '../index/checker';

function getVsTextRange(xDoc: XMLDocument, start: number, end: number) {
    const origin = {
        start: xDoc.tdoc.positionAt(start),
        end: xDoc.tdoc.positionAt(end),
    };
    return new vs.Range(
        new vs.Position(origin.start.line, origin.start.character),
        new vs.Position(origin.end.line, origin.end.character)
    );
}

export const enum DefinitionItemKind {
    Unknown,
    XNode,
    DescNode,
    UINode,
}

export interface DefinitionContainer {
    xSrcEl: XMLElement;
    xSrcAttr: XMLAttr;
    srcTextRange: vs.Range;
    itemKind: DefinitionItemKind;
    itemData: DefinitionXNode | DefinitionDescNode | UINode;

    xEl?: DefinitionXNode;
    descNode?: DefinitionDescNode;
    uNode?: UINode;
}

export interface DefinitionXNode {
    xNodes: XMLElement[];
}

export interface DefinitionDescNode {
    selectedDescs: DescNamespace[];
    pathIndex: number;
    selectedFragment: SelectorFragment;
}

export interface DefinitionUINode extends DefinitionDescNode {
    selectedNode: UINode;
}

export class DefinitionProvider extends AbstractProvider implements vs.DefinitionProvider {
    protected exParser = new ExpressionParser();
    protected uNavigator: UINavigator;
    protected uBuilder: UIBuilder;
    protected processor: LayoutProcessor;
    protected checker: LayoutChecker;

    protected prepare() {
        this.uNavigator = new UINavigator(this.store.schema, this.store.index);
        this.uBuilder = new UIBuilder(this.store.schema, this.store.index);
        this.processor = new LayoutProcessor(this.store, this.store.index);
        this.checker = new LayoutChecker(this.store, this.store.index);
    }

    protected getSelectedNodeFromPath(pathSel: PathSelector | PropertyBindExpr, xEl: XMLElement, offsRelative: number): DefinitionUINode {
        const pathIndex = getSelectionIndexAtPosition(pathSel, offsRelative);
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
            pathIndex: pathIndex,
            selectedFragment: pathSel.path[pathIndex],
            selectedDescs: Array.from(resolvedSel.chain[pathIndex].descs),
            selectedNode: resolvedSel.chain[pathIndex],
        };
    }

    protected getStaticDescFromPath(pathSel: PathSelector, offsRelative: number, fileDesc?: DescNamespace): DefinitionDescNode {
        if (fileDesc === void 0) {
            fileDesc = this.dIndex.rootNs;
        }

        const pathIndex = getSelectionIndexAtPosition(pathSel, offsRelative);
        if (pathIndex === void 0) return;

        const fragments = pathSel.path.map(item => item.name.name).slice(0, pathIndex + 1);
        const dsItem = fileDesc.getMulti(...fragments);
        if (!dsItem) return;

        return {
            pathIndex: pathIndex,
            selectedFragment: pathSel.path[pathIndex],
            selectedDescs: [dsItem],
        };
    }

    protected getMergedDescFromPath(pathSel: PathSelector, offsRelative: number, relativeDesc: DescNamespace): DefinitionDescNode {
        const pathIndex = getSelectionIndexAtPosition(pathSel, offsRelative);
        const resolvedDesc = this.checker.resolveDescPath(relativeDesc, pathSel);
        if (resolvedDesc.items.length <= pathIndex) return;
        return {
            pathIndex: pathIndex,
            selectedFragment: pathSel.path[pathIndex],
            selectedDescs: resolvedDesc.items[pathIndex]
        };
    }

    getDefinitionAtOffset(xDoc: XMLDocument, offset: number) {
        const xEl = <XMLElement>xDoc.findNodeAt(offset);
        if (!xEl || !(xEl instanceof XMLElement) || !xEl.stype) return void 0;
        if (xEl.closed) {
            if (xEl.selfClosed && offset > xEl.end) return void 0;
            if (!xEl.selfClosed && offset > xEl.startTagEnd) return void 0;
        }

        const nattr = xEl.findAttributeAt(offset);
        if (!nattr || !nattr.startValue || nattr.startValue > offset) return void 0;
        const sAttrType = this.processor.getElPropertyType(xEl, nattr.name);
        const offsRelative = offset - (nattr.startValue + 1);

        const defContainer: DefinitionContainer = {
            xSrcEl: xEl,
            xSrcAttr: nattr,
            srcTextRange: null,
            itemKind: DefinitionItemKind.Unknown,
            itemData: null,
        };

        if (sAttrType) {
            switch (sAttrType.builtinType) {
                case sch.BuiltinTypeKind.FrameReference:
                {
                    const pathSel = this.exParser.parsePathSelector(nattr.value);
                    defContainer.itemKind = DefinitionItemKind.UINode;
                    defContainer.itemData = this.getSelectedNodeFromPath(pathSel, xEl, offsRelative);
                    break;
                }

                case sch.BuiltinTypeKind.DescName:
                {
                    const currentDesc = this.store.index.resolveElementDesc(xEl);
                    defContainer.itemKind = DefinitionItemKind.DescNode;

                    if (xEl.hasAttribute('file')) {
                        const fileDesc = this.store.index.rootNs.get(xEl.getAttributeValue('file'));
                        if (!fileDesc) break;
                        const pathSel = this.exParser.parsePathSelector(nattr.value);

                        defContainer.itemData = this.getMergedDescFromPath(pathSel, offsRelative, fileDesc);
                    }
                    else {
                        let uNode = this.uBuilder.buildNodeFromDesc(currentDesc);
                        if (!uNode) break;
                        defContainer.itemData = <DefinitionDescNode>{
                            pathIndex: 0,
                            selectedFragment: {
                                pos: 0,
                                end: nattr.value.length,
                            },
                            selectedDescs: Array.from(uNode.descs),
                        };
                    }
                    break;
                }

                case sch.BuiltinTypeKind.FileDescName:
                {
                    const fileDesc = this.dIndex.rootNs.get(nattr.value);
                    if (!fileDesc) break;
                    defContainer.itemKind = DefinitionItemKind.DescNode;
                    defContainer.itemData = <DefinitionDescNode>{
                        pathIndex: 0,
                        selectedFragment: {
                            pos: 0,
                            end: nattr.value.length,
                        },
                        selectedDescs: [fileDesc],
                    };
                    break;
                }

                case sch.BuiltinTypeKind.DescTemplateName:
                {
                    const pathSel = this.exParser.parsePathSelector(nattr.value);
                    defContainer.itemKind = DefinitionItemKind.DescNode;
                    defContainer.itemData = this.getStaticDescFromPath(pathSel, offsRelative);
                    break;
                }

                case sch.BuiltinTypeKind.DescInternal:
                {
                    const currentDesc = this.store.index.resolveElementDesc(xEl);
                    const pathSel = this.exParser.parsePathSelector(nattr.value);
                    defContainer.itemKind = DefinitionItemKind.DescNode;
                    defContainer.itemData = this.getMergedDescFromPath(pathSel, offsRelative, currentDesc);
                    break;
                }

                case sch.BuiltinTypeKind.EventName:
                {
                    const uNode = this.xray.determineTargetFrameNode(xEl);
                    if (!uNode) return;
                    for (const uAnim of this.uNavigator.getChildrenOfType<AnimationNode>(uNode, DescKind.Animation).values()) {
                        const matchingEvs = uAnim.getEvents().get(nattr.value);
                        if (!matchingEvs) continue;
                        defContainer.itemKind = DefinitionItemKind.XNode;
                        defContainer.itemData = <DefinitionXNode>{
                            xNodes: matchingEvs,
                        };
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
                    defContainer.itemKind = DefinitionItemKind.XNode;
                    defContainer.itemData = <DefinitionXNode>{
                        xNodes: Array.from(citem.declarations),
                    };
                }
                break;
            }

            case AttrValueKind.PropertyBind:
            {
                const pbindSel = this.exParser.parsePropertyBind(nattr.value);
                defContainer.itemKind = DefinitionItemKind.UINode;

                if (pbindSel.path.pos <= offsRelative && pbindSel.path.end >= offsRelative) {
                    defContainer.itemData = this.getSelectedNodeFromPath(pbindSel, xEl, offsRelative);
                }
                else if (pbindSel.property.pos <= offsRelative && pbindSel.property.end >= offsRelative) {
                    const defUNode = this.getSelectedNodeFromPath(pbindSel, xEl, pbindSel.path[pbindSel.path.length - 1].end - 1);
                    if (!defUNode) return;

                    defContainer.itemKind = DefinitionItemKind.XNode;
                    defContainer.itemData = <DefinitionXNode>{
                        xNodes: [],
                    };

                    for (const xDecl of defUNode.selectedNode.mainDesc.xDecls) {
                        for (const xField of xDecl.children) {
                            if (xField.tag.toLowerCase() !== pbindSel.property.name.toLowerCase()) continue;
                            defContainer.itemData.xNodes.push(xField);
                        }
                    }

                    if (!defContainer.itemData.xNodes.length) return;

                    defContainer.srcTextRange = getVsTextRange(
                        xDoc,
                        (nattr.startValue + 1) + pbindSel.property.pos,
                        (nattr.startValue + 1) + pbindSel.property.end,
                    );
                }
                break;
            }
        }

        if (!defContainer.itemData) return;

        switch (defContainer.itemKind) {
            case DefinitionItemKind.DescNode:
            case DefinitionItemKind.UINode:
            {
                const selFrag = (<DefinitionDescNode>defContainer.itemData).selectedFragment;
                defContainer.srcTextRange = getVsTextRange(
                    xDoc,
                    (nattr.startValue + 1) + selFrag.pos,
                    (nattr.startValue + 1) + selFrag.end
                );
                break;
            }

            case DefinitionItemKind.XNode:
            {
                if (!defContainer.srcTextRange) {
                    defContainer.srcTextRange = getVsTextRange(xDoc, nattr.startValue + 1, nattr.end - 1);
                }
                break;
            }
        }

        return defContainer;
    }

    @svcRequest(false)
    async provideDefinition(document: vs.TextDocument, position: vs.Position, cancToken: vs.CancellationToken) {
        const xDoc = await this.svcContext.syncVsDocument(document);
        const offset = xDoc.tdoc.offsetAt(position);
        const defContainer = this.getDefinitionAtOffset(xDoc, offset);
        if (!defContainer) return;

        const defLinks: vs.DefinitionLink[] = [];

        function appendDefLinkFromXNode(xDecl: XMLNode) {
            if (xDecl === defContainer.xSrcEl) return;

            const xTargetDoc = xDecl.getDocument();
            const posSta = xTargetDoc.tdoc.positionAt(xDecl.start);
            const posEnd = xTargetDoc.tdoc.positionAt((<XMLElement>xDecl).startTagEnd ? (<XMLElement>xDecl).startTagEnd : xDecl.end);

            defLinks.push(<vs.DefinitionLink>{
                originSelectionRange: defContainer.srcTextRange,
                targetUri: URI.parse(xTargetDoc.tdoc.uri),
                targetRange: new vs.Range(
                    new vs.Position(posSta.line, posSta.character),
                    new vs.Position(posEnd.line, posEnd.character),
                ),
            });
        }

        switch (defContainer.itemKind) {
            case DefinitionItemKind.DescNode:
            case DefinitionItemKind.UINode:
            {
                for (const cdesc of (<DefinitionDescNode>defContainer.itemData).selectedDescs) {
                    for (const xDecl of cdesc.xDecls) {
                        appendDefLinkFromXNode(xDecl);
                    }
                }
                break;
            }

            case DefinitionItemKind.XNode:
            {
                for (const xDecl of (<DefinitionXNode>defContainer.itemData).xNodes) {
                    appendDefLinkFromXNode(xDecl);
                }
                break;
            }
        }

        return defLinks;
    }
}
