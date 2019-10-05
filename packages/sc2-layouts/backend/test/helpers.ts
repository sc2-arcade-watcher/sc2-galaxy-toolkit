import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import { Store } from '../src/index/store';
import { SchemaRegistry } from '../src/schema/base';
import URI from 'vscode-uri';
import { globify, readFileAsync } from '../src/common';
import { languageExt } from '../src/types';

export function getSchema(): SchemaRegistry {
    return (<any>global)._cachedSchema;
}

export function getFixturePath(...src: string[]) {
    return path.resolve(path.join('test', 'fixtures', ...src));
}

export interface MockupStoreOptions {
    fprefix?: string;
}

export function buildStore(opts: MockupStoreOptions = {}, ...filenames: string[]) {
    const store = new Store(getSchema());
    opts.fprefix = opts.fprefix ? path.join(getFixturePath(), opts.fprefix) : getFixturePath();
    for (const tmp of filenames) {
        let uri: URI;
        if (path.isAbsolute(tmp)) {
            uri = URI.file(tmp);
        }
        else {
            uri = URI.file(path.join(opts.fprefix, `${tmp}.${languageExt}`));
        }
        store.updateDocument(uri.toString(), fs.readFileSync(uri.fsPath, 'utf8'));
    }
    return store;
}

export async function buildStoreFromDir(srcDir: string) {
    const store = new Store(getSchema());
    if (!path.isAbsolute(srcDir)) {
        srcDir = getFixturePath(srcDir);
    }
    for (const fname of await globify(`**/*.${languageExt}`, {cwd: srcDir, absolute: true, nodir: true})) {
        const uri = URI.file(fname);
        store.updateDocument(uri.toString(), await readFileAsync(fname, 'utf8'));
    }
    return store;
}

export function tlog(d: any, opts: util.InspectOptions | number = {}) {
    if (typeof opts === 'number') opts = {depth: opts};
    console.log(util.inspect(d,
        Object.assign(<util.InspectOptions>{
            colors: true,
            depth: 1,
        }, opts)
    ));
}
