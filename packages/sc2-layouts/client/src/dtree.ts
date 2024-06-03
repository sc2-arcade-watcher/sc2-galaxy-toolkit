import * as path from 'path';
import * as vs from 'vscode';
import * as lspc from 'vscode-languageclient';
import { getThemeIcon } from './extension';
import { DTItemType, DTNodeKind, DTArchive, DTLayout, DTElement, FetchNodeRequest, FetchNodeParams, WorkspaceOverviewRequest, DTElementWithChildren, LayoutElementRequest, LayoutElementParams, WorkspaceChangeNotification, WorkspaceChangeParams, ElementViewDataSection, ElementViewDataRequest } from '../../backend/src/protocol/protocol.descTree';

interface DTRichElement extends DTElementWithChildren {
    parent?: DTRichElement;
}

type DTRichItemType = DTArchive | DTLayout | DTRichElement;

export class DescTreeDataProvider implements vs.TreeDataProvider<DTRichItemType> {
    protected _onDidChangeTreeData: vs.EventEmitter<DTRichItemType> = new vs.EventEmitter<DTRichItemType>();
    readonly onDidChangeTreeData: vs.Event<DTRichItemType | undefined | null> = this._onDidChangeTreeData.event;

    protected archiveNodes = new Map<string, DTArchive>();
    protected layoutNodes = new Map<string, DTLayout>();
    protected elementNodeTree = new Map<string, DTRichElement[]>();

    constructor(protected readonly langClient: lspc.LanguageClient) {
        this.langClient.onNotification(WorkspaceChangeNotification.type, this.onWorkspaceChange.bind(this));
    }

    protected async getWorkspaceOverview() {
        const wResult = await this.langClient.sendRequest(WorkspaceOverviewRequest.type, {});

        this.archiveNodes.clear();
        for (const item of wResult.archives) {
            this.archiveNodes.set(item.archiveUri, item);
        }

        this.layoutNodes.clear();
        for (const item of wResult.layouts) {
            this.layoutNodes.set(item.fileUri, item);
        }
    }

    public async ensureWorkspaceSynced() {
        if (!this.archiveNodes.size || !this.layoutNodes.size) {
            await this.getWorkspaceOverview();
        }
    }

    protected async getLayoutElement(docUri: string) {
        const lResult = await this.langClient.sendRequest(LayoutElementRequest.type, {
            textDocument: { uri: docUri },
        } as LayoutElementParams);

        function enrichElementList(currElements: DTElementWithChildren[], parent?: DTRichElement): DTRichElement[] {
            const richList: DTRichElement[] = [];
            for (const currChild of currElements) {
                const richChild: DTRichElement = {
                    ...currChild,
                    parent: parent,
                };
                richChild.children = enrichElementList(richChild.children);
                richList.push(richChild);
            }
            return richList;
        }

        const richResult = enrichElementList(lResult, void 0);
        this.elementNodeTree.set(docUri, richResult);

        return richResult;
    }

    protected async onWorkspaceChange(params: WorkspaceChangeParams) {
        let syncWorkspaceState = false;

        if (!params.events.length) {
            syncWorkspaceState = true;
        }
        else {
            for (const currEv of params.events) {
                switch (currEv.type) {
                    case lspc.FileChangeType.Created:
                    case lspc.FileChangeType.Deleted: {
                        syncWorkspaceState = true;
                        if (currEv.resource.kind === DTNodeKind.Layout) {
                            this.elementNodeTree.delete(currEv.resource.fileUri);
                        }
                        break;
                    }

                    case lspc.FileChangeType.Changed: {
                        if (currEv.resource.kind === DTNodeKind.Layout) {
                            this.elementNodeTree.delete(currEv.resource.fileUri);
                            this._onDidChangeTreeData.fire(this.layoutNodes.get(currEv.resource.fileUri));
                        }
                        break;
                    }
                }
            }
        }

        if (syncWorkspaceState) {
            this.archiveNodes.clear();
            this.layoutNodes.clear();
            this._onDidChangeTreeData.fire();
        }
    }

