import { DescIndex, DescNamespace, DescKind } from './desc';
import { SchemaRegistry } from '../schema/base';
import { PathSelector, SelectorFragment, SelHandleKind } from '../parser/expressions';

export class UINode {
    readonly name: string;
    readonly children = new Map<string, UINode>();
    readonly descs = new Set<DescNamespace>();
    public build = false;

    constructor(public readonly mainDesc: DescNamespace, public readonly parent: UINode = null) {
        this.name = mainDesc.name;
        if (parent) parent.children.set(this.name, this);

        this.descs.add(mainDesc);
    }

    getChild(...names: string[]) {
        let current: UINode = this;
        for (const tmp of names) {
            current = current.children.get(tmp);
            if (!current) break;
        }
        return current;
    }

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

    // get originDesc()
}

export class FrameNode extends UINode {
}

export class StateGroupNode extends UINode {
}

function createNodeFromDesc(desc: DescNamespace, parent?: UINode) {
    switch (desc.kind) {
        case DescKind.Frame:
            return new FrameNode(desc, parent);
        case DescKind.StateGroup:
            return new StateGroupNode(desc, parent);
        default:
            return new UINode(desc, parent);
    }
}

class ResolvedSelection {
    public readonly chain: FrameNode[] = [];

    constructor(public topNode: FrameNode, protected psel: PathSelector) {
    }

    get isValid() {
        return this.chain.length === this.psel.path.length;
    }

    get target() {
        if (!this.isValid) return
        return this.chain[this.chain.length - 1];
    }
}

export class UIBuilder {
    protected rootNs: DescNamespace;

    constructor(protected schema: SchemaRegistry, protected dIndex: DescIndex) {
        this.rootNs = dIndex.rootNs;
    }

    expandNode(initialNode: UINode, tpath: string[] | null) {
        const dIndex = this.dIndex;
        const rootNs = this.rootNs;

        function processDesc(uNode: UINode, frDesc: DescNamespace, tpath: string[] | null) {
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

            uNode.build = true;
        }

        processDesc(initialNode, initialNode.mainDesc, tpath);
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
            let mount = current.name.split('/');
            const topDesc = this.dIndex.rootNs.getMulti(current.file, mount[0]);
            if (topDesc) {
                hierarchyRoot = topDesc;
                if (mount.length > 1) {
                    tpath = tpath.concat(mount.slice(1));
                }
            }
        }

        return {hierarchyRoot, tpath};
    }

    buildNodeFromDesc(selectedDesc: DescNamespace) {
        const context = this.determineContextOfDesc(selectedDesc);
        const parentNode = createNodeFromDesc(context.hierarchyRoot);
        this.expandNode(parentNode, context.tpath)
        return parentNode.getChild(...context.tpath);
    }
}

export class UINavigator {
    protected uBuilder: UIBuilder;

    constructor(protected schema: SchemaRegistry, protected dIndex: DescIndex) {
        this.uBuilder = new UIBuilder(schema, dIndex);
    }

    resolveSelectorFragment(uNode: FrameNode, selFrag: SelectorFragment) {
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
                return uNode
            }

            case SelHandleKind.Identifier:
            {
                return uNode.getChild(selFrag.name.name);
            }

            case SelHandleKind.Custom:
            {
                const handle = this.dIndex.handles.get(selFrag.name.name);
                if (!handle) break;
                return this.uBuilder.buildNodeFromDesc(handle.desc)
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

    resolveSelection(uNode: FrameNode, psel: PathSelector) {
        const resSel = new ResolvedSelection(uNode, psel);
        if (!uNode.build) this.uBuilder.expandNode(uNode, []);

        for (const selFrag of psel.path) {
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
}
