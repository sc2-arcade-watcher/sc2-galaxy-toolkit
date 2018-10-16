import * as util from 'util';
import { oentries } from '../common';
import { LayoutDocument, Store } from './store';
import { XMLElement, XMLNode, DiagnosticReport } from '../types';
import * as sch from '../schema/base';
import { DescSelect, SelectionFragment, SelectionFragmentKind, BuiltinHandleKind } from '../parser/selector';

export function forEachChild(rootNode: XMLNode, visitor: (child: XMLNode) => boolean | void) {
    for (const child of oentries(rootNode.children)) {
        if (visitor(child) !== false) {
            forEachChild(child, visitor);
        }
    }
}

// export enum DescKind {
//     File,
//     Frame,
//     Animation,
// }

export class DescEntry {
    readonly name: string;
    declarations = new Set<XMLElement>();

    constructor(name: string) {
        this.name = name;
    }

    isOrphan() {
        return this.declarations.size === 0;
    }

    // addDecl(el: XMLElement) {
    //     this.declarations.add(el);
    // }
}

export class DescNamespaceMap<T extends DescEntry> extends Map<string, T> {
    protected descGroup = new Map<XMLElement, Set<XMLElement>>();
    protected nodeIndex = new Map<XMLElement, T>();

    constructor(protected itemType: { new (name: string): T; }, protected indexAttrKey = 'name') {
        super();
    }

    // flush(key: string) {
    //     const item = this.get(key);
    //     if (item.isOrphan()) {
    //         this.delete(key);
    //     }
    // }

