import * as util from 'util';
import { oentries } from '../common';
import { LayoutDocument, Store } from './store';
import { XMLElement, XMLNode, DiagnosticReport, XMLDocument } from '../types';
import * as sch from '../schema/base';
import { splitSlashDelimetedStr } from '../parser/utils';

export class DescXRef {
    declarations = new Set<XMLElement>();

    constructor(public readonly name: string, protected readonly dIndex: DescIndex) {
    }

    isOrphan() {
        return this.declarations.size === 0;
    }

    // addDecl(el: XMLElement) {
    //     this.declarations.add(el);
    // }
}

export class DescXRefMap<T extends DescXRef> extends Map<string, T> {
    protected descGroup = new Map<XMLDocument, Set<XMLElement>>();
    protected nodeIndex = new Map<XMLElement, T>();

    constructor(protected dIndex: DescIndex, protected itemType: { new (name: string, dIndex: DescIndex): T; }, protected indexAttrKey = 'name') {
        super();
    }

    appendOrCreate(el: XMLElement, xdoc: XMLDocument) {
        const key = el.getAttributeValue(this.indexAttrKey);
        let item = this.get(key);
        if (!item) {
            item = new this.itemType(key, this.dIndex);
            this.set(key, item);
        }

        item.declarations.add(el);
        this.nodeIndex.set(el, item);

        //
        if (!xdoc) xdoc = el.getDocument();
        let descGroupEntry = this.descGroup.get(xdoc);
        if (!descGroupEntry) {
            descGroupEntry = new Set<XMLElement>();
            this.descGroup.set(xdoc, descGroupEntry);
        }
        descGroupEntry.add(el);
    }

    removeOrDestroy(el: XMLElement) {
        // const key = el.getAttributeValue(this.indexAttrKey);
        // let item = this.get(key);
        let item = this.nodeIndex.get(el);
        if (item) {
            this.nodeIndex.delete(el);
            item.declarations.delete(el);
            if (item.isOrphan()) {
                this.delete(item.name);
            }
        }
    }

    purgeDocumentDecls(xdoc: XMLDocument) {
        const entries = this.descGroup.get(xdoc);
        if (!entries) return;
        for (const item of entries) {
            this.removeOrDestroy(item);
        }
        this.descGroup.delete(xdoc);
    }
}

export class ConstantItem extends DescXRef {}
export class HandleItem extends DescXRef {
    get desc() {
        const parentEl = Array.from(this.declarations)[0].parent as XMLElement;
        return this.dIndex.resolveElementDesc(parentEl);
    }
}

// ===

export const enum DescKind {
    Undeclared,
    Root,
    File,
    Frame,
    Animation,
    StateGroup,
}

export class DescNamespace {
    kind: DescKind;
    parent?: DescNamespace;
    readonly name: string;
    readonly children = new Map<string, DescNamespace>();
    readonly xDecls = new Set<XMLNode>();
    readonly descExtensions?: Map<string, Set<DescNamespace>>; // FileDesc

    constructor(name: string, kind = DescKind.Undeclared, parent?: DescNamespace, protected sInitialType?: sch.ComplexType) {
        this.name = name;
        this.kind = kind;
        if (parent) {
            this.parent = parent;
            parent.children.set(name, this);
        }

        if (this.kind === DescKind.File) {
            this.descExtensions = new Map();
        }
    }

    getOrCreate(name: string, kind: DescKind) {
        let tmp = this.children.get(name);
        if (!tmp) {
            tmp = new DescNamespace(name, kind, this);
        }
        return tmp;
    }

    purgeOrphansDeep() {
        for (const tmp of this.children.values()) {
            tmp.purgeOrphansDeep();
        }
        if (this.children.size) return;
        this.parent.children.delete(this.name);
        this.parent = void 0;
    }

    get(name: string) {
        return this.children.get(name);
    }

    getMulti(...names: string[]) {
        let current: DescNamespace = this;
        for (const tmp of names) {
            current = current.children.get(tmp);
            if (!current) break;
        }
        return current;
    }

    getDeep(name: string) {
        const parts = splitSlashDelimetedStr(name);
        if (parts.length === 0) return void 0;

        let tmp: DescNamespace = this;
        let i = 0;
        while (tmp && i < parts.length) {
            tmp = tmp.children.get(parts[i]);
            ++i;
        }
        return tmp;
    }

