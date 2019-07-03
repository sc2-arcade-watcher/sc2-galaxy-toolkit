import * as vs from 'vscode';
import { AbstractProvider, svcRequest } from './provider';
import { DescNamespace, DescKind } from '../index/desc';
import { ExtLangIds } from '../types';
import { UINode, FrameNode } from '../index/hierarchy';
import { Store } from '../index/store';
import { ServiceContext } from '../service';

interface VTreeItem extends vs.TreeItem {
    parent?: VTreeItem;
    children?: VTreeItem[];
}

class FramePropertiesTreeDataProvider implements vs.TreeDataProvider<VTreeItem> {
    protected _onDidChangeTreeData: vs.EventEmitter<VTreeItem> = new vs.EventEmitter<VTreeItem>();
    readonly onDidChangeTreeData: vs.Event<VTreeItem | undefined | null> = this._onDidChangeTreeData.event;
    protected rootElements?: VTreeItem[];

    constructor(private readonly store: Store, private readonly svcContext: ServiceContext) {
    }

    protected createVTreeItem(opts: VTreeItem = {}): VTreeItem {
        return Object.assign(<VTreeItem>{
            children: [],
            collapsibleState: vs.TreeItemCollapsibleState.None,
        }, opts);
    }

    protected createViewFromUNode(uNode: FrameNode) {
        const vRoot = this.createVTreeItem();
        const frameType = this.store.schema.getFrameType(uNode.mainDesc.stype);

        function append(parent: VTreeItem, child: VTreeItem) {
            parent.children.push(child);
            child.parent = parent;
            return child;
        }

        append(vRoot, this.createVTreeItem({
            label: uNode.name,
            description: `[${frameType.name}]`,
            tooltip: uNode.fqn,
            iconPath: this.svcContext.getThemeIcon('frame.svg'),
        }));
        // uNode.mainDesc.stype.name

        for (const frameClass of frameType.fclasses.values()) {
            const vFrameClassGroup = append(vRoot, this.createVTreeItem({
                collapsibleState: vs.TreeItemCollapsibleState.Expanded,
                label: frameClass.name,
                description: `(${frameClass.properties.size})`,
                iconPath: this.svcContext.getThemeIcon('folder.svg'),
            }));

            for (const frameProperty of frameClass.properties.values()) {
                append(vFrameClassGroup, this.createVTreeItem({
                    collapsibleState: vs.TreeItemCollapsibleState.None,
                    label: frameProperty.name,
                    description: (
                        `[${frameProperty.etype.type.name}]` +
                        (frameProperty.isReadonly ? ' *R' : '')
                    ),
                    tooltip: frameProperty.etype.label,
                }));
            }
        }

        return vRoot.children;
    }

    public setCurrentFrameNode(uNode?: FrameNode) {
        if (uNode === void 0) {
            this.rootElements = void 0;
        }
        else {
            this.rootElements = this.createViewFromUNode(uNode);
        }
        this.refresh();
    }

    public refresh(vItem?: VTreeItem) {
        this._onDidChangeTreeData.fire(vItem);
    }

    public getTreeItem(vItem: VTreeItem): vs.TreeItem {
        return vItem;
    }

    public getChildren(vItem?: VTreeItem): vs.ProviderResult<VTreeItem[]> {
        if (!vItem) {
            return this.rootElements;
        }

        return vItem.children;
    }

    public getParent(vItem: VTreeItem): vs.ProviderResult<VTreeItem> {
        return vItem.parent;
    }
}

export class PropertiesViewProvider extends AbstractProvider implements vs.Disposable {
    protected viewDataProvider: FramePropertiesTreeDataProvider;
    protected treeView: vs.TreeView<VTreeItem>;
    protected subscriptions: vs.Disposable[] = [];

    protected prepare() {
        this.viewDataProvider = new FramePropertiesTreeDataProvider(this.store, this.svcContext);
        this.treeView = vs.window.createTreeView('s2lPropertiesView', {
            treeDataProvider: this.viewDataProvider,
            showCollapseAll: true,
        });
        this.subscriptions.push(this.treeView);
    }

    @svcRequest(true)
    public showDescItem(dsItem?: DescNamespace) {
        if (dsItem && dsItem.kind === DescKind.Frame) {
            const uNode = <FrameNode>this.xray.uBuilder.buildNodeFromDesc(dsItem);
            this.viewDataProvider.setCurrentFrameNode(uNode);
        }
        else {
            this.viewDataProvider.setCurrentFrameNode();
        }
    }

    protected onChangeTextEditorSelection(ev: vs.TextEditorSelectionChangeEvent) {
        if (ev.textEditor.document.languageId !== ExtLangIds.SC2Layout) return;
    }

    dispose() {
        this.subscriptions.forEach(i => i.dispose());
        this.subscriptions = [];
    }
}
