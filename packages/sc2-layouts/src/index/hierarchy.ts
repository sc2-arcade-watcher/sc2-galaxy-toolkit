import { DescIndex, DescNamespace, DescKind } from './desc';
import { SchemaRegistry } from '../schema/base';
import { PathSelector, SelectorFragment, SelHandleKind, NodeArray } from '../parser/expressions';
import { splitSlashDelimetedStr } from '../parser/utils';
import * as sch from '../schema/base';
import { XMLElement } from '../types';

export class UINode {
    readonly name: string;
    readonly children = new Map<string, UINode>();
    readonly descs = new Set<DescNamespace>();
    public build = false;
    protected _elements: XMLElement[];

    constructor(public readonly mainDesc: DescNamespace, public readonly parent: UINode = null) {
        this.name = mainDesc.name;
        if (parent) parent.children.set(this.name, this);

        this.descs.add(mainDesc);
    }

    protected collectElements() {
        const mElements: XMLElement[] = [];
        for (const currDesc of Array.from(this.descs).reverse()) {
            for (const xDecl of currDesc.xDecls) {
                for (const xCurrEl of xDecl.children) {
                    mElements.push(xCurrEl);
                }
            }
        }
        return mElements;
    }

    getChild(...names: string[]) {
        let current: UINode = this;
        for (const tmp of names) {
            current = current.children.get(tmp);
            if (!current) break;
        }
        return current;
    }

    findElements(predicate: (itemEl: XMLElement) => boolean) {
        if (!this._elements) this._elements = this.collectElements();

        const mElements: XMLElement[] = [];
        for (const currEl of this._elements) {
            if (!predicate(currEl)) continue;
            mElements.push(currEl);
        }

        return mElements;
    }

    // childrenOfType<T>(tp: typeof UINode) {
    //     const rm = new Map<string, T>();
    //     for (const [key, item] of this.children) {
    //         if (item instanceof tp) {
    //             rm.set(key, <any>item);
    //         }
    //     }
    //     return rm;
    // }

    get topNode() {
        let tmp: UINode = this;
        while (tmp.parent) {
            tmp = tmp.parent;
        }
        return tmp;
    }

    get fqn(): string {
        return (this.parent) ? `${this.parent.fqn}/${this.name}` : this.name;
    }

    get parentNodes(): UINode[] {
        const plist: UINode[] = [];
        let current: UINode = this;

        while (current) {
            plist.push(current);
            current = current.parent;
        }

        return plist;
    }
}

export class FrameNode extends UINode {
    // get animations() {
    //     return this.childrenOfType<AnimationNode>(AnimationNode);
    // }

    // get stateGroups() {
    //     return this.childrenOfType<StateGroupNode>(StateGroupNode);
    // }
}

export class StateGroupNode extends UINode {
    get defaultState() {
        const defs = this.findElements(item => item.sdef.nodeKind === sch.ElementDefKind.StateGroupDefaultState);
        if (!defs.length) return;
        const val = defs.pop().getAttributeValue('val');
        if (!val) return;
        return val;
    }

    get states() {
        const r = new Map<string, XMLElement[]>();
        for (const item of this.findElements(item => item.sdef.nodeKind === sch.ElementDefKind.StateGroupState)) {
            const val = item.getAttributeValue('name', null);
            if (val === null || val === '') continue;
            let entry = r.get(val);
            if (!entry) {
                entry = [];
                r.set(val, entry);
            }
            entry.push(item);
        }
        return r;
    }
}

export class AnimationNode extends UINode {
    getEvents() {
        const r = new Map<string, XMLElement[]>();
        for (const item of this.findElements(item => item.sdef.nodeKind === sch.ElementDefKind.AnimationEvent)) {
            const val = item.getAttributeValue('event', null);
            if (val === null || val === '') continue;
            let entry = r.get(val);
            if (!entry) {
                entry = [];
                r.set(val, entry);
            }
            entry.push(item);
        }
        return r;
    }
}