    public ancestorOfKind(kind: DescKind) {
        let tmp: DescNamespace = this;
        while (tmp = tmp.parent) {
            if (tmp.kind === kind) return tmp;
        }
    }

    get fqn(): string {
        return (this.parent && this.parent.kind !== DescKind.Root) ? `${this.parent.fqn}/${this.name}` : this.name;
    }

    get descRelativeName(): string {
        return (this.parent && (this.parent.kind !== DescKind.Root && this.parent.kind !== DescKind.File)) ? `${this.parent.descRelativeName}/${this.name}` : this.name;
    }

    get topDescItem() {
        let tmp: DescNamespace = this;
        while (tmp.parent) {
            if (tmp.parent.kind === DescKind.Root || tmp.parent.kind === DescKind.File) break;
            tmp = tmp.parent;
        }
        return tmp;
    }

    get stype() {
        if (this.xDecls.size === 0) {
            return this.sInitialType;
        }
        return Array.from(this.xDecls.values())[0].stype;
    }

    get template() {
        const tmp = Array.from(this.xDecls.values())[0];
        return (<XMLElement>tmp).getAttributeValue('template', null);
    }

    get file() {
        const tmp = Array.from(this.xDecls.values())[0];
        return (<XMLElement>tmp).getAttributeValue('file', null);
    }

    get targetFile() {
        let f = this.topDescItem.file;
        if (f === null) {
            f = this.ancestorOfKind(DescKind.File).name;
        }
        return f;
    }
}

export class DocumentState {
    readonly xdeclDescMap = new Map<XMLNode, DescNamespace>();

    constructor(public readonly xdoc: XMLDocument) {
    }
}

function getDeclDescKind(xdecl: XMLElement) {
    switch (xdecl.sdef.nodeKind) {
        case sch.ElementDefKind.Frame:
            return DescKind.Frame;
        case sch.ElementDefKind.Animation:
            return DescKind.Animation;
        case sch.ElementDefKind.StateGroup:
            return DescKind.StateGroup;
    }
    throw new Error();
}

export class DescIndex {
    protected xdocState: Map<XMLDocument, DocumentState>;
    rootNs: DescNamespace;
    tplRefs: Map<string, Set<DescNamespace>>;
    fileRefs: Map<string, Map<string, Set<DescNamespace>>>;

    constants: DescXRefMap<ConstantItem>;
    handles: DescXRefMap<HandleItem>;

    constructor(protected readonly schema: sch.SchemaRegistry) {
        this.clear();
    }

    public clear() {
        this.xdocState = new Map<XMLDocument, DocumentState>();
        this.rootNs = new DescNamespace('$root', DescKind.Root, void 0, this.schema.fileRootType);
        this.tplRefs = new Map();
        this.fileRefs = new Map();

        this.constants = new DescXRefMap<ConstantItem>(this, ConstantItem, 'name');
        this.handles = new DescXRefMap<HandleItem>(this, HandleItem, 'val');
    }

