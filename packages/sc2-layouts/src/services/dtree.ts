import * as path from 'path';
import * as vs from 'vscode';
import * as sch from '../schema/base';
import { AbstractProvider, svcRequest } from './provider';
import { UINavigator, UIBuilder } from '../index/hierarchy';
import { DescIndex, DescNamespace, DescKind } from '../index/desc';
import * as s2 from '../index/s2mod';
import { Store, FileDescEventData } from '../index/store';
import { XMLDocument, XMLElement, ExtLangIds } from '../types';

const enum DescTreeNodeKind {
    Archive,
    File,
    Desc,
}

const DescTreeViewType = {
    [DescTreeNodeKind.Archive]: 'archive',
    [DescTreeNodeKind.File]: 'file',
    [DescTreeNodeKind.Desc]: 'desc',
};

interface DescTreeNode {
    kind: DescTreeNodeKind;
    name: string;
    archive?: s2.Archive;
    dsItem?: DescNamespace;
    xDoc?: XMLDocument;
    parent?: DescTreeNode;
}

export class DescTreeDataProvider implements vs.TreeDataProvider<DescTreeNode> {
    protected _onDidChangeTreeData: vs.EventEmitter<DescTreeNode> = new vs.EventEmitter<DescTreeNode>();
    readonly onDidChangeTreeData: vs.Event<DescTreeNode | undefined | null> = this._onDidChangeTreeData.event;
    readonly topNodes = new Map<string, DescTreeNode>();
    readonly fileNodes = new Map<string, DescTreeNode>();

    constructor(private readonly store: Store, private readonly dIndex: DescIndex, private readonly extPath: string) {
        this.store.onDidArchiveAdd((sa) => {
            this.topNodes.set(sa.uri.toString(), {
                kind: DescTreeNodeKind.Archive,
                name: sa.name,
                archive: sa,
            });
            this.refresh();
        });

        this.store.onDidArchiveDelete((sa) => {
            this.topNodes.delete(sa.uri.toString());
            this.refresh();
        });

        this.store.onDidFileDescCreate((ev) => {
            const dNode: DescTreeNode = {
                kind: DescTreeNodeKind.File,
                archive: ev.archive,
                name: ev.fDesc.name,
                dsItem: ev.fDesc,
                xDoc: ev.xDoc,
            };
            this.fileNodes.set(ev.xDoc.tdoc.uri, dNode);
            this.refresh(this.topNodes.get(dNode.archive.uri.toString()));
        });

        this.store.onDidFileDescChange((ev) => {
            const dNode = this.fileNodes.get(ev.xDoc.tdoc.uri);
            dNode.dsItem = ev.fDesc;
            dNode.xDoc = ev.xDoc;
            this.refresh(dNode);
        });

        this.store.onDidFileDescDelete((ev) => {
            this.fileNodes.delete(ev.xDoc.tdoc.uri);
            this.refresh(this.topNodes.get(ev.archive.uri.toString()));
        });
    }

    protected getIcon(name: string) {
        return {
            light: path.join(this.extPath, 'resources', 'light', `${name}`),
            dark: path.join(this.extPath, 'resources', 'dark', `${name}`)
        };
    }

    public refresh(dNode?: DescTreeNode) {
        this._onDidChangeTreeData.fire(dNode);
    }

    public getTreeItem(dNode: DescTreeNode): vs.TreeItem {
        const ritem: vs.TreeItem = {
            label: dNode.name,
            collapsibleState: vs.TreeItemCollapsibleState.Collapsed,
            contextValue: DescTreeViewType[dNode.kind],
        };

        switch (dNode.kind) {
            case DescTreeNodeKind.Archive:
            {
                if (dNode.archive.native) {
                    ritem.description = `[native]`;
                    ritem.tooltip = dNode.archive.name;
                    ritem.contextValue = void 0;
                }

                ritem.iconPath = this.getIcon('dependency.svg');
                break;
            }

            case DescTreeNodeKind.File:
            {
                ritem.resourceUri = vs.Uri.parse(dNode.xDoc.tdoc.uri);
                ritem.command = {
                    title: 'Open',
                    command: 'vscode.open',
                    arguments: [ritem.resourceUri],
                };

                ritem.iconPath = this.getIcon('layout.svg');
                break;
            }

            case DescTreeNodeKind.Desc:
            {
                ritem.command = {
                    title: 'Show element in Text Editor',
                    command: 'sc2layout.dtree.showInTextEditor',
                    arguments: [dNode],
                };

                ritem.description = `[${dNode.dsItem.stype.name}]`;
                ritem.tooltip = `${dNode.dsItem.fqn}\n[${dNode.dsItem.stype.name}]\n`;
                if (dNode.dsItem.template) {
                    ritem.tooltip += `template = ${dNode.dsItem.template}\n`;
                }
                if (dNode.dsItem.file) {
                    ritem.tooltip += `file = ${dNode.dsItem.file}\n`;
                }
                ritem.tooltip = ritem.tooltip.trim();

                switch (dNode.dsItem.stype.name) {
                    case 'EditBox': ritem.iconPath = this.getIcon('string.svg'); break;
                    default: ritem.iconPath = this.getIcon('frame.svg'); break;
                }
            }
        }

        if (dNode.kind === DescTreeNodeKind.File || dNode.kind === DescTreeNodeKind.Desc) {
            if (!dNode.dsItem.children.size) {
                ritem.collapsibleState = vs.TreeItemCollapsibleState.None;
            }
        }

        return ritem;
    }

