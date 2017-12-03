import * as xml from 'xml2js';
import * as path from 'path';
import { SC2Archive, SC2Workspace } from './archive';

export type CatalogEntryKind = string;
export type CatalogFileKind = string;
export type CatalogFileMap = Map<string, CatalogEntry>;

export class CatalogEntry {
    kind: CatalogEntryKind;
    id: string;
    parent?: string;
    default: boolean;
    // tokens: Map<string,string>;
    // attrs: Map<string,string>;
    // data
}

export class CatalogFile {
    protected kind: CatalogFileKind;
    protected archive: SC2Archive;
    entries: CatalogFileMap;

    constructor(archive: SC2Archive, kind: CatalogFileKind) {
        this.archive = archive;
        this.kind = kind;
    }

    public async load() {
        const filepath = 'Base.SC2Data/GameData/' + this.kind + 'Data.xml';
        const resolvedFiles = await this.archive.findFiles(filepath);
        if (!(resolvedFiles).length) {
            return false;
        }

        const reader = new XMLFileReader();
        await reader.readFromString(await this.archive.readFile(resolvedFiles[0]));
        this.entries = reader.toCatalog();
        return true;
    }
}

export class CatalogStore {
    readonly kind: CatalogFileKind;
    files: CatalogFile[] = [];
    entries: CatalogFileMap = new Map<string, CatalogEntry>();

    constructor(kind: CatalogFileKind) {
        this.kind = kind;
    }

    public async addArchive(archive: SC2Archive) {
        const catalogFile = new CatalogFile(archive, this.kind);
        const result = await catalogFile.load();
        if (result) {
            this.files.push(catalogFile);
            return true;
        }
        return false;
    }

    public merge() {
        this.entries.clear();

        for (const cfile of this.files) {
            for (const entry of cfile.entries.values()) {
                this.entries.set(entry.id, entry);
            }
        }
    }
}

export class GameCatalogStore {
    catalogs: Map<CatalogFileKind, CatalogStore>;

    async loadData(workspace: SC2Workspace): Promise<boolean> {
        const kindList: string[] = [];
        const archiveFiles = new Map<string,string[]>();

        this.catalogs = new Map<string, CatalogStore>();

        for (const archive of workspace.allArchives) {
            const files = await archive.findFiles('Base.SC2Data/GameData/*Data.xml')
            archiveFiles.set(archive.name, files);

            for (const name of files) {
                let kind = path.basename(name);
                kind = kind.substr(0, kind.length - 8);
                if (!kindList.find((item) => item.valueOf() === kind.valueOf())) {
                    kindList.push(kind);
                }
            }
        }

        for (const kind of kindList) {
            const catalogStore = new CatalogStore(kind);
            for (const archive of workspace.allArchives) {
                await catalogStore.addArchive(archive);
            }
            catalogStore.merge();
            this.catalogs.set(kind, catalogStore);
        }

        return true;
    }
}

export class XMLFileReader {
    protected catalogMap: CatalogFileMap;

    protected parse(xmlEntries: any) {
        this.catalogMap = new Map<string, CatalogEntry>();

        for (const kind in xmlEntries) {
            if (!kind.startsWith('C')) continue;

            for (const xmlEntry of xmlEntries[kind]) {
                const cEntry = new CatalogEntry();
                cEntry.kind = kind;

                if (xmlEntry.$ && xmlEntry.$.id) {
                    cEntry.id = xmlEntry.$.id;
                }
                else {
                    cEntry.id = kind;
                }

                if (xmlEntry.$ && xmlEntry.$.default) {
                    cEntry.default = xmlEntry.$.default === '1';
                }
                else {
                    cEntry.default = false;
                }
                if (xmlEntry.$ && xmlEntry.$.parent) {
                    cEntry.parent = xmlEntry.$.parent;
                }

                this.catalogMap.set(cEntry.id, cEntry);
            }
        }
    }

    public readFromString(text: string) {
        return new Promise<any>((resolve, reject) => {
            xml.parseString(text, (err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    try {
                        this.parse(result.Catalog);
                        resolve();
                    }
                    catch (err) {
                        reject(err);
                    }
                }
            });
        });
    }

    public toCatalog(): CatalogFileMap {
        return this.catalogMap;
    }
}
