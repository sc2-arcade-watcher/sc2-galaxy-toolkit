import * as sch from '../schema/base';
import { ExpressionParser } from '../parser/expressions';
import { UINavigator, UIBuilder, FrameNode } from './hierarchy';
import { DescIndex } from './desc';
import { XMLElement } from '../types';
import { Store } from './store';

export class XRay {
    protected exParser = new ExpressionParser();
    protected uNavigator: UINavigator;
    protected uBuilder: UIBuilder;
    protected dIndex: DescIndex;

    constructor(protected store: Store) {
        this.uNavigator = new UINavigator(this.store.schema, this.store.index);
        this.uBuilder = new UIBuilder(this.store.schema, this.store.index);
        this.dIndex = this.store.index;
    }

    determineTargetFrameNode(xEl: XMLElement) {
        switch (xEl.sdef.nodeKind) {
            case sch.ElementDefKind.AnimationControllerKey:
            {
                xEl = <XMLElement>xEl.parent;
                break;
            }
        }

        const currentDesc = this.store.index.resolveElementDesc(xEl);
        let uNode = this.uBuilder.buildNodeFromDesc(currentDesc);
        if (!uNode) return;
        uNode = this.uNavigator.getContextFrameNode(uNode);
        if (!uNode) return;

        let uTargetNode = uNode;
        switch (xEl.sdef.nodeKind) {
            case sch.ElementDefKind.AnimationController:
            case sch.ElementDefKind.AnimationEvent:
            case sch.ElementDefKind.StateGroupStateCondition:
            case sch.ElementDefKind.StateGroupStateAction:
            {
                const av = xEl.getAttributeValue('frame', void 0);
                if (!av) break;
                const pathSel = this.exParser.parsePathSelector(av);
                uTargetNode = this.uNavigator.resolveSelection(uNode, pathSel.path).target;
            }
        }

        return <FrameNode>uTargetNode;
    }
}
