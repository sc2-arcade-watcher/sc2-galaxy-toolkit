import * as lsp from 'vscode-languageserver';
import * as sch from '../../schema/base';
import { AbstractProvider, errGuard } from '../provider';
import { logIt } from '../../logger';
import { DTArchive, DTNodeKind, DTLayout, DTItemType, DTElementKind, FetchNodeParams, FetchNodeResult, FetchNodeRequest, DTElementWithChildren, WorkspaceOverviewRequest, WorkspaceOverviewParams, WorkspaceOverviewResult, LayoutElementRequest, LayoutElementParams, WorkspaceChangeNotification, WorkspaceChangeParams, WorkspaceChangeEvent, ElementViewDataRequest, ElementViewDataParams, ElementViewDataResult, ElementViewDataSection } from '../../protocol/protocol.descTree';
import { DescNamespace, DescKind } from '../../index/desc';
import { XMLDocument, XMLElement } from '../../types';
import { ServiceStateFlags } from '../server';
import URI from 'vscode-uri';
import { Archive } from '../../index/s2mod';
import { FrameNode } from '../../index/hierarchy';

function getElementKindOfDescNamespace(dsKind: DescKind) {
    switch (dsKind) {
        case DescKind.Frame: return DTElementKind.Frame;
        case DescKind.Animation: return DTElementKind.Animation;
        case DescKind.StateGroup: return DTElementKind.Stategroup;
        default: {
            throw new Error(`Unexpected dsKind: ${dsKind}`);
        }
    }
}

export class DescTreeDataProvider extends AbstractProvider /* implements dst.DescTreeDataProvider */ {
    protected dNodeFromDsItem(dsItem: DescNamespace, xDoc?: XMLDocument): DTItemType {
        if (!xDoc) {
            const dsFile = dsItem.kind === DescKind.File ? dsItem : dsItem.ancestorOfKind(DescKind.File);
            xDoc = Array.from(dsFile.xDecls)[0] as XMLDocument;
        }
        const xEl = <XMLElement>Array.from(dsItem.xDecls)[0];

        return {
            kind: DTNodeKind.Element,
            name: dsItem.name,
            elementKind: getElementKindOfDescNamespace(dsItem.kind),
            childrenCount: dsItem.children.size,
            fileUri: xDoc.tdoc.uri,
            ctype: dsItem.stype.name,
            fqn: dsItem.descRelativeChain.map(v => v.name),
            selectionRange: lsp.Range.create(
                xDoc.tdoc.positionAt(xEl.start),
                xDoc.tdoc.positionAt(xEl.startTagEnd ? xEl.startTagEnd : xEl.end)
            ),
        };
    }

    protected dNodeWithChildrenFromDsChildren(dsItem: DescNamespace): DTElementWithChildren[] {
        return Array.from(dsItem.children.values()).map<DTElementWithChildren>((dsChild) => {
            return {
                ...this.dNodeFromDsItem(dsChild),
                children: this.dNodeWithChildrenFromDsChildren(dsChild),
            } as DTElementWithChildren;
        });
    }

    protected dNodeFromDsChildren(dsNamespace: DescNamespace) {
        const dsFile = dsNamespace.kind === DescKind.File ? dsNamespace : dsNamespace.ancestorOfKind(DescKind.File);
        const xDoc = Array.from(dsFile.xDecls)[0] as XMLDocument;

        return Array.from(dsNamespace.children.values()).map((dsItem): DTItemType => {
            return this.dNodeFromDsItem(dsItem, xDoc);
        });
    }

    protected dNodeFromArchive(sa: Archive): DTArchive {
        return {
            kind: DTNodeKind.Archive,
            name: sa.name,
            isBuiltin: sa.native,
            archiveUri: sa.uri.toString(),
        };
    }

    protected dNodeFromLayout(xDoc: XMLDocument): DTLayout {
        const fDesc = this.dIndex.resolveElementDesc(xDoc.getRootNode());
        const sa = this.store.s2ws.matchFileWorkspace(URI.parse(xDoc.tdoc.uri));
        return {
            kind: DTNodeKind.Layout,
            name: fDesc.name,
            archiveUri: sa.uri.toString(),
            fileUri: xDoc.tdoc.uri,
        };
    }

    protected prepare() {
        this.store.onDidArchiveAdd((sa) => {
            this.sendWorkspaceChange(
                { resource: this.dNodeFromArchive(sa), type: lsp.FileChangeType.Created }
            );
        });

        this.store.onDidArchiveDelete((sa) => {
            this.sendWorkspaceChange(
                { resource: this.dNodeFromArchive(sa), type: lsp.FileChangeType.Deleted }
            );
        });

        // ===

        this.store.onDidFileDescCreate((ev) => {
            this.sendWorkspaceChange(
                { resource: this.dNodeFromLayout(ev.xDoc), type: lsp.FileChangeType.Created }
            );
        });

        this.store.onDidFileDescChange((ev) => {
            this.sendWorkspaceChange(
                { resource: this.dNodeFromLayout(ev.xDoc), type: lsp.FileChangeType.Changed }
            );
        });

        this.store.onDidFileDescDelete((ev) => {
            this.sendWorkspaceChange(
                { resource: this.dNodeFromLayout(ev.xDoc), type: lsp.FileChangeType.Deleted }
            );
        });
    }

    install() {
        this.slSrv.conn.onRequest(WorkspaceOverviewRequest.type, this.workspaceOverview.bind(this));
        this.slSrv.conn.onRequest(LayoutElementRequest.type, this.layoutElement.bind(this));
        this.slSrv.conn.onRequest(FetchNodeRequest.type, this.fetchNode.bind(this));
        this.slSrv.conn.onRequest(ElementViewDataRequest.type, this.provideElementViewData.bind(this));
    }