function createNodeFromDesc(desc: DescNamespace, parent?: UINode) {
    switch (desc.kind) {
        case DescKind.Frame:
            return new FrameNode(desc, parent);
        case DescKind.StateGroup:
            return new StateGroupNode(desc, parent);
        case DescKind.Animation:
            return new AnimationNode(desc, parent);
        default:
            return new UINode(desc, parent);
    }
}

class ResolvedSelection {
    public readonly chain: UINode[] = [];

    constructor(public topNode: UINode, protected path: SelectorFragment[]) {
    }

    get isValid() {
        return this.chain.length === this.path.length;
    }

    get target() {
        if (!this.isValid) return;
        return this.chain[this.chain.length - 1];
    }
}

export class UIBuilder {
    protected rootNs: DescNamespace;

    constructor(protected schema: SchemaRegistry, protected dIndex: DescIndex) {
        this.rootNs = dIndex.rootNs;
    }

    expandNode(initialNode: UINode, tpath: string[] | null = []) {
        const dIndex = this.dIndex;
        const rootNs = this.rootNs;

        function processDesc(uNode: UINode, frDesc: DescNamespace, tpath: string[] | null) {
            uNode.descs.add(frDesc);

            // apply template
            const tplpath = frDesc.template;
            if (tplpath !== null) {
                const tplDesc = rootNs.getDeep(tplpath);
                if (tplDesc) {
                    processDesc(uNode, tplDesc, tpath);
                }
                else {
                    // console.warn('miss', frDesc.name, tplpath);
                }
            }

            // process sub tree
            for (const childDesc of frDesc.children.values()) {
                if (tpath && tpath.length > 0 && tpath[0] !== childDesc.name) continue;

                let childUNode: UINode;
                childUNode = uNode.children.get(childDesc.name);
                if (!childUNode) {
                    childUNode = createNodeFromDesc(childDesc, uNode);
                }
                else {
                    childUNode.descs.add(childDesc);
                }

                if (tpath) {
                    if (!tpath.length) continue;
                    processDesc(childUNode, childDesc, tpath.slice(1));
                }
                else {
                    processDesc(childUNode, childDesc, tpath);
                }
            }

            // include parts of hierarchy that extends this node
            const dExtMap = dIndex.fileRefs.get(frDesc.ancestorOfKind(DescKind.File).name);
            if (dExtMap) {
                const dExSet = dExtMap.get(frDesc.descRelativeName);
                if (dExSet) {
                    for (const extDesc of dExSet.values()) {
                        processDesc(uNode, extDesc, tpath);
                    }
                }
            }

            if (tpath === null || tpath.length === 0) {
                uNode.build = true;
            }
        }

        for (const cDesc of Array.from(initialNode.descs)) {
            processDesc(initialNode, cDesc, tpath);
        }
    }

    determineContextOfDesc(selectedDesc: DescNamespace) {
        let tpath: string[] = [];
        let current = selectedDesc;
        while (current && current.parent.kind !== DescKind.File) {
            tpath.push(current.name);
            current = current.parent;
        }
        if (!current) return;

        let hierarchyRoot = current;
        tpath = tpath.reverse();
        if (current.file) {
            let mount = splitSlashDelimetedStr(current.name);
            const topDesc = this.dIndex.rootNs.getMulti(current.file, mount[0]);
            if (topDesc) {
                hierarchyRoot = topDesc;
                if (mount.length > 1) {
                    tpath = mount.slice(1).concat(tpath);
                }
            }
            else {
                return;
            }
        }

        return {hierarchyRoot, tpath};
    }

    buildNodeFromDesc(selectedDesc: DescNamespace) {
        const context = this.determineContextOfDesc(selectedDesc);
        if (!context) {
            return;
        }
        const parentNode = createNodeFromDesc(context.hierarchyRoot);
        this.expandNode(parentNode, context.tpath);
        return parentNode.getChild(...context.tpath);
    }
}

export class UINavigator {
    protected uBuilder: UIBuilder;

    constructor(protected schema: SchemaRegistry, protected dIndex: DescIndex) {
        this.uBuilder = new UIBuilder(schema, dIndex);
    }

