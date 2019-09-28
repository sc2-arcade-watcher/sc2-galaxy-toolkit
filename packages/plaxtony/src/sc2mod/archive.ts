import * as fs from 'fs';
import * as util from 'util';
import * as path from 'path';
import * as xml from 'xml2js';
import * as trig from './trigger';
import * as cat from './datacatalog';
import * as loc from './localization';
import { globify } from '../service/utils';
import { logger, logIt } from '../common';

const validArchiveExtensions = [
    'sc2map',
    'sc2interface',
    'sc2campaign',
    'sc2mod',
];

const reValidArchiveExtension = new RegExp('\\.(' + validArchiveExtensions.join('|') + ')$', 'i');

export enum BuiltinDeps {
    'mods/core.sc2mod',
    'mods/glue.sc2mod',
    'mods/liberty.sc2mod',
    'mods/swarm.sc2mod',
    'mods/void.sc2mod',
    'mods/libertymulti.sc2mod',
    'mods/swarmmulti.sc2mod',
    'mods/voidmulti.sc2mod',
    'mods/balancemulti.sc2mod',
    'mods/starcoop/starcoop.sc2mod',
    'mods/war3.sc2mod',
    'mods/novastoryassets.sc2mod',
    'campaigns/liberty.sc2campaign',
    'campaigns/swarm.sc2campaign',
    'campaigns/void.sc2campaign',
    'campaigns/libertystory.sc2campaign',
    'campaigns/swarmstory.sc2campaign',
    'campaigns/voidstory.sc2campaign',
}
export type builtinDepName = keyof typeof BuiltinDeps;
const builtinDepsHierarchy = (function() {
    function depsFor(modName: builtinDepName) {
        let list: string[] = [];

        let matches: RegExpExecArray;
        if (matches = /^campaigns\/(liberty|swarm|void)story\.sc2campaign$/i.exec(modName)) {
            list.push('campaigns/' + matches[1] + '.sc2campaign');
        }
        else if (matches = /^mods\/(liberty|swarm|void|balance)multi\.sc2mod$/i.exec(modName)) {
            if (matches[1] === 'balance') {
                list.push('mods/void.sc2mod');
            }
            else {
                list.push('mods/' + matches[1] + '.sc2mod');
            }
        }
        else if (matches = /^campaigns\/(liberty|swarm|void)\.sc2campaign$/i.exec(modName)) {
            if (matches[1] === 'void') {
                list.push('campaigns/swarm.sc2campaign');
            }
            else if (matches[1] === 'swarm') {
                list.push('campaigns/liberty.sc2campaign');
            }
            list.push('mods/' + matches[1] + '.sc2mod');
        }
        else if (matches = /^mods\/(liberty|swarm|void)\.sc2mod$/i.exec(modName)) {
            if (matches[1] === 'void') {
                list.push('mods/swarm.sc2mod');
            }
            else if (matches[1] === 'swarm') {
                list.push('mods/liberty.sc2mod');
            }
        }
        else {
            switch (modName) {
                case 'mods/novastoryassets.sc2mod':
                case 'mods/starcoop/starcoop.sc2mod':
                {
                    list.push('campaigns/void.sc2campaign');
                    break;
                }
            }
        }

        for (const item of list) {
            list = depsFor(item as builtinDepName).concat(list.reverse());
        }

        return list;
    }

    const depHierarchy: {[key in builtinDepName]: string[]} = {} as any;
    for (const modName of Object.keys(BuiltinDeps).filter(v => typeof (BuiltinDeps as any)[v] === 'number')) {
        depHierarchy[modName as builtinDepName] = [];
        if (modName !== 'mods/core.sc2mod') {
            depHierarchy[modName as builtinDepName].push('mods/core.sc2mod');
        }
        depHierarchy[modName as builtinDepName] = depHierarchy[modName as builtinDepName].concat(
            Array.from(new Set(depsFor(modName as builtinDepName)))
        );
    }
    return depHierarchy;
})();

export function isSC2Archive(directory: string) {
    return path.basename(directory).match(reValidArchiveExtension);
}

export async function findSC2ArchiveDirectories(directory: string) {
    directory = path.resolve(directory);
    if (isSC2Archive(directory)) {
        return [directory];
    }

    const results = await globify(
        path.join(`**/*.+(${validArchiveExtensions.join('|')})/`),
        {
            nocase: true,
            realpath: true,
            cwd: directory,
        }
    );

    return results.sort((a, b) => {
        return (
            validArchiveExtensions.indexOf(b.match(reValidArchiveExtension)[1].toLowerCase()) -
            validArchiveExtensions.indexOf(a.match(reValidArchiveExtension)[1].toLowerCase())
        );
    });
}

export abstract class Component {
    protected workspace: SC2Workspace;

    constructor(workspace: SC2Workspace) {
        this.workspace = workspace;
    }

    public async load() {
        return await this.loadData();
    }

    abstract async loadData(): Promise<boolean>;
}

export class TriggerComponent extends Component {
    protected store = new trig.TriggerStore();
    // protected libraries: trig.Library;