    appendOrCreate(el: XMLElement) {
        const key = el.getAttributeValue(this.indexAttrKey);
        let item = this.get(key);
        if (!item) {
            item = new this.itemType(key);
            this.set(key, item);
        }

        item.declarations.add(el);
        this.nodeIndex.set(el, item);

        //
        const descKey = el.getDocumentDesc();
        let descGroupEntry = this.descGroup.get(descKey);
        if (!descGroupEntry) {
            descGroupEntry = new Set<XMLElement>();
            this.descGroup.set(descKey, descGroupEntry);
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

    purgeByRootNode(root: XMLElement) {
        const entries = this.descGroup.get(root);
        if (!entries) return;
        for (const item of entries) {
            this.removeOrDestroy(item);
        }
        this.descGroup.delete(root);
    }
}

export abstract class DescItemContainer {
    name: string;
    parent?: DescItemContainer;
    children = new Map<string, DescItemContainer>();
    declarations = new Set<XMLElement>();

    constructor(name: string, parent?: DescItemContainer) {
        this.name = name;
        if (this.parent) this.parent = parent;
    }
}

export class ConstantItem extends DescEntry {
}

export class HandleItem extends DescEntry {
}

export interface DescContext {
    file: string;
    name: string;
}

export class FrameDesc extends DescItemContainer {
    ctype: string;
    fileDesc?: string;
    template?: string;

    constructor(name: string, parent?: DescItemContainer) {
        super(name, parent);
    }
}

export class FileDesc extends DescItemContainer {
    mappedNodes = new Map<XMLElement, FrameDesc>();
}

export class DescIndex {
    docmap: Map<string, FileDesc>;
    constants: DescNamespaceMap<ConstantItem>;
    handles: DescNamespaceMap<HandleItem>;

    constructor() {
        this.clear();
    }

    bindDocument(doc: LayoutDocument) {
        const dcFile = new FileDesc(doc.getDescName());
        dcFile.declarations.add(doc.getDescNode());
        this.docmap.set(dcFile.name, dcFile);

        const bind = (parentContainer: DescItemContainer, currNode: XMLNode) => {
            const currEl = <XMLElement>currNode;
            if (!currEl.sdef || !currEl.stype) return false;
            let currentContainer: DescItemContainer = parentContainer;

            switch (currEl.sdef.nodeKind) {
                case sch.ElementDefKind.Constant:
                {
                    this.constants.appendOrCreate(currEl);
                    return;
                }

                case sch.ElementDefKind.FrameProperty:
                {
                    const natVal = currEl.stype.attributes.get('val');
                    switch (natVal && natVal.type.builtinType) {
                        case sch.BuiltinTypeKind.Handle:
                        {
                            this.handles.appendOrCreate(currEl);
                            break;
                        }
                    }
                    return;
                }

                case sch.ElementDefKind.Frame:
                {
                    const dcFrame = new FrameDesc(currEl.getAttributeValue('name'));
                    currentContainer = dcFrame;
                    dcFrame.ctype = currEl.getAttributeValue('type');
                    dcFrame.fileDesc = currEl.attributes['file'] ? currEl.getAttributeValue('file') : void 0;
                    dcFrame.declarations.add(currEl);
                    dcFrame.parent = parentContainer;
                    parentContainer.children.set(dcFrame.name, dcFrame);
                    dcFile.mappedNodes.set(currEl, dcFrame);
                    break;
                }

                case sch.ElementDefKind.Animation:
                case sch.ElementDefKind.StateGroup:
                case sch.ElementDefKind.DescFlags:
                case sch.ElementDefKind.Include:
                {
                    return;
                    break;
                }

                default: {
                    // console.log(`# unknown ${currEl.tag}[${currEl.stype.name}]`);
                    return;
                    break;
                }
            }

            currNode.children.forEach(bind.bind(this, currentContainer));
        }

        doc.getDescNode().children.forEach(bind.bind(this, dcFile));
    }

    unbindDocument(doc: LayoutDocument) {
        // switch (currEl.sdef.nodeKind) {
        //     case sch.ElementDefKind.Constant:
        //     {
        //         break;
        //     }
        // }
        this.constants.purgeByRootNode(doc.getDescNode());
        this.handles.purgeByRootNode(doc.getDescNode());
        this.docmap.delete(doc.getDescName());
    }

    clear() {
        this.docmap = new Map<string, FileDesc>();
        this.constants = new DescNamespaceMap<ConstantItem>(ConstantItem, 'name');
        this.handles = new DescNamespaceMap<HandleItem>(HandleItem, 'val');
    }

    resolveSelectionFragment(sef: SelectionFragment, dcontext: DescItemContainer, first = false): DescItemContainer {
        switch (sef.kind) {
            case SelectionFragmentKind.BuiltinHandle:
            {
                switch (sef.builtinHandle) {
                    case BuiltinHandleKind.Root:
                    {
                        if (!first) return void 0;
                        let currd = dcontext;
                        while (currd.parent) {
                            currd = currd.parent;
                        }
                        return currd;
                    }

                    case BuiltinHandleKind.This:
                    {
                        return dcontext;
                    }

                    case BuiltinHandleKind.Parent:
                    {
                        return dcontext.parent;
                    }

                    case BuiltinHandleKind.Layer:
                    case BuiltinHandleKind.Ancestor:
                    case BuiltinHandleKind.Sibling:
                    {
                        // TODO:
                        return void 0;
                    }
                }
                break;
            }

            case SelectionFragmentKind.CustomHandle:
            {
                if (!first) return void 0;
                // TODO:
                break;
            }

            case SelectionFragmentKind.Identifier:
            {
                return dcontext.children.get(sef.identifier);
                break;
            }
        }
        return void 0;
    }

    resolveSelection(sel: DescSelect, dcontext: DescItemContainer): DescItemContainer {
        let currd = dcontext;
        for (const slfrag of sel.fragments) {
            currd = this.resolveSelectionFragment(slfrag, currd, currd === dcontext);
            if (!currd) break;
        }
        return currd;
    }

    // *constants() {
    //     for (const doc of this.docmap.values()) {
    //         for (const item of doc.constants.values()) {
    //             yield item;
    //         }
    //     }
    // }
}
