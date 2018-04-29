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
const sax = require("sax");
const path = require("path");
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
            const parser = new CatalogParser();
            parser.write(yield this.archive.readFile(resolvedFiles[0]));
            this.entries = parser.toCatalog();
            parser.close();
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
    processDataKind(kind, workspace) {
        return __awaiter(this, void 0, void 0, function* () {
            const catalogStore = new CatalogStore(kind);
            const p = [];
            for (const archive of workspace.allArchives) {
                p.push(catalogStore.addArchive(archive));
            }
            yield Promise.all(p);
            catalogStore.merge();
            this.catalogs.set(kind, catalogStore);
        });
    }
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
            const p = [];
            for (const kind of kindList) {
                p.push(this.processDataKind(kind, workspace));
            }
            yield Promise.all(p);
            return true;
        });
    }
}
exports.GameCatalogStore = GameCatalogStore;
const reDataEntry = /^C([A-Za-z0-9]+)$/;
class CatalogParser extends sax.SAXParser {
    constructor() {
        super(true, {
            position: false,
        });
        this.depth = 0;
    }
    onready() {
        this.catalogMap = new Map();
    }
    onend() {
        this.catalogMap = new Map();
    }
    onopentag(tag) {
        if (this.depth === 1 && tag.name.startsWith('C')) {
            if (tag.attributes['id']) {
                this.catalogMap.set(tag.attributes['id'], {
                    kind: tag.name,
                    id: tag.attributes['id'],
                    default: tag.attributes['default'] ? true : false,
                    parent: tag.attributes['parent'] || null,
                });
            }
        }
        this.depth++;
    }
    onclosetag(tagName) {
        this.depth--;
    }
    toCatalog() {
        return this.catalogMap;
    }
}
exports.CatalogParser = CatalogParser;
//# sourceMappingURL=datacatalog.js.map