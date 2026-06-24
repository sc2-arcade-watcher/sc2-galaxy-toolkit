import * as lsp from 'vscode-languageserver';
import { RequestType, NotificationType } from 'vscode-jsonrpc';
import { TextDocumentIdentifier } from 'vscode-languageserver';

export enum DTNodeKind {
    Archive,
    Layout,
    Element,
}

export enum DTElementKind {
    Frame,
    Animation,
    Stategroup,
}

export interface DTItem {
    kind: DTNodeKind;
    name: string;
}

export interface DTArchive extends DTItem {
    kind: DTNodeKind.Archive;
    isBuiltin: boolean;
    archiveUri: string;
}

export interface DTLayout extends DTItem {
    kind: DTNodeKind.Layout;
    archiveUri: string;
    fileUri: string;
}

export interface DTElement extends DTItem {
    kind: DTNodeKind.Element;
    elementKind: DTElementKind;
    childrenCount: number;
    fileUri: string;
    ctype: string;
    fqn: string[];
    selectionRange?: lsp.Range;
}

export interface DTElementWithChildren extends DTElement {
    children: DTElementWithChildren[];
}

export type DTItemType = DTArchive | DTLayout | DTElement;


// ===

export interface WorkspaceOverviewParams {
}

export interface WorkspaceOverviewResult {
    archives: DTArchive[];
    layouts: DTLayout[];
}

export namespace WorkspaceOverviewRequest {
    export const type = new RequestType<WorkspaceOverviewParams, WorkspaceOverviewResult, void, void>('descTree/workspaceOverview');
}

// ===

export interface WorkspaceChangeEvent {
    resource: DTArchive | DTLayout;
    type: lsp.FileChangeType;
}

export interface WorkspaceChangeParams {
    events: WorkspaceChangeEvent[];
}

export namespace WorkspaceChangeNotification {
    export const type = new NotificationType<WorkspaceChangeParams, void>('descTree/workspaceChange');
}

// ===

export interface LayoutElementParams {
    textDocument: TextDocumentIdentifier;
}

export namespace LayoutElementRequest {
    export const type = new RequestType<LayoutElementParams, DTElementWithChildren[], void, void>('descTree/layoutElement');
}

// ===

export type FetchNodeParams = lsp.TextDocumentPositionParams;

export type FetchNodeResult = DTLayout | DTElement | null;

export namespace FetchNodeRequest {
    export const type = new RequestType<FetchNodeParams, FetchNodeResult, void, void>('descTree/fetchNode');
}

// ===

export interface ElementViewDataParams {
    node: DTElement;
}

export interface ElementViewDataSection {
    label: string;
    description?: string;
    tooltip?: string;
    iconPath?: string;
    children?: ElementViewDataSection[];
}

export type ElementViewDataResult = ElementViewDataSection | undefined;

export namespace ElementViewDataRequest {
    export const type = new RequestType<ElementViewDataParams, ElementViewDataResult, void, void>('descTree/elementViewData');
}