    resolveSelectorFragment(uNode: UINode, selFrag: SelectorFragment) {
        switch (selFrag.selKind) {
            case SelHandleKind.Ancestor:
            {
                if (!selFrag.parameter) break;

                let current: UINode = uNode;

                switch (selFrag.parameter.key.name) {
                    case 'name':
                    {
                        do {
                            current = current.parent;
                        } while (current && current.name !== selFrag.parameter.value.name);
                        return current;
                    }

                    case 'type':
                    {
                        let type = `Frame:${selFrag.parameter.value.name}`;
                        do {
                            current = current.parent;
                        } while (current && current.mainDesc.stype.name !== type);
                        return current;
                    }

                    case 'oftype':
                    {
                        const ftype = this.schema.frameTypes.get(selFrag.parameter.value.name);
                        // TODO: report warnings about invalid type
                        if (!ftype) break;

                        while (true) {
                            current = current.parent;
                            if (!current) break;

                            const currentFType = this.schema.getFrameType(current.mainDesc.stype);
                            if (!currentFType) break;

                            const ofClasses = Array.from(currentFType.fclasses.values());
                            const ofTypes = ofClasses.map(fcls => fcls.name.substr(1));

                            if (ofTypes.findIndex(t => t === ftype.name) !== -1) {
                                break;
                            }
                        }
                        return current;
                    }
                }

                break;
            }

            case SelHandleKind.Parent:
            {
                return uNode.parent;
            }

            case SelHandleKind.This:
            {
                return uNode;
            }

            case SelHandleKind.Sibling:
            {
                // TODO:
                // selFrag.offset.value
                return uNode;
            }

            case SelHandleKind.Identifier:
            {
                return uNode.getChild(selFrag.name.name);
            }

            case SelHandleKind.Custom:
            {
                const handle = this.dIndex.handles.get(selFrag.name.name);
                if (!handle) break;
                return this.uBuilder.buildNodeFromDesc(handle.desc);
            }

            case SelHandleKind.Layer:
            {
                // TODO:
                break;
            }

            case SelHandleKind.Root:
            {
                // TODO: report warnigns - root is not allowed here
                break;
            }

            default:
            {
                break;
            }
        }
        return;
    }

    resolveSelection(uNode: UINode, path: SelectorFragment[]) {
        const resSel = new ResolvedSelection(uNode, path);
        if (!uNode.build) this.uBuilder.expandNode(uNode, []);

        for (const selFrag of path) {
            switch (selFrag.selKind) {
                case SelHandleKind.Identifier:
                {
                    if (!uNode.build) this.uBuilder.expandNode(uNode, []);
                }
                default: break;
            }
            uNode = this.resolveSelectorFragment(uNode, selFrag);

            if (!uNode) break;
            resSel.chain.push(uNode);
        }

        return resSel;
    }

    resolveChild(uNode: UINode, name: string) {
        const childNode = uNode.getChild(name);
        if (!childNode) return;
        if (!childNode.build) this.uBuilder.expandNode(childNode, []);
        return childNode;
    }

    getChildrenOfType<T extends UINode>(uNode: UINode, dkind: DescKind) {
        const rm = new Map<string, T>();
        outer: for (const item of Array.from(uNode.children.values())) {
            switch (dkind) {
                case DescKind.Frame:
                    if (!(item instanceof FrameNode)) continue outer;
                    break;
                case DescKind.StateGroup:
                    if (!(item instanceof StateGroupNode)) continue outer;
                    break;
                case DescKind.Animation:
                    if (!(item instanceof AnimationNode)) continue outer;
                    break;
            }
            rm.set(item.name, <any>item);
        }
        return rm;
    }

    getContextFrameNode(uNode: UINode) {
        if (uNode.constructor !== FrameNode) {
            if (uNode.parent && uNode.parent.constructor === FrameNode) {
                uNode = uNode.parent;
                this.uBuilder.expandNode(uNode, []);
                return uNode;
            }
            else {
                return;
            }
        }
        return uNode;
    }
}