    @logIt()
    public async loadData() {
        const trigReader = new trig.XMLReader(this.store);

        for (const archive of this.workspace.metadataArchives) {
            for (const filename of await archive.findFiles('**/+(*.TriggerLib|*.SC2Lib)')) {
                logger.debug(`:: ${archive.name}/${filename}`);
                this.store.addLibrary(await trigReader.loadLibrary(await archive.readFile(filename)));
            }
            if (await archive.hasFile('Triggers')) {
                logger.debug(`:: ${archive.name}/Triggers`);
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

    @logIt()
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
    strings = new Map<string, loc.LocalizationTextStore>();

    private async loadStrings(name: string) {
        const textStore = new loc.LocalizationTextStore();
        for (const archive of this.workspace.metadataArchives) {
            const filenames = await archive.findFiles(this.lang + '.SC2Data/LocalizedData/' + name + 'Strings.txt');
            if (filenames.length) {
                logger.debug(`:: ${archive.name}/${filenames[0]}`);
                const locFile = new loc.LocalizationFile();
                locFile.read(await archive.readFile(filenames[0]));
                textStore.merge(locFile);
            }
        }
        this.strings.set(name, textStore);
    }

    @logIt()
    public async loadData() {
        for (const archive of this.workspace.metadataArchives) {
            const filenames = await archive.findFiles(this.lang + '.SC2Data/LocalizedData/TriggerStrings.txt');
            if (filenames.length) {
                logger.debug(`:: ${archive.name}/${filenames[0]}`);
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

type ResolveDependencyOpts = {
    overrides?: Map<string, string>;
    fallbackResolve?: (name: string) => Promise<string | undefined>;
};

export async function resolveArchiveDependencyList(rootArchive: SC2Archive, sources: string[], opts: ResolveDependencyOpts = {}) {
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
            if (opts.overrides && opts.overrides.has(entry)) {
                dir = opts.overrides.get(entry);
            }
            else {
                dir = await resolveArchiveDirectory(entry, sources);
            }

            if (!dir && opts.fallbackResolve) {
                dir = await opts.fallbackResolve(entry);
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
    const result = await resolveArchiveDependencyList(archive, sources, {
        overrides,
    });

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
    priority: number = 0;

    constructor(name: string = null, directory: string) {
        if (name === null) {
            name = path.basename(directory);
        }
        this.name = name.replace(/\\/g, '/').toLowerCase();
        this.directory = fs.realpathSync(path.resolve(directory));
        this.lcFsPath = this.directory.toLowerCase();
    }

    public async findFiles(pattern: string) {
        return (await globify(pattern, {
            nocase: true,
            nodir: true,
            cwd: this.directory,
        })).filter(v => {
            // filter out sc2maps inside campaign deps
            return !v.match(/base[\d]*\.sc2maps/i);
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

    /**
     * returns lowercased and forward slash normalized list
     */
    public async getDependencyList() {
        let list: string[] = [];

        if (builtinDepsHierarchy[this.name as builtinDepName]) {
            list = list.concat(builtinDepsHierarchy[this.name as builtinDepName]);
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

            if (data.DocInfo && data.DocInfo.Dependencies) {
                for (const depValue of data.DocInfo.Dependencies[0].Value) {
                    list.push(depValue.substr(depValue.indexOf('file:') + 5).replace(/\\/g, '/').toLowerCase());
                }
            }
        }
        return list;
    }

    get isBuiltin(): boolean {
        return builtinDepsHierarchy[this.name as builtinDepName] !== void 0;
    }
}

export enum S2ArchiveNsNameKind {
    base,
    enus,
    // TODO: add missing localizations
}

export enum S2ArchiveNsTypeKind {
    sc2assets,
    sc2data,
}

export interface S2FileNs {
    name: keyof typeof S2ArchiveNsNameKind;
    type: keyof typeof S2ArchiveNsTypeKind;
}

export interface S2QualifiedFile {
    fsPath: string;
    relativePath: string;
    namespace?: S2FileNs;
    archive?: SC2Archive;
    priority: number;
}

const reArchiveFileNs = /^(?:(?<nsName>[a-z]+)\.(?<nsType>(?:sc2data|sc2assets))(?:\/|\\))?(?<rp>.+)$/i;

export class SC2Workspace {
    rootArchive?: SC2Archive;
    allArchives: SC2Archive[] = [];
    dependencies: SC2Archive[] = [];
    metadataArchives: SC2Archive[] = [];
    trigComponent: TriggerComponent = new TriggerComponent(this);
    locComponent: LocalizationComponent = new LocalizationComponent(this);
    catalogComponent: CatalogComponent = new CatalogComponent(this);
    readonly arvMap = new Map<string, SC2Archive>();

    constructor(rootArchive?: SC2Archive, dependencies: SC2Archive[] = []) {
        this.rootArchive = rootArchive;
        this.dependencies = dependencies;
        this.allArchives = this.allArchives.concat(this.dependencies);
        this.metadataArchives = this.allArchives;
        if (rootArchive) {
            this.allArchives.push(rootArchive);
        }

        this.allArchives.forEach((av, index) => {
            this.arvMap.set(av.name, av);
            av.priority = index * 20;
        });
    }

    public async loadComponents() {
        await this.trigComponent.load();
        await this.locComponent.load();
        await this.catalogComponent.load();
    }

    public resolvePath(fsPath: string): S2QualifiedFile | undefined {
        for (const cArchive of this.allArchives) {
            if (!fsPath.toLowerCase().startsWith(cArchive.lcFsPath + path.sep)) continue;

            const m = fsPath.substr(cArchive.lcFsPath.length + 1).match(reArchiveFileNs);
            if (!m) return;

            let priority = cArchive.priority;
            let ns: S2FileNs;
            if (m.groups['nsName']) {
                ns = {
                    name: <any>m.groups['nsName'].toLowerCase(),
                    type: <any>m.groups['nsType'].toLowerCase(),
                };
                priority += S2ArchiveNsTypeKind[ns.type];
                if (ns.name !== 'base') {
                    priority += 5;
                }
            }
            else {
                priority += 10;
            }

            return {
                fsPath: fsPath,
                relativePath: m.groups['rp'].replace(/\\/g, '/'),
                namespace: ns,
                archive: cArchive,
                priority: priority,
            };
        }
    }
}
