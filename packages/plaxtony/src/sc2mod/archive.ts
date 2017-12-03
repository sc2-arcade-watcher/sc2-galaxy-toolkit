import * as fs from 'fs'
import * as glob from 'glob'
import * as path from 'path'
import * as xml from 'xml2js';
import * as trig from './trigger';
import * as cat from './datacatalog';
import * as loc from './localization';

export function isSC2Archive(directory: string) {
    return /\.(SC2Mod|SC2Map|SC2Campaign)$/i.exec(path.basename(directory));
}

export function findSC2ArchiveDirectories(directory: string) {
    directory = path.relative(process.cwd(), path.resolve(directory));
    return new Promise<string[]>((resolve, reject) => {
        if (isSC2Archive(directory)) {
            resolve([path.resolve(directory)]);
            return;
        }
        glob(path.join(directory, '**/*.+(SC2Mod|SC2Map|SC2Campaign)'), {nocase: true, realpath: true} , (err, matches) => {
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

function findSC2File(directory: string, pattern: string) {
    return new Promise<string[]>((resolve, reject) => {
        glob(path.join(pattern), {nocase: true, realpath: true, nodir: true, cwd: directory} , (err, matches) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(matches);
            }
        });
    });
}

export abstract class Component {
    protected workspace: SC2Workspace;
    protected waitPromise: Promise<boolean>;
    protected waitQueue: (ready: boolean) => void;
    protected ready: boolean = false;

    constructor(workspace: SC2Workspace) {
        this.workspace = workspace;
    }

    public load() {
        this.ready = false;
        // this.waitQueue = (ready: boolean) => {
        // }
        this.waitPromise = new Promise<boolean>(async (resolve, reject) => {
            try {
                this.ready = await this.loadData();
                resolve(this.ready);
            }
            catch (e) {
                e.message = '[' + this.constructor.name + '/load] ' + e.message;
                reject(e);
            }
        });
        return Promise.resolve(this.waitPromise);
    }

    abstract async loadData(): Promise<boolean>;

    public isReady(): boolean {
        return this.ready;
    }

    public sync(): Promise<boolean> {
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

export class TriggerComponent extends Component {
    protected store = new trig.TriggerStore();
    // protected libraries: trig.Library;

    public async loadData() {
        const trigReader = new trig.XMLReader(this.store);

        for (const archive of this.workspace.allArchives) {
            for (const filename of await archive.findFiles('**/+(*.TriggerLib|*.SC2Lib)')) {
                this.store.addLibrary(await trigReader.loadLibrary(await archive.readFile(filename)));
            }
            if (await archive.hasFile('Triggers')) {
                await trigReader.load(await archive.readFile('Triggers'), this.workspace.rootArchive !== archive);
            }
        }

        return true;
    }

    public getStore() {
        return this.store;
    }
}

export class CatalogComponent extends Component {
    protected store = new cat.GameCatalogStore();

    public async loadData() {
        await this.store.loadData(this.workspace);

        return true;
    }

    public getStore() {
        return this.store;
    }
}

export class LocalizationComponent extends Component {
    triggers = new loc.LocalizationTriggers();
    strings = new Map<string,loc.LocalizationTextStore>();

    private async loadStrings(name: string, lang: string) {
        const textStore = new loc.LocalizationTextStore();
        for (const archive of this.workspace.allArchives) {
            const filenames = await archive.findFiles(lang + '.SC2Data/LocalizedData/' + name + 'Strings.txt');
            if (filenames.length) {
                const locFile = new loc.LocalizationFile();
                locFile.read(await archive.readFile(filenames[0]));
                textStore.merge(locFile);
            }
        }
        this.strings.set(name, textStore);
    }

    public async loadData() {
        for (const archive of this.workspace.allArchives) {
            const filenames = await archive.findFiles('**/TriggerStrings.txt');
            if (filenames.length) {
                const locFile = new loc.LocalizationFile();
                locFile.read(await archive.readFile(filenames[0]));
                this.triggers.merge(locFile);
            }
        }

        // await this.loadStrings('Trigger', 'enUS');
        await this.loadStrings('Game', 'enUS');
        await this.loadStrings('Object', 'enUS');

        return true;
    }
}

export interface ArchiveLink {
    name: string;
    src: string;
}

export function resolveArchiveDirectory(name: string, sources: string[]) {
    for (const src of sources) {
        if (fs.existsSync(path.join(src, name).toLowerCase())) {
            return path.join(src, name).toLowerCase();
        }
        const results = glob.sync(name, {nocase: true, realpath: true, cwd: src});

        if (results.length) {
            return results[0];
        }
    }
}

export async function resolveArchiveDependencyList(archive: SC2Archive, sources: string[], list: ArchiveLink[] = []) {
    for (const entry of await archive.getDependencyList()) {
        if (list.findIndex((item) => item.name === entry) !== -1) {
            continue;
        }
        const link = <ArchiveLink>{
            name: entry,
        };

        const dir = resolveArchiveDirectory(entry, sources);
        if (!dir) {
            throw new Error('coldn\'t resolve "' + entry + '"');
        }
        link.src = dir;
        list.push(link);
        await resolveArchiveDependencyList(new SC2Archive(entry, dir), sources, list);
    }
    return list;
}

export async function openArchiveWorkspace(archive: SC2Archive, sources: string[]) {
    const dependencyArchives: SC2Archive[] = [];
    const list = await resolveArchiveDependencyList(archive, sources);

    for (const link of list) {
        dependencyArchives.push(new SC2Archive(link.name, link.src));
    }

    return new SC2Workspace(archive, dependencyArchives);
}

export class SC2Archive {
    // triggers = new trig.TriggerStore();
    // trigStrings = new Map<string, LocalizationFile>();
    // trigStrings = new LocalizationFile();
    name: string;
    directory: string;

    constructor(name: string, directory: string) {
        this.name = name.toLowerCase();
        // this.directory = directory;
        this.directory = path.resolve(directory);
    }

    public async findFiles(pattern: string) {
        const dirs = await findSC2File(this.directory, pattern);
        return dirs.map((item) => {
            return item.substr(fs.realpathSync(this.directory).length + 1);
        });
    }

    public async hasFile(filename: string) {
        return new Promise<boolean>((resolve) => {
            fs.exists(path.join(this.directory, filename), (result) => {
                resolve(result);
            })
        });
    }

    public async readFile(filename: string) {
        return new Promise<string>((resolve, reject) => {
            fs.readFile(path.join(this.directory, filename), 'utf8', (err, result) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    }

    public async getDependencyList() {
        const list: string[] = [];

        if (this.name !== 'mods/core.sc2mod') {
            list.push('mods/core.sc2mod');
        }

        if (await this.hasFile('DocumentInfo')) {
            const content = await this.readFile('DocumentInfo');
            const data: any = await new Promise((resolve, reject) => {
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

            let depValue: string;
            for (depValue of data.DocInfo.Dependencies[0].Value) {
                list.push(depValue.substr(depValue.indexOf('file:') + 5).replace('\\', '/'));
            }
        }
        return list;
    }
}

export class SC2Workspace {
    rootArchive?: SC2Archive;
    allArchives: SC2Archive[] = [];
    dependencies: SC2Archive[] = [];
    trigComponent: TriggerComponent = new TriggerComponent(this);
    locComponent: LocalizationComponent = new LocalizationComponent(this);
    catalogComponent: CatalogComponent = new CatalogComponent(this);

    constructor(rootArchive?: SC2Archive, dependencies: SC2Archive[] = []) {
        this.rootArchive = rootArchive;
        this.dependencies = dependencies;
        this.allArchives = this.allArchives.concat(this.dependencies);
        if (rootArchive) {
            this.allArchives.push(rootArchive);
        }
    }

    public async loadComponents() {
        await this.trigComponent.load();
        await this.locComponent.load();
        await this.catalogComponent.load();
    }
}
