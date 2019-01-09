import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { readFileAsync, globify, readDirAsync } from '../common';
import URI from 'vscode-uri';
import { ILoggerConsole, createLogger } from '../services/provider';

if (!Symbol.asyncIterator) (<any>Symbol).asyncIterator = Symbol.for('Symbol.asyncIterator');

type KeyStringMap = Map<string, string>;

async function *readKeyStringsFile(filename: string) {
    const reKeyString = /^\n?([^\/][^=\s]*)=(.+)$/gm;
    let content = await readFileAsync(filename, 'utf8');
    content = content.replace(/^\uFEFF/, ''); // remove UTF8 BOM

    let result: RegExpExecArray;
    while (result = reKeyString.exec(content)) {
        yield [result[1], result[2]];
    }
}

// ===

export enum StringFileKind {
    Assets,
    GameStrings,
    GameHotkeys,
}

export interface StringFileMatch {
    partial: boolean;
    result?: {
        value: string;
        archive: Archive;
    };
}

export class StringFile {
    protected relativePaths: string[];
    protected src = new Map<Archive, KeyStringMap>();

    constructor(relativePath: string | string[]) {
        if (typeof relativePath === 'string') {
            this.relativePaths = [relativePath];
        }
        else {
            this.relativePaths = relativePath;
        }
    }

    async reload(archive: Archive) {
        const sm = new Map<string, string>();
        for (const fpath of this.relativePaths) {
            const fname = await archive.resolveFilename(fpath);
            if (!fname) continue;
            for await (const [ikey, ival] of readKeyStringsFile(fname)) {
                sm.set(ikey, ival);
            }
        }
        this.src.set(archive, sm);
    }

    async add(archive: Archive) {
        await this.reload(archive);
    }

    async delete(archive: Archive) {
        this.src.delete(archive);
    }

    *entries() {
        for (const [sa, kstr] of this.src) {
            for (const [key, val] of kstr) {
                yield {
                    archive: sa,
                    key,
                    val,
                };
            }
        }
    }

    entriesStartingWith(s: string) {
        if (!s.endsWith('/')) {
            const segments = s.split('/');
            if (segments.length) segments.pop();
            s = segments.join('/');
            if (segments.length) s += '/';
        }

        const res = new Map<string, StringFileMatch>();

        for (const [sa, kstr] of Array.from(this.src.entries()).reverse()) {
            for (const [key, val] of kstr) {
                if (s.length > 0 && !key.startsWith(s)) continue;
                let slashIdx = key.indexOf('/', s.length);
                if (slashIdx === -1) slashIdx = key.length;
                const pkey = key.substring(s.length, slashIdx);

                if (res.has(pkey)) continue;
                if (slashIdx === key.length) {
                    res.set(pkey, {
                        partial: false,
                        result: {
                            archive: sa,
                            value: val,
                        },
                    });
                }
                else {
                    res.set(pkey, {
                        partial: true,
                    });
                }
            }
        }

        return res;
    }
}

export class StringsComponent {
    protected lang = 'enUS';
    protected files: Map<StringFileKind, StringFile>;

    constructor(protected workspace: Workspace) {
        this.files = new Map([
            [StringFileKind.Assets, new StringFile(['base.SC2Data/GameData/Assets.txt', 'base.SC2Data/GameData/AssetsProduct.txt'])],
            [StringFileKind.GameStrings, new StringFile(`${this.lang}.SC2Data/LocalizedData/GameStrings.txt`)],
            [StringFileKind.GameHotkeys, new StringFile(`${this.lang}.SC2Data/LocalizedData/GameHotkeys.txt`)],
        ]);
    }

    async reload(archive: Archive) {
        for (const sf of this.files.values()) {
            await sf.reload(archive);
        }
    }

    async add(archive: Archive) {
        for (const sf of this.files.values()) {
            await sf.add(archive);
        }
    }

    async delete(archive: Archive) {
        for (const sf of this.files.values()) {
            await sf.delete(archive);
        }
    }

    file(fkind: StringFileKind) {
        return this.files.get(fkind);
    }
}

// ===

async function *readStyleFile(filename: string) {
    const reStyleDecl = /<(Style|Constant)\s+name="([^"]+)"/gm;

    let content = await readFileAsync(filename, 'utf8');

    let matches: RegExpExecArray;
    while (matches = reStyleDecl.exec(content)) {
        yield [matches[1], matches[2]];
    }
}

export class FontStyleEntry {
    readonly archives = new Set<Archive>();

