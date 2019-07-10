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
import { getAttrInfoAtPosition } from './helpers';

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
    sAttrType: sch.SimpleType,
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

    protected getMergedDescFromFilePath(pathSel: PathSelector, offsRelative: number, fileDesc: DescNamespace): DefinitionDescNode {
        const pathIndex = getSelectionIndexAtPosition(pathSel, offsRelative);
        if (pathIndex === void 0) return;

        const topDesc = fileDesc.get(pathSel.path[0].name.name);
        if (!topDesc) return;

        const uNode = this.uBuilder.buildNodeFromDesc(topDesc);
        if (!uNode) return;

        let selectedDescs = Array.from(uNode.descs);

        if (pathIndex > 0) {
            const fragments = pathSel.path.slice(1, pathIndex + 1);
            const resolvedSel = this.uNavigator.resolveSelection(uNode, fragments);
            if (resolvedSel.chain.length <= pathIndex - 1) return;
            selectedDescs = Array.from(resolvedSel.chain[pathIndex - 1].descs);
        }

        return {
            pathIndex: pathIndex,
            selectedFragment: pathSel.path[pathIndex],
            selectedDescs: selectedDescs,
        };
    }

    protected getMergedDescFromPath(pathSel: PathSelector, offsRelative: number, relativeDesc: DescNamespace): DefinitionDescNode {
        const pathIndex = getSelectionIndexAtPosition(pathSel, offsRelative);
        if (pathIndex === void 0) return;

        const resolvedDesc = this.checker.resolveDescPath(relativeDesc, pathSel);
        if (resolvedDesc.items.length <= pathIndex) return;
        return {
            pathIndex: pathIndex,
            selectedFragment: pathSel.path[pathIndex],
            selectedDescs: resolvedDesc.items[pathIndex]
        };
    }

    getDefinitionAtOffset(xDoc: XMLDocument, offset: number) {
        const attrInfo = getAttrInfoAtPosition(xDoc, offset);
        if (!attrInfo) return;
        if (!attrInfo.sType) {
            attrInfo.sType = this.processor.getElPropertyType(attrInfo.xEl, attrInfo.xAttr.name);
            if (!attrInfo.sType) return;
        }

        const defContainer: DefinitionContainer = {
            xSrcEl: attrInfo.xEl,
            xSrcAttr: attrInfo.xAttr,
            sAttrType: attrInfo.sType,
            srcTextRange: null,
            itemKind: DefinitionItemKind.Unknown,
            itemData: null,
        };

        if (attrInfo.sType) {
            switch (attrInfo.sType.builtinType) {
                case sch.BuiltinTypeKind.FrameReference:
                {
                    const pathSel = this.exParser.parsePathSelector(attrInfo.xAttr.value);
                    defContainer.itemKind = DefinitionItemKind.UINode;
                    defContainer.itemData = this.getSelectedNodeFromPath(pathSel, attrInfo.xEl, attrInfo.offsetRelative);
                    break;
                }

                case sch.BuiltinTypeKind.DescName:
                {
                    const currentDesc = this.store.index.resolveElementDesc(attrInfo.xEl);
                    defContainer.itemKind = DefinitionItemKind.DescNode;

                    if (attrInfo.xEl.hasAttribute('file')) {
                        const fileDesc = this.store.index.rootNs.get(attrInfo.xEl.getAttributeValue('file'));
                        if (!fileDesc) break;
                        const pathSel = this.exParser.parsePathSelector(attrInfo.xAttr.value);

                        defContainer.itemData = this.getMergedDescFromFilePath(pathSel, attrInfo.offsetRelative, fileDesc);
                    }
                    else {
                        let uNode = this.uBuilder.buildNodeFromDesc(currentDesc);
                        if (!uNode) break;
                        defContainer.itemData = <DefinitionDescNode>{
                            pathIndex: 0,
                            selectedFragment: {
                                pos: 0,
                                end: attrInfo.xAttr.value.length,
                            },
                            selectedDescs: Array.from(uNode.descs),
                        };
                    }
                    break;
                }

                case sch.BuiltinTypeKind.FileDescName:
                {
                    const fileDesc = this.dIndex.rootNs.get(attrInfo.xAttr.value);
                    if (!fileDesc) break;
                    defContainer.itemKind = DefinitionItemKind.DescNode;
                    defContainer.itemData = <DefinitionDescNode>{
                        pathIndex: 0,
                        selectedFragment: {
                            pos: 0,
                            end: attrInfo.xAttr.value.length,
                        },
                        selectedDescs: [fileDesc],
                    };
                    break;
                }

                case sch.BuiltinTypeKind.DescTemplateName:
                {
                    const pathSel = this.exParser.parsePathSelector(attrInfo.xAttr.value);
                    defContainer.itemKind = DefinitionItemKind.DescNode;
                    defContainer.itemData = this.getStaticDescFromPath(pathSel, attrInfo.offsetRelative);
                    break;
                }

                case sch.BuiltinTypeKind.DescInternal:
                {
                    const currentDesc = this.store.index.resolveElementDesc(attrInfo.xEl);
                    const pathSel = this.exParser.parsePathSelector(attrInfo.xAttr.value);
                    defContainer.itemKind = DefinitionItemKind.DescNode;
                    defContainer.itemData = this.getMergedDescFromPath(pathSel, attrInfo.offsetRelative, currentDesc);
                    break;
                }

                case sch.BuiltinTypeKind.EventName:
                {
                    const uNode = this.xray.determineTargetFrameNode(attrInfo.xEl);
                    if (!uNode) return;
                    for (const uAnim of this.uNavigator.getChildrenOfType<AnimationNode>(uNode, DescKind.Animation).values()) {
                        const matchingEvs = uAnim.getEvents().get(attrInfo.xAttr.value);
                        if (!matchingEvs) continue;
                        defContainer.itemKind = DefinitionItemKind.XNode;
                        defContainer.itemData = <DefinitionXNode>{
                            xNodes: matchingEvs,
                        };
                    }
                }
            }
        }

        const vKind = getAttrValueKind(attrInfo.xAttr.value);
        switch (vKind) {
            case AttrValueKind.Constant:
            case AttrValueKind.ConstantRacial:
            case AttrValueKind.ConstantFactional:
            {
                const name = attrInfo.xAttr.value.substr(AttrValueKindOffset[vKind]);
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
                const pbindSel = this.exParser.parsePropertyBind(attrInfo.xAttr.value);
                defContainer.itemKind = DefinitionItemKind.UINode;

                if (pbindSel.path.pos <= attrInfo.offsetRelative && pbindSel.path.end >= attrInfo.offsetRelative) {
                    defContainer.itemData = this.getSelectedNodeFromPath(pbindSel, attrInfo.xEl, attrInfo.offsetRelative);
                }
                else if (pbindSel.property.pos <= attrInfo.offsetRelative && pbindSel.property.end >= attrInfo.offsetRelative) {
                    const defUNode = this.getSelectedNodeFromPath(pbindSel, attrInfo.xEl, pbindSel.path[pbindSel.path.length - 1].end - 1);
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
                        (attrInfo.xAttr.startValue + 1) + pbindSel.property.pos,
                        (attrInfo.xAttr.startValue + 1) + pbindSel.property.end,
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
                    (attrInfo.xAttr.startValue + 1) + selFrag.pos,
                    (attrInfo.xAttr.startValue + 1) + selFrag.end
                );
                break;
            }

            case DefinitionItemKind.XNode:
            {
                if (!defContainer.srcTextRange) {
                    defContainer.srcTextRange = getVsTextRange(xDoc, attrInfo.xAttr.startValue + 1, attrInfo.xAttr.end - 1);
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
