import * as fs from 'fs'
import * as util from 'util'
import * as glob from 'glob'
import * as path from 'path'
import * as xml from 'xml2js';
import * as trig from './trigger';
import * as cat from './datacatalog';
import * as loc from './localization';
import { globify } from '../service/utils';

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
    lang = 'enUS';
    triggers = new loc.LocalizationTriggers();
    strings = new Map<string,loc.LocalizationTextStore>();

    private async loadStrings(name: string) {
        const textStore = new loc.LocalizationTextStore();
        for (const archive of this.workspace.allArchives) {
            const filenames = await archive.findFiles(this.lang + '.SC2Data/LocalizedData/' + name + 'Strings.txt');
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
            const filenames = await archive.findFiles('enUS.SC2Data/LocalizedData/TriggerStrings.txt');
            if (filenames.length) {
                const locFile = new loc.LocalizationFile();
                locFile.read(await archive.readFile(filenames[0]));
                this.triggers.merge(locFile);
            }
        }

        // await this.loadStrings('Trigger');
        await this.loadStrings('Game');
        await this.loadStrings('Object');

        return true;
    }
}

export interface ArchiveLink {
    name: string;
    src: string;
}

export async function resolveArchiveDirectory(name: string, sources: string[]) {
    for (const src of sources) {
        const results = await globify(`${name}/`, {nocase: true, realpath: true, cwd: src});

        if (results.length) {
            return results[0];
        }
    }
}

export async function resolveArchiveDependencyList(rootArchive: SC2Archive, sources: string[], overrides: Map<string,string> = null) {
    const list: ArchiveLink[] = [];
    const unresolvedNames: string[] = [];

    async function resolveWorker(archive: SC2Archive) {
        for (const entry of await archive.getDependencyList()) {
            if (list.findIndex((item) => item.name === entry) !== -1) {
                continue;
            }
            const link = <ArchiveLink>{
                name: entry,
            };

            let dir: string;
            if (overrides && overrides.has(entry)) {
                dir = overrides.get(entry);
            }
            else {
                dir = await resolveArchiveDirectory(entry, sources);
            }
            if (dir) {
                await resolveWorker(new SC2Archive(entry, dir));
                link.src = dir;
                list.push(link);
            }
            else {
                unresolvedNames.push(entry);
            }
        }
    }

    await resolveWorker(rootArchive);

    return {
        list,
        unresolvedNames,
    };
}

export async function openArchiveWorkspace(archive: SC2Archive, sources: string[], overrides: Map<string,string> = null, extra: Map<string,string> = null) {
    const dependencyArchives: SC2Archive[] = [];
    const result = await resolveArchiveDependencyList(archive, sources, overrides);

    if (result.unresolvedNames.length > 0) {
        throw new Error(`couldn\'t resolve ${util.inspect(result.unresolvedNames)}\nSources: ${util.inspect(sources)}\nOverrides: ${util.inspect(overrides)}`);
    }

    for (const link of result.list) {
        dependencyArchives.push(new SC2Archive(link.name, link.src));
    }

    if (extra) {
        for (const [name, src] of extra) {
            dependencyArchives.push(new SC2Archive(name, src));
        }
    }

    return new SC2Workspace(archive, dependencyArchives);
}

export class SC2Archive {
    readonly name: string;
    readonly directory: string;
    /** lower-cased `fsPath` */
    readonly lcFsPath: string;

    constructor(name: string, directory: string) {
        this.name = name.replace(/\\/g, '/').toLowerCase();
        this.directory = path.resolve(directory);
        this.lcFsPath = this.directory.toLowerCase();
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

        let matches: RegExpExecArray;
        if (matches = /^campaigns\/(liberty|swarm|void)story\.sc2campaign$/i.exec(this.name)) {
            list.push('campaigns/' + matches[1] + '.sc2campaign');
        }
        else if (matches = /^campaigns\/(liberty|swarm|void)\.sc2campaign$/i.exec(this.name)) {
            if (matches[1] === 'void') {
                list.push('campaigns/swarm.sc2campaign');
            }
            else if (matches[1] === 'swarm') {
                list.push('campaigns/liberty.sc2campaign');
            }
            list.push('mods/' + matches[1] + '.sc2mod');
        }
        else if (matches = /^mods\/(liberty|swarm|void)\.sc2mod$/i.exec(this.name)) {
            if (matches[1] === 'void') {
                list.push('mods/swarm.sc2mod');
            }
            else if (matches[1] === 'swarm') {
                list.push('mods/liberty.sc2mod');
            }
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

            if (data.DocInfo.Dependencies) {
                for (const depValue of data.DocInfo.Dependencies[0].Value) {
                    list.push(depValue.substr(depValue.indexOf('file:') + 5).replace(/\\/g, '/').toLowerCase());
                }
            }
        }
        return list;
    }
}

export enum S2ArchiveNsNameKind {
    'base',
    'enus',
    // TODO: add missing localizations
}

export enum S2ArchiveNsTypeKind {
    'sc2data',
    'sc2assets',
}

export interface S2FileNs {
    name: keyof typeof S2ArchiveNsNameKind;
    type: keyof typeof S2ArchiveNsTypeKind;
}

export interface S2QualifiedFile {
    fsPath: string;
    relativePath: string;
    namespace?: S2FileNs;
    archive: SC2Archive;
}

const reArchiveFileNs = /^(?:(?<nsName>[a-z]+)\.(?<nsType>(?:sc2data|sc2assets))(?:\/|\\))?(?<rp>.+)$/i;

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
        const p: Promise<boolean>[] = [];
        p.push(this.trigComponent.load());
        p.push(this.locComponent.load());
        p.push(this.catalogComponent.load());
        await Promise.all(p);
    }

    public resolvePath(fsPath: string): S2QualifiedFile | undefined {
        for (const cArchive of this.allArchives) {
            if (!fsPath.toLowerCase().startsWith(cArchive.lcFsPath + path.sep)) continue;

            const m = fsPath.substr(cArchive.lcFsPath.length + 1).match(reArchiveFileNs);
            if (!m) return;

            let ns: S2FileNs;
            if (m.groups['nsName']) {
                ns = {
                    name: <any>m.groups['nsName'].toLowerCase(),
                    type: <any>m.groups['nsType'].toLowerCase(),
                };
            }

            return {
                fsPath: fsPath,
                relativePath: m.groups['rp'].replace(/\\/g, '/'),
                namespace: ns,
                archive: cArchive,
            };
        }
    }
}
