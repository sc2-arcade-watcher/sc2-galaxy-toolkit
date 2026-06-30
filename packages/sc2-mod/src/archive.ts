import { URI } from 'vscode-uri';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as util from 'util';
import * as path from 'path';
import * as xml from 'xml2js';
import glob from 'fast-glob';
import { BuiltinDeps, S2ArchiveNsTypeKind, type BuiltinDepName, type ArchiveLink, type S2QualifiedFile, type S2FileNs } from './types.js';
import { logger, logIt } from './logger.js';

const validArchiveExtensions = [
    'sc2map',
    'sc2interface',
    'sc2campaign',
    'sc2mod',
];

const reValidArchiveExtension = new RegExp('\\.(' + validArchiveExtensions.join('|') + ')$', 'i');

const builtinDepsHierarchy = (function() {
    function depsFor(modName: BuiltinDepName) {
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
            list = depsFor(item as BuiltinDepName).concat(list.reverse());
        }

        return list;
    }

    const depHierarchy: {[key in BuiltinDepName]: string[]} = {} as any;
    for (const modName of Object.keys(BuiltinDeps).filter(v => typeof (BuiltinDeps as any)[v] === 'number')) {
        depHierarchy[modName as BuiltinDepName] = [];
        if (modName !== 'mods/core.sc2mod') {
            depHierarchy[modName as BuiltinDepName].push('mods/core.sc2mod');
        }
        depHierarchy[modName as BuiltinDepName] = depHierarchy[modName as BuiltinDepName].concat(
            Array.from(new Set(depsFor(modName as BuiltinDepName)))
        );
    }
    return depHierarchy;
})();

export function isSC2Archive(directory: string) {
    return path.basename(directory).match(reValidArchiveExtension);
}

export async function findSC2ArchiveDirectories(directory: string, opts: { exclude?: string[] } = {}) {
    directory = path.resolve(directory);
    if (isSC2Archive(directory)) {
        return [directory];
    }

    const results = (await glob(
        `**/*.{${validArchiveExtensions.join(',')}}`,
        {
            caseSensitiveMatch: false,
            absolute: true,
            cwd: directory,
            ignore: opts.exclude,
            onlyDirectories: true,
            stats: true,
            objectMode: true,
        }
    )).map((x: glob.Entry) => x.path);

    return results.sort((a: string, b: string) => {
        return (
            validArchiveExtensions.indexOf(b.match(reValidArchiveExtension)[1].toLowerCase()) -
            validArchiveExtensions.indexOf(a.match(reValidArchiveExtension)[1].toLowerCase())
        );
    });
}

export async function resolveArchiveDirectory(name: string, sources: string[]) {
    for (const src of sources) {
        const results = await glob(`**/${name}`, {
            caseSensitiveMatch: false,
            absolute: true,
            cwd: src,
            onlyDirectories: true,
        });

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

    public async findFiles(pattern: string | string[]) {
        return glob(pattern, {
            cwd: this.directory,
            caseSensitiveMatch: false,
            onlyFiles: true,
            objectMode: false,
            ignore: [
                'base{0..99}.sc2maps/**',
            ],
        });
    }

    public async hasFile(filename: string) {
        return fsp.access(path.join(this.directory, filename)).then(() => true, () => false);
    }

    public async readFile(filename: string) {
        return fsp.readFile(path.join(this.directory, filename), 'utf8');
    }

    public relativePath(uri: string) {
        const fsPath = URI.parse(uri).fsPath;
        if (fsPath.substring(0, this.lcFsPath.length).toLowerCase() !== this.lcFsPath) return;
        return fsPath.substring(this.lcFsPath.length + 1);
    }

    public async getDependencyList() {
        let list: string[] = [];

        if (builtinDepsHierarchy[this.name as BuiltinDepName]) {
            list = list.concat(builtinDepsHierarchy[this.name as BuiltinDepName]);
        }

        if (await this.hasFile('DocumentInfo')) {
            try {
                const content = await this.readFile('DocumentInfo');
                const data = await xml.parseStringPromise(content);

                for (const depValue of data.DocInfo.Dependencies[0].Value) {
                    list.push(depValue.substr(depValue.indexOf('file:') + 5).replace(/\\/g, '/').toLowerCase());
                }
            }
            catch (err) {
                logger.warn(`Couldn't read dependencies from "DocumentInfo" of "${this.name}`, (<Error>err).message);
                list.push('mods/core.sc2mod');
            }
        }
        return list;
    }

    get isBuiltin(): boolean {
        return builtinDepsHierarchy[this.name as BuiltinDepName] !== void 0;
    }
}

export abstract class Component {
    protected workspace: SC2Workspace;

    constructor(workspace: SC2Workspace) {
        this.workspace = workspace;
    }

    public async load() {
        return await this.loadData();
    }

    abstract loadData(): Promise<boolean>;
}

export class SC2Workspace {
    rootArchive?: SC2Archive;
    allArchives: SC2Archive[] = [];
    dependencies: SC2Archive[] = [];
    metadataArchives: SC2Archive[] = [];
    readonly arvMap = new Map<string, SC2Archive>();
    private components = new Map<string, Component>();

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

    registerComponent(name: string, component: Component): void {
        this.components.set(name, component);
    }

    getComponent<T extends Component>(name: string): T | undefined {
        return this.components.get(name) as T | undefined;
    }

    public async *findFiles(pattern: string | string[]) {
        const stuff = this.allArchives.map(archive => <[SC2Archive, Promise<string[]>]>[archive, archive.findFiles(pattern)]);
        for (const [archive, archiveFiles] of stuff) {
            for (const filename of await archiveFiles) {
                yield <[SC2Archive, string]>[archive, filename];
            }
        }
    }

    public resolvePath(fsPath: string): S2QualifiedFile | undefined {
        const reArchiveFileNs = /^(?:(?<nsName>[a-z]+)\.(?<nsType>(?:sc2data|sc2assets))(?:\/|\\))?(?<rp>.+)$/i;
        const reIsUri = /^[^:/?#]+:\/\//i;

        if (fsPath.match(reIsUri)) {
            fsPath = URI.parse(fsPath).fsPath;
        }
        for (const cArchive of this.allArchives) {
            if (!fsPath.toLowerCase().startsWith(cArchive.lcFsPath)) continue;

            const m = fsPath.substring(cArchive.directory.length + 1).match(reArchiveFileNs);
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

            const relativePath = m.groups['rp'].replace(/\\/g, '/');
            return {
                fsPath: fsPath,
                relativePath: relativePath,
                archiveRelpath: m.groups['nsName'] ? `${m.groups['nsName']}.${m.groups['nsType']}/${relativePath}` : relativePath,
                namespace: ns,
                archive: cArchive,
                priority: priority,
            };
        }
    }
}
