import * as fs from 'fs';
import * as util from 'util';
import glob from 'fast-glob';
import type { Options as GlobOptions } from 'fast-glob';
import { CharacterCodes } from 'sc2-xml';

export const readFileAsync = util.promisify(fs.readFile);
export const readDirAsync = util.promisify(fs.readdir);
export const fileExistsAsync = util.promisify(fs.exists);

//

export function buildMap<T>(obj: {[name: string]: T}) {
    return Object.keys(obj).reduce((map, key) => map.set(key, obj[key]), new Map<string, T>());
}

export function* oentries<T>(obj: T[]) {
    for (const key in obj) {
        yield obj[key];
    }
}

export function* objventries<T>(obj: {[name: string]: T}): Iterable<[string, T]> {
    for (const key in obj) {
        yield [key, obj[key]];
    }
}

export function *reverseMap<T>(source: ReadonlyMap<string, T>): Iterable<[T, string]> {
    const result: string[] = [];
    for (const [k, v] of source.entries()) {
        yield [v, k];
    }
}

export function fuzzysearch (needle: string, haystack: string) {
    let hlen = haystack.length;
    let nlen = needle.length;
    if (nlen > hlen) {
        return false;
    }
    if (nlen === hlen && needle === haystack) {
        return true;
    }
    outer: for (let i = 0, j = 0; i < nlen; i++) {
        let nch = needle.charCodeAt(i);
        while (j < hlen) {
            let hch = haystack.charCodeAt(j++);

            // case sensitive
            if (hch === nch) {
                continue outer;
            }

            // try case insensitive
            if (nch >= 65 && nch <= 90) {
                nch += 32;
            }
            else if (nch >= 97 && nch <= 122) {
                nch -= 32;
            }
            else {
                switch (nch) {
                    case CharacterCodes.space:
                    // case CharacterCodes.slash:
                    // case CharacterCodes.backslash:
                    // case CharacterCodes.minus:
                    // case CharacterCodes._:
                        continue outer;
                }

                continue;
            }
            if (hch === nch) {
                continue outer;
            }
        }
        return false;
    }
    return true;
}

export function globify(pattern: string, opts: GlobOptions = {}) {
    return glob(pattern, {
        ...opts,
        caseSensitiveMatch: false,
        onlyFiles: true,
    });
}

export function dlog(o: any, opts: util.InspectOptions = {}) {
    console.log(util.inspect(o, Object.assign({
        colors: true,
        compact: false,
        depth: 6,
    }, opts)));
}

export class StringIcaseMap<T> extends Map<string, T> {
    protected readonly lcaseMap = new Map<string, T>();

    clear() {
        super.clear();
        this.lcaseMap.clear();
    }

    set(key: string, value: T) {
        this.lcaseMap.set(key.toLowerCase(), value);
        return super.set(key, value);
    }

    get(key: string): T | undefined {
        let r = super.get(key);
        if (!r) {
            r = this.lcaseMap.get(key.toLowerCase());
        }
        return r;
    }

    getStrictCase(key: string): T | undefined {
        return super.get(key);
    }

    has(key: string): boolean {
        let r = super.has(key);
        if (!r) {
            r = this.lcaseMap.has(key.toLowerCase());
        }
        return r;
    }

    delete(key: string): boolean {
        let r = super.delete(key);
        if (r) {
            this.lcaseMap.delete(key.toLowerCase());
        }
        return r;
    }
}
