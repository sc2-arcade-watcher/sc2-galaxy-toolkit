import { SC2Archive, SC2Workspace } from './archive';
export declare type CatalogEntryKind = string;
export declare type CatalogFileKind = string;
export declare type CatalogFileMap = Map<string, CatalogEntry>;
export interface CatalogEntry {
    kind: CatalogEntryKind;
    id: string;
    parent?: string;
    default: boolean;
}
export declare class CatalogFile {
    protected kind: CatalogFileKind;
    protected archive: SC2Archive;
    entries: CatalogFileMap;
    constructor(archive: SC2Archive, kind: CatalogFileKind);
    load(): Promise<boolean>;
}
export declare class CatalogStore {
    readonly kind: CatalogFileKind;
    files: CatalogFile[];
    entries: CatalogFileMap;
    constructor(kind: CatalogFileKind);
    addArchive(archive: SC2Archive): Promise<boolean>;
    merge(): void;
}
export declare class GameCatalogStore {
    catalogs: Map<CatalogFileKind, CatalogStore>;
    private processDataKind(kind, workspace);
    loadData(workspace: SC2Workspace): Promise<boolean>;
}
export declare class CatalogParser {
    protected catalogMap: CatalogFileMap;
    constructor();
    write(s: string): void;
    close(): void;
    flush(): void;
    toCatalog(): Map<string, CatalogEntry>;
}
