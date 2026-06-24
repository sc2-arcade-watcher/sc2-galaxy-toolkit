import * as sch from '../schema/base';
import { ExpressionParser } from '../parser/expressions';
import { UINavigator, UIBuilder, FrameNode, StateGroupNode } from './hierarchy';
import { DescIndex } from './desc';
import { XMLElement } from '../types';
import { Store } from './store';

export class XRay {
    protected exParser = new ExpressionParser();
    public readonly uNavigator: UINavigator;
    public readonly uBuilder: UIBuilder;
    public readonly dIndex: DescIndex;

    constructor(protected store: Store) {
        this.uNavigator = new UINavigator(this.store.schema, this.store.index);
        this.uBuilder = new UIBuilder(this.store.schema, this.store.index);
        this.dIndex = this.store.index;
    }

    matchIndeterminateAttr(xEl: XMLElement, attrName: string) {
        if (!xEl.stype.indeterminateAttributes.size) return;

        for (const [sname, sattr] of xEl.stype.attributes) {
            if (!sattr.required) continue;
            if (!xEl.attributes[sname]) return;
        }

        for (const atKey in xEl.attributes) {
            if (xEl.stype.attributes.has(atKey)) continue;
            if (xEl.attributes[atKey].name !== attrName) {
                return;
            }
            break;
        }

        return Array.from(xEl.stype.indeterminateAttributes.values())[0];
    }

    determineCurrentFrameNode(xEl: XMLElement) {
        const currentDesc = this.store.index.resolveElementDesc(xEl);
        let uNode = this.uBuilder.buildNodeFromDesc(currentDesc);
        if (!uNode) return;
        uNode = this.uNavigator.getContextFrameNode(uNode);
        if (!uNode) return;
        return uNode;
    }

    determineActionFrameNode(xEl: XMLElement) {
        let uNode = this.determineCurrentFrameNode(xEl);
        if (!uNode) return;

        let uTargetNode = uNode;
        switch (xEl.sdef.nodeKind) {
            case sch.ElementDefKind.StateGroupStateAction:
            {
                const av = xEl.getAttributeValue('frame', void 0);
                if (!av) break;

                const pathSel = this.exParser.parsePathSelector(av);
                uTargetNode = this.uNavigator.resolveSelection(uNode, pathSel.path).target;
                if (!uTargetNode) return;
            }
        }

        this.uBuilder.expandNode(uTargetNode);
        return <FrameNode>uTargetNode;
    }

    determineTargetFrameNode(xEl: XMLElement) {
        switch (xEl.sdef.nodeKind) {
            case sch.ElementDefKind.AnimationControllerKey:
            {
                xEl = <XMLElement>xEl.parent;
                break;
            }
        }

        let uNode = this.determineCurrentFrameNode(xEl);
        if (!uNode) return;

        let uTargetNode = uNode;
        switch (xEl.sdef.nodeKind) {
            case sch.ElementDefKind.AnimationController:
            case sch.ElementDefKind.StateGroupStateCondition:
            case sch.ElementDefKind.StateGroupStateAction:
            {
                const av = xEl.getAttributeValue('frame', void 0);
                if (!av) break;

                const pathSel = this.exParser.parsePathSelector(av);
                uTargetNode = this.uNavigator.resolveSelection(uNode, pathSel.path).target;
                if (!uTargetNode) return;
            }
        }

        this.uBuilder.expandNode(uTargetNode);
        return <FrameNode>uTargetNode;
    }

    determineTargetStateGroup(xEl: XMLElement, sgname: string = void 0) {
        const uFrame = this.determineTargetFrameNode(xEl);
        if (!uFrame) return;
        // let sgname: string;

        switch (xEl.sdef.nodeKind) {
            case sch.ElementDefKind.AnimationControllerKey:
            {
                sgname = (<XMLElement>xEl.parent).getAttributeValue('stategroup', null);
                break;
            }

            case sch.ElementDefKind.StateGroupStateCondition:
            {
                if (sgname !== void 0) break;
                // TODO: fix it
                sgname = Object.values(xEl.attributes).pop().name;
                break;
            }

            case sch.ElementDefKind.StateGroupStateAction:
            {
                sgname = xEl.getAttributeValue('group', null);
                break;
            }

            case sch.ElementDefKind.StateGroupDefaultState:
            {
                sgname = (<XMLElement>xEl.parent).getAttributeValue('name', null);
                break;
            }
        }

        if (!sgname) return;
        const sgNode = <StateGroupNode>uFrame.getChild(sgname);
        if (!(sgNode instanceof StateGroupNode)) return;

        return sgNode;
    }
}