    public getChildren(dParentNode?: DescTreeNode): DescTreeNode[] {
        if (!dParentNode) {
            return Array.from(this.topNodes.values());
        }

        let children: DescTreeNode[] = [];

        switch (dParentNode.kind) {
            case DescTreeNodeKind.Archive:
            {
                for (const item of Array.from(this.fileNodes.values()).sort((a, b) => a.name.localeCompare(b.name))) {
                    if (item.archive !== dParentNode.archive) continue;
                    children.push(item);
                }
                break;
            }

            case DescTreeNodeKind.File:
            case DescTreeNodeKind.Desc:
            {
                children = Array.from(dParentNode.dsItem.children.values()).map((dChild): DescTreeNode => {
                    return {
                        kind: DescTreeNodeKind.Desc,
                        archive: dParentNode.archive,
                        name: dChild.name,
                        xDoc: dParentNode.xDoc,
                        dsItem: dChild,
                        parent: dParentNode,
                    };
                });
                break;
            }
        }

        return children;
    }

    getParent(dtNode: DescTreeNode): vs.ProviderResult<DescTreeNode> {
        if (dtNode.kind === DescTreeNodeKind.File) {
            return this.topNodes.get(dtNode.archive.uri.toString());
        }

        return dtNode.parent;
    }
}

export class TreeViewProvider extends AbstractProvider implements vs.Disposable {
    protected uNavigator: UINavigator;
    protected uBuilder: UIBuilder;
    protected dTreeDataProvider: DescTreeDataProvider;
    protected descViewer: vs.TreeView<DescTreeNode>;
    protected subscriptions: vs.Disposable[] = [];

    protected prepare() {
        this.uNavigator = new UINavigator(this.store.schema, this.store.index);
        this.uBuilder = new UIBuilder(this.store.schema, this.store.index);
    }

    register(): vs.Disposable {
        this.dTreeDataProvider = new DescTreeDataProvider(this.store, this.dIndex, this.svcContext.extContext.extensionPath);
        this.descViewer = vs.window.createTreeView('sc2layoutDesc', { treeDataProvider: this.dTreeDataProvider, showCollapseAll: true });
        this.subscriptions.push(this.descViewer);

        this.descViewer.onDidChangeSelection(this.onChangeSelection, this, this.subscriptions);

        this.subscriptions.push(vs.commands.registerCommand('sc2layout.dtree.showInTextEditor', async (dNode: DescTreeNode) => {
            const xEl = <XMLElement>Array.from(dNode.dsItem.xDecls)[0];
            const posSta = dNode.xDoc.tdoc.positionAt(xEl.start);
            const posEnd = dNode.xDoc.tdoc.positionAt(xEl.startTagEnd ? xEl.startTagEnd : xEl.end);

            await vs.window.showTextDocument(vs.Uri.parse(dNode.xDoc.tdoc.uri), {
                preserveFocus: true,
                selection: new vs.Range(
                    new vs.Position(posSta.line, posSta.character),
                    new vs.Position(posEnd.line, posEnd.character),
                ),
            });
        }));

        this.subscriptions.push(vs.commands.registerTextEditorCommand('sc2layout.dtree.revealActiveFile', this.revealTextSelectedNode, this));

        this.subscriptions.push(
            vs.commands.registerCommand('sc2layout.dtree.showProperties', this.onShowProperties, this)
        );

        return this.descViewer;
    }

    async revealTextSelectedNode(textEditor: vs.TextEditor, edit: vs.TextEditorEdit) {
        if (textEditor.document.languageId !== ExtLangIds.SC2Layout) return;

        let dtFile = this.dTreeDataProvider.fileNodes.get(textEditor.document.uri.toString());

        if (!dtFile) {
            vs.window.showErrorMessage(`Currently active file doesn't appear to be part of the workspace.`);
            return;
        }

        const sourceFile = await this.svcContext.syncVsDocument(textEditor.document);
        const offset = textEditor.document.offsetAt(textEditor.selection.active);
        const xEl = sourceFile.findNodeAt(offset);
        if (!(xEl instanceof XMLElement) || !xEl.stype) return;
        const descItem = this.store.index.resolveElementDesc(xEl);

        let dtResult = dtFile;
        if (descItem) {
            switch (descItem.kind) {
                case DescKind.Frame:
                case DescKind.Animation:
                case DescKind.StateGroup:
                {
                    const descChain = descItem.descRelativeChain.reverse();
                    let dcurrent: DescNamespace;
                    while (dcurrent = descChain.pop()) {
                        const dtChildren = this.dTreeDataProvider.getChildren(dtResult);
                        dtResult = dtChildren.find(item => item.dsItem === dcurrent);
                        if (!dtResult) break;
                    }
                    break;
                }
            }
        }

        this.descViewer.reveal(dtResult ? dtResult : dtFile);
    }

    onChangeSelection(ev: vs.TreeViewSelectionChangeEvent<DescTreeNode>) {
        let dsItem: DescNamespace;
        if (ev.selection.length && ev.selection[0].kind === DescTreeNodeKind.Desc) {
            dsItem = ev.selection[0].dsItem;
        }
        this.svcContext.frameViewProvider.showDescItem(dsItem);
    }

    onShowProperties(dNode: DescTreeNode) {
        if (dNode.kind !== DescTreeNodeKind.Desc) return;
        this.svcContext.frameViewProvider.showDescItem(dNode.dsItem);
    }

    dispose() {
        // TODO: dispose DescTreeDataProvider
        this.subscriptions.forEach(item => item.dispose());
        this.subscriptions = [];
    }
}
