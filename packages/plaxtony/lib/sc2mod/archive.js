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
const fs = require("fs");
const glob = require("glob");
const path = require("path");
const xml = require("xml2js");
const trig = require("./trigger");
const loc = require("./localization");
function isSC2Archive(directory) {
    return /\.(SC2Mod|SC2Map|SC2Campaign)$/i.exec(path.basename(directory));
}
exports.isSC2Archive = isSC2Archive;
function findSC2ArchiveDirectories(directory) {
    return new Promise((resolve, reject) => {
        if (isSC2Archive(directory)) {
            resolve([path.resolve(directory)]);
            return;
        }
        glob(path.join(directory, '**/*.+(SC2Mod|SC2Map|SC2Campaign)'), { nocase: true, realpath: true }, (err, matches) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(matches.filter((value) => {
                    return fs.lstatSync(value).isDirectory();
                }));
            }
        });
    });
}
exports.findSC2ArchiveDirectories = findSC2ArchiveDirectories;
function findSC2File(directory, pattern) {
    return new Promise((resolve, reject) => {
        glob(path.join('**/' + pattern), { nocase: true, realpath: true, nodir: true, cwd: directory }, (err, matches) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(matches);
            }
        });
    });
}
class Component {
    constructor(workspace) {
        this.ready = false;
        this.workspace = workspace;
    }
    load() {
        this.ready = false;
        // this.waitQueue = (ready: boolean) => {
        // }
        this.waitPromise = new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                this.ready = yield this.loadData();
                resolve(this.ready);
            }
            catch (e) {
                e.message = '[' + this.constructor.name + '/load] ' + e.message;
                reject(e);
            }
        }));
        return Promise.resolve(this.waitPromise);
    }
    isReady() {
        return this.ready;
    }
    sync() {
        if (!this.waitPromise) {
            return Promise.race([this.load()]);
            // return this.ready;
        }
        if (this.isReady()) {
            return Promise.resolve(true);
        }
        return Promise.race([this.waitPromise]);
    }
}
exports.Component = Component;
class TriggerComponent extends Component {
    constructor() {
        super(...arguments);
        this.store = new trig.TriggerStore();
    }
    // protected libraries: trig.Library;
    loadData() {
        return __awaiter(this, void 0, void 0, function* () {
            const trigReader = new trig.XMLReader(this.store);
            for (const archive of this.workspace.allArchives) {
                for (const filename of yield archive.findFiles('+(*.TriggerLib|*.SC2Lib)')) {
                    this.store.addLibrary(yield trigReader.loadLibrary(yield archive.readFile(filename)));
                }
                if (yield archive.hasFile('Triggers')) {
                    yield trigReader.load(yield archive.readFile('Triggers'), this.workspace.rootArchive !== archive);
                }
            }
            return true;
        });
    }
    getStore() {
        return this.store;
    }
}
exports.TriggerComponent = TriggerComponent;
class LocalizationComponent extends Component {
    constructor() {
        super(...arguments);
        this.triggers = new loc.LocalizationTriggers();
    }
    loadData() {
        return __awaiter(this, void 0, void 0, function* () {
            // for (const filename of await findSC2File(this.directory, '*.sc2data/LocalizedData/TriggerStrings.txt')) {
            // }
            for (const archive of this.workspace.allArchives) {
                const filenames = yield archive.findFiles('TriggerStrings.txt');
                if (filenames.length) {
                    const locFile = new loc.LocalizationFile();
                    locFile.read(yield archive.readFile(filenames[0]));
                    this.triggers.merge(locFile);
                }
            }
            return true;
        });
    }
}
exports.LocalizationComponent = LocalizationComponent;
function resolveArchiveDirectory(name, sources) {
    for (const src of sources) {
        const results = glob.sync(path.join(src, name), { nocase: true, realpath: true });
        if (results.length) {
            return results[0];
        }
    }
}
exports.resolveArchiveDirectory = resolveArchiveDirectory;
function resolveArchiveDependencyList(archive, sources, list = []) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const entry of yield archive.getDependencyList()) {
            if (list.findIndex((item) => item.name === entry) !== -1) {
                continue;
            }
            const link = {
                name: entry,
            };
            const dir = resolveArchiveDirectory(entry, sources);
            if (!dir) {
                throw new Error('coldn\'t resolve "' + entry + '"');
            }
            link.src = dir;
            list.push(link);
            yield resolveArchiveDependencyList(new SC2Archive(entry, dir), sources, list);
        }
        return list;
    });
}
exports.resolveArchiveDependencyList = resolveArchiveDependencyList;
function openArchiveWorkspace(archive, sources) {
    return __awaiter(this, void 0, void 0, function* () {
        const dependencyArchives = [];
        const list = yield resolveArchiveDependencyList(archive, sources);
        for (const link of list) {
            dependencyArchives.push(new SC2Archive(link.name, link.src));
        }
        return new SC2Workspace(archive, dependencyArchives);
    });
}
exports.openArchiveWorkspace = openArchiveWorkspace;
class SC2Archive {
    constructor(name, directory) {
        this.name = name.toLowerCase();
        // this.directory = directory;
        this.directory = path.resolve(directory);
    }
    findFiles(pattern) {
        return __awaiter(this, void 0, void 0, function* () {
            const dirs = yield findSC2File(this.directory, pattern);
            return dirs.map((item) => {
                return item.substr(this.directory.length + 1);
            });
        });
    }
    hasFile(filename) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                fs.exists(path.join(this.directory, filename), (result) => {
                    resolve(result);
                });
            });
        });
    }
    readFile(filename) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                fs.readFile(path.join(this.directory, filename), 'utf8', (err, result) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(result);
                    }
                });
            });
        });
    }
    getDependencyList() {
        return __awaiter(this, void 0, void 0, function* () {
            const list = [];
            if (this.name !== 'mods/core.sc2mod') {
                list.push('mods/core.sc2mod');
            }
            if (yield this.hasFile('DocumentInfo')) {
                const content = yield this.readFile('DocumentInfo');
                const data = yield new Promise((resolve, reject) => {
                    xml.parseString(content, (err, result) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            try {
                                resolve(result);
                            }
                            catch (err) {
                                reject(err);
                            }
                        }
                    });
                });
                let depValue;
                for (depValue of data.DocInfo.Dependencies[0].Value) {
                    list.push(depValue.substr(depValue.indexOf('file:') + 5).replace('\\', '/'));
                }
            }
            return list;
        });
    }
}
exports.SC2Archive = SC2Archive;
class SC2Workspace {
    constructor(rootArchive, dependencies = []) {
        this.allArchives = [];
        this.dependencies = [];
        this.trigComponent = new TriggerComponent(this);
        this.locComponent = new LocalizationComponent(this);
        this.rootArchive = rootArchive;
        this.dependencies = dependencies;
        this.allArchives = this.allArchives.concat(this.dependencies);
        if (rootArchive) {
            this.allArchives.push(rootArchive);
        }
    }
    loadComponents() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.trigComponent.load();
            yield this.locComponent.load();
        });
    }
}
exports.SC2Workspace = SC2Workspace;
//# sourceMappingURL=archive.js.map