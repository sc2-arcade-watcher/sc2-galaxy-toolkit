import { DescIndex, DescNamespace, DescKind } from './desc';

export class UINode {
    readonly name: string;
    readonly children = new Map<string, UINode>();
    readonly descs = new Set<DescNamespace>();

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
    ancestorByName(name: string) {
        let current: UINode = this;
        do {
            current = current.parent;
        } while (current && current.name !== name)
        return current;
    }

    ancestorByType(type: string) {
        type = `Frame:${type}`;
        let current: UINode = this;
        do {
            current = current.parent;
        } while (current && current.mainDesc.stype.name !== type)
        return current;
    }

    ancestorOfType(type: string) {
        // TODO:
    }
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

export function buildPartialTree(dIndex: DescIndex, contextDesc: DescNamespace, tpath: string[] = null) {
    const rootNs = dIndex.rootNs;

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

        // add-in desc that is being extended
        // if (frDesc.file) {
        //     const extDesc = rootNs.getDeep(frDesc.file + '/' + frDesc.name);
        //     if (extDesc) {
        //         processDesc(uNode, extDesc, tpath);
        //     }
        // }

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

        return uNode;
    }

    return processDesc(createNodeFromDesc(contextDesc), contextDesc, tpath);
}

export function buildContextTree(dIndex: DescIndex, selectedDesc: DescNamespace) {
    let tpath: string[] = [];
    let current = selectedDesc;
    while (current.parent.kind !== DescKind.File) {
        tpath.push(current.name);
        current = current.parent;
    }

    let hierarchyRoot = current;
    tpath = tpath.reverse();
    if (current.file) {
        let mount = current.name.split('/');
        const topDesc = dIndex.rootNs.getMulti(current.file, mount[0]);
        if (topDesc) {
            hierarchyRoot = topDesc;
            if (mount.length > 1) {
                tpath = tpath.concat(mount.slice(1));
            }
        }
    }

    return buildPartialTree(dIndex, hierarchyRoot, tpath).getChild(...tpath);
}

class FrameHierarchy {}