    constructor(public readonly name: string, archive?: Archive) {
        if (archive) {
            this.archives.add(archive);
        }
    }
}

export class FontStyleComponent {
    protected stylesMap = new Map<string, FontStyleEntry>();

    constructor(protected workspace: Workspace) {
    }

    async reload(archive: Archive) {
        this.delete(archive);

        const fname = await archive.resolveFilename('base.SC2Data/UI/FontStyles.SC2Style');
        if (!fname) return;

        for await (const [dkind, name] of readStyleFile(fname)) {
            switch (dkind) {
                case 'Style':
                    let dfs = this.stylesMap.get(name);
                    if (!dfs) {
                        dfs = new FontStyleEntry(name);
                        this.stylesMap.set(name, dfs);
                    }
                    dfs.archives.add(archive);
                    break;
            }
        }
    }

    async add(archive: Archive) {
        await this.reload(archive);
    }

    async delete(archive: Archive) {
        for (const decl of this.stylesMap.values()) {
            if (!decl.archives.has(archive)) continue;
            if (decl.archives.size > 1) {
                decl.archives.delete(archive);
            }
            else {
                this.stylesMap.delete(decl.name);
            }
        }
    }

    entries() {
        return <ReadonlyMap<string, FontStyleEntry>>this.stylesMap;
    }

    get values() {
        return this.stylesMap.values();
    }
}

// ===

export const S2ArchiveExts = ['SC2Mod', 'SC2Map', 'SC2Campaign', 'SC2Interface'];
export const S2ArchiveExtsStr = S2ArchiveExts.join('|');
const reIsS2Archive = new RegExp(`^\\.(${S2ArchiveExtsStr})$`, 'i');

export function isS2Archive(fsPath: string) {
    return reIsS2Archive.exec(path.extname(fsPath));
}

export async function findArchiveDirectories(fsPath: string) {
    if (isS2Archive(fsPath)) {
        return [path.resolve(fsPath)];
    }
    const folders = (await globify(`**/*.+(${S2ArchiveExtsStr})/`, {
        cwd: fsPath,
        absolute: true,
        nocase: true,
    })).sort().sort((a, b) => {
        return path.extname(a).toLowerCase() === '.sc2map' ? 1 : -1;
    });
    return folders;
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

export class Archive {
    constructor(public readonly name: string, public readonly uri: URI, public readonly native: boolean = false) {
    }

    public async findFiles(pattern: string) {
        return await findSC2File(this.uri.fsPath, pattern);
    }

    public async resolveFilename(fname: string) {
        const r = await this.findFiles(fname);
        return r.length ? r[0] : void 0;
    }
}

export class Workspace {
    readonly archives = new Set<Archive>();
    readonly strings = new StringsComponent(this);
    readonly styles = new FontStyleComponent(this);

    constructor (public logger: ILoggerConsole = createLogger()) {
    }

    async clear() {
        for (const sa of Array.from(this.archives)) {
            await this.deleteArchive(sa);
        }
    }

    async presetArchives(...sas: Archive[]) {
        sas.forEach(sa => this.archives.add(sa));
    }

    async addArchive(sa: Archive) {
        this.archives.add(sa);
        await Promise.all([
            this.strings.add(sa),
            this.styles.add(sa)
        ]);
    }

    async deleteArchive(sa: Archive) {
        this.archives.delete(sa);
        await this.strings.delete(sa);
        await this.styles.delete(sa);
    }

    async reloadArchive(sa: Archive) {
        this.logger.info(`processing s2mod: ${sa.name}`);
        await this.strings.reload(sa);
        await this.styles.reload(sa);
    }

    async reload() {
        for (const sa of this.archives.values()) {
            await this.reloadArchive(sa);
        }
    }

    async handleFileUpdate(uri: URI) {
        const archiveMatch = Array.from(this.archives.values()).find(item => uri.fsPath.startsWith(item.uri.fsPath));
        if (!archiveMatch) return false;
        if (uri.fsPath.match(/\/(GameStrings|GameHotkeys|Assets|AssetsProduct)\.txt$/i)) {
            await this.strings.reload(archiveMatch);
        }
        else if (uri.fsPath.match(/\/FontStyles\.SC2Style$/i)) {
            await this.styles.reload(archiveMatch);
        }
        return true;
    }

    matchFileWorkspace(uri: URI) {
        for (const sa of this.archives.values()) {
            if (uri.fsPath.toString().startsWith(sa.uri.fsPath.toString())) {
                return sa;
            }
        }
    }
}
