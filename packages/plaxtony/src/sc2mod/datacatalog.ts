import * as path from 'path';
import { SC2Archive, SC2Workspace } from './archive';

export type CatalogEntryKind = string;
export type CatalogFileKind = string;
export type CatalogFileMap = Map<string, CatalogEntry>;

export interface CatalogEntry {
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

        const parser = new CatalogParser();
        parser.write(await this.archive.readFile(resolvedFiles[0]));
        this.entries = parser.toCatalog();
        parser.close();
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

    private async processDataKind(kind: string, workspace: SC2Workspace) {
        const catalogStore = new CatalogStore(kind);
        const p: Promise<boolean>[] = [];
        for (const archive of workspace.allArchives) {
            p.push(catalogStore.addArchive(archive));
        }
        await Promise.all(p);
        catalogStore.merge();
        this.catalogs.set(kind, catalogStore);
    }

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

        const p: Promise<void>[] = [];
        for (const kind of kindList) {
            p.push(this.processDataKind(kind, workspace));
        }
        await Promise.all(p);

        return true;
    }
}

const reDataElement = /<C([A-Z][A-Za-z0-9]+)\s([^>]+)\/?>/g;
const reAttrs = /([\w-]+)\s?=\s?"([^"]+)"/g;
export class CatalogParser {
    protected catalogMap: CatalogFileMap;

    constructor() {
        this.flush();
    }

    write(s: string) {
        let matchedElement: RegExpMatchArray;
        while (matchedElement = reDataElement.exec(s)) {
            const entry = <CatalogEntry>{
                kind: matchedElement[1],
            };

            let matchedAttr;
            while (matchedAttr = reAttrs.exec(matchedElement[2])) {
                switch (matchedAttr[1]) {
                    case 'id':
                    case 'parent':
                    case 'default':
                        (<any>entry)[matchedAttr[1]] = matchedAttr[2];
                        break;
                }
            }

            reAttrs.lastIndex = 0;
            if (!entry.id) continue;

            if (s.charCodeAt(reDataElement.lastIndex - 2) !== 47) { // '/'
                reDataElement.lastIndex = s.indexOf(`</C${entry.kind}>`, reDataElement.lastIndex)
                if (reDataElement.lastIndex === -1) {
                    reDataElement.lastIndex = 0;
                    break;
                }
            }

            this.catalogMap.set(entry.id, entry);
        }
        reDataElement.lastIndex = 0;
    }

    close() {
        this.flush();
    }

    flush() {
        this.catalogMap = new Map<string, CatalogEntry>();
    }

    toCatalog() {
        return this.catalogMap;
    }
}