    public getTreeItem(dNode: DTRichItemType): vs.TreeItem {
        const ritem: vs.TreeItem = {
            label: dNode.name,
            collapsibleState: vs.TreeItemCollapsibleState.Collapsed,
            contextValue: DTNodeKind[dNode.kind].toLowerCase(),
        };

        switch (dNode.kind) {
            case DTNodeKind.Archive:
            {
                if (dNode.isBuiltin) {
                    ritem.description = `[built-in]`;
                    ritem.contextValue = void 0;
                }
                else {
                    ritem.description = `[workspace]`;
                }

                ritem.iconPath = getThemeIcon('dependency.svg');
                break;
            }

            case DTNodeKind.Layout:
            {
                ritem.resourceUri = vs.Uri.parse(dNode.fileUri);
                ritem.command = {
                    title: 'Open',
                    command: 'vscode.open',
                    arguments: [ritem.resourceUri],
                };

                ritem.iconPath = getThemeIcon('layout.svg');
                break;
            }

            case DTNodeKind.Element:
            {
                ritem.command = {
                    title: 'Show element in Text Editor',
                    command: 'sc2layout.dtree.showInTextEditor',
                    arguments: [dNode],
                };

                ritem.description = `[${dNode.ctype}]`;
                ritem.tooltip = `${dNode.fqn.join('/')}`;

                switch (dNode.ctype) {
                    case 'EditBox': ritem.iconPath = getThemeIcon('string.svg'); break;
                    default: ritem.iconPath = getThemeIcon('frame.svg'); break;
                }
            }
        }

        if (dNode.kind === DTNodeKind.Element) {
            if (dNode.childrenCount <= 0) {
                ritem.collapsibleState = vs.TreeItemCollapsibleState.None;
            }
        }

        return ritem;
    }

    public async getChildren(dParentNode?: DTRichItemType): Promise<DTRichItemType[]> {
        if (!dParentNode) {
            await this.ensureWorkspaceSynced();
            return Array.from(this.archiveNodes.values());
        }
        else if (dParentNode.kind === DTNodeKind.Archive) {
            const children: DTRichItemType[] = [];
            for (const item of this.layoutNodes.values()) {
                if (dParentNode.archiveUri !== item.archiveUri) continue;
                children.push(item);
            }
            return children.sort((a, b) => a.name.localeCompare(b.name));
        }
        else if (dParentNode.kind === DTNodeKind.Layout) {
            let rElements: DTRichElement[] = this.elementNodeTree.get(dParentNode.fileUri);
            if (!rElements) {
                rElements = await this.getLayoutElement(dParentNode.fileUri);
            }
            return rElements;
        }
        else if (dParentNode.kind === DTNodeKind.Element) {
            return dParentNode.children;
        }
    }

    async getParent(dtNode: DTRichItemType): Promise<DTRichItemType> {
        switch (dtNode.kind) {
            case DTNodeKind.Layout: {
                return this.archiveNodes.get(dtNode.archiveUri);
            }

            case DTNodeKind.Element: {
                if (dtNode.fqn.length <= 1) {
                    return this.layoutNodes.get(dtNode.fileUri);
                }
                else {
                    const fqnPath = dtNode.fqn.slice(0, -1).reverse();
                    let currentNodeList = this.elementNodeTree.get(dtNode.fileUri);
                    if (!currentNodeList) {
                        currentNodeList = await this.getLayoutElement(dtNode.fileUri);
                    }

                    let matchedElement: DTRichElement;
                    while (fqnPath.length) {
                        const currName = fqnPath.pop();
                        matchedElement = currentNodeList.find(item => item.name === currName)
                        if (!matchedElement) {
                            // TODO: report warning
                            return;
                        }
                        currentNodeList = matchedElement.children;
                    }

                    return matchedElement;
                }
            }
        }
    }
}

interface ElementViewDataSectionRich extends ElementViewDataSection {
    parent: ElementViewDataSectionRich;
    children: ElementViewDataSectionRich[];
}

class FramePropertiesTreeDataProvider implements vs.TreeDataProvider<ElementViewDataSectionRich> {
    protected _onDidChangeTreeData: vs.EventEmitter<ElementViewDataSectionRich> = new vs.EventEmitter<ElementViewDataSectionRich>();
    readonly onDidChangeTreeData: vs.Event<ElementViewDataSectionRich | undefined | null> = this._onDidChangeTreeData.event;
    protected rootElements: ElementViewDataSectionRich[] = void 0;
    protected activeElement: DTElement = void 0;

    constructor(protected readonly langClient: lspc.LanguageClient) {
    }

    public refresh(vItem?: ElementViewDataSectionRich) {
        this._onDidChangeTreeData.fire(vItem);
    }

    public setActiveElement(dtElement?: DTElement) {
        this.activeElement = dtElement;
        this.rootElements = void 0;
        this.refresh();
    }

    public getTreeItem(vItem: ElementViewDataSectionRich): vs.TreeItem {
        return {
            label: vItem.label,
            description: vItem.description,
            tooltip: vItem.tooltip,
            iconPath: vItem.iconPath ? getThemeIcon(vItem.iconPath) : void 0,
            collapsibleState: vItem.children.length ? vs.TreeItemCollapsibleState.Expanded : vs.TreeItemCollapsibleState.None,
        };
    }

