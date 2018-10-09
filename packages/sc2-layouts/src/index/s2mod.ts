import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { readFileAsync } from '../common';
import URI from 'vscode-uri';

const reKeyString = /^\s*([^=]+)=(.+)$/gmu;
type KeyStringMap = Map<string, string>;

async function readKeyStringsFile(filename: string) {
    const sm = new Map<string, string>();
    let content = await readFileAsync(filename, 'utf8');
    content = content.replace(/^\uFEFF/, ''); // remove UTF8 BOM

    let result: RegExpExecArray;
    while (result = reKeyString.exec(content)) {
        sm.set(result[1], result[2]);
    }

    return sm;
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
    protected src = new Map<Archive, KeyStringMap>();

    constructor(public relativePath: string) {}

    async reload(archive: Archive) {
        const fname = await archive.resolveFilename(this.relativePath)
        if (!fname) return;
        const r = await readKeyStringsFile(fname)
        this.src.set(archive, r);
    }

    *entries() {
        for (const [sa, kstr] of this.src) {
            for (const [key, val] of kstr) {
                yield {
                    archive: sa,
                    key,
                    val,
                }
            }
        }
    }

    entriesStartingWith(s: string) {
        if (!s.endsWith('/')) {
            const segments = s.split('/');
            if (segments.length) segments.pop();
            s = segments.join('/');
        }

        const res = new Map<string, StringFileMatch>();

        for (const [sa, kstr] of Array.from(this.src.entries()).reverse()) {
            for (const [key, val] of kstr) {
                if (s.length > 0 && !key.startsWith(s)) continue;
                let slashIdx = key.indexOf('/', s.length);
                if (slashIdx === -1) slashIdx = key.length;
                const pkey = key.substring(s.length, slashIdx);

                if (res.has(pkey)) continue;
                if (slashIdx === s.length) {
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
    public files: Map<StringFileKind, StringFile>;

    constructor(protected workspace: Workspace) {
        this.files = new Map([
            [StringFileKind.Assets, new StringFile('base.SC2Data/GameData/Assets.txt')],
            [StringFileKind.GameStrings, new StringFile('enUS.SC2Data/LocalizedData/GameStrings.txt')],
            [StringFileKind.GameHotkeys, new StringFile('enUS.SC2Data/LocalizedData/GameHotkeys.txt')],
        ]);
    }

    async reload(archive: Archive) {
        for (const sf of this.files.values()) {
            await sf.reload(archive);
        }
    }
}

// ===

// export const S2ArchiveExts = ['SC2Mod', 'SC2Map', 'SC2Campaign'];

export function isS2Archive(fsPath: string) {
    return /\.(SC2Mod|SC2Map|SC2Campaign)$/i.exec(path.basename(fsPath));
}

export function findS2ArchiveDirectories(fsPath: string, cwd = process.cwd()) {
    fsPath = path.relative(cwd, path.resolve(fsPath));
    return new Promise<string[]>((resolve, reject) => {
        if (isS2Archive(fsPath)) {
            resolve([path.resolve(fsPath)]);
            return;
        }
        glob(path.join(fsPath, '**/*.+(SC2Mod|SC2Map|SC2Campaign)'), {nocase: true, realpath: true} , (err, matches) => {
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

export class Archive {
    readonly name: string;
    readonly uri: URI;

    constructor(name: string, uri: URI) {
        this.name = name;
        this.uri = uri;
    }

    public async findFiles(pattern: string) {
        return await findSC2File(this.uri.fsPath, pattern);
        // return r.map((item) => {
        //     return item.substr(fs.realpathSync(this.uri.fsPath).length + 1);
        // });
    }

    public async resolveFilename(fname: string) {
        const r = await this.findFiles(fname);
        return r.length ? r[0] : void 0;
    }

    // public async hasFile(filename: string) {
    //     return new Promise<boolean>((resolve) => {
    //         fs.exists(path.join(this.uri.fsPath, filename), (result) => {
    //             resolve(result);
    //         })
    //     });
    // }
}

export class Workspace {
    protected archives = new Map<string, Archive>();
    strings = new StringsComponent(this);

    constructor (archives: Archive[]) {
        for (const sa of archives) {
            this.archives.set(sa.name, sa);
        }
    }

    async reload() {
        for (const sa of this.archives.values()) {
            await this.strings.reload(sa);
        }
    }

    async handleFileUpdate(uri: URI) {
    }
}