    sendWorkspaceChange(...events: WorkspaceChangeEvent[]) {
        if ((this.slSrv.state & ServiceStateFlags.StatusReady) !== ServiceStateFlags.StatusReady) return;

        this.slSrv.conn.sendNotification(WorkspaceChangeNotification.type, { events });
    }

    @errGuard()
    @logIt()
    async workspaceOverview(params: WorkspaceOverviewParams): Promise<WorkspaceOverviewResult> {
        const rArchives: DTArchive[] = [];
        for (const sa of this.store.s2ws.archives.values()) {
            rArchives.push({
                kind: DTNodeKind.Archive,
                name: sa.name,
                isBuiltin: sa.native,
                archiveUri: sa.uri.toString(),
            });
        }

        const rLayouts: DTLayout[] = [];
        for (const xDoc of this.store.documents.values()) {
            const fDesc = this.dIndex.resolveElementDesc(xDoc.getRootNode());
            if (!fDesc) continue;

            const sa = this.store.s2ws.matchFileWorkspace(URI.parse(xDoc.tdoc.uri));
            if (!sa) continue;

            rLayouts.push({
                kind: DTNodeKind.Layout,
                name: fDesc.name,
                archiveUri: sa.uri.toString(),
                fileUri: xDoc.tdoc.uri,
            });
        }

        return {
            archives: rArchives,
            layouts: rLayouts,
        };
    }

    @errGuard()
    @logIt()
    async layoutElement(params: LayoutElementParams): Promise<DTElementWithChildren[]> {
        const xDoc = this.store.documents.get(params.textDocument.uri);
        if (!xDoc) return;

        const fDesc = this.dIndex.resolveElementDesc(xDoc.getRootNode());
        if (!fDesc) return;

        return this.dNodeWithChildrenFromDsChildren(fDesc);
    }

    @errGuard()
    @logIt()
    async fetchNode(params: FetchNodeParams): Promise<FetchNodeResult> {
        const sourceFile = await this.slSrv.flushDocumentByUri(params.textDocument.uri);
        if (!sourceFile) return;

        const offset = sourceFile.tdoc.offsetAt(params.position);
        const xEl = sourceFile.findNodeAt(offset);

        if (!(xEl instanceof XMLElement) || !xEl.stype) return;
        const descItem = this.store.index.resolveElementDesc(xEl);
        if (!descItem) return;

        return this.dNodeFromDsItem(descItem, sourceFile) as FetchNodeResult;
    }

    @errGuard()
    @logIt()
    provideElementViewData(params: ElementViewDataParams): ElementViewDataResult {
        const xDoc = this.store.documents.get(params.node.fileUri);
        if (!xDoc) return;
        const fDesc = this.dIndex.resolveElementDesc(xDoc.getRootNode());
        if (!fDesc) return;
        const dsNode = fDesc.getMulti(...params.node.fqn);
        if (!dsNode) return;

        const vRoot: ElementViewDataSection = {
            label: 'vRoot',
        };

        function append(section: ElementViewDataSection, parent?: ElementViewDataSection) {
            if (!parent) {
                parent = vRoot;
            }
            if (!parent.children) {
                parent.children = [];
            }
            parent.children.push(section);
            return section;
        }

        if (dsNode.kind === DescKind.Frame) {
            const uNode = <FrameNode>this.xray.uBuilder.buildNodeFromDesc(dsNode);
            if (!uNode) {
                const tmp = append({ label: 'ERROR', iconPath: 'number.svg' });
                append({
                    label: `Details cannot be shown, because element contains errors.`,
                }, tmp);
                return vRoot;
            }

            const frameType = this.store.schema.getFrameType(uNode.mainDesc.stype);

            // ===
            // header
            append({
                label: uNode.name,
                description: `[${frameType.name}]`,
                tooltip: uNode.fqn,
                iconPath: 'frame.svg',
            });

            // ===
            // hookups
            const vHookupGroup = append({
                label: 'Hookups',
                description: `[${frameType.hookups.size}]`,
                tooltip: 'Native hookup list',
                iconPath: 'dependency.svg',
            });
            for (const hookupItem of frameType.hookups.values()) {
                append({
                    label: (hookupItem.required ? '* ' : '  ') + hookupItem.path,
                    description: hookupItem.fClass.name,
                    tooltip: `"${hookupItem.path}" [${hookupItem.fClass.name}] - ` + (hookupItem.required ? 'required' : 'optional')
                }, vHookupGroup);
            }

            // ===
            // desc structures
            for (const descType of this.store.schema.getFrameDescs(frameType)) {
                const vFrameDescGroup = append({
                    label: descType.name,
                    description: `(${descType.struct.size})`,
                    iconPath: 'folder.svg',
                });

                for (const descField of descType.struct.values()) {
                    append({
                        label: descField.name,
                        description: `[${descField.type.name}]`,
                        tooltip: descField.label,
                    }, vFrameDescGroup);
                }
            }

            // ===
            // class props
            for (const frameClass of frameType.fclasses.values()) {
                const vFrameClassGroup = append({
                    label: frameClass.name,
                    description: `(${frameClass.properties.size})`,
                    iconPath: 'folder.svg',
                });

                for (const frameProperty of frameClass.properties.values()) {
                    append({
                        label: frameProperty.name,
                        description: (
                            `[${frameProperty.etype.type.name}]` +
                            (frameProperty.isReadonly ? ' *R' : '')
                        ),
                        tooltip: frameProperty.etype.label,
                    }, vFrameClassGroup);
                }
            }

            return vRoot;
        }
    }
}