    public async getChildren(vItem?: ElementViewDataSectionRich): Promise<ElementViewDataSectionRich[]> {
        if (!this.activeElement) return;

        function enrichViewDataSection(section: ElementViewDataSection, parent?: ElementViewDataSectionRich): ElementViewDataSectionRich {
            const richSect: ElementViewDataSectionRich = {
                ...section,
                parent,
                children: [],
            };
            if (section.children) {
                richSect.children = section.children.map(item => enrichViewDataSection(item, richSect));
            }
            return richSect;
        }

        if (!vItem) {
            if (!this.rootElements) {
                const result = await this.langClient.sendRequest(ElementViewDataRequest.type, { node: this.activeElement });
                if (result) {
                    this.rootElements = enrichViewDataSection(result).children;
                }
            }

            return this.rootElements;
        }
        else {
            return vItem.children;
        }
    }

    public getParent(vItem: ElementViewDataSectionRich): vs.ProviderResult<ElementViewDataSectionRich> {
        return vItem.parent;
    }
}

export class TreeViewProvider implements vs.Disposable {
    protected descDataProvider: DescTreeDataProvider;
    protected descViewer: vs.TreeView<DTRichItemType>;
    protected viewDataProvider: FramePropertiesTreeDataProvider;
    protected elementDataViewer: vs.TreeView<ElementViewDataSectionRich>;
    protected subscriptions: vs.Disposable[] = [];

    constructor(protected readonly langClient: lspc.LanguageClient) {
        this.descDataProvider = new DescTreeDataProvider(langClient);
        this.descViewer = vs.window.createTreeView('sc2layoutMainView', {
            treeDataProvider: this.descDataProvider,
            showCollapseAll: true,
        });
        this.subscriptions.push(this.descViewer);

        this.viewDataProvider = new FramePropertiesTreeDataProvider(langClient);
        this.elementDataViewer = vs.window.createTreeView('sc2layoutElementView', {
            treeDataProvider: this.viewDataProvider,
            showCollapseAll: true,
        });
        this.subscriptions.push(this.elementDataViewer);

        this.descViewer.onDidChangeSelection(this.onChangeSelection, this, this.subscriptions);

        this.subscriptions.push(
            vs.commands.registerCommand('sc2layout.dtree.showInTextEditor', this.showInTextEditor, this),
            vs.commands.registerTextEditorCommand('sc2layout.dtree.revealActiveFile', this.revealTextSelectedNode, this),
            vs.commands.registerCommand('sc2layout.dtree.showProperties', this.onShowProperties, this)
        );
    }

    async showInTextEditor(dtNode: DTElement) {
        const docShowOpts: vs.TextDocumentShowOptions = {
            preserveFocus: true,
        };
        if (dtNode.selectionRange) {
            docShowOpts.selection = new vs.Range(
                dtNode.selectionRange.start.line,
                dtNode.selectionRange.start.character,
                dtNode.selectionRange.end.line,
                dtNode.selectionRange.end.character
            )
        }
        await vs.window.showTextDocument(vs.Uri.parse(dtNode.fileUri), docShowOpts);
    }

    async revealTextSelectedNode(textEditor: vs.TextEditor, edit: vs.TextEditorEdit) {
        if (textEditor.document.languageId !== 'sc2layout') return;

        await this.descDataProvider.ensureWorkspaceSynced();

        const dtNode = await this.langClient.sendRequest(FetchNodeRequest.type, <FetchNodeParams>{
            textDocument: { uri: textEditor.document.uri.toString() },
            position: { line: textEditor.selection.active.line, character: textEditor.selection.active.character },
        });

        if (!dtNode) return;

        this.descViewer.reveal(dtNode as DTRichItemType, { select: true, expand: true });
    }

    onChangeSelection(ev: vs.TreeViewSelectionChangeEvent<DTRichItemType>) {
        let dtNode: DTRichItemType;
        if (ev.selection.length && ev.selection[0].kind === DTNodeKind.Element) {
            dtNode = ev.selection[0];
            this.viewDataProvider.setActiveElement(dtNode);
        }
        else {
            this.viewDataProvider.setActiveElement();
        }
    }

    onShowProperties(dtNode: DTRichItemType) {
        if (dtNode.kind !== DTNodeKind.Element) return;
        this.viewDataProvider.setActiveElement(dtNode);
    }

    dispose() {
        this.subscriptions.forEach(item => item.dispose());
        this.subscriptions = [];
    }
}