    protected bindWorker(parentNs: DescNamespace, currXNode: XMLElement, docState: DocumentState) {
        if (!currXNode.sdef || !currXNode.stype) return;

        const isInFDesc = parentNs.kind === DescKind.File;

        switch (currXNode.sdef.nodeKind) {
            case sch.ElementDefKind.Animation:
            case sch.ElementDefKind.StateGroup:
            case sch.ElementDefKind.Frame:
            {
                let name = currXNode.getAttributeValue('name', null);
                if (name === null) {
                    for (let i = 0;; ++i) {
                        name = `${currXNode.stype.name}_${i}`;
                        if (!parentNs.get(name)) break;
                        if (i < 50) {
                            name = null;
                            break;
                        }
                    }
                    if (name === null) break;
                }
                const currDesc = parentNs.getOrCreate(name, getDeclDescKind(currXNode));

                // TODO: validate type?
                if (currDesc.xDecls.size > 0) {
                }
                currDesc.xDecls.add(currXNode);
                docState.xdeclDescMap.set(currXNode, currDesc);

                // desc extension
                const file = currXNode.getAttributeValue('file', null);
                if (file !== null) {
                    let fdmap = this.fileRefs.get(file);
                    if (!fdmap) {
                        fdmap = new Map();
                        this.fileRefs.set(file, fdmap);
                    }
                    let frefs = fdmap.get(currDesc.name);
                    if (!frefs) {
                        frefs = new Set();
                        fdmap.set(currDesc.name, frefs);
                    }
                    frefs.add(currDesc);
                }

                // track templates
                const tpl = currXNode.getAttributeValue('template', null);
                if (tpl !== null) {
                    let trefs = this.tplRefs.get(tpl);
                    if (!trefs) {
                        trefs = new Set();
                        this.tplRefs.set(tpl, trefs);
                    }
                    trefs.add(currDesc);
                }

                //
                if (currXNode.sdef.nodeKind === sch.ElementDefKind.Frame) {
                    for (const xsub of currXNode.children) {
                        this.bindWorker(currDesc, xsub, docState);
                    }
                }

                break;
            }

            case sch.ElementDefKind.Constant:
            {
                this.constants.appendOrCreate(currXNode, docState.xdoc);
                return;
            }

            case sch.ElementDefKind.FrameProperty:
            {
                const natVal = currXNode.stype.attributes.get('val');
                if (!natVal) return;
                switch (natVal.type.builtinType) {
                    case sch.BuiltinTypeKind.Handle:
                    {
                        this.handles.appendOrCreate(currXNode, docState.xdoc);
                        break;
                    }
                }
                return;
            }

            default:
            {
                // console.log(`# unknown ${currXNode.tag}[${currXNode.stype.name}]`);
                return;
            }
        }
    }

    bindDocument(doc: LayoutDocument) {
        const docState = new DocumentState(doc);
        this.xdocState.set(doc, docState);

        const fiDesc = this.rootNs.getOrCreate(doc.descName, DescKind.File);
        fiDesc.xDecls.add(doc);
        docState.xdeclDescMap.set(doc, fiDesc);

        if (doc.getDescNode()) {
            for (const xsub of doc.getDescNode().children) {
                this.bindWorker(fiDesc, xsub, docState);
            }
        }

        return fiDesc;
    }

    unbindDocument(doc: LayoutDocument) {
        this.constants.purgeDocumentDecls(doc);
        this.handles.purgeDocumentDecls(doc);

        const docState = this.xdocState.get(doc);
        for (const [xDecl, descNode] of docState.xdeclDescMap) {
            descNode.xDecls.delete(xDecl);

            switch (descNode.kind) {
                case DescKind.Frame:
                case DescKind.Animation:
                case DescKind.StateGroup:
                {
                    const tpl = (<XMLElement>xDecl).getAttributeValue('template', null);
                    if (tpl !== null) {
                        const trefs = this.tplRefs.get(tpl);

                        // elements with the same name are grouped under the same DescNamespace
                        // so we have to double check whether the reference wasn't already deleted
                        if (trefs) {
                            trefs.delete(descNode);
                            if (!trefs.size) {
                                this.tplRefs.delete(tpl);
                            }
                        }
                    }

                    const file = (<XMLElement>xDecl).getAttributeValue('file', null);
                    if (file !== null) {
                        let fdmap = this.fileRefs.get(file);
                        if (fdmap) {
                            let frefs = fdmap.get(descNode.name);

                            // elements with the same name are grouped under the same DescNamespace
                            // so we have to double check whether the reference wasn't already deleted
                            if (frefs) {
                                frefs.delete(descNode);
                                if (frefs.size <= 0) {
                                    fdmap.delete(descNode.name);
                                    if (fdmap.size <= 0) {
                                        this.fileRefs.delete(file);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        for (const descNode of docState.xdeclDescMap.values()) {
            if (descNode.xDecls.size) continue;
            if (!descNode.parent) continue;
            descNode.purgeOrphansDeep();
        }

        this.xdocState.delete(doc);
    }

    resolveElementDesc(xEl: XMLElement, kind: DescKind = null) {
        const docState = this.xdocState.get(xEl.getDocument());
        do {
            const elDesc = docState.xdeclDescMap.get(xEl);
            if (elDesc && (kind === null || elDesc.kind === kind)) return elDesc;
        } while (xEl = <XMLElement>xEl.parent);
    }
}
