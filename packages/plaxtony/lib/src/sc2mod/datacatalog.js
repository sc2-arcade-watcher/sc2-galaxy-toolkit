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
const reDataElement = /<C([A-Z][A-Za-z0-9]+)\s([^>]+)\/?>/g;
const reAttrs = /([\w-]+)\s?=\s?"([^"]+)"/g;
class CatalogParser {
    constructor() {
        this.flush();
    }
    write(s) {
        let matchedElement;
        while (matchedElement = reDataElement.exec(s)) {
            const entry = {
                kind: matchedElement[1],
            };
            let matchedAttr;
            while (matchedAttr = reAttrs.exec(matchedElement[2])) {
                switch (matchedAttr[1]) {
                    case 'id':
                    case 'parent':
                    case 'default':
                        entry[matchedAttr[1]] = matchedAttr[2];
                        break;
                }
            }
            reAttrs.lastIndex = 0;
            if (!entry.id)
                continue;
            if (s.charCodeAt(reDataElement.lastIndex - 2) !== 47) { // '/'
                reDataElement.lastIndex = s.indexOf(`</C${entry.kind}>`, reDataElement.lastIndex);
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
        this.catalogMap = new Map();
    }
    toCatalog() {
        return this.catalogMap;
    }
}
exports.CatalogParser = CatalogParser;
//# sourceMappingURL=datacatalog.js.map