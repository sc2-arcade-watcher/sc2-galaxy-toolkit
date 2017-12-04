"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const xml = require("xml2js");
const path = require("path");
class CatalogEntry {
}
exports.CatalogEntry = CatalogEntry;
class CatalogFile {
    constructor(archive, kind) {
        this.archive = archive;
        this.kind = kind;
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            const filepath = 'Base.SC2Data/GameData/' + this.kind + 'Data.xml';
            const resolvedFiles = yield this.archive.findFiles(filepath);
            if (!(resolvedFiles).length) {
                return false;
            }
            const reader = new XMLFileReader();
            yield reader.readFromString(yield this.archive.readFile(resolvedFiles[0]));
            this.entries = reader.toCatalog();
            return true;
        });
    }
}
exports.CatalogFile = CatalogFile;
class CatalogStore {
    constructor(kind) {
        this.files = [];
        this.entries = new Map();
        this.kind = kind;
    }
    addArchive(archive) {
        return __awaiter(this, void 0, void 0, function* () {
            const catalogFile = new CatalogFile(archive, this.kind);
            const result = yield catalogFile.load();
            if (result) {
                this.files.push(catalogFile);
                return true;
            }
            return false;
        });
    }
    merge() {
        this.entries.clear();
        for (const cfile of this.files) {
            for (const entry of cfile.entries.values()) {
                this.entries.set(entry.id, entry);
            }
        }
    }
}
exports.CatalogStore = CatalogStore;
class GameCatalogStore {
    loadData(workspace) {
        return __awaiter(this, void 0, void 0, function* () {
            const kindList = [];
            const archiveFiles = new Map();
            this.catalogs = new Map();
            for (const archive of workspace.allArchives) {
                const files = yield archive.findFiles('Base.SC2Data/GameData/*Data.xml');
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
                    yield catalogStore.addArchive(archive);
                }
                catalogStore.merge();
                this.catalogs.set(kind, catalogStore);
            }
            return true;
        });
    }
}
exports.GameCatalogStore = GameCatalogStore;
class XMLFileReader {
    parse(xmlEntries) {
        this.catalogMap = new Map();
        for (const kind in xmlEntries) {
            if (!kind.startsWith('C'))
                continue;
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
    readFromString(text) {
        return new Promise((resolve, reject) => {
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
    toCatalog() {
        return this.catalogMap;
    }
}
exports.XMLFileReader = XMLFileReader;
//# sourceMappingURL=datacatalog.js.map